"""
Smart Operations Domain Interfaces

This module exports all interfaces for the smart operations domain,
providing focused contracts for template processing, file operations,
job management, and metadata resolution.
"""

from .smart_operations_interface import (
    TemplateProcessorInterface,
    FileOperationInterface,
    SmartOperationsJobInterface,
    MetadataResolverInterface,
    ConflictResolutionStrategy,
    OperationType,
    FileOperationResult,
    OperationConfig
)

__all__ = [
    # Core interfaces
    'TemplateProcessorInterface',
    'FileOperationInterface', 
    'SmartOperationsJobInterface',
    'MetadataResolverInterface',
    
    # Enums and data classes
    'ConflictResolutionStrategy',
    'OperationType',
    'FileOperationResult',
    'OperationConfig'
]