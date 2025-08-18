"""
API routes for Smart File Operations
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...services.smart_operations_service import SmartOperationsService

router = APIRouter(prefix="/api/v1/smart-operations", tags=["smart-operations"])


# Pydantic models for request/response
class CreateOperationRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Operation name")
    operation_type: str = Field(..., pattern="^(copy|move)$", description="Operation type: copy or move")
    source_pattern_id: int = Field(..., gt=0, description="Source pattern ID")
    target_directory: str = Field(..., min_length=1, description="Target directory path")
    target_template: str = Field(..., min_length=1, description="Target filename template with placeholders")
    created_by: Optional[str] = Field(None, description="User who created the operation")


class PreviewOperationRequest(BaseModel):
    source_pattern_id: int = Field(..., gt=0, description="Source pattern ID")
    target_directory: str = Field(..., min_length=1, description="Target directory path")
    target_template: str = Field(..., min_length=1, description="Target filename template with placeholders")
    limit: Optional[int] = Field(10, ge=1, le=50, description="Number of sample files to preview")


class OperationResponse(BaseModel):
    id: str
    name: str
    operation_type: str
    status: str
    source_pattern_id: int
    source_pattern_name: Optional[str]
    source_file_count: int
    target_directory: str
    target_template: str
    processed_files: int
    successful_files: int
    failed_files: int
    progress_percentage: float
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    duration_seconds: Optional[int]


class OperationListResponse(BaseModel):
    operations: list[Dict[str, Any]]
    total: int
    skip: int
    limit: int
    has_more: bool


class PreviewResponse(BaseModel):
    total_files: int
    sample_files: list[Dict[str, Any]]
    warnings: list[str]
    pattern_name: str
    target_directory: str
    target_template: str


# API Routes
@router.post("/", response_model=Dict[str, Any])
async def create_operation(
    request: CreateOperationRequest,
    db: Session = Depends(get_db)
):
    """Create a new Smart File Operation"""
    service = SmartOperationsService(db)
    
    try:
        operation = service.create_operation(
            name=request.name,
            operation_type=request.operation_type,
            source_pattern_id=request.source_pattern_id,
            target_directory=request.target_directory,
            target_template=request.target_template,
            created_by=request.created_by
        )
        
        return {
            "success": True,
            "message": "Operation created successfully",
            "operation": operation.to_dict()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create operation: {str(e)}")


@router.get("/", response_model=OperationListResponse)
async def get_operations_list(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    status_filter: Optional[str] = Query(None, pattern="^(pending|running|completed|failed|cancelled)$"),
    operation_type_filter: Optional[str] = Query(None, pattern="^(copy|move)$"),
    sort_by: str = Query("created_at", pattern="^(created_at|name|status|operation_type)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    """Get list of Smart File Operations with filtering and pagination"""
    service = SmartOperationsService(db)
    
    try:
        return service.get_operations_list(
            skip=skip,
            limit=limit,
            status_filter=status_filter,
            operation_type_filter=operation_type_filter,
            sort_by=sort_by,
            sort_order=sort_order
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get operations: {str(e)}")


@router.get("/{operation_id}", response_model=Dict[str, Any])
async def get_operation_by_id(
    operation_id: str,
    db: Session = Depends(get_db)
):
    """Get Smart File Operation by ID with full details"""
    service = SmartOperationsService(db)
    
    operation = service.get_operation_by_id(operation_id)
    if not operation:
        raise HTTPException(status_code=404, detail="Operation not found")
    
    return {
        "success": True,
        "operation": operation.to_dict()
    }


@router.get("/{operation_id}/files", response_model=Dict[str, Any])
async def get_operation_files(
    operation_id: str,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    status_filter: Optional[str] = Query(None, pattern="^(pending|processing|completed|failed)$"),
    db: Session = Depends(get_db)
):
    """Get files for a Smart File Operation"""
    service = SmartOperationsService(db)
    
    try:
        result = service.get_operation_files(
            operation_id=operation_id,
            status_filter=status_filter,
            skip=skip,
            limit=limit
        )
        
        return {
            "success": True,
            **result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get operation files: {str(e)}")


@router.delete("/{operation_id}", response_model=Dict[str, Any])
async def delete_operation(
    operation_id: str,
    db: Session = Depends(get_db)
):
    """Delete Smart File Operation (only if pending)"""
    service = SmartOperationsService(db)
    
    try:
        success = service.delete_operation(operation_id)
        
        if success:
            return {
                "success": True,
                "message": "Operation deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete operation")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete operation: {str(e)}")


@router.post("/preview", response_model=PreviewResponse)
async def preview_operation(
    request: PreviewOperationRequest,
    db: Session = Depends(get_db)
):
    """Preview what a Smart File Operation would do without creating it"""
    service = SmartOperationsService(db)
    
    try:
        return service.preview_operation(
            source_pattern_id=request.source_pattern_id,
            target_directory=request.target_directory,
            target_template=request.target_template,
            limit=request.limit
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview operation: {str(e)}")


@router.get("/by-pattern/{pattern_id}", response_model=Dict[str, Any])
async def get_operations_by_pattern(
    pattern_id: int,
    db: Session = Depends(get_db)
):
    """Get all Smart File Operations that use a specific pattern"""
    service = SmartOperationsService(db)
    
    try:
        operations = service.get_operations_by_pattern(pattern_id)
        
        return {
            "success": True,
            "operations": [op.to_summary_dict() for op in operations],
            "total": len(operations)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get operations by pattern: {str(e)}")


@router.get("/statistics/overview", response_model=Dict[str, Any])
async def get_operations_statistics(
    db: Session = Depends(get_db)
):
    """Get Smart File Operations statistics"""
    service = SmartOperationsService(db)
    
    try:
        stats = service.get_statistics()
        
        return {
            "success": True,
            "statistics": stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


# Execution control endpoints (for future job processing)
@router.post("/{operation_id}/start", response_model=Dict[str, Any])
async def start_operation_execution(
    operation_id: str,
    db: Session = Depends(get_db)
):
    """Start executing a Smart File Operation"""
    service = SmartOperationsService(db)
    
    try:
        operation = service.start_operation_execution(operation_id)
        
        return {
            "success": True,
            "message": "Operation execution started",
            "operation": operation.to_dict()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start operation: {str(e)}")


@router.post("/{operation_id}/complete", response_model=Dict[str, Any])
async def complete_operation_execution(
    operation_id: str,
    result_data: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
):
    """Mark Smart File Operation as completed"""
    service = SmartOperationsService(db)
    
    try:
        operation = service.complete_operation_execution(operation_id, result_data)
        
        return {
            "success": True,
            "message": "Operation marked as completed",
            "operation": operation.to_dict()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete operation: {str(e)}")


@router.post("/{operation_id}/fail", response_model=Dict[str, Any])
async def fail_operation_execution(
    operation_id: str,
    error_details: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
):
    """Mark Smart File Operation as failed"""
    service = SmartOperationsService(db)
    
    try:
        operation = service.fail_operation_execution(operation_id, error_details)
        
        return {
            "success": True,
            "message": "Operation marked as failed",
            "operation": operation.to_dict()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fail operation: {str(e)}")


class UpdateProgressRequest(BaseModel):
    processed_files: int = Field(..., ge=0)
    successful_files: int = Field(..., ge=0)
    failed_files: int = Field(..., ge=0)
    result_data: Optional[Dict[str, Any]] = None

@router.put("/{operation_id}/progress", response_model=Dict[str, Any])
async def update_operation_progress(
    operation_id: str,
    request: UpdateProgressRequest,
    db: Session = Depends(get_db)
):
    """Update Smart File Operation progress"""
    service = SmartOperationsService(db)
    
    try:
        operation = service.update_operation_progress(
            operation_id=operation_id,
            processed_files=request.processed_files,
            successful_files=request.successful_files,
            failed_files=request.failed_files,
            result_data=request.result_data
        )
        
        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        return {
            "success": True,
            "message": "Operation progress updated",
            "operation": operation.to_dict()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")