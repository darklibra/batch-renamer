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
from app.repositories.selection_history_repository import PatternSelectionHistoryRepository
from app.services.pattern_extraction_service import PatternExtractionService
from app.services.pattern_validation_service import PatternValidationService, PatternTester

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


class PatternValidationRequest(BaseModel):
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
    test_filenames: Optional[List[str]] = Field(
        None, description="Optional list of filenames to test against"
    )


class PatternAnalysisRequest(BaseModel):
    file_filters: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Filters to apply to file selection"
    )
    limit: int = Field(
        default=100, ge=1, le=1000, description="Maximum number of files to analyze"
    )
    quality_threshold: int = Field(
        default=70, ge=0, le=100, description="Minimum quality threshold for recommendations"
    )
    exclude_previously_selected: bool = Field(
        default=True, description="Exclude files that were previously auto-selected for this pattern"
    )
    force_include_all: bool = Field(
        default=False, description="Force include all files regardless of selection history"
    )


class PatternSelectionRequest(BaseModel):
    file_ids: List[int] = Field(
        ..., description="List of file IDs that were selected"
    )
    selection_context: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Context information about the selection"
    )


class FileExtractionScore(BaseModel):
    file_id: int
    filename: str
    full_path: str
    extraction_score: int
    extracted_fields: int
    potential_data: Dict[str, Any]
    confidence: float


class PatternAnalysisResponse(BaseModel):
    pattern_id: int
    pattern_name: str
    analyzed_files: int
    ranked_files: List[FileExtractionScore]
    recommendations: Dict[str, Any]
    execution_time_ms: int


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
    selection_history_repo = PatternSelectionHistoryRepository(db)

    return PatternExtractionService(
        file_repo, pattern_repo, application_repo, failure_repo, job_repo, selection_history_repo
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


def get_pattern_validation_service() -> PatternValidationService:
    """Get pattern validation service"""
    return PatternValidationService()


def get_pattern_tester() -> PatternTester:
    """Get pattern tester service"""
    validation_service = PatternValidationService()
    return PatternTester(validation_service)


def get_selection_history_repository(db: Session = Depends(get_db)) -> PatternSelectionHistoryRepository:
    """Get pattern selection history repository"""
    return PatternSelectionHistoryRepository(db)


# Pattern CRUD endpoints
@router.post("/", response_model=PatternResponse, status_code=201)
async def create_pattern(
    pattern_data: PatternCreateRequest,
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
    validation_service: PatternValidationService = Depends(get_pattern_validation_service),
    pattern_tester: PatternTester = Depends(get_pattern_tester),
):
    """Create a new extraction pattern with comprehensive security validation"""
    try:
        # Basic regex compilation check
        import re
        re.compile(pattern_data.regex_pattern)

        # SECURITY: Comprehensive pattern validation with ReDoS protection
        pattern_dict = pattern_data.dict()
        validation_report = validation_service.validate_pattern(pattern_dict)
        
        # Check for critical security issues
        if validation_report.has_critical_issues():
            critical_errors = [r.message for r in validation_report.get_errors() if r.severity.value == "critical"]
            raise HTTPException(
                status_code=400,
                detail=f"Pattern validation failed with critical security issues: {'; '.join(critical_errors)}"
            )
        
        # SECURITY: Pattern security validation (ReDoS protection)
        security_result = pattern_tester.validate_pattern_security(pattern_data.regex_pattern)
        if not security_result['is_valid']:
            risk_score = security_result.get('risk_score', 0)
            if risk_score >= 0.7:  # High/Critical risk
                raise HTTPException(
                    status_code=400,
                    detail=f"Pattern rejected due to security risk (score: {risk_score:.2f}): {security_result['message']}"
                )

        # Check for duplicate names
        existing = pattern_repo.get_pattern_by_name(pattern_data.name)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Pattern with name '{pattern_data.name}' already exists",
            )

        # Create pattern (exclude description field as it's not in the model)
        pattern_dict.pop('description', None)  # Remove description field if present
        pattern = pattern_repo.create_pattern(pattern_dict)
        
        # Return pattern with validation metadata
        response_data = pattern.to_dict()
        response_data['validation_score'] = validation_report.score
        response_data['security_risk_score'] = security_result.get('risk_score', 0)
        
        return PatternResponse(**pattern.to_dict())

    except HTTPException:
        raise
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
    validation_service: PatternValidationService = Depends(get_pattern_validation_service),
    pattern_tester: PatternTester = Depends(get_pattern_tester),
):
    """Update an extraction pattern with comprehensive security validation"""
    try:
        # Get existing pattern
        existing_pattern = pattern_repo.get_pattern_by_id(pattern_id)
        if not existing_pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")

        # Validate regex if provided
        if update_data.regex_pattern:
            import re
            re.compile(update_data.regex_pattern)

            # SECURITY: Validate new regex pattern with ReDoS protection
            # Create full pattern data for validation
            full_pattern_data = {
                'name': update_data.name or existing_pattern.name,
                'regex_pattern': update_data.regex_pattern,
                'field_mapping': update_data.field_mapping or existing_pattern.field_mapping,
                'priority': update_data.priority or existing_pattern.priority
            }
            
            validation_report = validation_service.validate_pattern(full_pattern_data)
            
            # Check for critical security issues
            if validation_report.has_critical_issues():
                critical_errors = [r.message for r in validation_report.get_errors() if r.severity.value == "critical"]
                raise HTTPException(
                    status_code=400,
                    detail=f"Pattern validation failed with critical security issues: {'; '.join(critical_errors)}"
                )
            
            # SECURITY: Pattern security validation (ReDoS protection)
            security_result = pattern_tester.validate_pattern_security(update_data.regex_pattern)
            if not security_result['is_valid']:
                risk_score = security_result.get('risk_score', 0)
                if risk_score >= 0.7:  # High/Critical risk
                    raise HTTPException(
                        status_code=400,
                        detail=f"Pattern rejected due to security risk (score: {risk_score:.2f}): {security_result['message']}"
                    )

        # Check for name conflicts
        if update_data.name:
            existing_by_name = pattern_repo.get_pattern_by_name(update_data.name)
            if existing_by_name and existing_by_name.id != pattern_id:
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


# Pattern validation endpoints
@router.post("/validate", response_model=Dict[str, Any])
async def validate_pattern_security(
    validation_data: PatternValidationRequest,
    validation_service: PatternValidationService = Depends(get_pattern_validation_service),
    pattern_tester: PatternTester = Depends(get_pattern_tester),
):
    """
    Comprehensive pattern validation with security checks and ReDoS protection
    
    This endpoint validates regex patterns for:
    - Syntax correctness
    - Security vulnerabilities (ReDoS attacks)
    - Performance issues
    - Pattern quality and best practices
    - Field mapping consistency
    """
    try:
        # Convert to dict for validation
        pattern_dict = validation_data.dict()
        
        # Comprehensive pattern validation
        validation_report = validation_service.validate_pattern(
            pattern_dict, 
            test_filenames=validation_data.test_filenames
        )
        
        # Security validation with ReDoS protection
        security_result = pattern_tester.validate_pattern_security(validation_data.regex_pattern)
        
        # Comprehensive testing if test filenames provided
        test_results = None
        if validation_data.test_filenames:
            test_results = pattern_tester.test_pattern_comprehensively(
                pattern_dict, 
                validation_data.test_filenames
            )
        
        # Compile detailed response
        response = {
            # Basic validation info
            'is_valid': validation_report.is_valid and security_result['is_valid'],
            'validation_score': validation_report.score,
            
            # Security information
            'security': {
                'is_secure': security_result['is_valid'],
                'risk_score': security_result.get('risk_score', 0),
                'risk_level': 'low' if security_result.get('risk_score', 0) < 0.3 
                             else 'medium' if security_result.get('risk_score', 0) < 0.7 
                             else 'high',
                'message': security_result['message'],
                'recommendations': security_result.get('recommendations', [])
            },
            
            # Validation details
            'validation_details': {
                'errors': [
                    {
                        'severity': result.severity.value,
                        'message': result.message,
                        'field': result.field,
                        'suggestion': result.suggestion,
                        'code': result.code
                    }
                    for result in validation_report.results
                ],
                'has_critical_issues': validation_report.has_critical_issues(),
                'error_count': len(validation_report.get_errors()),
                'warning_count': len(validation_report.get_warnings())
            },
            
            # Performance and test results
            'test_results': test_results if test_results else None,
            
            # Recommendations
            'recommendations': pattern_tester.get_validation_recommendations(validation_report),
            
            # Pattern suggestions
            'pattern_suggestions': validation_service.suggest_pattern_for_filenames(
                validation_data.test_filenames or []
            ) if validation_data.test_filenames else None
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Pattern validation failed: {str(e)}"
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


# Pattern analysis endpoints for auto file selection
@router.post("/{pattern_id}/analyze-files", response_model=PatternAnalysisResponse)
async def analyze_pattern_effectiveness(
    pattern_id: int = Path(..., description="Pattern ID to analyze"),
    request: PatternAnalysisRequest = PatternAnalysisRequest(),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
):
    """
    Analyze files to find best matches for a specific pattern
    Returns files ranked by extraction potential for auto file selection
    """
    import time
    start_time = time.perf_counter()
    
    try:
        # Get the pattern
        pattern = pattern_repo.get_pattern_by_id(pattern_id)
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")

        # Analyze pattern effectiveness across files
        analysis_result = await pattern_service.analyze_pattern_effectiveness_for_files(
            pattern_id=pattern_id,
            file_filters=request.file_filters,
            limit=request.limit,
            quality_threshold=request.quality_threshold,
            exclude_previously_selected=request.exclude_previously_selected,
            force_include_all=request.force_include_all
        )
        
        execution_time = int((time.perf_counter() - start_time) * 1000)
        
        # Convert to response format
        ranked_files = [
            FileExtractionScore(
                file_id=file_data["file_id"],
                filename=file_data["filename"],
                full_path=file_data["full_path"],
                extraction_score=file_data["extraction_score"],
                extracted_fields=file_data["extracted_fields"],
                potential_data=file_data["potential_data"],
                confidence=file_data["confidence"]
            )
            for file_data in analysis_result["ranked_files"]
        ]
        
        return PatternAnalysisResponse(
            pattern_id=pattern_id,
            pattern_name=pattern.name,
            analyzed_files=analysis_result["analyzed_files"],
            ranked_files=ranked_files,
            recommendations=analysis_result["recommendations"],
            execution_time_ms=execution_time
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to analyze pattern effectiveness: {str(e)}"
        )


@router.get("/{pattern_id}/optimal-files")
async def get_optimal_files_for_pattern(
    pattern_id: int = Path(..., description="Pattern ID"),
    count: int = Query(20, ge=1, le=100, description="Number of optimal files to return"),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
    pattern_repo: PatternRepository = Depends(get_pattern_repository),
):
    """
    Get optimal files for a specific pattern (quick version of analysis)
    """
    try:
        # Get the pattern
        pattern = pattern_repo.get_pattern_by_id(pattern_id)
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")

        # Get optimal files with default settings
        result = await pattern_service.analyze_pattern_effectiveness_for_files(
            pattern_id=pattern_id,
            file_filters={},
            limit=count * 3,  # Analyze more to get best results
            quality_threshold=80  # Higher threshold for "optimal"
        )
        
        # Return only the top files
        optimal_files = result["ranked_files"][:count]
        
        return {
            "pattern_id": pattern_id,
            "pattern_name": pattern.name,
            "optimal_files": optimal_files,
            "total_analyzed": result["analyzed_files"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get optimal files: {str(e)}"
        )


# Selection history management endpoints
@router.post("/{pattern_id}/record-selection", response_model=Dict[str, Any])
async def record_pattern_selection(
    request: PatternSelectionRequest,
    pattern_id: int = Path(..., description="Pattern ID"),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """
    Record files that were auto-selected for a pattern
    """
    try:
        result = pattern_service.record_pattern_selection(
            pattern_id=pattern_id,
            file_ids=request.file_ids,
            selection_context=request.selection_context
        )
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to record selection: {str(e)}"
        )


@router.delete("/{pattern_id}/reset-selections", response_model=Dict[str, Any])
async def reset_pattern_selections(
    pattern_id: int = Path(..., description="Pattern ID to reset"),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """
    Reset selection history for a specific pattern
    """
    try:
        result = pattern_service.reset_pattern_selections(pattern_id)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to reset pattern selections: {str(e)}"
        )


@router.delete("/reset-all-selections", response_model=Dict[str, Any])
async def reset_all_selections(
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """
    Reset all selection history for all patterns
    """
    try:
        result = pattern_service.reset_all_selections()
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to reset all selections: {str(e)}"
        )


@router.get("/{pattern_id}/selection-history", response_model=Dict[str, Any])
async def get_pattern_selection_history(
    pattern_id: int = Path(..., description="Pattern ID"),
    pattern_service: PatternExtractionService = Depends(get_pattern_service),
):
    """
    Get selection history and statistics for a specific pattern
    """
    try:
        result = pattern_service.get_pattern_selection_history(pattern_id)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get selection history: {str(e)}"
        )
