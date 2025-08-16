import os
import shutil
import uuid
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from pathlib import Path
import logging
from dataclasses import dataclass

from app.models.file_models import IndexedFile, PatternExtractionJob
from app.repositories.file_repository import FileRepository
from app.repositories.pattern_repository import PatternExtractionJobRepository
from app.core.path_validator import get_path_validator

logger = logging.getLogger(__name__)


@dataclass
class FileOperationResult:
    """Result of a single file operation"""
    file_id: int
    original_path: str
    target_path: str
    operation: str  # 'copy' or 'move'
    success: bool
    error_message: Optional[str] = None
    new_filename: Optional[str] = None


@dataclass
class SmartFileOperationJob:
    """Smart file operation job status"""
    job_id: str
    operation_type: str  # 'smart_copy' or 'smart_move'
    status: str  # 'started', 'processing', 'completed', 'failed'
    total_files: int
    processed_files: int
    successful_operations: int
    failed_operations: int
    template: str
    target_directory: str
    results: List[FileOperationResult]
    error_message: Optional[str] = None
    started_at: datetime = None
    completed_at: Optional[datetime] = None


class SmartFileService:
    """
    Service for intelligent file copying and moving based on extracted metadata
    """

    def __init__(
        self,
        file_repository: FileRepository,
        job_repository: PatternExtractionJobRepository
    ):
        self.file_repo = file_repository
        self.job_repo = job_repository
        self.path_validator = get_path_validator()
        
        # In-memory job tracking (in production, use Redis or database)
        self._active_jobs: Dict[str, SmartFileOperationJob] = {}
        
        logger.info("SmartFileService initialized")

    def validate_filename_template(self, template: str, sample_metadata: Dict) -> Tuple[bool, Optional[str]]:
        """
        Validate filename template against sample metadata
        
        Args:
            template: Template string with {field} placeholders
            sample_metadata: Sample metadata to test against
            
        Returns:
            (is_valid, error_message)
        """
        try:
            import re
            
            # Find all placeholders in template
            placeholders = re.findall(r'\{([^}]+)\}', template)
            
            if not placeholders:
                return False, "Template must contain at least one field placeholder like {field}"
            
            # Check if placeholders exist in sample metadata
            missing_fields = []
            for field in placeholders:
                if field not in sample_metadata:
                    missing_fields.append(field)
            
            if missing_fields:
                return False, f"Fields not found in metadata: {', '.join(missing_fields)}"
            
            # Test template rendering with sample data
            try:
                test_filename = template.format(**sample_metadata)
                
                # Validate resulting filename
                if not self._is_valid_filename(test_filename):
                    return False, f"Template produces invalid filename: {test_filename}"
                    
            except KeyError as e:
                return False, f"Template field error: {str(e)}"
            except Exception as e:
                return False, f"Template formatting error: {str(e)}"
            
            return True, None
            
        except Exception as e:
            return False, f"Template validation error: {str(e)}"

    def preview_file_rename(self, file_ids: List[int], template: str) -> Dict[str, Any]:
        """
        Generate preview of how files will be renamed using the template
        
        Args:
            file_ids: List of file IDs to preview
            template: Filename template
            
        Returns:
            Dictionary with preview results
        """
        try:
            previews = []
            errors = []
            
            for file_id in file_ids:
                file_obj = self.file_repo.get_file_by_id(file_id)
                if not file_obj:
                    errors.append(f"File {file_id} not found")
                    continue
                
                if not file_obj.extracted_data:
                    errors.append(f"File {file_obj.filename} has no extracted metadata")
                    continue
                
                try:
                    # Add special fields to extracted data
                    template_data = file_obj.extracted_data.copy()
                    template_data.update({
                        'original_filename': file_obj.filename,
                        'extension': file_obj.extension,
                        'basename': Path(file_obj.filename).stem
                    })
                    
                    # Generate new filename
                    new_filename = template.format(**template_data)
                    
                    # Validate filename
                    if not self._is_valid_filename(new_filename):
                        errors.append(f"Invalid filename generated for {file_obj.filename}: {new_filename}")
                        continue
                    
                    previews.append({
                        'file_id': file_id,
                        'original_filename': file_obj.filename,
                        'new_filename': new_filename,
                        'original_path': file_obj.full_path,
                        'extracted_data': file_obj.extracted_data
                    })
                    
                except KeyError as e:
                    errors.append(f"Template field '{e}' not found in metadata for {file_obj.filename}")
                except Exception as e:
                    errors.append(f"Error processing {file_obj.filename}: {str(e)}")
            
            return {
                'previews': previews,
                'errors': errors,
                'total_files': len(file_ids),
                'preview_count': len(previews),
                'error_count': len(errors)
            }
            
        except Exception as e:
            logger.error(f"Preview generation failed: {str(e)}")
            return {
                'previews': [],
                'errors': [f"Preview generation failed: {str(e)}"],
                'total_files': len(file_ids),
                'preview_count': 0,
                'error_count': 1
            }

    def preview_file_rename_with_pattern(
        self, 
        file_ids: List[int], 
        template: str, 
        pattern_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate preview of how files will be renamed using the template with optional pattern selection
        
        Args:
            file_ids: List of file IDs to preview
            template: Filename template
            pattern_id: Optional pattern ID to apply before preview
            
        Returns:
            Dictionary with preview results including pattern application results
        """
        try:
            previews = []
            errors = []
            pattern_results = None
            
            # If pattern_id is provided, apply the pattern first
            if pattern_id is not None:
                from app.repositories.pattern_repository import PatternRepository
                from app.services.pattern_extraction_service import PatternExtractionService
                
                pattern_repo = PatternRepository(self.file_repo.db)
                pattern = pattern_repo.get_pattern_by_id(pattern_id)
                
                if not pattern:
                    return {
                        'previews': [],
                        'errors': [f"Pattern with ID {pattern_id} not found"],
                        'total_files': len(file_ids),
                        'preview_count': 0,
                        'error_count': 1,
                        'pattern_applied': False
                    }
                
                # Initialize pattern extraction service  
                from app.repositories.pattern_repository import PatternApplicationRepository, PatternFailureRepository
                pattern_service = PatternExtractionService(
                    self.file_repo,
                    pattern_repo,
                    PatternApplicationRepository(self.file_repo.db),
                    PatternFailureRepository(self.file_repo.db),
                    self.job_repo
                )
                
                pattern_results = {
                    'pattern_id': pattern_id,
                    'pattern_name': pattern.name,
                    'applications': []
                }
            
            for file_id in file_ids:
                file_obj = self.file_repo.get_file_by_id(file_id)
                if not file_obj:
                    errors.append(f"File {file_id} not found")
                    continue
                
                # Determine metadata to use
                extracted_data = None
                
                if pattern_id is not None:
                    # Apply the specific pattern
                    try:
                        extracted_data = pattern_service.apply_pattern_to_file(file_obj, pattern)
                        pattern_results['applications'].append({
                            'file_id': file_id,
                            'filename': file_obj.filename,
                            'success': True,
                            'extracted_data': extracted_data
                        })
                    except Exception as e:
                        pattern_results['applications'].append({
                            'file_id': file_id,
                            'filename': file_obj.filename,
                            'success': False,
                            'error': str(e)
                        })
                        errors.append(f"Failed to apply pattern to {file_obj.filename}: {str(e)}")
                        continue
                else:
                    # Use existing extracted data
                    if not file_obj.extracted_data:
                        errors.append(f"File {file_obj.filename} has no extracted metadata")
                        continue
                    extracted_data = file_obj.extracted_data
                
                try:
                    # Add special fields to extracted data
                    template_data = extracted_data.copy()
                    template_data.update({
                        'original_filename': file_obj.filename,
                        'extension': file_obj.extension,
                        'basename': Path(file_obj.filename).stem
                    })
                    
                    # Generate new filename
                    new_filename = template.format(**template_data)
                    
                    # Validate filename
                    if not self._is_valid_filename(new_filename):
                        errors.append(f"Invalid filename generated for {file_obj.filename}: {new_filename}")
                        continue
                    
                    previews.append({
                        'file_id': file_id,
                        'original_filename': file_obj.filename,
                        'new_filename': new_filename,
                        'original_path': file_obj.full_path,
                        'extracted_data': extracted_data,
                        'pattern_applied': pattern_id is not None
                    })
                    
                except KeyError as e:
                    errors.append(f"Template field '{e}' not found in metadata for {file_obj.filename}")
                except Exception as e:
                    errors.append(f"Error processing {file_obj.filename}: {str(e)}")
            
            result = {
                'previews': previews,
                'errors': errors,
                'total_files': len(file_ids),
                'preview_count': len(previews),
                'error_count': len(errors),
                'pattern_applied': pattern_id is not None
            }
            
            if pattern_results:
                result['pattern_results'] = pattern_results
                
            return result
            
        except Exception as e:
            logger.error(f"Enhanced preview generation failed: {str(e)}")
            return {
                'previews': [],
                'errors': [f"Preview generation failed: {str(e)}"],
                'total_files': len(file_ids),
                'preview_count': 0,
                'error_count': 1,
                'pattern_applied': False
            }

    async def start_smart_copy_job(
        self,
        file_ids: List[int],
        target_directory: str,
        template: str,
        conflict_resolution: str = "skip",  # skip, overwrite, rename
        create_backup: bool = False,
        pattern_id: Optional[int] = None
    ) -> str:
        """
        Start smart file copy job
        
        Args:
            file_ids: Files to copy
            target_directory: Destination directory
            template: Filename template
            conflict_resolution: How to handle conflicts
            create_backup: Whether to backup existing files
            
        Returns:
            Job ID
        """
        return await self._start_smart_operation_job(
            file_ids=file_ids,
            target_directory=target_directory,
            template=template,
            operation_type="smart_copy",
            conflict_resolution=conflict_resolution,
            create_backup=create_backup,
            pattern_id=pattern_id
        )

    async def start_smart_move_job(
        self,
        file_ids: List[int],
        target_directory: str,
        template: str,
        conflict_resolution: str = "skip",
        create_backup: bool = False,
        pattern_id: Optional[int] = None
    ) -> str:
        """
        Start smart file move job
        """
        return await self._start_smart_operation_job(
            file_ids=file_ids,
            target_directory=target_directory,
            template=template,
            operation_type="smart_move",
            conflict_resolution=conflict_resolution,
            create_backup=create_backup,
            pattern_id=pattern_id
        )

    async def _start_smart_operation_job(
        self,
        file_ids: List[int],
        target_directory: str,
        template: str,
        operation_type: str,
        conflict_resolution: str,
        create_backup: bool,
        pattern_id: Optional[int] = None
    ) -> str:
        """Internal method to start smart operation job"""
        
        # Validate target directory
        if not self.path_validator.validate_directory_path(target_directory):
            raise ValueError(f"Invalid or inaccessible target directory: {target_directory}")
        
        # Create target directory if it doesn't exist
        os.makedirs(target_directory, exist_ok=True)
        
        # Generate job ID and create job object
        job_id = str(uuid.uuid4())
        job = SmartFileOperationJob(
            job_id=job_id,
            operation_type=operation_type,
            status="started",
            total_files=len(file_ids),
            processed_files=0,
            successful_operations=0,
            failed_operations=0,
            template=template,
            target_directory=target_directory,
            results=[],
            started_at=datetime.now()
        )
        
        self._active_jobs[job_id] = job
        
        # Start background processing
        asyncio.create_task(self._process_smart_operation_job(
            job_id, file_ids, conflict_resolution, create_backup, pattern_id
        ))
        
        return job_id

    async def _process_smart_operation_job(
        self,
        job_id: str,
        file_ids: List[int],
        conflict_resolution: str,
        create_backup: bool,
        pattern_id: Optional[int] = None
    ):
        """Process smart operation job in background"""
        job = self._active_jobs.get(job_id)
        if not job:
            return
        
        try:
            job.status = "processing"
            
            for file_id in file_ids:
                try:
                    # Get file object
                    file_obj = self.file_repo.get_file_by_id(file_id)
                    if not file_obj:
                        result = FileOperationResult(
                            file_id=file_id,
                            original_path="",
                            target_path="",
                            operation=job.operation_type,
                            success=False,
                            error_message=f"File {file_id} not found"
                        )
                        job.results.append(result)
                        job.failed_operations += 1
                        continue
                    
                    # Process single file
                    result = await self._process_single_file(
                        file_obj, job.template, job.target_directory,
                        job.operation_type, conflict_resolution, create_backup, pattern_id
                    )
                    
                    job.results.append(result)
                    if result.success:
                        job.successful_operations += 1
                    else:
                        job.failed_operations += 1
                    
                    job.processed_files += 1
                    
                    # Small delay to prevent overwhelming the system
                    await asyncio.sleep(0.01)
                    
                except Exception as e:
                    logger.error(f"Error processing file {file_id}: {str(e)}")
                    result = FileOperationResult(
                        file_id=file_id,
                        original_path=file_obj.full_path if 'file_obj' in locals() else "",
                        target_path="",
                        operation=job.operation_type,
                        success=False,
                        error_message=str(e)
                    )
                    job.results.append(result)
                    job.failed_operations += 1
                    job.processed_files += 1
            
            job.status = "completed"
            job.completed_at = datetime.now()
            
        except Exception as e:
            logger.error(f"Job {job_id} failed: {str(e)}")
            job.status = "failed"
            job.error_message = str(e)
            job.completed_at = datetime.now()

    def _resolve_file_metadata(self, file_obj: IndexedFile, pattern_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Smart metadata resolution with fallback strategies
        
        Priority order:
        1. Use existing extracted_data
        2. Apply specific pattern if provided
        3. Auto-find best matching pattern
        4. Provide minimal fallback metadata
        """
        # Priority 1: Use existing extracted data
        if file_obj.extracted_data:
            logger.debug(f"Using existing metadata for file {file_obj.id}: {file_obj.filename}")
            return file_obj.extracted_data
        
        # Priority 2: Apply specific pattern if provided
        if pattern_id is not None:
            try:
                from app.repositories.pattern_repository import PatternRepository
                from app.services.pattern_extraction_service import PatternExtractionService
                
                # Initialize pattern service components
                pattern_repo = PatternRepository(self.file_repo.db)
                pattern = pattern_repo.get_pattern_by_id(pattern_id)
                
                if pattern:
                    from app.repositories.pattern_repository import PatternApplicationRepository, PatternFailureRepository
                    pattern_service = PatternExtractionService(
                        self.file_repo,
                        pattern_repo,
                        PatternApplicationRepository(self.file_repo.db),
                        PatternFailureRepository(self.file_repo.db),
                        self.job_repo
                    )
                    
                    # Apply the specific pattern
                    extracted_data = pattern_service.apply_pattern_to_file(file_obj, pattern)
                    if extracted_data:
                        logger.info(f"Applied pattern {pattern_id} to file {file_obj.id}: {file_obj.filename}")
                        return extracted_data
                    else:
                        logger.warning(f"Pattern {pattern_id} failed to extract data from file {file_obj.id}: {file_obj.filename}")
                else:
                    logger.warning(f"Pattern {pattern_id} not found")
                    
            except Exception as e:
                logger.error(f"Error applying pattern {pattern_id} to file {file_obj.id}: {str(e)}")
        
        # Priority 3: Auto-find best matching pattern (simplified approach)
        try:
            from app.repositories.pattern_repository import PatternRepository
            from app.services.pattern_extraction_service import PatternExtractionService
            
            pattern_repo = PatternRepository(self.file_repo.db)
            active_patterns = pattern_repo.get_active_patterns()
            
            if active_patterns:
                from app.repositories.pattern_repository import PatternApplicationRepository, PatternFailureRepository
                pattern_service = PatternExtractionService(
                    self.file_repo,
                    pattern_repo,
                    PatternApplicationRepository(self.file_repo.db),
                    PatternFailureRepository(self.file_repo.db),
                    self.job_repo
                )
                
                # Try patterns in priority order
                for pattern in sorted(active_patterns, key=lambda p: p.priority, reverse=True):
                    try:
                        extracted_data = pattern_service.apply_pattern_to_file(file_obj, pattern)
                        if extracted_data and len(extracted_data) > 0:
                            logger.info(f"Auto-applied pattern {pattern.id} ({pattern.name}) to file {file_obj.id}: {file_obj.filename}")
                            return extracted_data
                    except Exception as e:
                        logger.debug(f"Pattern {pattern.id} failed for file {file_obj.id}: {str(e)}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error in auto-pattern matching for file {file_obj.id}: {str(e)}")
        
        # Priority 4: Provide minimal fallback metadata
        logger.info(f"Using fallback metadata for file {file_obj.id}: {file_obj.filename}")
        fallback_metadata = {
            'name': Path(file_obj.filename).stem,
            'filename': file_obj.filename,
            'basename': Path(file_obj.filename).stem,
            'extension': file_obj.extension or '',
            'original_filename': file_obj.filename,
            # Add some basic extracted fields that might be commonly used
            'title': Path(file_obj.filename).stem,
            'original': file_obj.filename
        }
        
        return fallback_metadata

    async def _process_single_file(
        self,
        file_obj: IndexedFile,
        template: str,
        target_directory: str,
        operation_type: str,
        conflict_resolution: str,
        create_backup: bool,
        pattern_id: Optional[int] = None
    ) -> FileOperationResult:
        """Process a single file operation"""
        
        try:
            # Use smart metadata resolution
            extracted_data = self._resolve_file_metadata(file_obj, pattern_id)
            
            # Prepare template data
            template_data = extracted_data.copy()
            template_data.update({
                'original_filename': file_obj.filename,
                'extension': file_obj.extension or '',
                'basename': Path(file_obj.filename).stem
            })
            
            # Generate new filename
            new_filename = template.format(**template_data)
            
            # Validate new filename
            if not self._is_valid_filename(new_filename):
                return FileOperationResult(
                    file_id=file_obj.id,
                    original_path=file_obj.full_path,
                    target_path="",
                    operation=operation_type,
                    success=False,
                    error_message=f"Invalid filename generated: {new_filename}"
                )
            
            # Build target path
            target_path = os.path.join(target_directory, new_filename)
            
            # Handle conflicts
            final_target_path = self._resolve_path_conflict(
                target_path, conflict_resolution
            )
            
            # Perform operation
            if operation_type == "smart_copy":
                if create_backup and os.path.exists(final_target_path):
                    backup_path = f"{final_target_path}.backup.{int(datetime.now().timestamp())}"
                    shutil.copy2(final_target_path, backup_path)
                
                shutil.copy2(file_obj.full_path, final_target_path)
                
            elif operation_type == "smart_move":
                if create_backup and os.path.exists(final_target_path):
                    backup_path = f"{final_target_path}.backup.{int(datetime.now().timestamp())}"
                    shutil.copy2(final_target_path, backup_path)
                
                shutil.move(file_obj.full_path, final_target_path)
                
                # Update file record for move operation
                file_obj.full_path = final_target_path
                file_obj.filename = Path(final_target_path).name
                file_obj.path = str(Path(final_target_path).parent)
                self.file_repo.update_file(file_obj)
            
            return FileOperationResult(
                file_id=file_obj.id,
                original_path=file_obj.full_path,
                target_path=final_target_path,
                operation=operation_type,
                success=True,
                new_filename=Path(final_target_path).name
            )
            
        except Exception as e:
            logger.error(f"Error processing file {file_obj.id}: {str(e)}")
            return FileOperationResult(
                file_id=file_obj.id,
                original_path=file_obj.full_path,
                target_path="",
                operation=operation_type,
                success=False,
                error_message=str(e)
            )

    def _resolve_path_conflict(self, target_path: str, resolution: str) -> str:
        """Resolve file path conflicts"""
        if not os.path.exists(target_path):
            return target_path
        
        if resolution == "overwrite":
            return target_path
        elif resolution == "skip":
            raise FileExistsError(f"File already exists: {target_path}")
        elif resolution == "rename":
            # Generate unique filename
            path_obj = Path(target_path)
            counter = 1
            while os.path.exists(target_path):
                new_name = f"{path_obj.stem}_{counter}{path_obj.suffix}"
                target_path = path_obj.parent / new_name
                counter += 1
            return str(target_path)
        else:
            raise ValueError(f"Unknown conflict resolution: {resolution}")

    def _is_valid_filename(self, filename: str) -> bool:
        """Validate filename for safety"""
        if not filename or len(filename) > 255:
            return False
        
        # Check for invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            if char in filename:
                return False
        
        # Check for reserved names
        reserved_names = {
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        }
        if Path(filename).stem.upper() in reserved_names:
            return False
        
        return True

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get status of smart file operation job"""
        job = self._active_jobs.get(job_id)
        if not job:
            return None
        
        return {
            'job_id': job.job_id,
            'operation_type': job.operation_type,
            'status': job.status,
            'total_files': job.total_files,
            'processed_files': job.processed_files,
            'successful_operations': job.successful_operations,
            'failed_operations': job.failed_operations,
            'template': job.template,
            'target_directory': job.target_directory,
            'error_message': job.error_message,
            'started_at': job.started_at.isoformat() if job.started_at else None,
            'completed_at': job.completed_at.isoformat() if job.completed_at else None,
            'progress_percentage': (job.processed_files / job.total_files * 100) if job.total_files > 0 else 0,
            'results': [
                {
                    'file_id': r.file_id,
                    'original_path': r.original_path,
                    'target_path': r.target_path,
                    'operation': r.operation,
                    'success': r.success,
                    'error_message': r.error_message,
                    'new_filename': r.new_filename
                }
                for r in job.results
            ]
        }

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job"""
        job = self._active_jobs.get(job_id)
        if not job:
            return False
        
        if job.status in ["started", "processing"]:
            job.status = "cancelled"
            job.completed_at = datetime.now()
            job.error_message = "Job cancelled by user"
            return True
        
        return False

    def get_recent_jobs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent smart file operation jobs"""
        jobs = sorted(
            self._active_jobs.values(),
            key=lambda j: j.started_at if j.started_at else datetime.min,
            reverse=True
        )
        
        return [
            {
                'job_id': job.job_id,
                'operation_type': job.operation_type,
                'status': job.status,
                'total_files': job.total_files,
                'successful_operations': job.successful_operations,
                'failed_operations': job.failed_operations,
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'completed_at': job.completed_at.isoformat() if job.completed_at else None
            }
            for job in jobs[:limit]
        ]