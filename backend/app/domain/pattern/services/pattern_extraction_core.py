"""
Pattern Extraction Core Service
패턴 추출의 핵심 로직을 담당하는 서비스

단일 책임 원칙: 패턴을 사용한 메타데이터 추출만 담당
높은 응집도: 추출 관련 로직만 포함
낮은 결합도: 인터페이스를 통한 의존성 주입
"""

import re
import json
import time
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from app.models.file_models import ExtractionPattern
from app.domain.pattern.interfaces.pattern_extractor_interface import (
    PatternExtractorInterface, 
    ExtractionResult, 
    PatternMatchResult,
    PatternCacheInterface
)
from app.domain.pattern.interfaces.pattern_validator_interface import (
    PatternValidatorInterface,
    ValidationResult
)

logger = logging.getLogger(__name__)


class PatternExtractionCore(PatternExtractorInterface):
    """
    패턴 추출 핵심 서비스
    
    책임:
    - 정규표현식을 사용한 메타데이터 추출
    - 데이터 타입 변환
    - 추출 품질 평가
    """

    def __init__(self, 
                 cache_manager: PatternCacheInterface,
                 validator: PatternValidatorInterface):
        """
        의존성 주입을 통한 초기화
        
        Args:
            cache_manager: 캐싱 인터페이스
            validator: 검증 인터페이스
        """
        self._cache = cache_manager
        self._validator = validator
        
        # 성능 통계
        self._stats = {
            'total_extractions': 0,
            'cache_hits': 0,
            'successful_extractions': 0,
            'failed_extractions': 0,
            'average_processing_time': 0.0
        }
        
        logger.info("PatternExtractionCore initialized with caching and validation")

    def extract_metadata(self, filename: str, pattern: ExtractionPattern) -> ExtractionResult:
        """
        특정 패턴을 사용하여 파일명에서 메타데이터 추출
        
        Args:
            filename: 대상 파일명
            pattern: 적용할 추출 패턴
            
        Returns:
            ExtractionResult: 추출 결과와 메타데이터
        """
        start_time = time.time()
        self._stats['total_extractions'] += 1
        
        try:
            # 1. 캐시 확인
            cached_result = self._cache.get_cached_extraction(filename, pattern.id)
            if cached_result:
                self._stats['cache_hits'] += 1
                logger.debug(f"Cache hit for {filename} with pattern {pattern.id}")
                return cached_result

            # 2. 패턴 안전성 검증
            validation_result = self._validator.validate_security(pattern.regex_pattern)
            if not validation_result.is_valid:
                error_msg = f"Pattern security validation failed: {', '.join(validation_result.error_messages)}"
                return ExtractionResult(
                    success=False,
                    extracted_data={},
                    pattern_id=pattern.id,
                    extraction_score=0.0,
                    error_message=error_msg,
                    processing_time_ms=(time.time() - start_time) * 1000
                )

            # 3. 실제 추출 수행
            result = self._perform_extraction(filename, pattern, start_time)
            
            # 4. 결과 캐싱 (성공한 경우만)
            if result.success and result.extraction_score >= 0.5:
                self._cache.set_cached_extraction(filename, pattern.id, result)
            
            # 5. 통계 업데이트
            if result.success:
                self._stats['successful_extractions'] += 1
            else:
                self._stats['failed_extractions'] += 1
            
            self._update_average_processing_time(result.processing_time_ms)
            
            return result
            
        except Exception as e:
            logger.error(f"Extraction failed for {filename} with pattern {pattern.id}: {e}")
            self._stats['failed_extractions'] += 1
            
            return ExtractionResult(
                success=False,
                extracted_data={},
                pattern_id=pattern.id,
                extraction_score=0.0,
                error_message=f"Extraction error: {str(e)}",
                processing_time_ms=(time.time() - start_time) * 1000
            )

    def extract_with_best_pattern(self, filename: str, patterns: List[ExtractionPattern]) -> ExtractionResult:
        """
        여러 패턴 중 가장 적합한 패턴을 찾아 메타데이터 추출
        
        Args:
            filename: 대상 파일명
            patterns: 사용 가능한 패턴 목록
            
        Returns:
            ExtractionResult: 추출 결과와 최적 패턴 정보
        """
        if not patterns:
            return ExtractionResult(
                success=False,
                extracted_data={},
                pattern_id=-1,
                extraction_score=0.0,
                error_message="No patterns provided"
            )

        best_result = None
        best_score = 0.0

        # 모든 패턴으로 추출을 시도하고 가장 좋은 결과 선택
        for pattern in sorted(patterns, key=lambda p: p.priority, reverse=True):
            result = self.extract_metadata(filename, pattern)
            
            if result.success and result.extraction_score > best_score:
                best_result = result
                best_score = result.extraction_score
                
                # 매우 좋은 결과가 나온 경우 조기 종료
                if best_score >= 0.9:
                    break

        if best_result:
            logger.debug(f"Best pattern {best_result.pattern_id} for {filename} with score {best_score}")
            return best_result
        else:
            # 모든 패턴이 실패한 경우
            return ExtractionResult(
                success=False,
                extracted_data={},
                pattern_id=-1,
                extraction_score=0.0,
                error_message="No suitable pattern found"
            )

    def validate_extraction_quality(self, result: ExtractionResult) -> bool:
        """
        추출 결과의 품질 검증
        
        Args:
            result: 검증할 추출 결과
            
        Returns:
            bool: 품질 기준 통과 여부
        """
        if not result.success:
            return False
        
        # 품질 기준들
        quality_checks = [
            result.extraction_score >= 0.5,  # 최소 신뢰도
            len(result.extracted_data) > 0,   # 데이터 존재
            result.processing_time_ms < 5000, # 성능 기준
        ]
        
        # 추가 데이터 품질 검증
        for key, value in result.extracted_data.items():
            if value is None or (isinstance(value, str) and value.strip() == ""):
                quality_checks.append(False)
                break
        
        return all(quality_checks)

    def _perform_extraction(self, filename: str, pattern: ExtractionPattern, start_time: float) -> ExtractionResult:
        """
        실제 정규표현식 추출 수행
        
        Args:
            filename: 대상 파일명
            pattern: 추출 패턴
            start_time: 시작 시간
            
        Returns:
            ExtractionResult: 추출 결과
        """
        try:
            # 정규표현식 컴파일 및 매칭
            compiled_pattern = re.compile(pattern.regex_pattern, re.IGNORECASE)
            match = compiled_pattern.search(filename)
            
            if not match:
                return ExtractionResult(
                    success=False,
                    extracted_data={},
                    pattern_id=pattern.id,
                    extraction_score=0.0,
                    error_message="No match found",
                    processing_time_ms=(time.time() - start_time) * 1000
                )

            # 필드 매핑을 통한 데이터 추출
            extracted_data = self._extract_fields_from_match(match, pattern.field_mapping)
            
            # 추출 점수 계산
            extraction_score = self._calculate_extraction_score(match, extracted_data, pattern)
            
            return ExtractionResult(
                success=True,
                extracted_data=extracted_data,
                pattern_id=pattern.id,
                extraction_score=extraction_score,
                processing_time_ms=(time.time() - start_time) * 1000
            )
            
        except re.error as e:
            return ExtractionResult(
                success=False,
                extracted_data={},
                pattern_id=pattern.id,
                extraction_score=0.0,
                error_message=f"Regex error: {str(e)}",
                processing_time_ms=(time.time() - start_time) * 1000
            )

    def _extract_fields_from_match(self, match: re.Match, field_mapping: Dict[str, Any]) -> Dict[str, Any]:
        """
        매치 객체에서 필드 매핑을 통해 데이터 추출
        
        Args:
            match: 정규표현식 매치 객체
            field_mapping: 필드 매핑 설정
            
        Returns:
            Dict[str, Any]: 추출된 데이터
        """
        extracted_data = {}
        
        if not field_mapping:
            return extracted_data

        try:
            # 필드 매핑이 문자열인 경우 JSON 파싱
            if isinstance(field_mapping, str):
                field_mapping = json.loads(field_mapping)
            
            # 각 필드에 대해 추출 및 타입 변환 수행
            for field_name, field_config in field_mapping.items():
                if isinstance(field_config, dict):
                    group_index = field_config.get('group', 0)
                    data_type = field_config.get('type', 'string')
                    default_value = field_config.get('default')
                else:
                    # 단순 그룹 인덱스인 경우
                    group_index = field_config
                    data_type = 'string'
                    default_value = None

                # 그룹에서 값 추출
                try:
                    if isinstance(group_index, str):
                        # 명명된 그룹
                        raw_value = match.group(group_index)
                    else:
                        # 인덱스 그룹
                        raw_value = match.group(group_index)
                except (IndexError, KeyError):
                    raw_value = default_value

                # 타입 변환
                extracted_data[field_name] = self._convert_data_type(raw_value, data_type, default_value)

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Field mapping error: {e}")
            # 기본적인 그룹 추출 시도
            for i in range(1, len(match.groups()) + 1):
                extracted_data[f'group_{i}'] = match.group(i)

        return extracted_data

    def _convert_data_type(self, value: Any, data_type: str, default_value: Any = None) -> Any:
        """
        데이터 타입 변환
        
        Args:
            value: 변환할 값
            data_type: 목표 데이터 타입
            default_value: 기본값
            
        Returns:
            Any: 변환된 값
        """
        if value is None:
            return default_value

        try:
            if data_type == 'int':
                return int(value) if value else default_value
            elif data_type == 'float':
                return float(value) if value else default_value
            elif data_type == 'bool':
                return str(value).lower() in ('true', '1', 'yes', 'on') if value else bool(default_value)
            elif data_type == 'date':
                from datetime import datetime
                return datetime.strptime(str(value), '%Y-%m-%d').date() if value else default_value
            elif data_type == 'datetime':
                from datetime import datetime
                return datetime.fromisoformat(str(value)) if value else default_value
            else:  # string or unknown type
                return str(value).strip() if value else (default_value or "")
                
        except (ValueError, TypeError) as e:
            logger.debug(f"Type conversion failed for {value} to {data_type}: {e}")
            return default_value

    def _calculate_extraction_score(self, match: re.Match, extracted_data: Dict[str, Any], pattern: ExtractionPattern) -> float:
        """
        추출 점수 계산
        
        Args:
            match: 정규표현식 매치 객체
            extracted_data: 추출된 데이터
            pattern: 사용된 패턴
            
        Returns:
            float: 추출 점수 (0.0 ~ 1.0)
        """
        score = 0.0
        
        # 기본 점수: 매치 성공 (0.3)
        score += 0.3
        
        # 추출된 필드 수에 따른 점수 (0.4)
        if extracted_data:
            valid_fields = sum(1 for v in extracted_data.values() 
                             if v is not None and str(v).strip() != "")
            expected_fields = len(pattern.field_mapping) if pattern.field_mapping else 1
            field_ratio = min(valid_fields / max(expected_fields, 1), 1.0)
            score += 0.4 * field_ratio
        
        # 매치 품질에 따른 점수 (0.3)
        match_span = match.end() - match.start()
        filename_length = len(match.string)
        coverage_ratio = match_span / max(filename_length, 1)
        score += 0.3 * coverage_ratio
        
        return min(score, 1.0)

    def _update_average_processing_time(self, processing_time: float) -> None:
        """평균 처리 시간 업데이트"""
        total_operations = self._stats['successful_extractions'] + self._stats['failed_extractions']
        if total_operations > 0:
            current_avg = self._stats['average_processing_time']
            self._stats['average_processing_time'] = (
                (current_avg * (total_operations - 1) + processing_time) / total_operations
            )

    def get_performance_stats(self) -> Dict[str, Any]:
        """성능 통계 반환"""
        return self._stats.copy()

    def reset_stats(self) -> None:
        """통계 초기화"""
        self._stats = {
            'total_extractions': 0,
            'cache_hits': 0,
            'successful_extractions': 0,
            'failed_extractions': 0,
            'average_processing_time': 0.0
        }