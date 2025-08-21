"""
File Indexing Core Service - Pure file indexing logic

This service contains the core business logic for file indexing operations,
separated from infrastructure concerns and external dependencies.
"""

import os
import fnmatch
import re
from typing import List, Dict, Generator, Optional, Any, AsyncGenerator
from pathlib import Path
from datetime import datetime
import asyncio
import logging

from app.domain.file.interfaces import FileIndexerInterface, FileValidatorInterface
from app.models.file_models import IndexedFile

logger = logging.getLogger(__name__)


class FileIndexingCore(FileIndexerInterface):
    """
    Core implementation of file indexing operations
    
    Focuses on the pure business logic of directory scanning and file discovery,
    delegating validation and security concerns to injected dependencies.
    """

    def __init__(self, file_validator: FileValidatorInterface):
        """
        Initialize the file indexing core service
        
        Args:
            file_validator: Validator for security and path validation
        """
        self._validator = file_validator
        self._default_exclusion_patterns = [
            # System files
            ".*",  # Hidden files
            "Thumbs.db",
            "Desktop.ini",
            "__pycache__",
            "*.pyc",
            "*.pyo",
            "*.pyd",
            
            # Development files
            "node_modules",
            ".git",
            ".svn",
            ".hg",
            ".vscode",
            ".idea",
            "dist",
            "build",
            
            # Archive files
            "*.tmp",
            "*.temp",
            "*.log",
            "*.bak",
            "*.swp",
            "~*",
            
            # Large media directories
            "*.iso",
            "*.dmg",
            "*.img"
        ]
        
        logger.info("FileIndexingCore initialized with default exclusion patterns")

    async def scan_directory(
        self, 
        directory_path: str, 
        scan_config: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[IndexedFile, None]:
        """
        Scan directory and yield indexed files
        
        Implements the core scanning logic with support for:
        - Recursive directory traversal
        - Exclusion pattern filtering
        - File metadata extraction
        - Async yielding for large directories
        """
        scan_config = scan_config or {}
        
        # Validate the scan path first
        validation_result = await self.validate_scan_path(directory_path)
        if not validation_result['is_valid']:
            raise PermissionError(f"Invalid scan path: {validation_result['message']}")
        
        # Get exclusion patterns
        exclusion_patterns = await self.get_exclusion_patterns()
        user_exclusions = scan_config.get('exclusion_patterns', [])
        all_exclusions = exclusion_patterns + user_exclusions
        
        # Configure scanning behavior
        recursive = scan_config.get('recursive', True)
        max_depth = scan_config.get('max_depth', 10)
        file_extensions = scan_config.get('file_extensions', None)  # None means all extensions
        
        logger.info(f"Starting directory scan: {directory_path}")
        logger.info(f"Config - Recursive: {recursive}, Max depth: {max_depth}")
        logger.info(f"Exclusion patterns: {len(all_exclusions)} patterns loaded")
        
        # Start the scanning process
        scan_count = 0
        async for indexed_file in self._scan_directory_recursive(
            Path(directory_path), 
            all_exclusions, 
            recursive, 
            max_depth,
            file_extensions,
            current_depth=0
        ):
            scan_count += 1
            
            # Yield periodically to prevent blocking
            if scan_count % 50 == 0:
                await asyncio.sleep(0.001)  # Brief yield
                
            yield indexed_file
        
        logger.info(f"Directory scan completed. Found {scan_count} files")

    async def validate_scan_path(self, directory_path: str) -> Dict[str, Any]:
        """
        Validate scan path using injected validator
        """
        try:
            path_obj = Path(directory_path)
            
            # Check if path exists
            if not path_obj.exists():
                return {
                    'is_valid': False,
                    'message': f"Directory does not exist: {directory_path}",
                    'security_score': 0.0
                }
            
            # Check if it's a directory
            if not path_obj.is_dir():
                return {
                    'is_valid': False,
                    'message': f"Path is not a directory: {directory_path}",
                    'security_score': 0.0
                }
            
            # Use validator for security checks
            validation_result = self._validator.validate_file_path(directory_path)
            
            return {
                'is_valid': validation_result.get('is_secure', False),
                'message': validation_result.get('message', 'Unknown validation error'),
                'security_score': validation_result.get('security_score', 0.0)
            }
            
        except Exception as e:
            logger.error(f"Path validation error: {str(e)}")
            return {
                'is_valid': False,
                'message': f"Validation error: {str(e)}",
                'security_score': 0.0
            }

    async def get_exclusion_patterns(self) -> List[str]:
        """
        Get current exclusion patterns
        
        Combines default patterns with any configured patterns
        """
        # For now, return default patterns
        # In future versions, this could load from database or config
        return self._default_exclusion_patterns.copy()

    def should_exclude_file(self, file_path: Path, exclusion_patterns: List[str]) -> bool:
        """
        Check if file should be excluded based on patterns
        """
        file_str = str(file_path)
        filename = file_path.name
        
        for pattern in exclusion_patterns:
            try:
                # Handle glob patterns
                if '*' in pattern or '?' in pattern:
                    if fnmatch.fnmatch(filename, pattern) or fnmatch.fnmatch(file_str, pattern):
                        return True
                
                # Handle exact matches
                elif pattern == filename or pattern in file_str:
                    return True
                
                # Handle regex patterns (if they start with ^)
                elif pattern.startswith('^'):
                    if re.match(pattern, filename) or re.match(pattern, file_str):
                        return True
                        
            except re.error:
                # If regex is invalid, treat as literal string
                if pattern in file_str:
                    return True
                    
        return False

    async def _scan_directory_recursive(
        self,
        directory: Path,
        exclusion_patterns: List[str],
        recursive: bool,
        max_depth: int,
        file_extensions: Optional[List[str]],
        current_depth: int = 0
    ) -> AsyncGenerator[IndexedFile, None]:
        """
        Recursive directory scanning with depth control
        """
        if current_depth > max_depth:
            return
            
        try:
            # Get directory contents
            entries = list(directory.iterdir())
            
            for entry in entries:
                # Check if we should exclude this entry
                if self.should_exclude_file(entry, exclusion_patterns):
                    continue
                
                if entry.is_file():
                    # Check file extension filter
                    if file_extensions:
                        file_ext = entry.suffix.lower()
                        if file_ext not in [ext.lower() for ext in file_extensions]:
                            continue
                    
                    # Create IndexedFile object
                    try:
                        indexed_file = await self._create_indexed_file(entry)
                        yield indexed_file
                        
                    except Exception as e:
                        logger.warning(f"Failed to index file {entry}: {str(e)}")
                        continue
                
                elif entry.is_dir() and recursive:
                    # Recursively scan subdirectory
                    async for sub_file in self._scan_directory_recursive(
                        entry, 
                        exclusion_patterns, 
                        recursive, 
                        max_depth, 
                        file_extensions,
                        current_depth + 1
                    ):
                        yield sub_file
                        
        except PermissionError:
            logger.warning(f"Permission denied accessing directory: {directory}")
        except Exception as e:
            logger.error(f"Error scanning directory {directory}: {str(e)}")

    async def _create_indexed_file(self, file_path: Path) -> IndexedFile:
        """
        Create an IndexedFile object from a file path
        """
        try:
            stat_info = file_path.stat()
            
            # Extract basic file information
            filename = file_path.stem
            extension = file_path.suffix
            path = str(file_path.parent)
            full_path = str(file_path.absolute())
            
            # Create the indexed file object
            indexed_file = IndexedFile(
                filename=filename,
                extension=extension,
                path=path,
                full_path=full_path,
                file_size=stat_info.st_size,
                created_at=datetime.fromtimestamp(stat_info.st_ctime),
                updated_at=datetime.fromtimestamp(stat_info.st_mtime)
            )
            
            return indexed_file
            
        except Exception as e:
            logger.error(f"Failed to create indexed file for {file_path}: {str(e)}")
            raise