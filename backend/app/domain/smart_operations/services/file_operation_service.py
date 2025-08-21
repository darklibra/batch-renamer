"""
File Operation Service - Safe and intelligent file copy/move operations

This service handles the actual file system operations with comprehensive
error handling, conflict resolution, and security validation.
"""

import os
import shutil
import asyncio
from pathlib import Path
from typing import Tuple, Optional
import logging

from app.domain.smart_operations.interfaces import (
    FileOperationInterface,
    FileOperationResult,
    OperationType,
    ConflictResolutionStrategy
)

logger = logging.getLogger(__name__)


class FileOperationService(FileOperationInterface):
    """
    Core implementation of file copy/move operations
    
    Provides:
    - Safe file copy and move operations
    - Comprehensive path validation
    - Intelligent conflict resolution
    - Progress tracking and error handling
    """

    def __init__(self, create_backup: bool = True):
        """
        Initialize file operation service
        
        Args:
            create_backup: Whether to create backups for overwrite operations
        """
        self._create_backup = create_backup
        self._max_filename_length = 255
        self._backup_suffix = '_backup'
        
        logger.info("FileOperationService initialized with backup support")

    async def execute_operation(
        self, 
        file_path: str, 
        target_path: str, 
        operation_type: OperationType,
        conflict_strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SKIP
    ) -> FileOperationResult:
        """
        Execute a single file operation with comprehensive error handling
        """
        source_file = Path(file_path)
        target_file = Path(target_path)
        
        # Initialize result object
        result = FileOperationResult(
            file_id=0,  # Will be set by caller
            original_path=file_path,
            target_path=target_path,
            operation=operation_type,
            success=False
        )
        
        try:
            logger.debug(f"Starting {operation_type.value} operation: {file_path} -> {target_path}")
            
            # Validate paths
            is_valid, error_msg = self.validate_operation_paths(file_path, target_path)
            if not is_valid:
                result.error_message = f"Path validation failed: {error_msg}"
                return result
            
            # Check if source file exists
            if not source_file.exists():
                result.error_message = f"Source file does not exist: {file_path}"
                return result
            
            # Create target directory if needed
            target_dir = target_file.parent
            if not target_dir.exists():
                try:
                    target_dir.mkdir(parents=True, exist_ok=True)
                    logger.debug(f"Created target directory: {target_dir}")
                except Exception as e:
                    result.error_message = f"Failed to create target directory: {str(e)}"
                    return result
            
            # Handle conflicts if target exists
            final_target_path = target_path
            conflict_resolution_used = None
            
            if target_file.exists():
                resolved_path, strategy_used = self.handle_conflict(target_path, conflict_strategy)
                final_target_path = resolved_path
                conflict_resolution_used = strategy_used
                
                # If skip strategy, don't perform operation
                if strategy_used == ConflictResolutionStrategy.SKIP:
                    result.error_message = "File skipped due to conflict"
                    result.conflict_resolution_used = strategy_used
                    return result
            
            # Perform the actual operation
            final_target = Path(final_target_path)
            
            if operation_type == OperationType.COPY:
                await self._copy_file_async(source_file, final_target)
            elif operation_type == OperationType.MOVE:
                await self._move_file_async(source_file, final_target)
            else:
                result.error_message = f"Unsupported operation type: {operation_type}"
                return result
            
            # Verify operation success
            if not final_target.exists():
                result.error_message = "Operation completed but target file not found"
                return result
            
            # Success
            result.success = True
            result.target_path = final_target_path
            result.new_filename = final_target.name
            result.conflict_resolution_used = conflict_resolution_used
            
            logger.debug(f"Operation successful: {file_path} -> {final_target_path}")
            return result
            
        except PermissionError as e:
            result.error_message = f"Permission denied: {str(e)}"
            logger.error(f"Permission error in file operation: {str(e)}")
        except OSError as e:
            result.error_message = f"File system error: {str(e)}"
            logger.error(f"OS error in file operation: {str(e)}")
        except Exception as e:
            result.error_message = f"Unexpected error: {str(e)}"
            logger.error(f"Unexpected error in file operation: {str(e)}")
        
        return result

    def validate_operation_paths(self, source_path: str, target_path: str) -> Tuple[bool, Optional[str]]:
        """
        Comprehensive validation of source and target paths
        """
        try:
            source = Path(source_path)
            target = Path(target_path)
            
            # Basic path validation
            if not source_path or not target_path:
                return False, "Source and target paths cannot be empty"
            
            # Check for path traversal attacks
            if '..' in source_path or '..' in target_path:
                return False, "Path traversal detected in file paths"
            
            # Validate source path
            if not source.exists():
                return False, f"Source file does not exist: {source_path}"
            
            if not source.is_file():
                return False, f"Source path is not a file: {source_path}"
            
            # Check source permissions
            if not os.access(source_path, os.R_OK):
                return False, f"No read permission for source file: {source_path}"
            
            # Validate target path
            target_dir = target.parent
            
            # Check if target directory can be created or accessed
            if target_dir.exists():
                if not os.access(str(target_dir), os.W_OK):
                    return False, f"No write permission for target directory: {target_dir}"
            else:
                # Check if we can create the directory
                try:
                    # Try to find the deepest existing parent
                    current = target_dir
                    while current and not current.exists():
                        current = current.parent
                    
                    if current and not os.access(str(current), os.W_OK):
                        return False, f"Cannot create target directory (no write permission): {target_dir}"
                        
                except Exception as e:
                    return False, f"Cannot validate target directory: {str(e)}"
            
            # Check filename length
            if len(target.name) > self._max_filename_length:
                return False, f"Target filename too long (>{self._max_filename_length} chars)"
            
            # Check for invalid characters in target filename
            invalid_chars = set('<>:"|?*')
            if any(char in target.name for char in invalid_chars):
                return False, f"Target filename contains invalid characters"
            
            # Prevent copying file to itself
            if source.resolve() == target.resolve():
                return False, "Cannot copy/move file to itself"
            
            return True, None
            
        except Exception as e:
            logger.error(f"Path validation error: {str(e)}")
            return False, f"Path validation failed: {str(e)}"

    def handle_conflict(
        self, 
        target_path: str, 
        strategy: ConflictResolutionStrategy
    ) -> Tuple[str, ConflictResolutionStrategy]:
        """
        Handle file name conflicts based on the specified strategy
        """
        target = Path(target_path)
        
        if strategy == ConflictResolutionStrategy.SKIP:
            return target_path, ConflictResolutionStrategy.SKIP
        
        elif strategy == ConflictResolutionStrategy.OVERWRITE:
            if self._create_backup:
                self._create_backup_file(target)
            return target_path, ConflictResolutionStrategy.OVERWRITE
        
        elif strategy == ConflictResolutionStrategy.BACKUP:
            backup_path = self._create_backup_file(target)
            logger.info(f"Created backup: {backup_path}")
            return target_path, ConflictResolutionStrategy.BACKUP
        
        elif strategy == ConflictResolutionStrategy.RENAME:
            new_path = self._generate_unique_filename(target)
            return str(new_path), ConflictResolutionStrategy.RENAME
        
        else:
            # Default to rename if strategy is unknown
            new_path = self._generate_unique_filename(target)
            return str(new_path), ConflictResolutionStrategy.RENAME

    async def _copy_file_async(self, source: Path, target: Path) -> None:
        """
        Asynchronously copy file with progress support
        """
        try:
            # For large files, use async approach
            source_size = source.stat().st_size
            
            if source_size > 50 * 1024 * 1024:  # 50MB threshold
                await self._copy_large_file_async(source, target)
            else:
                # Use standard library for smaller files
                await asyncio.get_event_loop().run_in_executor(
                    None, 
                    lambda: shutil.copy2(str(source), str(target))
                )
                
            logger.debug(f"File copied successfully: {source} -> {target}")
            
        except Exception as e:
            logger.error(f"File copy failed: {source} -> {target}, error: {str(e)}")
            raise

    async def _move_file_async(self, source: Path, target: Path) -> None:
        """
        Asynchronously move file
        """
        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: shutil.move(str(source), str(target))
            )
            
            logger.debug(f"File moved successfully: {source} -> {target}")
            
        except Exception as e:
            logger.error(f"File move failed: {source} -> {target}, error: {str(e)}")
            raise

    async def _copy_large_file_async(self, source: Path, target: Path, chunk_size: int = 64 * 1024) -> None:
        """
        Copy large files asynchronously with chunked reading
        """
        try:
            with open(source, 'rb') as src, open(target, 'wb') as dst:
                while True:
                    chunk = src.read(chunk_size)
                    if not chunk:
                        break
                    dst.write(chunk)
                    
                    # Yield control periodically
                    await asyncio.sleep(0)
                    
            # Copy metadata
            shutil.copystat(str(source), str(target))
            
        except Exception as e:
            # Clean up partial file if copy failed
            if target.exists():
                try:
                    target.unlink()
                except Exception:
                    pass
            raise e

    def _create_backup_file(self, target: Path) -> str:
        """
        Create backup of existing target file
        """
        try:
            backup_path = self._generate_backup_filename(target)
            shutil.copy2(str(target), str(backup_path))
            logger.info(f"Backup created: {backup_path}")
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"Failed to create backup for {target}: {str(e)}")
            raise

    def _generate_unique_filename(self, target: Path) -> Path:
        """
        Generate unique filename by appending counter
        """
        base_name = target.stem
        suffix = target.suffix
        parent = target.parent
        
        counter = 1
        while True:
            new_name = f"{base_name}_{counter}{suffix}"
            new_path = parent / new_name
            
            if not new_path.exists():
                return new_path
                
            counter += 1
            
            # Prevent infinite loop
            if counter > 1000:
                # Use timestamp as fallback
                import time
                timestamp = str(int(time.time()))
                return parent / f"{base_name}_{timestamp}{suffix}"

    def _generate_backup_filename(self, target: Path) -> Path:
        """
        Generate backup filename
        """
        base_name = target.stem
        suffix = target.suffix
        parent = target.parent
        
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        backup_name = f"{base_name}{self._backup_suffix}_{timestamp}{suffix}"
        return parent / backup_name