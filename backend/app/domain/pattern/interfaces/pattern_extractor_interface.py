"""
Pattern Extractor Interface - Domain Interface
단일 책임 원칙을 따르는 패턴 추출 인터페이스
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass

from app.models.file_models import IndexedFile, ExtractionPattern


@dataclass
class ExtractionResult:
    """패턴 추출 결과를 담는 Value Object"""
    success: bool
    extracted_data: Dict[str, Any]
    pattern_id: int
    extraction_score: float
    error_message: Optional[str] = None
    processing_time_ms: float = 0.0


@dataclass
class PatternMatchResult:
    """패턴 매칭 결과를 담는 Value Object"""
    pattern_id: int
    confidence_score: float
    match_quality: str  # 'excellent', 'good', 'fair', 'poor'
    matched_groups: Dict[str, str]


class PatternExtractorInterface(ABC):
    """
    패턴 추출 인터페이스
    
    단일 책임: 파일명에서 패턴을 사용하여 메타데이터를 추출하는 책임만 담당
    높은 응집도: 추출 관련 메서드들만 포함
    낮은 결합도: 구체적 구현체에 의존하지 않음
    """

    @abstractmethod
    def extract_metadata(self, filename: str, pattern: ExtractionPattern) -> ExtractionResult:
        """
        특정 패턴을 사용하여 파일명에서 메타데이터 추출
        
        Args:
            filename: 대상 파일명
            pattern: 적용할 추출 패턴
            
        Returns:
            ExtractionResult: 추출 결과와 메타데이터
        """
        pass

    @abstractmethod
    def extract_with_best_pattern(self, filename: str, patterns: List[ExtractionPattern]) -> ExtractionResult:
        """
        여러 패턴 중 가장 적합한 패턴을 찾아 메타데이터 추출
        
        Args:
            filename: 대상 파일명
            patterns: 사용 가능한 패턴 목록
            
        Returns:
            ExtractionResult: 추출 결과와 최적 패턴 정보
        """
        pass

    @abstractmethod
    def validate_extraction_quality(self, result: ExtractionResult) -> bool:
        """
        추출 결과의 품질 검증
        
        Args:
            result: 검증할 추출 결과
            
        Returns:
            bool: 품질 기준 통과 여부
        """
        pass


class PatternMatcherInterface(ABC):
    """
    패턴 매칭 인터페이스
    
    단일 책임: 파일명에 대한 패턴 매칭 점수 계산만 담당
    """

    @abstractmethod
    def calculate_match_score(self, filename: str, pattern: ExtractionPattern) -> PatternMatchResult:
        """
        파일명과 패턴의 매칭 점수 계산
        
        Args:
            filename: 대상 파일명
            pattern: 매칭할 패턴
            
        Returns:
            PatternMatchResult: 매칭 결과와 점수
        """
        pass

    @abstractmethod
    def find_best_pattern(self, filename: str, patterns: List[ExtractionPattern]) -> Optional[PatternMatchResult]:
        """
        파일명에 가장 적합한 패턴 찾기
        
        Args:
            filename: 대상 파일명
            patterns: 후보 패턴 목록
            
        Returns:
            Optional[PatternMatchResult]: 최적 패턴 매칭 결과 (없으면 None)
        """
        pass

    @abstractmethod
    def batch_match_patterns(self, filenames: List[str], patterns: List[ExtractionPattern]) -> Dict[str, Optional[PatternMatchResult]]:
        """
        여러 파일명에 대한 일괄 패턴 매칭
        
        Args:
            filenames: 대상 파일명 목록
            patterns: 후보 패턴 목록
            
        Returns:
            Dict[str, Optional[PatternMatchResult]]: 파일명별 최적 패턴 매칭 결과
        """
        pass


class PatternCacheInterface(ABC):
    """
    패턴 캐싱 인터페이스
    
    단일 책임: 패턴 관련 데이터 캐싱만 담당
    """

    @abstractmethod
    def get_cached_extraction(self, filename: str, pattern_id: int) -> Optional[ExtractionResult]:
        """캐시된 추출 결과 조회"""
        pass

    @abstractmethod
    def set_cached_extraction(self, filename: str, pattern_id: int, result: ExtractionResult) -> None:
        """추출 결과 캐시 저장"""
        pass

    @abstractmethod
    def get_cached_pattern_match(self, filename: str) -> Optional[PatternMatchResult]:
        """캐시된 패턴 매칭 결과 조회"""
        pass

    @abstractmethod
    def set_cached_pattern_match(self, filename: str, result: PatternMatchResult) -> None:
        """패턴 매칭 결과 캐시 저장"""
        pass

    @abstractmethod
    def invalidate_pattern_cache(self, pattern_id: int) -> None:
        """특정 패턴 관련 캐시 무효화"""
        pass

    @abstractmethod
    def clear_all_cache(self) -> None:
        """모든 캐시 삭제"""
        pass