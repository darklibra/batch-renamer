from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.repositories.file_repository import FileRepository
from app.repositories.pattern_repository import (
    PatternRepository,
    PatternApplicationRepository,
    PatternFailureRepository,
    PatternExtractionJobRepository,
)
from app.services.pattern_extraction_service import PatternExtractionService

router = APIRouter(prefix="/patterns", tags=["Pattern Management"])


# Pydantic schemas for pattern operations
class PatternCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Pattern name")
    regex_pattern: str = Field(
        ..., min_length=1, max_length=500, description="Regular expression pattern"
    )
    field_mapping: Dict[str, Any] = Field(
        ..., description="Field mapping configuration"
    )
    priority: int = Field(
        default=1,
        ge=0,
        le=100,
        description="Pattern priority (higher = more important)",
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Pattern description"
    )


class PatternUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    regex_pattern: Optional[str] = Field(None, min_length=1, max_length=500)
    field_mapping: Optional[Dict[str, Any]] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class PatternTestRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    regex_pattern: str = Field(..., min_length=1, max_length=500)
    field_mapping: Dict[str, Any] = Field(...)
    file_ids: List[int] = Field(
        ..., min_items=1, description="List of file IDs to test against"
    )


class BatchExtractionRequest(BaseModel):
    file_ids: List[int] = Field(
        ..., min_items=1, description="List of file IDs to process"
    )
    pattern_ids: Optional[List[int]] = Field(
        None, description="Specific patterns to use (optional)"
    )
    force_reapply: bool = Field(
        default=False, description="Force reapply patterns to already processed files"
    )


class FailureResolutionRequest(BaseModel):
    pattern_id: int = Field(..., description="Pattern ID to resolve the failure")


class PatternResponse(BaseModel):
    id: int
    name: str
    regex_pattern: str
    field_mapping: Dict[str, Any]
    priority: int
    is_active: bool
    created_at: str
    updated_at: str


class PatternApplicationResponse(BaseModel):
    id: int
    file_id: int
    pattern_id: int
    extraction_score: int
    extracted_data: Dict[str, Any]
    applied_at: str
    is_current: bool
    processing_time_ms: int


class PatternFailureResponse(BaseModel):
    id: int
    file_id: int
    attempted_patterns: List[int]
    failure_reason: str
    error_details: Dict[str, Any]
    requires_user_input: bool
    created_at: str
    resolved_at: Optional[str]
    resolved_by_pattern_id: Optional[int]


class ExtractionJobResponse(BaseModel):
    id: str
    job_type: str
    file_ids: List[int]
    pattern_ids: List[int]
    status: str
    processed_count: int
    total_count: int
    successful_extractions: int
    failed_extractions: int
    error_message: Optional[str]
    result_data: Optional[Dict[str, Any]]
    started_at: str
    completed_at: Optional[str]


# Dependency injection for services
def get_pattern_service(db: Session = Depends(get_db)) -> PatternExtractionService:
    """Get pattern extraction service with all dependencies"""
    file_repo = FileRepository(db)
    pattern_repo = PatternRepository(db)
    application_repo = PatternApplicationRepository(db)
    failure_repo = PatternFailureRepository(db)
    job_repo = PatternExtractionJobRepository(db)

    return PatternExtractionService(
        file_repo, pattern_repo, application_repo, failure_repo, job_repo
    )


def get_pattern_repository(db: Session = Depends(get_db)) -> PatternRepository:
    """Get pattern repository"""
    return PatternRepository(db)


def get_application_repository(
    db: Session = Depends(get_db),
) -> PatternApplicationRepository:
    """Get pattern application repository"""
    return PatternApplicationRepository(db)


def get_failure_repository(db: Session = Depends(get_db)) -> PatternFailureRepository:
    """Get pattern failure repository"""
    return PatternFailureRepository(db)


def get_job_repository(db: Session = Depends(get_db)) -> PatternExtractionJobRepository:
    """Get pattern extraction job repository"""
    return PatternExtractionJobRepository(db)


# Pattern CRUD endpoints
@router.post("/", response_model=PatternResponse, status_code=201)
async def create_pattern(
    pattern_data: PatternCreateRequest,
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
):
    """Create a new extraction pattern"""
    try:
        # Validate regex pattern
        import re

        re.compile(pattern_data.regex_pattern)

        # Check for duplicate names
        existing = pattern_repo.get_pattern_by_name(pattern_data.name)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Pattern with name '{pattern_data.name}' already exists",
            )

        # Create pattern (exclude description field as it's not in the model)
        pattern_dict = pattern_data.dict()
        pattern_dict.pop('description', None)  # Remove description field if present
        pattern = pattern_repo.create_pattern(pattern_dict)
        return PatternResponse(**pattern.to_dict())

    except re.error as e:
        raise HTTPException(status_code=400, detail=f"Invalid regex pattern: {str(e)}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create pattern: {str(e)}"
        )


@router.get("/", response_model=Dict[str, Any])
async def list_patterns(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    sort_by: str = Query("priority", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
):
    """List extraction patterns with pagination and filtering"""
    try:
        result = pattern_repo.get_patterns_paginated(
            page=page,
            per_page=per_page,
            is_active=is_active,
            sort_by=sort_by,
            sort_order=sort_order,
        )

        return {
            "patterns": [PatternResponse(**p.to_dict()) for p in result["patterns"]],
            "pagination": {
                "total": result["total"],
                "page": result["page"],
                "per_page": result["per_page"],
                "total_pages": result["total_pages"],
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list patterns: {str(e)}"
        )


@router.get("/{pattern_id}", response_model=PatternResponse)
async def get_pattern(
    pattern_id: int = Path(..., description="Pattern ID"),
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
):
    """Get a specific extraction pattern"""
    pattern = pattern_repo.get_pattern_by_id(pattern_id)
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    return PatternResponse(**pattern.to_dict())


@router.put("/{pattern_id}", response_model=PatternResponse)
async def update_pattern(
    update_data: PatternUpdateRequest,
    pattern_id: int = Path(..., description="Pattern ID"),
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
):
    """Update an extraction pattern"""
    try:
        # Validate regex if provided
        if update_data.regex_pattern:
            import re

            re.compile(update_data.regex_pattern)

        # Check for name conflicts
        if update_data.name:
            existing = pattern_repo.get_pattern_by_name(update_data.name)
            if existing and existing.id != pattern_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Pattern with name '{update_data.name}' already exists",
                )

        # Update pattern (exclude description field as it's not in the model)
        update_dict = update_data.dict(exclude_unset=True)
        update_dict.pop('description', None)  # Remove description field if present
        updated_pattern = pattern_repo.update_pattern(pattern_id, update_dict)

        if not updated_pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")

        return PatternResponse(**updated_pattern.to_dict())

    except re.error as e:
        raise HTTPException(status_code=400, detail=f"Invalid regex pattern: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update pattern: {str(e)}"
        )


@router.delete("/{pattern_id}")
async def delete_pattern(
    pattern_id: int = Path(..., description="Pattern ID"),
    hard_delete: bool = Query(
        False, description="Permanently delete pattern and related data"
    ),
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
):
    """Delete an extraction pattern"""
    try:
        if hard_delete:
            success = pattern_repo.hard_delete_pattern(pattern_id)
        else:
            success = pattern_repo.delete_pattern(pattern_id)

        if not success:
            raise HTTPException(status_code=404, detail="Pattern not found")

        return {"message": "Pattern deleted successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete pattern: {str(e)}"
        )


# Pattern testing endpoints
@router.post("/test", response_model=Dict[str, Any])
async def test_pattern(
    test_data: PatternTestRequest,
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """Test a pattern against specific files without saving results"""
    try:
        result = pattern_service.test_pattern_against_files(
            pattern_data=test_data.dict(), file_ids=test_data.file_ids
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pattern test failed: {str(e)}")


# Pattern extraction endpoints
@router.post("/extract/file/{file_id}", response_model=Dict[str, Any])
async def extract_metadata_for_file(
    file_id: int = Path(..., description="File ID"),
    force_reapply: bool = Query(False, description="Force reapply patterns"),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """Extract metadata for a specific file"""
    try:
        result = await pattern_service.extract_metadata_for_file(file_id, force_reapply)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Metadata extraction failed: {str(e)}"
        )


@router.post("/extract/batch", response_model=Dict[str, str])
async def start_batch_extraction(
    extraction_data: BatchExtractionRequest,
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """Start a background job to extract metadata for multiple files"""
    try:
        job_id = await pattern_service.batch_extract_metadata(
            file_ids=extraction_data.file_ids,
            pattern_ids=extraction_data.pattern_ids,
            force_reapply=extraction_data.force_reapply,
        )

        return {
            "job_id": job_id,
            "message": "Batch extraction job started successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to start batch extraction: {str(e)}"
        )


# Pattern application endpoints
@router.get("/applications/", response_model=Dict[str, Any])
async def list_pattern_applications(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    file_id: Optional[int] = Query(None, description="Filter by file ID"),
    pattern_id: Optional[int] = Query(None, description="Filter by pattern ID"),
    is_current: Optional[bool] = Query(None, description="Filter by current status"),
    application_repo: PatternApplicationRepository = Depends(
        get_application_repository
    ),
):
    """List pattern applications with pagination and filtering"""
    try:
        result = application_repo.get_applications_paginated(
            page=page,
            per_page=per_page,
            file_id=file_id,
            pattern_id=pattern_id,
            is_current=is_current,
        )

        return {
            "applications": [
                PatternApplicationResponse(**app.to_dict())
                for app in result["applications"]
            ],
            "pagination": {
                "total": result["total"],
                "page": result["page"],
                "per_page": result["per_page"],
                "total_pages": result["total_pages"],
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list applications: {str(e)}"
        )


@router.get(
    "/applications/file/{file_id}", response_model=List[PatternApplicationResponse]
)
async def get_file_applications(
    file_id: int = Path(..., description="File ID"),
    application_repo: PatternApplicationRepository = Depends(
        get_application_repository
    ),
):
    """Get all pattern applications for a specific file"""
    try:
        applications = application_repo.get_applications_for_file(file_id)
        return [PatternApplicationResponse(**app.to_dict()) for app in applications]

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get file applications: {str(e)}"
        )


# Pattern failure endpoints
@router.get("/failures/", response_model=Dict[str, Any])
async def list_pattern_failures(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    requires_user_input: Optional[bool] = Query(
        None, description="Filter by user input requirement"
    ),
    resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    failure_repo: PatternFailureRepository = Depends(get_failure_repository),
):
    """List pattern failures with pagination and filtering"""
    try:
        result = failure_repo.get_failures_paginated(
            page=page,
            per_page=per_page,
            requires_user_input=requires_user_input,
            resolved=resolved,
        )

        return {
            "failures": [
                PatternFailureResponse(**failure.to_dict())
                for failure in result["failures"]
            ],
            "pagination": {
                "total": result["total"],
                "page": result["page"],
                "per_page": result["per_page"],
                "total_pages": result["total_pages"],
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list failures: {str(e)}"
        )


@router.post("/failures/{failure_id}/resolve", response_model=Dict[str, Any])
async def resolve_failure(
    resolution_data: FailureResolutionRequest,
    failure_id: int = Path(..., description="Failure ID"),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """Resolve a pattern extraction failure with a specific pattern"""
    try:
        result = pattern_service.resolve_extraction_failure(
            failure_id, resolution_data.pattern_id
        )
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to resolve failure: {str(e)}"
        )


# Background job endpoints
@router.get("/jobs/", response_model=Dict[str, Any])
async def list_extraction_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    job_repo: PatternExtractionJobRepository = Depends(get_job_repository),
):
    """List pattern extraction jobs with pagination and filtering"""
    try:
        result = job_repo.get_jobs_paginated(
            page=page, per_page=per_page, status=status, job_type=job_type
        )

        return {
            "jobs": [ExtractionJobResponse(**job.to_dict()) for job in result["jobs"]],
            "pagination": {
                "total": result["total"],
                "page": result["page"],
                "per_page": result["per_page"],
                "total_pages": result["total_pages"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {str(e)}")


@router.get("/jobs/{job_id}", response_model=ExtractionJobResponse)
async def get_extraction_job(
    job_id: str = Path(..., description="Job ID"),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """Get status and progress of a specific extraction job"""
    try:
        job_info = pattern_service.get_job_progress(job_id)
        if not job_info:
            raise HTTPException(status_code=404, detail="Job not found")

        return ExtractionJobResponse(**job_info)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get job status: {str(e)}"
        )


# Statistics and analytics endpoints
@router.get("/stats/overview", response_model=Dict[str, Any])
async def get_extraction_overview(
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """Get overall extraction statistics and overview"""
    try:
        stats = pattern_service.get_extraction_overview()
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get extraction overview: {str(e)}"
        )


@router.get("/stats/pattern/{pattern_id}", response_model=Dict[str, Any])
async def get_pattern_stats(
    pattern_id: int = Path(..., description="Pattern ID"),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """Get detailed performance statistics for a specific pattern"""
    try:
        stats = pattern_service.get_pattern_performance_stats(pattern_id)
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get pattern statistics: {str(e)}"
        )


@router.get("/stats/failures", response_model=Dict[str, Any])
async def get_failure_stats(
    failure_repo: PatternFailureRepository = Depends(get_failure_repository),
):
    """Get pattern failure statistics"""
    try:
        stats = failure_repo.get_failure_stats()
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get failure statistics: {str(e)}"
        )


@router.get("/stats/jobs", response_model=Dict[str, Any])
async def get_job_stats(
    job_repo: PatternExtractionJobRepository = Depends(get_job_repository),
):
    """Get job execution statistics"""
    try:
        stats = job_repo.get_job_stats()
        return stats

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get job statistics: {str(e)}"
        )


# Maintenance endpoints
@router.post("/maintenance/cleanup-jobs")
async def cleanup_old_jobs(
    days_old: int = Query(
        30, ge=1, le=365, description="Delete jobs older than this many days"
    ),
    job_repo: PatternExtractionJobRepository = Depends(get_job_repository),
):
    """Clean up old completed extraction jobs"""
    try:
        deleted_count = job_repo.cleanup_old_jobs(days_old)
        return {
            "message": f"Successfully deleted {deleted_count} old jobs",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup jobs: {str(e)}")


@router.get("/active", response_model=List[PatternResponse])
async def get_active_patterns(
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
):
    """Get all active patterns ordered by priority"""
    try:
        patterns = pattern_repo.get_active_patterns()
        return [PatternResponse(**p.to_dict()) for p in patterns]

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get active patterns: {str(e)}"
        )
