"""
Dependency Injection Container
의존성 주입 컨테이너

단일 책임 원칙: 의존성 관리만 담당
낮은 결합도: 인터페이스 기반 의존성 관리
확장 가능성: 새로운 서비스 쉽게 등록 가능
"""

import logging
from typing import Dict, Type, Any, Callable, Optional, TypeVar, Generic
from abc import ABC, abstractmethod
from enum import Enum
import inspect

logger = logging.getLogger(__name__)

T = TypeVar('T')


class LifetimeScope(Enum):
    """서비스 생명주기 스코프"""
    SINGLETON = "singleton"      # 앱 전체에 하나의 인스턴스
    SCOPED = "scoped"           # 요청별 하나의 인스턴스
    TRANSIENT = "transient"     # 매번 새로운 인스턴스


class ServiceDescriptor:
    """서비스 설명자"""
    def __init__(self, 
                 service_type: Type, 
                 implementation: Type, 
                 lifetime: LifetimeScope = LifetimeScope.TRANSIENT,
                 factory: Optional[Callable] = None):
        self.service_type = service_type
        self.implementation = implementation
        self.lifetime = lifetime
        self.factory = factory
        self.instance = None  # 싱글톤용 인스턴스 저장


class DIContainer:
    """
    의존성 주입 컨테이너
    
    책임:
    - 서비스 등록 및 관리
    - 의존성 주입을 통한 인스턴스 생성
    - 생명주기 관리
    """

    def __init__(self):
        self._services: Dict[Type, ServiceDescriptor] = {}
        self._scoped_instances: Dict[Type, Any] = {}  # 스코프별 인스턴스
        self._building: set = set()  # 순환 의존성 감지용
        
        logger.info("DIContainer initialized")

    def register_singleton(self, service_type: Type[T], implementation: Type[T]) -> 'DIContainer':
        """
        싱글톤 서비스 등록
        
        Args:
            service_type: 서비스 인터페이스 타입
            implementation: 구현 클래스 타입
            
        Returns:
            DIContainer: 메서드 체이닝을 위한 자기 자신
        """
        descriptor = ServiceDescriptor(service_type, implementation, LifetimeScope.SINGLETON)
        self._services[service_type] = descriptor
        
        logger.debug(f"Registered singleton: {service_type.__name__} -> {implementation.__name__}")
        return self

    def register_scoped(self, service_type: Type[T], implementation: Type[T]) -> 'DIContainer':
        """
        스코프 서비스 등록
        
        Args:
            service_type: 서비스 인터페이스 타입
            implementation: 구현 클래스 타입
            
        Returns:
            DIContainer: 메서드 체이닝을 위한 자기 자신
        """
        descriptor = ServiceDescriptor(service_type, implementation, LifetimeScope.SCOPED)
        self._services[service_type] = descriptor
        
        logger.debug(f"Registered scoped: {service_type.__name__} -> {implementation.__name__}")
        return self

    def register_transient(self, service_type: Type[T], implementation: Type[T]) -> 'DIContainer':
        """
        트랜지언트 서비스 등록
        
        Args:
            service_type: 서비스 인터페이스 타입
            implementation: 구현 클래스 타입
            
        Returns:
            DIContainer: 메서드 체이닝을 위한 자기 자신
        """
        descriptor = ServiceDescriptor(service_type, implementation, LifetimeScope.TRANSIENT)
        self._services[service_type] = descriptor
        
        logger.debug(f"Registered transient: {service_type.__name__} -> {implementation.__name__}")
        return self

    def register_factory(self, service_type: Type[T], factory: Callable[[], T], 
                        lifetime: LifetimeScope = LifetimeScope.TRANSIENT) -> 'DIContainer':
        """
        팩토리 함수를 통한 서비스 등록
        
        Args:
            service_type: 서비스 인터페이스 타입
            factory: 인스턴스를 생성하는 팩토리 함수
            lifetime: 서비스 생명주기
            
        Returns:
            DIContainer: 메서드 체이닝을 위한 자기 자신
        """
        descriptor = ServiceDescriptor(service_type, None, lifetime, factory)
        self._services[service_type] = descriptor
        
        logger.debug(f"Registered factory: {service_type.__name__} with {lifetime.value} lifetime")
        return self

    def register_instance(self, service_type: Type[T], instance: T) -> 'DIContainer':
        """
        인스턴스 직접 등록 (싱글톤으로 처리)
        
        Args:
            service_type: 서비스 인터페이스 타입
            instance: 등록할 인스턴스
            
        Returns:
            DIContainer: 메서드 체이닝을 위한 자기 자신
        """
        descriptor = ServiceDescriptor(service_type, type(instance), LifetimeScope.SINGLETON)
        descriptor.instance = instance
        self._services[service_type] = descriptor
        
        logger.debug(f"Registered instance: {service_type.__name__}")
        return self

    def resolve(self, service_type: Type[T]) -> T:
        """
        서비스 인스턴스 해결
        
        Args:
            service_type: 요청할 서비스 타입
            
        Returns:
            T: 서비스 인스턴스
            
        Raises:
            ValueError: 등록되지 않은 서비스 요청 시
            RuntimeError: 순환 의존성 감지 시
        """
        if service_type in self._building:
            raise RuntimeError(f"Circular dependency detected for {service_type.__name__}")

        if service_type not in self._services:
            raise ValueError(f"Service {service_type.__name__} is not registered")

        descriptor = self._services[service_type]
        
        try:
            self._building.add(service_type)
            
            # 생명주기에 따른 인스턴스 반환
            if descriptor.lifetime == LifetimeScope.SINGLETON:
                return self._get_singleton_instance(descriptor)
            elif descriptor.lifetime == LifetimeScope.SCOPED:
                return self._get_scoped_instance(descriptor)
            else:  # TRANSIENT
                return self._create_instance(descriptor)
                
        finally:
            self._building.discard(service_type)

    def resolve_optional(self, service_type: Type[T]) -> Optional[T]:
        """
        서비스 인스턴스 해결 (선택적)
        
        Args:
            service_type: 요청할 서비스 타입
            
        Returns:
            Optional[T]: 서비스 인스턴스 (없으면 None)
        """
        try:
            return self.resolve(service_type)
        except (ValueError, RuntimeError):
            return None

    def is_registered(self, service_type: Type) -> bool:
        """
        서비스 등록 여부 확인
        
        Args:
            service_type: 확인할 서비스 타입
            
        Returns:
            bool: 등록 여부
        """
        return service_type in self._services

    def create_scope(self) -> 'DIScope':
        """
        새로운 DI 스코프 생성
        
        Returns:
            DIScope: 새로운 스코프
        """
        return DIScope(self)

    def _get_singleton_instance(self, descriptor: ServiceDescriptor) -> Any:
        """싱글톤 인스턴스 획득"""
        if descriptor.instance is None:
            descriptor.instance = self._create_instance(descriptor)
            logger.debug(f"Created singleton instance: {descriptor.service_type.__name__}")
        
        return descriptor.instance

    def _get_scoped_instance(self, descriptor: ServiceDescriptor) -> Any:
        """스코프 인스턴스 획득"""
        if descriptor.service_type not in self._scoped_instances:
            self._scoped_instances[descriptor.service_type] = self._create_instance(descriptor)
            logger.debug(f"Created scoped instance: {descriptor.service_type.__name__}")
        
        return self._scoped_instances[descriptor.service_type]

    def _create_instance(self, descriptor: ServiceDescriptor) -> Any:
        """새 인스턴스 생성"""
        if descriptor.factory:
            # 팩토리 함수 사용
            return descriptor.factory()
        
        # 생성자 주입을 통한 인스턴스 생성
        return self._create_with_constructor_injection(descriptor.implementation)

    def _create_with_constructor_injection(self, implementation_type: Type) -> Any:
        """
        생성자 주입을 통한 인스턴스 생성
        
        Args:
            implementation_type: 생성할 구현 클래스 타입
            
        Returns:
            Any: 생성된 인스턴스
        """
        # 생성자 시그니처 분석
        constructor = implementation_type.__init__
        sig = inspect.signature(constructor)
        
        # 의존성 해결
        dependencies = {}
        for param_name, param in sig.parameters.items():
            if param_name == 'self':
                continue
            
            param_type = param.annotation
            if param_type == inspect.Parameter.empty:
                # 타입 힌트가 없는 경우 기본값 사용
                if param.default != inspect.Parameter.empty:
                    dependencies[param_name] = param.default
                else:
                    logger.warning(f"No type hint for parameter {param_name} in {implementation_type.__name__}")
                    continue
            else:
                # 의존성 주입
                if param.default != inspect.Parameter.empty and not self.is_registered(param_type):
                    # 선택적 의존성 - 등록되지 않은 경우 기본값 사용
                    dependencies[param_name] = param.default
                else:
                    # 필수 의존성
                    dependencies[param_name] = self.resolve(param_type)
        
        # 인스턴스 생성
        logger.debug(f"Creating instance: {implementation_type.__name__} with dependencies: {list(dependencies.keys())}")
        return implementation_type(**dependencies)

    def clear_scoped_instances(self) -> None:
        """스코프 인스턴스 클리어"""
        self._scoped_instances.clear()
        logger.debug("Cleared scoped instances")

    def get_registered_services(self) -> Dict[Type, ServiceDescriptor]:
        """등록된 서비스 목록 반환"""
        return self._services.copy()


class DIScope:
    """
    DI 스코프 - 스코프별 인스턴스 관리
    """

    def __init__(self, container: DIContainer):
        self._container = container
        self._scoped_instances: Dict[Type, Any] = {}

    def resolve(self, service_type: Type[T]) -> T:
        """스코프에서 서비스 해결"""
        descriptor = self._container._services.get(service_type)
        if not descriptor:
            raise ValueError(f"Service {service_type.__name__} is not registered")

        if descriptor.lifetime == LifetimeScope.SCOPED:
            # 스코프 인스턴스 관리
            if service_type not in self._scoped_instances:
                self._scoped_instances[service_type] = self._container._create_instance(descriptor)
            return self._scoped_instances[service_type]
        else:
            # 다른 생명주기는 컨테이너에 위임
            return self._container.resolve(service_type)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._scoped_instances.clear()


# 전역 컨테이너 인스턴스
_global_container = DIContainer()


def get_container() -> DIContainer:
    """전역 DI 컨테이너 반환"""
    return _global_container


def configure_container(configurator: Callable[[DIContainer], None]) -> None:
    """
    DI 컨테이너 설정
    
    Args:
        configurator: 컨테이너 설정 함수
    """
    configurator(_global_container)
    logger.info("DI Container configured")