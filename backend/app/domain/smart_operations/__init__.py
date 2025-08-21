"""
Smart Operations Domain - Intelligent file operations system

This domain handles pattern-based file copy/move operations with:
- Template-based filename generation
- Intelligent metadata resolution
- Comprehensive conflict resolution
- Progress tracking and job management

Architecture follows SOLID principles with:
- Clear interface contracts for extensibility
- Dependency injection for testability
- Single responsibility per service
- Strategy pattern for conflict resolution
"""

from .interfaces import (
    TemplateProcessorInterface,
    FileOperationInterface,
    SmartOperationsJobInterface,
    MetadataResolverInterface,
    ConflictResolutionStrategy,
    OperationType,
    FileOperationResult,
    OperationConfig
)

from .services import (
    TemplateProcessorService,
    FileOperationService,
    MetadataResolverService
)

__all__ = [
    # Interfaces
    'TemplateProcessorInterface',
    'FileOperationInterface', 
    'SmartOperationsJobInterface',
    'MetadataResolverInterface',
    
    # Enums and Data Classes
    'ConflictResolutionStrategy',
    'OperationType',
    'FileOperationResult',
    'OperationConfig',
    
    # Services
    'TemplateProcessorService',
    'FileOperationService',
    'MetadataResolverService'
]