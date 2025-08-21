"""
Smart Operations Interfaces - Contracts for intelligent file operations

This interface defines contracts for pattern-based file copy/move operations
with template processing, conflict resolution, and progress tracking.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any, AsyncGenerator
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

from app.models.file_models import IndexedFile


class ConflictResolutionStrategy(Enum):
    """Strategies for handling file name conflicts"""
    SKIP = "skip"
    OVERWRITE = "overwrite" 
    RENAME = "rename"
    BACKUP = "backup"


class OperationType(Enum):
    """Types of file operations"""
    COPY = "copy"
    MOVE = "move"


@dataclass
class FileOperationResult:
    """Result of a single file operation"""
    file_id: int
    original_path: str
    target_path: str
    operation: OperationType
    success: bool
    new_filename: Optional[str] = None
    error_message: Optional[str] = None
    conflict_resolution_used: Optional[ConflictResolutionStrategy] = None


@dataclass 
class OperationConfig:
    """Configuration for smart file operations"""
    template: str
    target_directory: str
    operation_type: OperationType
    conflict_strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SKIP
    pattern_id: Optional[int] = None
    create_directories: bool = True
    preserve_extensions: bool = True
    backup_original: bool = False


class TemplateProcessorInterface(ABC):
    """Interface for filename template processing"""

    @abstractmethod
    def validate_template(self, template: str, sample_metadata: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Validate template against sample metadata
        
        Args:
            template: Template string with {field} placeholders
            sample_metadata: Sample metadata for validation
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        pass

    @abstractmethod
    def process_template(self, template: str, metadata: Dict[str, Any], fallback_data: Dict[str, Any] = None) -> str:
        """
        Process template with metadata to generate filename
        
        Args:
            template: Template string
            metadata: File metadata
            fallback_data: Fallback data for missing fields
            
        Returns:
            Generated filename
        """
        pass

    @abstractmethod
    def get_template_fields(self, template: str) -> List[str]:
        """
        Extract field names from template
        
        Args:
            template: Template string
            
        Returns:
            List of field names found in template
        """
        pass

    @abstractmethod
    def preview_template_results(self, template: str, files: List[IndexedFile]) -> List[Dict[str, Any]]:
        """
        Preview template processing results for multiple files
        
        Args:
            template: Template string
            files: List of files to preview
            
        Returns:
            List of preview results with generated filenames
        """
        pass


class FileOperationInterface(ABC):
    """Interface for file copy/move operations"""

    @abstractmethod
    async def execute_operation(
        self, 
        file_path: str, 
        target_path: str, 
        operation_type: OperationType,
        conflict_strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SKIP
    ) -> FileOperationResult:
        """
        Execute a single file operation
        
        Args:
            file_path: Source file path
            target_path: Target file path  
            operation_type: Copy or move operation
            conflict_strategy: How to handle conflicts
            
        Returns:
            Result of the operation
        """
        pass

    @abstractmethod
    def validate_operation_paths(self, source_path: str, target_path: str) -> Tuple[bool, Optional[str]]:
        """
        Validate source and target paths for operations
        
        Args:
            source_path: Source file path
            target_path: Target file path
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        pass

    @abstractmethod
    def handle_conflict(
        self, 
        target_path: str, 
        strategy: ConflictResolutionStrategy
    ) -> Tuple[str, ConflictResolutionStrategy]:
        """
        Handle file name conflicts based on strategy
        
        Args:
            target_path: Conflicting target path
            strategy: Resolution strategy to use
            
        Returns:
            Tuple of (resolved_path, strategy_used)
        """
        pass


class SmartOperationsJobInterface(ABC):
    """Interface for smart operations job management"""

    @abstractmethod
    async def start_smart_operation_job(
        self, 
        file_ids: List[int], 
        config: OperationConfig
    ) -> str:
        """
        Start a smart file operation job
        
        Args:
            file_ids: List of file IDs to process
            config: Operation configuration
            
        Returns:
            Job ID for tracking
        """
        pass

    @abstractmethod
    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get status of a smart operation job
        
        Args:
            job_id: ID of job to check
            
        Returns:
            Dict with job status and progress information
        """
        pass

    @abstractmethod
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running smart operation job
        
        Args:
            job_id: ID of job to cancel
            
        Returns:
            True if cancellation successful
        """
        pass

    @abstractmethod
    async def get_job_results(self, job_id: str) -> Dict[str, Any]:
        """
        Get results from a completed job
        
        Args:
            job_id: ID of completed job
            
        Returns:
            Dict with comprehensive job results
        """
        pass

    @abstractmethod
    async def get_operation_progress(self, job_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream progress updates for an active job
        
        Args:
            job_id: ID of job to monitor
            
        Yields:
            Progress update dictionaries
        """
        pass


class MetadataResolverInterface(ABC):
    """Interface for resolving file metadata for operations"""

    @abstractmethod
    async def resolve_file_metadata(
        self, 
        file: IndexedFile, 
        pattern_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Resolve metadata for a file using fallback strategies
        
        Args:
            file: File to resolve metadata for
            pattern_id: Optional specific pattern to use
            
        Returns:
            Resolved metadata dictionary
        """
        pass

    @abstractmethod
    async def batch_resolve_metadata(
        self, 
        files: List[IndexedFile], 
        pattern_id: Optional[int] = None
    ) -> Dict[int, Dict[str, Any]]:
        """
        Resolve metadata for multiple files efficiently
        
        Args:
            files: List of files to resolve
            pattern_id: Optional specific pattern to use
            
        Returns:
            Dict mapping file IDs to resolved metadata
        """
        pass

    @abstractmethod
    def get_fallback_metadata(self, file: IndexedFile) -> Dict[str, Any]:
        """
        Generate fallback metadata when extraction fails
        
        Args:
            file: File to generate fallback for
            
        Returns:
            Fallback metadata dictionary
        """
        pass