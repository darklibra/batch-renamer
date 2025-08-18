from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os
from pathlib import Path
from pydantic import BaseModel

from app.core.database import get_db
from app.repositories.file_repository import FileRepository, ExclusionPatternRepository, IndexingJobRepository
from app.repositories.pattern_repository import (
    PatternRepository, PatternApplicationRepository, 
    PatternFailureRepository, PatternExtractionJobRepository
)
from app.services.file_indexing_service import FileIndexingService, ExclusionPatternService
from app.services.pattern_extraction_service import PatternExtractionService
from app.services.smart_file_service import SmartFileService
from app.api.schemas import (
    FileInfoResponse, FileListResponse, FileStatsResponse,
    IndexFilesRequest, IndexFilesResponse, IndexingJobResponse,
    ExclusionPatternRequest, ExclusionPatternResponse,
    TestPatternRequest, TestPatternResponse
)

# Request models for Smart File Manager
class PreviewRenameRequest(BaseModel):
    file_ids: List[int]
    filename_template: str
    pattern_id: Optional[int] = None  # Optional pattern selection

class SmartOperationRequest(BaseModel):
    file_ids: List[int]
    target_directory: str
    filename_template: str
    pattern_id: Optional[int] = None  # Optional pattern selection
    conflict_resolution: str = "skip"
    create_backup: bool = False

class ApplyPatternRequest(BaseModel):
    file_ids: List[int]
    pattern_id: int

router = APIRouter()

# Dependency injection helpers
def get_file_repository(db: Session = Depends(get_db)) -> FileRepository:
    return FileRepository(db)

def get_exclusion_repository(db: Session = Depends(get_db)) -> ExclusionPatternRepository:
    return ExclusionPatternRepository(db)

def get_job_repository(db: Session = Depends(get_db)) -> IndexingJobRepository:
    return IndexingJobRepository(db)

def get_indexing_service(
    file_repo: FileRepository = Depends(get_file_repository),
    exclusion_repo: ExclusionPatternRepository = Depends(get_exclusion_repository),
    job_repo: IndexingJobRepository = Depends(get_job_repository)
) -> FileIndexingService:
    return FileIndexingService(file_repo, exclusion_repo, job_repo)

def get_exclusion_service(
    exclusion_repo: ExclusionPatternRepository = Depends(get_exclusion_repository)
) -> ExclusionPatternService:
    return ExclusionPatternService(exclusion_repo)

def get_pattern_extraction_service(db: Session = Depends(get_db)) -> PatternExtractionService:
    """Get pattern extraction service with all dependencies"""
    file_repo = FileRepository(db)
    pattern_repo = PatternRepository(db)
    application_repo = PatternApplicationRepository(db)
    failure_repo = PatternFailureRepository(db)
    job_repo = PatternExtractionJobRepository(db)
    
    return PatternExtractionService(
        file_repo, pattern_repo, application_repo, failure_repo, job_repo
    )

# Global singleton instance
_smart_file_service_instance = None

def get_smart_file_service(db: Session = Depends(get_db)) -> SmartFileService:
    """Get smart file service with all dependencies (singleton pattern)"""
    global _smart_file_service_instance
    
    if _smart_file_service_instance is None:
        file_repo = FileRepository(db)
        job_repo = PatternExtractionJobRepository(db)
        _smart_file_service_instance = SmartFileService(file_repo, job_repo)
    
    return _smart_file_service_instance

def _validate_path_security(directory_path: str) -> bool:
    """Security validation for directory paths"""
    try:
        resolved_path = Path(directory_path).resolve()
        
        # Basic security checks
        if not resolved_path.exists():
            return False
            
        # Prevent access to sensitive system directories
        sensitive_paths = ['/etc', '/sys', '/proc', '/dev', '/root']
        for sensitive in sensitive_paths:
            if str(resolved_path).startswith(sensitive):
                return False
                
        return True
    except Exception:
        return False

# File listing and management endpoints
@router.get("/files", response_model=FileListResponse)
def list_files(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    sort_field: str = Query("indexed_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    extension: Optional[str] = Query(None, description="Filter by file extension"),
    path: Optional[str] = Query(None, description="Filter by path containing"),
    filename: Optional[str] = Query(None, description="Filter by filename containing"),
    file_repo: FileRepository = Depends(get_file_repository)
):
    """
    Get paginated list of indexed files with filtering and sorting
    """
    try:
        filters = {}
        if extension:
            filters['extension'] = extension
        if path:
            filters['path'] = path
        if filename:
            filters['filename'] = filename
            
        result = file_repo.get_files_paginated(
            page=page,
            per_page=per_page,
            sort_field=sort_field,
            sort_order=sort_order,
            filters=filters
        )
        
        return FileListResponse(
            files=[FileInfoResponse(**file.to_dict()) for file in result['files']],
            total=result['total'],
            page=result['page'],
            per_page=result['per_page'],
            total_pages=result['total_pages']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve files: {str(e)}")

# Specific routes must come before parameterized routes
@router.get("/files/stats", response_model=FileStatsResponse)
def get_file_stats(
    file_repo: FileRepository = Depends(get_file_repository)
):
    """
    Get file statistics
    """
    try:
        stats = file_repo.get_file_statistics()
        return FileStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@router.get("/files/extraction-stats")
def get_extraction_stats(
    pattern_service: PatternExtractionService = Depends(get_pattern_extraction_service)
):
    """
    Get overall extraction statistics
    """
    try:
        stats = pattern_service.get_extraction_overview()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get extraction stats: {str(e)}")

@router.get("/files/extraction-failures")
def get_extraction_failures(
    pattern_service: PatternExtractionService = Depends(get_pattern_extraction_service),
    limit: Optional[int] = Query(50, description="Maximum number of failures to return"),
    offset: Optional[int] = Query(0, description="Number of failures to skip")
):
    """
    Get list of files that failed pattern extraction
    """
    try:
        failures = pattern_service.get_extraction_failures(limit=limit, offset=offset)
        return {
            'failures': failures,
            'total_returned': len(failures)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get extraction failures: {str(e)}")

@router.get("/files/search", response_model=FileListResponse)
def search_files(
    query: Optional[str] = Query(None, description="Search query for filename or path"),
    extension: Optional[str] = Query(None, description="Filter by file extension"),
    has_extracted_data: Optional[bool] = Query(None, description="Filter by extracted data presence"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    file_repo: FileRepository = Depends(get_file_repository)
):
    """
    Search files with filters
    """
    try:
        filters = {
            'search': query,
            'extension': extension,
            'has_extracted_data': has_extracted_data
        }
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        result = file_repo.list_files(
            filters=filters,
            page=page,
            per_page=per_page
        )
        
        return FileListResponse(
            files=[FileInfoResponse(**file.to_dict()) for file in result['files']],
            total=result['total'],
            page=result['page'],
            per_page=result['per_page'],
            total_pages=result['total_pages']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search files: {str(e)}")

@router.get("/files/smart-operations")
def get_smart_operations(
    db: Session = Depends(get_db),
    limit: int = Query(10, description="Maximum number of operations to return")
):
    """
    Get list of smart operations (copy/move jobs)
    """
    try:
        file_repo = FileRepository(db)
        job_repo = PatternExtractionJobRepository(db)
        smart_service = SmartFileService(file_repo, job_repo)
        operations = smart_service.list_operations(limit=limit)
        return {"operations": operations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get smart operations: {str(e)}")

@router.post("/files/validate-template")
def validate_filename_template(
    template: str,
    sample_file_id: Optional[int] = Query(None, description="File ID to use as template validation sample"),
    pattern_id: Optional[int] = Query(None, description="Pattern ID to use for field suggestions"),
    db: Session = Depends(get_db)
):
    """
    Validate filename template against sample metadata
    """
    if not template.strip():
        raise HTTPException(status_code=400, detail="Template cannot be empty")
    
    try:
        file_repo = FileRepository(db)
        job_repo = PatternExtractionJobRepository(db)
        smart_service = SmartFileService(file_repo, job_repo)
        
        # Get sample metadata
        sample_metadata = None
        
        if sample_file_id:
            file_repo = smart_service.file_repo
            file_obj = file_repo.get_file_by_id(sample_file_id)
            if not file_obj:
                raise HTTPException(status_code=404, detail="Sample file not found")
            
            # If file has extracted data, use it
            if file_obj.extracted_data:
                sample_metadata = file_obj.extracted_data.copy()
                sample_metadata.update({
                    'original_filename': file_obj.filename,
                    'extension': file_obj.extension or '',
                    'basename': Path(file_obj.filename).stem
                })
            # If file has no extracted data but pattern_id is provided, use pattern-based metadata
            elif pattern_id:
                print(f"File {sample_file_id} has no extracted metadata, falling back to pattern-based metadata")
                sample_metadata = None  # Will be handled in pattern_id section below
            else:
                raise HTTPException(status_code=400, detail="Sample file has no extracted metadata and no pattern provided")
        
        if sample_metadata is None and pattern_id:
            # Use pattern-based sample metadata
            pattern_repo = PatternRepository(db)
            pattern = pattern_repo.get_pattern_by_id(pattern_id)
            if not pattern:
                raise HTTPException(status_code=404, detail="Pattern not found")
            
            # Generate sample metadata based on pattern fields
            sample_metadata = {}
            for field_name in pattern.field_mapping.keys():
                if field_name == 'name':
                    sample_metadata[field_name] = '샘플 제목'
                elif field_name == 'start':
                    sample_metadata[field_name] = '1'
                elif field_name == 'end':
                    sample_metadata[field_name] = '100'
                elif field_name == 'author':
                    sample_metadata[field_name] = '샘플 작가'
                elif field_name == 'year':
                    sample_metadata[field_name] = '2023'
                elif field_name == 'category':
                    sample_metadata[field_name] = '샘플 카테고리'
                elif field_name == 'episode':
                    sample_metadata[field_name] = '1'
                elif field_name == 'season':
                    sample_metadata[field_name] = '1'
                else:
                    sample_metadata[field_name] = f'샘플_{field_name}'
            
            # Add standard metadata
            sample_metadata.update({
                'original_filename': 'sample.txt',
                'extension': 'txt',
                'basename': 'sample'
            })
        
        if sample_metadata is None:
            # Use default sample metadata as final fallback
            sample_metadata = {
                'title': 'Sample Title',
                'author': 'Sample Author',
                'year': '2023',
                'category': 'Sample Category',
                'original_filename': 'sample.txt',
                'extension': 'txt',
                'basename': 'sample'
            }
        
        is_valid, error_message = smart_service.validate_filename_template(
            template, sample_metadata
        )
        
        response = {
            'is_valid': is_valid,
            'error_message': error_message,
            'template': template,
            'sample_metadata': sample_metadata
        }
        
        if is_valid:
            # Show preview with sample data
            try:
                sample_filename = template.format(**sample_metadata)
                response['sample_output'] = sample_filename
            except Exception as e:
                response['sample_output'] = f"Error: {str(e)}"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template validation failed: {str(e)}")

@router.post("/files/preview-rename")
def preview_filename_template(
    request: PreviewRenameRequest,
    db: Session = Depends(get_db)
):
    """
    Preview filename generation for selected files
    """
    try:
        file_repo = FileRepository(db)
        job_repo = PatternExtractionJobRepository(db)
        smart_service = SmartFileService(file_repo, job_repo)
        preview_result = smart_service.preview_file_rename_with_pattern(
            request.file_ids, 
            request.filename_template, 
            request.pattern_id
        )
        return preview_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")


@router.get("/files/patterns-for-file/{file_id}")
def get_applicable_patterns_for_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    """
    Get patterns that can be applied to specific file
    """
    try:
        from app.repositories.pattern_repository import PatternRepository
        pattern_repo = PatternRepository(db)
        
        # Get all active patterns using the paginated method
        patterns_result = pattern_repo.get_patterns_paginated(
            page=1,
            per_page=100,
            is_active=True,
            sort_by='priority',
            sort_order='desc'
        )
        
        return {
            "file_id": file_id,
            "available_patterns": [pattern.to_dict() for pattern in patterns_result['patterns']],
            "total_patterns": patterns_result['total']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get patterns for file: {str(e)}")

@router.post("/files/apply-pattern")
def apply_pattern_to_files(
    request: ApplyPatternRequest,
    db: Session = Depends(get_db)
):
    """
    Apply specific pattern to files and return extracted metadata
    """
    try:
        file_repo = FileRepository(db)
        pattern_repo = PatternRepository(db)
        job_repo = PatternExtractionJobRepository(db)
        
        # Get the pattern
        pattern = pattern_repo.get_pattern_by_id(request.pattern_id)
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")
        
        # Initialize pattern extraction service
        from app.services.pattern_extraction_service import PatternExtractionService
        pattern_service = PatternExtractionService(
            file_repo, pattern_repo, 
            PatternApplicationRepository(db),
            PatternFailureRepository(db),
            job_repo
        )
        
        results = []
        for file_id in request.file_ids:
            file_obj = file_repo.get_file_by_id(file_id)
            if not file_obj:
                results.append({
                    "file_id": file_id,
                    "success": False,
                    "error": "File not found"
                })
                continue
            
            try:
                # Apply the specific pattern
                extracted_data = pattern_service.apply_pattern_to_file(file_obj, pattern)
                results.append({
                    "file_id": file_id,
                    "filename": file_obj.filename,
                    "success": True,
                    "extracted_data": extracted_data,
                    "pattern_name": pattern.name
                })
            except Exception as e:
                results.append({
                    "file_id": file_id,
                    "filename": file_obj.filename if file_obj else "Unknown",
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "pattern_id": request.pattern_id,
            "pattern_name": pattern.name,
            "results": results,
            "total_files": len(request.file_ids),
            "successful_extractions": len([r for r in results if r["success"]])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply pattern: {str(e)}")

# Smart operations endpoints (must come before parameterized routes)
@router.get("/files/smart-operations-history")
def get_smart_operation_history(
    limit: int = Query(10, ge=1, le=50, description="Number of recent jobs to return"),
    smart_file_service: SmartFileService = Depends(get_smart_file_service)
):
    """
    Get recent smart file operation jobs
    """
    try:
        jobs = smart_file_service.get_recent_jobs(limit)
        return {"jobs": jobs, "total_returned": len(jobs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get job history: {str(e)}")

@router.get("/files/smart-operations/{job_id}")
def get_smart_operation_status(
    job_id: str,
    smart_file_service: SmartFileService = Depends(get_smart_file_service)
):
    """
    Get status of smart file operation job
    """
    status = smart_file_service.get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return status

@router.post("/files/smart-operations/{job_id}/cancel")
def cancel_smart_operation(
    job_id: str,
    smart_file_service: SmartFileService = Depends(get_smart_file_service)
):
    """
    Cancel a running smart file operation job
    """
    success = smart_file_service.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or cannot be cancelled")
    
    return {"message": "Job cancelled successfully", "job_id": job_id}

# Now the parameterized routes
@router.get("/files/{file_id}", response_model=FileInfoResponse)
def get_file(
    file_id: int,
    file_repo: FileRepository = Depends(get_file_repository)
):
    """
    Get specific file by ID
    """
    file_obj = file_repo.get_file_by_id(file_id)
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileInfoResponse(**file_obj.to_dict())

# File indexing endpoints
@router.post("/files/index", response_model=IndexFilesResponse)
async def start_file_indexing(
    request: IndexFilesRequest,
    indexing_service: FileIndexingService = Depends(get_indexing_service)
):
    """
    Start file indexing process with progress tracking
    """
    # Validate directory exists and is accessible
    if not os.path.isdir(request.directory_path):
        raise HTTPException(status_code=404, detail="Directory not found")
    
    # Security validation
    if not _validate_path_security(request.directory_path):
        raise HTTPException(status_code=403, detail="Access to directory forbidden")
    
    try:
        # Create scan configuration from request
        scan_config = {
            'file_extensions': request.file_extensions,
            'max_file_size_mb': request.max_file_size_mb,
            'max_files': request.max_files,
            'recursion_depth': request.recursion_depth
        }
        
        job_id = await indexing_service.start_indexing_job(request.directory_path, scan_config)
        return IndexFilesResponse(
            job_id=job_id,
            status="started",
            message="File indexing started in background"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start indexing: {str(e)}")

@router.get("/files/index/{job_id}/progress", response_model=IndexingJobResponse)
def get_indexing_progress(
    job_id: str,
    indexing_service: FileIndexingService = Depends(get_indexing_service)
):
    """
    Get progress of indexing job
    """
    progress = indexing_service.get_job_progress(job_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return IndexingJobResponse(**progress)

@router.get("/files/index/jobs", response_model=List[IndexingJobResponse])
def get_recent_indexing_jobs(
    limit: int = Query(10, ge=1, le=50, description="Number of recent jobs to return"),
    indexing_service: FileIndexingService = Depends(get_indexing_service)
):
    """
    Get recent indexing jobs
    """
    jobs = indexing_service.get_recent_jobs(limit)
    return [IndexingJobResponse(**job) for job in jobs]

# Exclusion pattern endpoints
@router.get("/exclusion-patterns", response_model=List[ExclusionPatternResponse])
def list_exclusion_patterns(
    active_only: bool = Query(False, description="Return only active patterns"),
    exclusion_service: ExclusionPatternService = Depends(get_exclusion_service)
):
    """
    Get list of exclusion patterns
    """
    try:
        patterns = exclusion_service.get_exclusion_patterns(active_only=active_only)
        return [ExclusionPatternResponse(**pattern) for pattern in patterns]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get patterns: {str(e)}")

@router.post("/exclusion-patterns", response_model=ExclusionPatternResponse)
def create_exclusion_pattern(
    pattern_data: ExclusionPatternRequest,
    exclusion_service: ExclusionPatternService = Depends(get_exclusion_service)
):
    """
    Create new exclusion pattern
    """
    try:
        pattern = exclusion_service.create_exclusion_pattern(pattern_data.dict())
        return ExclusionPatternResponse(**pattern)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create pattern: {str(e)}")

@router.put("/exclusion-patterns/{pattern_id}", response_model=ExclusionPatternResponse)
def update_exclusion_pattern(
    pattern_id: int,
    pattern_data: ExclusionPatternRequest,
    exclusion_service: ExclusionPatternService = Depends(get_exclusion_service)
):
    """
    Update exclusion pattern
    """
    try:
        pattern = exclusion_service.update_exclusion_pattern(pattern_id, pattern_data.dict())
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")
        return ExclusionPatternResponse(**pattern)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update pattern: {str(e)}")

@router.delete("/exclusion-patterns/{pattern_id}")
def delete_exclusion_pattern(
    pattern_id: int,
    exclusion_service: ExclusionPatternService = Depends(get_exclusion_service)
):
    """
    Delete exclusion pattern
    """
    try:
        success = exclusion_service.delete_exclusion_pattern(pattern_id)
        if not success:
            raise HTTPException(status_code=404, detail="Pattern not found")
        return {"message": "Pattern deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete pattern: {str(e)}")

@router.post("/exclusion-patterns/test", response_model=TestPatternResponse)
def test_exclusion_pattern(
    test_data: TestPatternRequest,
    exclusion_service: ExclusionPatternService = Depends(get_exclusion_service)
):
    """
    Test exclusion pattern against list of paths
    """
    try:
        result = exclusion_service.test_pattern(
            test_data.pattern,
            test_data.pattern_type,
            test_data.test_paths
        )
        return TestPatternResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test pattern: {str(e)}")

# Pattern extraction integration endpoints
@router.post("/files/{file_id}/extract-metadata")
async def extract_file_metadata(
    file_id: int,
    force_reapply: bool = Query(False, description="Force reapply patterns even if already processed"),
    pattern_service: PatternExtractionService = Depends(get_pattern_extraction_service)
):
    """
    Extract metadata from a specific file using pattern matching
    """
    try:
        result = await pattern_service.extract_metadata_for_file(file_id, force_reapply)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metadata extraction failed: {str(e)}")

@router.get("/files/{file_id}/extracted-data")
def get_file_extracted_data(
    file_id: int,
    include_history: bool = Query(False, description="Include extraction history"),
    pattern_service: PatternExtractionService = Depends(get_pattern_extraction_service)
):
    """
    Get extracted metadata for a specific file
    """
    try:
        file_repo = pattern_service.file_repo
        file_obj = file_repo.get_file_by_id(file_id)
        
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
        
        response_data = {
            'file_id': file_id,
            'filename': file_obj.filename,
            'extracted_data': file_obj.extracted_data,
            'pattern_id': file_obj.pattern_id
        }
        
        if include_history:
            applications = pattern_service.application_repo.get_applications_for_file(file_id)
            response_data['extraction_history'] = [app.to_dict() for app in applications]
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get extracted data: {str(e)}")

@router.post("/files/batch-extract-metadata")
async def start_batch_metadata_extraction(
    file_ids: List[int],
    pattern_ids: Optional[List[int]] = Query(None, description="Specific patterns to use"),
    force_reapply: bool = Query(False, description="Force reapply patterns"),
    pattern_service: PatternExtractionService = Depends(get_pattern_extraction_service)
):
    """
    Start batch metadata extraction for multiple files
    """
    if not file_ids:
        raise HTTPException(status_code=400, detail="File IDs list cannot be empty")
    
    if len(file_ids) > 1000:
        raise HTTPException(status_code=400, detail="Cannot process more than 1000 files at once")
    
    try:
        job_id = await pattern_service.batch_extract_metadata(
            file_ids=file_ids,
            pattern_ids=pattern_ids,
            force_reapply=force_reapply
        )
        
        return {
            "job_id": job_id,
            "message": f"Batch metadata extraction started for {len(file_ids)} files",
            "file_count": len(file_ids)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start batch extraction: {str(e)}")


@router.post("/files/reindex-with-patterns")
async def reindex_files_with_patterns(
    directory_path: Optional[str] = Query(None, description="Directory to reindex"),
    file_ids: Optional[List[int]] = Query(None, description="Specific files to reindex"),
    apply_patterns: bool = Query(True, description="Apply pattern extraction after indexing"),
    indexing_service: FileIndexingService = Depends(get_indexing_service),
    pattern_service: PatternExtractionService = Depends(get_pattern_extraction_service)
):
    """
    Reindex files and optionally apply pattern extraction
    """
    if not directory_path and not file_ids:
        raise HTTPException(
            status_code=400, 
            detail="Either directory_path or file_ids must be provided"
        )
    
    try:
        response = {}
        
        if directory_path:
            # Validate directory
            if not os.path.isdir(directory_path):
                raise HTTPException(status_code=404, detail="Directory not found")
            
            if not _validate_path_security(directory_path):
                raise HTTPException(status_code=403, detail="Access to directory forbidden")
            
            # Start indexing job
            indexing_job_id = await indexing_service.start_indexing_job(directory_path)
            response['indexing_job_id'] = indexing_job_id
        
        if apply_patterns and file_ids:
            # Start pattern extraction job for specific files
            extraction_job_id = await pattern_service.batch_extract_metadata(
                file_ids=file_ids,
                force_reapply=True
            )
            response['extraction_job_id'] = extraction_job_id
        
        response['message'] = "Reindexing and pattern extraction jobs started"
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start reindexing: {str(e)}")

# Enhanced file search with pattern data
@router.get("/files/search-advanced", response_model=FileListResponse)
def search_files_with_patterns(
    query: str = Query(..., min_length=1, description="Search query"),
    search_in: str = Query("all", regex="^(filename|path|extracted_data|all)$", description="Where to search"),
    pattern_id: Optional[int] = Query(None, description="Filter by pattern ID"),
    has_extracted_data: Optional[bool] = Query(None, description="Filter by extraction status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    file_repo: FileRepository = Depends(get_file_repository)
):
    """
    Advanced file search including extracted metadata
    """
    try:
        # Build search filters
        filters = {}
        
        if search_in == "filename" or search_in == "all":
            filters['filename'] = query
        if search_in == "path" or search_in == "all":
            filters['path'] = query
        if search_in == "extracted_data" or search_in == "all":
            filters['extracted_data'] = query
        
        if pattern_id is not None:
            filters['pattern_id'] = pattern_id
            
        if has_extracted_data is not None:
            filters['has_extracted_data'] = has_extracted_data
        
        # Perform search
        result = file_repo.search_files_advanced(
            filters=filters,
            page=page,
            per_page=per_page
        )
        
        return FileListResponse(
            files=[FileInfoResponse(**file.to_dict()) for file in result['files']],
            total=result['total'],
            page=result['page'],
            per_page=result['per_page'],
            total_pages=result['total_pages']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# Pattern-based File Selection Endpoints
@router.get("/files/by-pattern/{pattern_id}")
def get_files_by_pattern(
    pattern_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    include_metadata: bool = Query(True, description="Include extracted metadata in response"),
    db: Session = Depends(get_db)
):
    """
    Get files that are currently using a specific pattern
    """
    try:
        from app.models.file_models import IndexedFile
        from app.repositories.pattern_repository import PatternRepository
        
        pattern_repo = PatternRepository(db)
        pattern = pattern_repo.get_pattern_by_id(pattern_id)
        
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")
        
        # Get files that currently use this pattern
        query = db.query(IndexedFile).filter(IndexedFile.pattern_id == pattern_id)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        files = query.offset(offset).limit(per_page).all()
        
        # Calculate total pages
        total_pages = (total + per_page - 1) // per_page
        
        # Format response
        file_responses = []
        for file_obj in files:
            file_data = file_obj.to_dict()
            if include_metadata and file_obj.extracted_data:
                file_data['extracted_data'] = file_obj.extracted_data
            file_responses.append(file_data)
        
        return {
            "pattern_id": pattern_id,
            "pattern_name": pattern.name,
            "files": file_responses,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get files by pattern: {str(e)}")

@router.post("/files/smart-copy-by-pattern")
async def smart_copy_by_pattern(
    pattern_id: int,
    target_directory: str,
    filename_template: str,
    conflict_resolution: str = Query("skip", regex="^(skip|overwrite|rename)$"),
    create_backup: bool = Query(False),
    file_filters: Optional[Dict] = None,
    smart_file_service: SmartFileService = Depends(get_smart_file_service),
    db: Session = Depends(get_db)
):
    """
    Start smart copy operation for all files using a specific pattern
    """
    try:
        from app.models.file_models import IndexedFile
        from app.repositories.pattern_repository import PatternRepository
        
        pattern_repo = PatternRepository(db)
        pattern = pattern_repo.get_pattern_by_id(pattern_id)
        
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")
        
        # Get all files that use this pattern
        query = db.query(IndexedFile).filter(IndexedFile.pattern_id == pattern_id)
        
        # Apply additional filters if provided
        if file_filters:
            if 'extension' in file_filters:
                extensions = file_filters['extension'] if isinstance(file_filters['extension'], list) else [file_filters['extension']]
                query = query.filter(IndexedFile.extension.in_(extensions))
            if 'path_contains' in file_filters:
                query = query.filter(IndexedFile.path.contains(file_filters['path_contains']))
        
        files = query.all()
        file_ids = [file.id for file in files]
        
        if not file_ids:
            raise HTTPException(status_code=404, detail=f"No files found using pattern '{pattern.name}'")
        
        # Security validation for target directory
        if not _validate_path_security(target_directory):
            raise HTTPException(status_code=403, detail="Access to target directory forbidden")
        
        # Start smart copy job with the pattern
        job_id = await smart_file_service.start_smart_copy_job(
            file_ids=file_ids,
            target_directory=target_directory,
            template=filename_template,
            conflict_resolution=conflict_resolution,
            create_backup=create_backup,
            pattern_id=pattern_id
        )
        
        return {
            "job_id": job_id,
            "pattern_id": pattern_id,
            "pattern_name": pattern.name,
            "message": f"Smart copy operation started for {len(file_ids)} files using pattern '{pattern.name}'",
            "operation_type": "smart_copy_by_pattern",
            "file_count": len(file_ids),
            "template": filename_template,
            "target_directory": target_directory
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start pattern-based smart copy: {str(e)}")

@router.post("/files/smart-move-by-pattern")
async def smart_move_by_pattern(
    pattern_id: int,
    target_directory: str,
    filename_template: str,
    conflict_resolution: str = Query("skip", regex="^(skip|overwrite|rename)$"),
    create_backup: bool = Query(False),
    file_filters: Optional[Dict] = None,
    smart_file_service: SmartFileService = Depends(get_smart_file_service),
    db: Session = Depends(get_db)
):
    """
    Start smart move operation for all files using a specific pattern
    """
    try:
        from app.models.file_models import IndexedFile
        from app.repositories.pattern_repository import PatternRepository
        
        pattern_repo = PatternRepository(db)
        pattern = pattern_repo.get_pattern_by_id(pattern_id)
        
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")
        
        # Get all files that use this pattern
        query = db.query(IndexedFile).filter(IndexedFile.pattern_id == pattern_id)
        
        # Apply additional filters if provided
        if file_filters:
            if 'extension' in file_filters:
                extensions = file_filters['extension'] if isinstance(file_filters['extension'], list) else [file_filters['extension']]
                query = query.filter(IndexedFile.extension.in_(extensions))
            if 'path_contains' in file_filters:
                query = query.filter(IndexedFile.path.contains(file_filters['path_contains']))
        
        files = query.all()
        file_ids = [file.id for file in files]
        
        if not file_ids:
            raise HTTPException(status_code=404, detail=f"No files found using pattern '{pattern.name}'")
        
        # Security validation for target directory
        if not _validate_path_security(target_directory):
            raise HTTPException(status_code=403, detail="Access to target directory forbidden")
        
        # Start smart move job with the pattern
        job_id = await smart_file_service.start_smart_move_job(
            file_ids=file_ids,
            target_directory=target_directory,
            template=filename_template,
            conflict_resolution=conflict_resolution,
            create_backup=create_backup,
            pattern_id=pattern_id
        )
        
        return {
            "job_id": job_id,
            "pattern_id": pattern_id,
            "pattern_name": pattern.name,
            "message": f"Smart move operation started for {len(file_ids)} files using pattern '{pattern.name}'",
            "operation_type": "smart_move_by_pattern",
            "file_count": len(file_ids),
            "template": filename_template,
            "target_directory": target_directory
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start pattern-based smart move: {str(e)}")

# Smart File Management Endpoints
@router.post("/files/smart-copy")
async def start_smart_copy_job(
    file_ids: List[int] = Query(..., description="List of file IDs to copy"),
    target_directory: str = Query(..., description="Target directory path"),
    filename_template: str = Query(..., description="Filename template with placeholders"),
    conflict_resolution: str = Query("skip", regex="^(skip|overwrite|rename)$", description="Conflict resolution strategy"),
    create_backup: bool = Query(False, description="Create backup of existing files"),
    pattern_id: Optional[int] = Query(None, description="Optional pattern ID for metadata extraction"),
    smart_file_service: SmartFileService = Depends(get_smart_file_service)
):
    """
    Start smart file copy operation with filename template
    """
    if not file_ids:
        raise HTTPException(status_code=400, detail="File IDs list cannot be empty")
    
    if len(file_ids) > 1000:
        raise HTTPException(status_code=400, detail="Cannot process more than 1000 files at once")
    
    if not filename_template.strip():
        raise HTTPException(status_code=400, detail="Filename template cannot be empty")
    
    # Security validation for target directory
    if not _validate_path_security(target_directory):
        raise HTTPException(status_code=403, detail="Access to target directory forbidden")
    
    try:
        job_id = await smart_file_service.start_smart_copy_job(
            file_ids=file_ids,
            target_directory=target_directory,
            template=filename_template,
            conflict_resolution=conflict_resolution,
            create_backup=create_backup,
            pattern_id=pattern_id
        )
        
        return {
            "job_id": job_id,
            "message": f"Smart copy operation started for {len(file_ids)} files",
            "operation_type": "smart_copy",
            "file_count": len(file_ids),
            "template": filename_template,
            "target_directory": target_directory
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start smart copy: {str(e)}")

@router.post("/files/smart-move")
async def start_smart_move_job(
    file_ids: List[int] = Query(..., description="List of file IDs to move"),
    target_directory: str = Query(..., description="Target directory path"),
    filename_template: str = Query(..., description="Filename template with placeholders"),
    conflict_resolution: str = Query("skip", regex="^(skip|overwrite|rename)$", description="Conflict resolution strategy"),
    create_backup: bool = Query(False, description="Create backup of existing files"),
    pattern_id: Optional[int] = Query(None, description="Optional pattern ID for metadata extraction"),
    smart_file_service: SmartFileService = Depends(get_smart_file_service)
):
    """
    Start smart file move operation with filename template
    """
    if not file_ids:
        raise HTTPException(status_code=400, detail="File IDs list cannot be empty")
    
    if len(file_ids) > 1000:
        raise HTTPException(status_code=400, detail="Cannot process more than 1000 files at once")
    
    if not filename_template.strip():
        raise HTTPException(status_code=400, detail="Filename template cannot be empty")
    
    # Security validation for target directory
    if not _validate_path_security(target_directory):
        raise HTTPException(status_code=403, detail="Access to target directory forbidden")
    
    try:
        job_id = await smart_file_service.start_smart_move_job(
            file_ids=file_ids,
            target_directory=target_directory,
            template=filename_template,
            conflict_resolution=conflict_resolution,
            create_backup=create_backup,
            pattern_id=pattern_id
        )
        
        return {
            "job_id": job_id,
            "message": f"Smart move operation started for {len(file_ids)} files",
            "operation_type": "smart_move",
            "file_count": len(file_ids),
            "template": filename_template,
            "target_directory": target_directory
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start smart move: {str(e)}")

@router.post("/files/preview-rename")
def preview_filename_template(
    file_ids: List[int],
    filename_template: str,
    smart_file_service: SmartFileService = Depends(get_smart_file_service)
):
    """
    Preview how files will be renamed using the template
    """
    if not file_ids:
        raise HTTPException(status_code=400, detail="File IDs list cannot be empty")
    
    if len(file_ids) > 100:
        raise HTTPException(status_code=400, detail="Cannot preview more than 100 files at once")
    
    if not filename_template.strip():
        raise HTTPException(status_code=400, detail="Filename template cannot be empty")
    
    try:
        preview = smart_file_service.preview_file_rename(file_ids, filename_template)
        return preview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")


