"""
File Indexer Interface - Defines contracts for file indexing operations

This interface separates file indexing concerns from implementation details,
enabling dependency inversion and testability.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Generator, Optional, Any, AsyncGenerator
from pathlib import Path
from datetime import datetime

from app.models.file_models import IndexedFile


class FileIndexerInterface(ABC):
    """
    Abstract interface for file indexing operations
    
    Defines the contract for scanning directories and indexing files
    with support for filtering, exclusion patterns, and progress tracking.
    """

    @abstractmethod
    async def scan_directory(
        self, 
        directory_path: str, 
        scan_config: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[IndexedFile, None]:
        """
        Scan a directory and yield indexed files
        
        Args:
            directory_path: Path to directory to scan
            scan_config: Optional configuration for scanning behavior
            
        Yields:
            IndexedFile: Each discovered and indexed file
            
        Raises:
            SecurityError: If path validation fails
            PermissionError: If directory access is denied
        """
        pass

    @abstractmethod
    async def validate_scan_path(self, directory_path: str) -> Dict[str, Any]:
        """
        Validate if a directory path is safe for scanning
        
        Args:
            directory_path: Path to validate
            
        Returns:
            Dict containing validation result with keys:
            - is_valid: bool
            - message: str
            - security_score: float
        """
        pass

    @abstractmethod
    async def get_exclusion_patterns(self) -> List[str]:
        """
        Get current exclusion patterns for file scanning
        
        Returns:
            List of pattern strings (glob or regex format)
        """
        pass

    @abstractmethod
    def should_exclude_file(self, file_path: Path, exclusion_patterns: List[str]) -> bool:
        """
        Check if a file should be excluded from indexing
        
        Args:
            file_path: Path to check
            exclusion_patterns: List of exclusion patterns
            
        Returns:
            True if file should be excluded, False otherwise
        """
        pass


class FileIndexingJobInterface(ABC):
    """
    Abstract interface for file indexing job management
    
    Handles the lifecycle of indexing operations with progress tracking,
    cancellation support, and result reporting.
    """

    @abstractmethod
    async def start_indexing_job(
        self, 
        directory_path: str, 
        scan_config: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Start a new file indexing job
        
        Args:
            directory_path: Directory to index
            scan_config: Optional scanning configuration
            
        Returns:
            Job ID for tracking the operation
            
        Raises:
            SecurityError: If path validation fails
            ValueError: If configuration is invalid
        """
        pass

    @abstractmethod
    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get current status of an indexing job
        
        Args:
            job_id: ID of the job to check
            
        Returns:
            Dict containing job status information
        """
        pass

    @abstractmethod
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running indexing job
        
        Args:
            job_id: ID of the job to cancel
            
        Returns:
            True if cancellation was successful, False otherwise
        """
        pass

    @abstractmethod
    async def get_job_results(self, job_id: str) -> Dict[str, Any]:
        """
        Get results from a completed indexing job
        
        Args:
            job_id: ID of the completed job
            
        Returns:
            Dict containing job results and statistics
        """
        pass


class FileValidatorInterface(ABC):
    """
    Abstract interface for file validation operations
    
    Handles file system security validation, path sanitization,
    and file access permission checks.
    """

    @abstractmethod
    def validate_file_path(self, file_path: str) -> Dict[str, Any]:
        """
        Validate if a file path is safe for processing
        
        Args:
            file_path: Path to validate
            
        Returns:
            Dict with validation results including security assessment
        """
        pass

    @abstractmethod
    def sanitize_filename(self, filename: str) -> str:
        """
        Sanitize a filename to ensure it's safe for file system operations
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename safe for use
        """
        pass

    @abstractmethod
    def check_file_permissions(self, file_path: str) -> Dict[str, bool]:
        """
        Check file system permissions for a given path
        
        Args:
            file_path: Path to check
            
        Returns:
            Dict with permission flags (read, write, execute)
        """
        pass