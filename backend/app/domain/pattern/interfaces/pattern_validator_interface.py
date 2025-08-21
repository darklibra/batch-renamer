"""
Pattern Validator Interface - Domain Interface
패턴 검증 관련 인터페이스
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class SecurityRisk(Enum):
    """보안 위험도 레벨"""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ValidationResult:
    """검증 결과를 담는 Value Object"""
    def __init__(self, 
                 is_valid: bool, 
                 security_risk: SecurityRisk = SecurityRisk.NONE,
                 error_messages: List[str] = None,
                 warnings: List[str] = None,
                 complexity_score: float = 0.0,
                 performance_impact: str = "low"):
        self.is_valid = is_valid
        self.security_risk = security_risk
        self.error_messages = error_messages or []
        self.warnings = warnings or []
        self.complexity_score = complexity_score
        self.performance_impact = performance_impact


@dataclass
class PatternComplexityResult:
    """패턴 복잡도 분석 결과"""
    complexity_score: float
    estimated_performance: str  # 'fast', 'moderate', 'slow', 'very_slow'
    dangerous_constructs: List[str]
    optimization_suggestions: List[str]


class PatternValidatorInterface(ABC):
    """
    패턴 검증 인터페이스
    
    단일 책임: 정규표현식 패턴의 안전성과 유효성 검증만 담당
    높은 응집도: 검증 관련 기능들만 포함
    """

    @abstractmethod
    def validate_regex_syntax(self, pattern: str) -> ValidationResult:
        """
        정규표현식 문법 검증
        
        Args:
            pattern: 검증할 정규표현식 패턴
            
        Returns:
            ValidationResult: 문법 검증 결과
        """
        pass

    @abstractmethod
    def validate_security(self, pattern: str) -> ValidationResult:
        """
        ReDoS 공격 및 보안 취약점 검증
        
        Args:
            pattern: 검증할 정규표현식 패턴
            
        Returns:
            ValidationResult: 보안 검증 결과
        """
        pass

    @abstractmethod
    def analyze_complexity(self, pattern: str) -> PatternComplexityResult:
        """
        패턴 복잡도 분석
        
        Args:
            pattern: 분석할 정규표현식 패턴
            
        Returns:
            PatternComplexityResult: 복잡도 분석 결과
        """
        pass

    @abstractmethod
    def validate_field_mapping(self, pattern: str, field_mapping: Dict[str, Any]) -> ValidationResult:
        """
        필드 매핑 유효성 검증
        
        Args:
            pattern: 정규표현식 패턴
            field_mapping: 필드 매핑 설정
            
        Returns:
            ValidationResult: 필드 매핑 검증 결과
        """
        pass


class PatternPerformanceInterface(ABC):
    """
    패턴 성능 검증 인터페이스
    
    단일 책임: 패턴 실행 성능 검증만 담당
    """

    @abstractmethod
    def measure_performance(self, pattern: str, test_strings: List[str]) -> Dict[str, Any]:
        """
        패턴 실행 성능 측정
        
        Args:
            pattern: 성능을 측정할 패턴
            test_strings: 테스트용 문자열 목록
            
        Returns:
            Dict[str, Any]: 성능 측정 결과
        """
        pass

    @abstractmethod
    def detect_performance_issues(self, pattern: str) -> List[str]:
        """
        성능 문제 가능성 탐지
        
        Args:
            pattern: 검사할 패턴
            
        Returns:
            List[str]: 발견된 성능 이슈 목록
        """
        pass

    @abstractmethod
    def suggest_optimizations(self, pattern: str) -> List[str]:
        """
        패턴 최적화 제안
        
        Args:
            pattern: 최적화할 패턴
            
        Returns:
            List[str]: 최적화 제안 목록
        """
        pass


class PatternCompatibilityInterface(ABC):
    """
    패턴 호환성 검증 인터페이스
    
    단일 책임: 패턴의 환경별 호환성 검증만 담당
    """

    @abstractmethod
    def validate_python_compatibility(self, pattern: str) -> ValidationResult:
        """Python re 모듈 호환성 검증"""
        pass

    @abstractmethod
    def validate_unicode_support(self, pattern: str) -> ValidationResult:
        """유니코드 지원 검증"""
        pass

    @abstractmethod
    def validate_cross_platform_compatibility(self, pattern: str) -> ValidationResult:
        """크로스 플랫폼 호환성 검증"""
        pass