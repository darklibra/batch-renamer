from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os
from pathlib import Path

from app.core.database import get_db
from app.repositories.file_repository import FileRepository, ExclusionPatternRepository, IndexingJobRepository
from app.repositories.pattern_repository import (
    PatternRepository, PatternApplicationRepository, 
    PatternFailureRepository, PatternExtractionJobRepository
)
from app.services.file_indexing_service import FileIndexingService, ExclusionPatternService
from app.services.pattern_extraction_service import PatternExtractionService
from app.api.schemas import (
    FileInfoResponse, FileListResponse, FileStatsResponse,
    IndexFilesRequest, IndexFilesResponse, IndexingJobResponse,
    ExclusionPatternRequest, ExclusionPatternResponse,
    TestPatternRequest, TestPatternResponse
)

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

@router.get("/files/stats", response_model=FileStatsResponse)
def get_file_stats(
    file_repo: FileRepository = Depends(get_file_repository)
):
    """
    Get file statistics
    """
    try:
        stats = file_repo.get_file_stats()
        return FileStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

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
        job_id = await indexing_service.start_indexing_job(request.directory_path)
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

@router.get("/files/extraction-failures")
def get_extraction_failures(
    limit: int = Query(50, ge=1, le=100, description="Maximum failures to return"),
    requires_user_input: Optional[bool] = Query(None, description="Filter by user input requirement"),
    pattern_service: PatternExtractionService = Depends(get_pattern_extraction_service)
):
    """
    Get files that failed pattern extraction
    """
    try:
        failures = pattern_service.get_extraction_failures(
            limit=limit,
            requires_user_input=requires_user_input
        )
        
        return {
            'failures': failures,
            'total_returned': len(failures)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get extraction failures: {str(e)}")

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
@router.get("/files/search", response_model=FileListResponse)
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
