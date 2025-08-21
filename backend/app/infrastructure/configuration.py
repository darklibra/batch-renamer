"""
Infrastructure Configuration
인프라스트럭처 및 도메인 서비스 DI 설정

확장 가능성: 새로운 서비스 쉽게 추가 가능
명확한 인터페이스: 의존성 관계 명시적 표현
"""

import logging
from sqlalchemy.orm import Session

from app.infrastructure.container import DIContainer, LifetimeScope, configure_container
from app.core.database import get_db

# 도메인 인터페이스
from app.domain.pattern.interfaces.pattern_extractor_interface import (
    PatternExtractorInterface,
    PatternMatcherInterface,
    PatternCacheInterface
)
from app.domain.pattern.interfaces.pattern_validator_interface import (
    PatternValidatorInterface,
    PatternPerformanceInterface,
    PatternCompatibilityInterface
)

# 도메인 서비스 구현
from app.domain.pattern.services.pattern_extraction_core import PatternExtractionCore
from app.domain.pattern.services.pattern_matching_engine import PatternMatchingEngine
from app.domain.pattern.services.pattern_cache_manager import PatternCacheManager
from app.domain.pattern.services.pattern_facade_service import PatternFacadeService

# File Domain 인터페이스 및 서비스
from app.domain.file.interfaces import (
    FileIndexerInterface,
    FileIndexingJobInterface,
    FileValidatorInterface
)
from app.domain.file.services import (
    FileIndexingCore,
    FileIndexingJobManager,
    FileValidatorService,
    FileFacadeService
)

# Smart Operations Domain 인터페이스 및 서비스
from app.domain.smart_operations.interfaces import (
    TemplateProcessorInterface,
    FileOperationInterface,
    MetadataResolverInterface
)
from app.domain.smart_operations.services import (
    TemplateProcessorService,
    FileOperationService,
    MetadataResolverService
)

# 기존 서비스들 (점진적 마이그레이션)
from app.services.pattern_validation_service import PatternValidationService
from app.core.security_validator import get_pattern_validator, PatternSecurityValidator
from app.repositories.pattern_repository import PatternRepository, PatternApplicationRepository
from app.repositories.file_repository import FileRepository, IndexingJobRepository

logger = logging.getLogger(__name__)


class PatternValidationServiceAdapter(PatternValidatorInterface):
    """
    기존 PatternValidationService를 새 인터페이스에 맞게 어댑터
    점진적 마이그레이션을 위한 임시 어댑터
    """
    
    def __init__(self):
        self._validator = get_pattern_validator()
    
    def validate_regex_syntax(self, pattern: str):
        """정규표현식 문법 검증"""
        from app.domain.pattern.interfaces.pattern_validator_interface import ValidationResult, SecurityRisk
        
        try:
            import re
            re.compile(pattern)
            return ValidationResult(is_valid=True)
        except re.error as e:
            return ValidationResult(
                is_valid=False,
                error_messages=[f"Regex syntax error: {str(e)}"]
            )
    
    def validate_security(self, pattern: str):
        """보안 검증"""
        from app.domain.pattern.interfaces.pattern_validator_interface import ValidationResult, SecurityRisk
        
        result = self._validator.validate_pattern(pattern)
        
        if result.is_secure:
            return ValidationResult(is_valid=True, security_risk=SecurityRisk.NONE)
        else:
            risk_level = SecurityRisk.HIGH if result.complexity_score > 0.8 else SecurityRisk.MEDIUM
            return ValidationResult(
                is_valid=False,
                security_risk=risk_level,
                error_messages=[result.message or "Security validation failed"]
            )
    
    def analyze_complexity(self, pattern: str):
        """복잡도 분석"""
        from app.domain.pattern.interfaces.pattern_validator_interface import PatternComplexityResult
        
        result = self._validator.validate_pattern(pattern)
        
        return PatternComplexityResult(
            complexity_score=result.complexity_score,
            estimated_performance="fast" if result.complexity_score < 0.5 else "moderate",
            dangerous_constructs=result.dangerous_constructs or [],
            optimization_suggestions=[]
        )
    
    def validate_field_mapping(self, pattern: str, field_mapping):
        """필드 매핑 검증"""
        from app.domain.pattern.interfaces.pattern_validator_interface import ValidationResult
        
        # 기본적인 검증만 수행
        if field_mapping is None:
            return ValidationResult(is_valid=True)
        
        try:
            import json
            if isinstance(field_mapping, str):
                json.loads(field_mapping)
            return ValidationResult(is_valid=True)
        except json.JSONDecodeError:
            return ValidationResult(
                is_valid=False,
                error_messages=["Invalid JSON in field mapping"]
            )


def configure_pattern_domain_services(container: DIContainer) -> None:
    """
    패턴 도메인 서비스 설정
    
    Args:
        container: DI 컨테이너
    """
    # 캐시 매니저 - 싱글톤 (전역 캐시 공유)
    container.register_singleton(
        PatternCacheInterface, 
        PatternCacheManager
    )
    
    # 패턴 검증 서비스 - 싱글톤 (무상태 서비스)
    container.register_singleton(
        PatternValidatorInterface,
        PatternValidationServiceAdapter
    )
    
    # 패턴 매칭 엔진 - 트랜지언트 (각 요청마다 독립적)
    container.register_transient(
        PatternMatcherInterface,
        PatternMatchingEngine
    )
    
    # 패턴 추출 코어 - 트랜지언트 (각 요청마다 독립적)
    container.register_transient(
        PatternExtractorInterface,
        PatternExtractionCore
    )
    
    # 패턴 파사드 서비스 - 트랜지언트 (각 요청마다 독립적)
    container.register_transient(
        PatternFacadeService,
        PatternFacadeService
    )
    
    logger.info("Pattern domain services configured")


def configure_file_domain_services(container: DIContainer) -> None:
    """
    파일 도메인 서비스 설정
    
    Args:
        container: DI 컨테이너
    """
    # 파일 검증 서비스 - 싱글톤 (무상태 서비스)
    container.register_singleton(
        FileValidatorInterface,
        FileValidatorService
    )
    
    # 파일 인덱서 - 트랜지언트 (각 스캔 작업마다 독립적)
    container.register_transient(
        FileIndexerInterface,
        FileIndexingCore
    )
    
    # 파일 인덱싱 작업 관리자 - 트랜지언트 (각 작업마다 독립적)
    container.register_transient(
        FileIndexingJobInterface,
        FileIndexingJobManager
    )
    
    # 파일 파사드 서비스 - 트랜지언트 (각 요청마다 독립적)
    container.register_transient(
        FileFacadeService,
        FileFacadeService
    )
    
    logger.info("File domain services configured")


def configure_smart_operations_domain_services(container: DIContainer) -> None:
    """
    스마트 작업 도메인 서비스 설정
    
    Args:
        container: DI 컨테이너
    """
    # 템플릿 프로세서 - 싱글톤 (무상태 서비스)
    container.register_singleton(
        TemplateProcessorInterface,
        TemplateProcessorService
    )
    
    # 파일 작업 서비스 - 트랜지언트 (각 작업마다 독립적)
    container.register_transient(
        FileOperationInterface,
        FileOperationService
    )
    
    # 메타데이터 리졸버 - 트랜지언트 (패턴 추출기 의존성)
    container.register_transient(
        MetadataResolverInterface,
        MetadataResolverService
    )
    
    logger.info("Smart Operations domain services configured")


def configure_legacy_services(container: DIContainer) -> None:
    """
    기존 서비스들 설정 (점진적 마이그레이션용)
    
    Args:
        container: DI 컨테이너
    """
    # 데이터베이스 세션 팩토리
    container.register_factory(
        Session,
        lambda: next(get_db()),
        lifetime=LifetimeScope.SCOPED
    )
    
    # 리포지토리들 - 스코프 (요청별 DB 세션 공유)
    container.register_scoped(
        PatternRepository,
        PatternRepository
    )
    
    container.register_scoped(
        PatternApplicationRepository,
        PatternApplicationRepository
    )
    
    container.register_scoped(
        FileRepository,
        FileRepository
    )
    
    container.register_scoped(
        IndexingJobRepository,
        IndexingJobRepository
    )
    
    logger.info("Legacy services configured")


def configure_all_services() -> None:
    """모든 서비스 DI 설정"""
    
    def configurator(container: DIContainer) -> None:
        configure_pattern_domain_services(container)
        configure_file_domain_services(container)
        configure_smart_operations_domain_services(container)
        configure_legacy_services(container)
        
        logger.info("All services configured successfully")
    
    configure_container(configurator)


# 애플리케이션 시작 시 서비스 설정
def initialize_services() -> None:
    """서비스 초기화"""
    configure_all_services()
    logger.info("Services initialization completed")


# 서비스 팩토리 함수들
def create_pattern_extractor() -> PatternExtractorInterface:
    """패턴 추출기 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(PatternExtractorInterface)


def create_pattern_matcher() -> PatternMatcherInterface:
    """패턴 매처 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(PatternMatcherInterface)


def create_pattern_cache() -> PatternCacheInterface:
    """패턴 캐시 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(PatternCacheInterface)


def create_pattern_facade() -> PatternFacadeService:
    """패턴 파사드 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(PatternFacadeService)


# File Domain 서비스 팩토리 함수들
def create_file_indexer() -> FileIndexerInterface:
    """파일 인덱서 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(FileIndexerInterface)


def create_file_indexing_job_manager() -> FileIndexingJobInterface:
    """파일 인덱싱 작업 관리자 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(FileIndexingJobInterface)


def create_file_validator() -> FileValidatorInterface:
    """파일 검증기 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(FileValidatorInterface)


def create_file_facade() -> FileFacadeService:
    """파일 파사드 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(FileFacadeService)


# Smart Operations Domain 서비스 팩토리 함수들
def create_template_processor() -> TemplateProcessorInterface:
    """템플릿 프로세서 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(TemplateProcessorInterface)


def create_file_operation_service() -> FileOperationInterface:
    """파일 작업 서비스 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(FileOperationInterface)


def create_metadata_resolver() -> MetadataResolverInterface:
    """메타데이터 리졸버 생성"""
    from app.infrastructure.container import get_container
    return get_container().resolve(MetadataResolverInterface)


# 서비스 로케이터 패턴 (필요한 경우)
class ServiceLocator:
    """
    서비스 로케이터
    
    DI 컨테이너에 직접 접근하기 어려운 경우 사용
    가능한 한 생성자 주입을 사용하고, 이 클래스는 최후의 수단으로만 사용
    """
    
    @staticmethod
    def get_pattern_extractor() -> PatternExtractorInterface:
        """패턴 추출기 반환"""
        return create_pattern_extractor()
    
    @staticmethod
    def get_pattern_matcher() -> PatternMatcherInterface:
        """패턴 매처 반환"""
        return create_pattern_matcher()
    
    @staticmethod
    def get_pattern_cache() -> PatternCacheInterface:
        """패턴 캐시 반환"""
        return create_pattern_cache()
    
    @staticmethod
    def get_pattern_facade() -> PatternFacadeService:
        """패턴 파사드 반환"""
        return create_pattern_facade()
    
    # File Domain Service Locator methods
    @staticmethod
    def get_file_indexer() -> FileIndexerInterface:
        """파일 인덱서 반환"""
        return create_file_indexer()
    
    @staticmethod
    def get_file_validator() -> FileValidatorInterface:
        """파일 검증기 반환"""
        return create_file_validator()
    
    @staticmethod
    def get_file_facade() -> FileFacadeService:
        """파일 파사드 반환"""
        return create_file_facade()
    
    # Smart Operations Domain Service Locator methods
    @staticmethod
    def get_template_processor() -> TemplateProcessorInterface:
        """템플릿 프로세서 반환"""
        return create_template_processor()
    
    @staticmethod
    def get_file_operation_service() -> FileOperationInterface:
        """파일 작업 서비스 반환"""
        return create_file_operation_service()
    
    @staticmethod
    def get_metadata_resolver() -> MetadataResolverInterface:
        """메타데이터 리졸버 반환"""
        return create_metadata_resolver()


# 헬스체크용 서비스 상태 확인
def check_services_health() -> dict:
    """서비스들의 상태 확인"""
    from app.infrastructure.container import get_container
    container = get_container()
    
    health_status = {
        # Pattern Domain
        'pattern_extractor': False,
        'pattern_matcher': False,
        'pattern_cache': False,
        # File Domain
        'file_indexer': False,
        'file_validator': False,
        'file_facade': False,
        # Smart Operations Domain  
        'template_processor': False,
        'file_operation_service': False,
        'metadata_resolver': False,
        # General
        'services_registered': 0,
        'all_domains_healthy': False
    }
    
    try:
        # 서비스 해결 테스트
        container.resolve(PatternExtractorInterface)
        health_status['pattern_extractor'] = True
    except Exception as e:
        logger.warning(f"Pattern extractor health check failed: {e}")
    
    try:
        container.resolve(PatternMatcherInterface)
        health_status['pattern_matcher'] = True
    except Exception as e:
        logger.warning(f"Pattern matcher health check failed: {e}")
    
    try:
        container.resolve(PatternCacheInterface)
        health_status['pattern_cache'] = True
    except Exception as e:
        logger.warning(f"Pattern cache health check failed: {e}")
    
    # File Domain 서비스 테스트
    try:
        container.resolve(FileIndexerInterface)
        health_status['file_indexer'] = True
    except Exception as e:
        logger.warning(f"File indexer health check failed: {e}")
    
    try:
        container.resolve(FileValidatorInterface)
        health_status['file_validator'] = True
    except Exception as e:
        logger.warning(f"File validator health check failed: {e}")
    
    try:
        container.resolve(FileFacadeService)
        health_status['file_facade'] = True
    except Exception as e:
        logger.warning(f"File facade health check failed: {e}")
    
    # Smart Operations Domain 서비스 테스트
    try:
        container.resolve(TemplateProcessorInterface)
        health_status['template_processor'] = True
    except Exception as e:
        logger.warning(f"Template processor health check failed: {e}")
    
    try:
        container.resolve(FileOperationInterface)
        health_status['file_operation_service'] = True
    except Exception as e:
        logger.warning(f"File operation service health check failed: {e}")
    
    try:
        container.resolve(MetadataResolverInterface)
        health_status['metadata_resolver'] = True
    except Exception as e:
        logger.warning(f"Metadata resolver health check failed: {e}")
    
    # 등록된 서비스 수
    health_status['services_registered'] = len(container.get_registered_services())
    
    # 전체 도메인 상태 확인
    pattern_domain_healthy = (
        health_status['pattern_extractor'] and 
        health_status['pattern_matcher'] and 
        health_status['pattern_cache']
    )
    
    file_domain_healthy = (
        health_status['file_indexer'] and
        health_status['file_validator'] and
        health_status['file_facade']
    )
    
    smart_ops_domain_healthy = (
        health_status['template_processor'] and
        health_status['file_operation_service'] and
        health_status['metadata_resolver']
    )
    
    health_status['all_domains_healthy'] = (
        pattern_domain_healthy and 
        file_domain_healthy and 
        smart_ops_domain_healthy
    )
    
    return health_status