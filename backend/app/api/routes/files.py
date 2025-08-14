from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import os
from pathlib import Path

from app.core.database import get_db
from app.repositories.file_repository import FileRepository, ExclusionPatternRepository, IndexingJobRepository
from app.services.file_indexing_service import FileIndexingService, ExclusionPatternService
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
