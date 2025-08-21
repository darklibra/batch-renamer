"""
Pattern Matching Engine
패턴 매칭 및 점수 계산을 담당하는 서비스

단일 책임 원칙: 패턴 매칭과 점수 계산만 담당
높은 응집도: 매칭 관련 로직만 포함
"""

import re
import time
import logging
from typing import Dict, List, Optional, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

from app.models.file_models import ExtractionPattern
from app.domain.pattern.interfaces.pattern_extractor_interface import (
    PatternMatcherInterface, 
    PatternMatchResult,
    PatternCacheInterface
)
from app.domain.pattern.interfaces.pattern_validator_interface import PatternValidatorInterface

logger = logging.getLogger(__name__)


@dataclass
class MatchingMetrics:
    """매칭 성능 메트릭"""
    total_matches: int = 0
    successful_matches: int = 0
    cache_hits: int = 0
    average_match_time: float = 0.0
    best_score_achieved: float = 0.0


class PatternMatchingEngine(PatternMatcherInterface):
    """
    패턴 매칭 엔진
    
    책임:
    - 파일명과 패턴의 매칭 점수 계산
    - 최적 패턴 찾기
    - 배치 매칭 처리
    """

    def __init__(self, 
                 cache_manager: PatternCacheInterface,
                 validator: PatternValidatorInterface,
                 max_workers: int = 4):
        """
        의존성 주입을 통한 초기화
        
        Args:
            cache_manager: 캐싱 인터페이스
            validator: 검증 인터페이스
            max_workers: 병렬 처리 최대 워커 수
        """
        self._cache = cache_manager
        self._validator = validator
        self._max_workers = max_workers
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        
        # 성능 메트릭
        self._metrics = MatchingMetrics()
        
        # 매칭 품질 임계값
        self.QUALITY_THRESHOLDS = {
            'excellent': 0.9,
            'good': 0.7,
            'fair': 0.5,
            'poor': 0.3
        }
        
        logger.info(f"PatternMatchingEngine initialized with {max_workers} workers")

    def calculate_match_score(self, filename: str, pattern: ExtractionPattern) -> PatternMatchResult:
        """
        파일명과 패턴의 매칭 점수 계산
        
        Args:
            filename: 대상 파일명
            pattern: 매칭할 패턴
            
        Returns:
            PatternMatchResult: 매칭 결과와 점수
        """
        start_time = time.time()
        self._metrics.total_matches += 1
        
        try:
            # 1. 캐시 확인
            cache_key = f"{filename}:{pattern.id}"
            cached_result = self._cache.get_cached_pattern_match(cache_key)
            if cached_result:
                self._metrics.cache_hits += 1
                logger.debug(f"Cache hit for pattern matching: {cache_key}")
                return cached_result

            # 2. 패턴 안전성 검증
            validation_result = self._validator.validate_security(pattern.regex_pattern)
            if not validation_result.is_valid:
                return PatternMatchResult(
                    pattern_id=pattern.id,
                    confidence_score=0.0,
                    match_quality='poor',
                    matched_groups={}
                )

            # 3. 실제 매칭 수행
            result = self._perform_matching(filename, pattern)
            
            # 4. 결과 캐싱 (좋은 매칭만)
            if result.confidence_score >= 0.5:
                self._cache.set_cached_pattern_match(cache_key, result)
            
            # 5. 메트릭 업데이트
            if result.confidence_score > 0:
                self._metrics.successful_matches += 1
                
            processing_time = (time.time() - start_time) * 1000
            self._update_metrics(processing_time, result.confidence_score)
            
            return result
            
        except Exception as e:
            logger.error(f"Pattern matching failed for {filename} with pattern {pattern.id}: {e}")
            return PatternMatchResult(
                pattern_id=pattern.id,
                confidence_score=0.0,
                match_quality='poor',
                matched_groups={}
            )

    def find_best_pattern(self, filename: str, patterns: List[ExtractionPattern]) -> Optional[PatternMatchResult]:
        """
        파일명에 가장 적합한 패턴 찾기
        
        Args:
            filename: 대상 파일명
            patterns: 후보 패턴 목록
            
        Returns:
            Optional[PatternMatchResult]: 최적 패턴 매칭 결과
        """
        if not patterns:
            return None

        best_result = None
        best_score = 0.0

        # 우선순위별로 정렬하여 처리
        sorted_patterns = sorted(patterns, key=lambda p: p.priority, reverse=True)
        
        for pattern in sorted_patterns:
            result = self.calculate_match_score(filename, pattern)
            
            if result.confidence_score > best_score:
                best_result = result
                best_score = result.confidence_score
                
                # 매우 좋은 결과가 나온 경우 조기 종료
                if best_score >= self.QUALITY_THRESHOLDS['excellent']:
                    logger.debug(f"Excellent match found early: pattern {pattern.id} with score {best_score}")
                    break

        if best_result and best_result.confidence_score >= self.QUALITY_THRESHOLDS['fair']:
            logger.debug(f"Best pattern {best_result.pattern_id} for '{filename}' with score {best_score}")
            return best_result
        
        return None

    def batch_match_patterns(self, filenames: List[str], patterns: List[ExtractionPattern]) -> Dict[str, Optional[PatternMatchResult]]:
        """
        여러 파일명에 대한 일괄 패턴 매칭
        
        Args:
            filenames: 대상 파일명 목록
            patterns: 후보 패턴 목록
            
        Returns:
            Dict[str, Optional[PatternMatchResult]]: 파일명별 최적 패턴 매칭 결과
        """
        results = {}
        
        if not filenames or not patterns:
            return results

        # 병렬 처리를 위한 태스크 생성
        future_to_filename = {}
        
        with ThreadPoolExecutor(max_workers=self._max_workers) as executor:
            for filename in filenames:
                future = executor.submit(self.find_best_pattern, filename, patterns)
                future_to_filename[future] = filename

            # 결과 수집
            for future in as_completed(future_to_filename):
                filename = future_to_filename[future]
                try:
                    result = future.result(timeout=30)  # 30초 타임아웃
                    results[filename] = result
                except Exception as e:
                    logger.error(f"Batch matching failed for {filename}: {e}")
                    results[filename] = None

        logger.info(f"Batch matching completed for {len(filenames)} files with {len(patterns)} patterns")
        return results

    def _perform_matching(self, filename: str, pattern: ExtractionPattern) -> PatternMatchResult:
        """
        실제 패턴 매칭 수행
        
        Args:
            filename: 대상 파일명
            pattern: 매칭할 패턴
            
        Returns:
            PatternMatchResult: 매칭 결과
        """
        try:
            # 정규표현식 컴파일
            compiled_pattern = re.compile(pattern.regex_pattern, re.IGNORECASE)
            match = compiled_pattern.search(filename)
            
            if not match:
                return PatternMatchResult(
                    pattern_id=pattern.id,
                    confidence_score=0.0,
                    match_quality='poor',
                    matched_groups={}
                )

            # 매치된 그룹 추출
            matched_groups = self._extract_groups(match)
            
            # 신뢰도 점수 계산
            confidence_score = self._calculate_confidence_score(filename, match, pattern)
            
            # 매치 품질 결정
            match_quality = self._determine_match_quality(confidence_score)
            
            return PatternMatchResult(
                pattern_id=pattern.id,
                confidence_score=confidence_score,
                match_quality=match_quality,
                matched_groups=matched_groups
            )
            
        except re.error as e:
            logger.warning(f"Regex error in pattern {pattern.id}: {e}")
            return PatternMatchResult(
                pattern_id=pattern.id,
                confidence_score=0.0,
                match_quality='poor',
                matched_groups={}
            )

    def _extract_groups(self, match: re.Match) -> Dict[str, str]:
        """
        매치 객체에서 그룹 정보 추출
        
        Args:
            match: 정규표현식 매치 객체
            
        Returns:
            Dict[str, str]: 그룹명과 값의 매핑
        """
        groups = {}
        
        # 명명된 그룹 추출
        groups.update(match.groupdict())
        
        # 인덱스 그룹 추가
        for i, group_value in enumerate(match.groups(), 1):
            if group_value is not None:
                groups[f'group_{i}'] = group_value
        
        return groups

    def _calculate_confidence_score(self, filename: str, match: re.Match, pattern: ExtractionPattern) -> float:
        """
        신뢰도 점수 계산
        
        Args:
            filename: 원본 파일명
            match: 매치 객체
            pattern: 사용된 패턴
            
        Returns:
            float: 신뢰도 점수 (0.0 ~ 1.0)
        """
        score = 0.0
        
        # 1. 기본 매치 점수 (0.2)
        score += 0.2
        
        # 2. 매치 커버리지 점수 (0.3)
        match_length = match.end() - match.start()
        filename_length = len(filename)
        coverage_ratio = match_length / max(filename_length, 1)
        score += 0.3 * coverage_ratio
        
        # 3. 그룹 매치 점수 (0.3)
        matched_groups = [g for g in match.groups() if g is not None]
        if matched_groups:
            group_score = len(matched_groups) / max(match.lastindex or 1, 1)
            score += 0.3 * group_score
        
        # 4. 패턴 우선순위 점수 (0.2)
        priority_score = min(pattern.priority / 10.0, 1.0) if pattern.priority else 0
        score += 0.2 * priority_score
        
        # 5. 보정 - 너무 짧은 매치는 점수 차감
        if match_length < 3:
            score *= 0.5
        
        return min(score, 1.0)

    def _determine_match_quality(self, confidence_score: float) -> str:
        """
        신뢰도 점수를 바탕으로 매치 품질 결정
        
        Args:
            confidence_score: 신뢰도 점수
            
        Returns:
            str: 매치 품질 ('excellent', 'good', 'fair', 'poor')
        """
        if confidence_score >= self.QUALITY_THRESHOLDS['excellent']:
            return 'excellent'
        elif confidence_score >= self.QUALITY_THRESHOLDS['good']:
            return 'good'
        elif confidence_score >= self.QUALITY_THRESHOLDS['fair']:
            return 'fair'
        else:
            return 'poor'

    def _update_metrics(self, processing_time: float, confidence_score: float) -> None:
        """
        성능 메트릭 업데이트
        
        Args:
            processing_time: 처리 시간 (ms)
            confidence_score: 신뢰도 점수
        """
        # 평균 매치 시간 업데이트
        total_matches = self._metrics.total_matches
        current_avg = self._metrics.average_match_time
        self._metrics.average_match_time = (
            (current_avg * (total_matches - 1) + processing_time) / total_matches
        )
        
        # 최고 점수 업데이트
        if confidence_score > self._metrics.best_score_achieved:
            self._metrics.best_score_achieved = confidence_score

    def get_performance_metrics(self) -> Dict[str, Any]:
        """성능 메트릭 반환"""
        return {
            'total_matches': self._metrics.total_matches,
            'successful_matches': self._metrics.successful_matches,
            'success_rate': (
                self._metrics.successful_matches / max(self._metrics.total_matches, 1) * 100
            ),
            'cache_hit_rate': (
                self._metrics.cache_hits / max(self._metrics.total_matches, 1) * 100
            ),
            'average_match_time_ms': self._metrics.average_match_time,
            'best_score_achieved': self._metrics.best_score_achieved
        }

    def reset_metrics(self) -> None:
        """메트릭 초기화"""
        self._metrics = MatchingMetrics()

    def update_quality_thresholds(self, thresholds: Dict[str, float]) -> None:
        """품질 임계값 업데이트"""
        self.QUALITY_THRESHOLDS.update(thresholds)
        logger.info(f"Quality thresholds updated: {self.QUALITY_THRESHOLDS}")

    def __del__(self):
        """소멸자 - 리소스 정리"""
        if hasattr(self, '_executor'):
            self._executor.shutdown(wait=True)