"""
Async API routes for Smart File Operations with Real-time Updates

Key Features:
1. Full async/await pattern for all endpoints
2. WebSocket support for real-time job updates
3. Advanced job management (pause/resume/cancel)
4. Performance monitoring and statistics
5. Batch operations with progress tracking
6. Error recovery and retry mechanisms
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import asyncio
import json
import logging

from ...core.database import get_db
from ...repositories.file_repository import FileRepository
from ...services.async_smart_operations_service import AsyncSmartOperationsService

logger = logging.getLogger(__name__)

# Global service instance (in production, use dependency injection)
_service_instance: Optional[AsyncSmartOperationsService] = None

router = APIRouter(prefix="/api/v1/async-smart-operations", tags=["async-smart-operations"])


def get_async_service(db: Session = Depends(get_db)) -> AsyncSmartOperationsService:
    """Get or create async service instance"""
    global _service_instance
    if _service_instance is None:
        file_repo = FileRepository(db)
        _service_instance = AsyncSmartOperationsService(
            file_repository=file_repo,
            max_concurrent_operations=5,
            max_concurrent_files=10,
            enable_websockets=True
        )
    return _service_instance


# Pydantic models for request/response
class AsyncSmartOperationRequest(BaseModel):
    """Request model for creating async smart operations"""
    operation_type: str = Field(..., pattern="^(smart_copy|smart_move)$", description="Operation type")
    file_ids: List[int] = Field(..., min_items=1, description="List of file IDs to process")
    template: str = Field(..., min_length=1, description="Filename template with placeholders")
    target_directory: str = Field(..., min_length=1, description="Target directory path")
    conflict_resolution: str = Field("skip", pattern="^(skip|overwrite|rename)$", description="Conflict resolution strategy")
    create_backup: bool = Field(False, description="Create backup files before overwriting")
    pattern_id: Optional[int] = Field(None, description="Pattern ID to apply before processing")
    max_concurrent: int = Field(5, ge=1, le=20, description="Maximum concurrent file operations")
    priority: int = Field(0, ge=0, le=10, description="Job priority (higher = processed first)")


class BatchOperationRequest(BaseModel):
    """Request model for batch operations"""
    operations: List[AsyncSmartOperationRequest] = Field(..., min_items=1, max_items=10)
    execute_sequentially: bool = Field(False, description="Execute operations one by one")
    stop_on_error: bool = Field(True, description="Stop batch if any operation fails")


class JobControlRequest(BaseModel):
    """Request model for job control operations"""
    action: str = Field(..., pattern="^(pause|resume|cancel)$", description="Control action")


class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    type: str = Field(..., description="Message type")
    job_id: Optional[str] = Field(None, description="Job ID for job-specific messages")
    data: Optional[Dict[str, Any]] = Field(None, description="Message data")


# API Routes

@router.post("/operations", response_model=Dict[str, Any])
async def create_async_operation(
    request: AsyncSmartOperationRequest,
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """Create a new async smart file operation"""
    try:
        job_id = await service.create_smart_operation_async(
            operation_type=request.operation_type,
            file_ids=request.file_ids,
            template=request.template,
            target_directory=request.target_directory,
            conflict_resolution=request.conflict_resolution,
            create_backup=request.create_backup,
            pattern_id=request.pattern_id,
            max_concurrent=request.max_concurrent,
            priority=request.priority
        )
        
        return {
            "success": True,
            "message": "Async operation created and queued successfully",
            "job_id": job_id,
            "estimated_processing_time": f"{len(request.file_ids) / 10:.1f} seconds"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create async operation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create operation: {str(e)}")


@router.post("/batch", response_model=Dict[str, Any])
async def create_batch_operations(
    request: BatchOperationRequest,
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """Create multiple async operations as a batch"""
    try:
        job_ids = []
        errors = []
        
        for i, operation in enumerate(request.operations):
            try:
                # Adjust priority for sequential execution
                priority = operation.priority
                if request.execute_sequentially:
                    priority = len(request.operations) - i  # Higher priority for earlier operations
                
                job_id = await service.create_smart_operation_async(
                    operation_type=operation.operation_type,
                    file_ids=operation.file_ids,
                    template=operation.template,
                    target_directory=operation.target_directory,
                    conflict_resolution=operation.conflict_resolution,
                    create_backup=operation.create_backup,
                    pattern_id=operation.pattern_id,
                    max_concurrent=operation.max_concurrent,
                    priority=priority
                )
                job_ids.append(job_id)
                
            except Exception as e:
                error_msg = f"Operation {i+1}: {str(e)}"
                errors.append(error_msg)
                
                if request.stop_on_error:
                    break
        
        return {
            "success": len(job_ids) > 0,
            "message": f"Created {len(job_ids)} operations successfully",
            "job_ids": job_ids,
            "errors": errors,
            "total_operations": len(request.operations),
            "successful_operations": len(job_ids),
            "failed_operations": len(errors)
        }
    
    except Exception as e:
        logger.error(f"Failed to create batch operations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create batch: {str(e)}")


@router.get("/jobs/{job_id}", response_model=Dict[str, Any])
async def get_job_status(
    job_id: str,
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """Get detailed status of an async job"""
    try:
        status = await service.get_job_status_async(job_id)
        if not status:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        return {
            "success": True,
            "job": status
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")


@router.post("/jobs/{job_id}/control", response_model=Dict[str, Any])
async def control_job(
    job_id: str,
    request: JobControlRequest,
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """Control job execution (pause/resume/cancel)"""
    try:
        if request.action == "pause":
            success = await service.pause_job_async(job_id)
            action_msg = "paused"
        elif request.action == "resume":
            success = await service.resume_job_async(job_id)
            action_msg = "resumed"
        elif request.action == "cancel":
            success = await service.cancel_job_async(job_id)
            action_msg = "cancelled"
        else:
            raise HTTPException(status_code=400, detail=f"Invalid action: {request.action}")
        
        if not success:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot {request.action} job {job_id} (job not found or invalid state)"
            )
        
        return {
            "success": True,
            "message": f"Job {job_id} {action_msg} successfully",
            "job_id": job_id,
            "action": request.action
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to {request.action} job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to control job: {str(e)}")


@router.get("/jobs", response_model=Dict[str, Any])
async def list_jobs(
    status_filter: Optional[str] = Query(None, description="Filter by job status"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of jobs to return"),
    offset: int = Query(0, ge=0, description="Number of jobs to skip"),
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """List all jobs with optional filtering"""
    try:
        # Get all jobs (in production, implement pagination in service)
        all_jobs = []
        for job_id, job in service._active_jobs.items():
            if status_filter and job.status != status_filter:
                continue
            
            job_data = await service.get_job_status_async(job_id)
            if job_data:
                all_jobs.append(job_data)
        
        # Sort by creation time (most recent first)
        all_jobs.sort(key=lambda x: x.get('started_at', ''), reverse=True)
        
        # Apply pagination
        total_jobs = len(all_jobs)
        paginated_jobs = all_jobs[offset:offset + limit]
        
        return {
            "success": True,
            "jobs": paginated_jobs,
            "pagination": {
                "total": total_jobs,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_jobs
            }
        }
    
    except Exception as e:
        logger.error(f"Failed to list jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list jobs: {str(e)}")


@router.get("/stats", response_model=Dict[str, Any])
async def get_operation_stats(
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """Get operation statistics and performance metrics"""
    try:
        stats = await service.get_operation_stats_async()
        return {
            "success": True,
            "statistics": stats
        }
    
    except Exception as e:
        logger.error(f"Failed to get operation stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@router.delete("/jobs/cleanup")
async def cleanup_completed_jobs(
    older_than_hours: int = Query(24, ge=1, le=168, description="Remove jobs completed more than N hours ago"),
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """Clean up completed jobs older than specified time"""
    try:
        cleaned_count = await service.cleanup_completed_jobs(older_than_hours)
        
        return {
            "success": True,
            "message": f"Cleaned up {cleaned_count} completed jobs",
            "cleaned_jobs": cleaned_count,
            "older_than_hours": older_than_hours
        }
    
    except Exception as e:
        logger.error(f"Failed to cleanup jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup: {str(e)}")


# WebSocket endpoint for real-time updates
@router.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """WebSocket endpoint for real-time job updates"""
    await websocket.accept()
    service.add_websocket_connection(websocket)
    
    logger.info(f"WebSocket client {client_id} connected")
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection_confirmed",
            "client_id": client_id,
            "timestamp": "2025-08-25T12:00:00Z",
            "message": "Connected to async smart operations WebSocket"
        })
        
        # Keep connection alive and handle client messages
        while True:
            try:
                # Wait for messages from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle client requests
                if message.get("type") == "subscribe_job":
                    job_id = message.get("job_id")
                    if job_id:
                        # Send current job status
                        status = await service.get_job_status_async(job_id)
                        if status:
                            await websocket.send_json({
                                "type": "job_status",
                                "job_id": job_id,
                                "data": status
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "message": f"Job {job_id} not found"
                            })
                
                elif message.get("type") == "get_stats":
                    stats = await service.get_operation_stats_async()
                    await websocket.send_json({
                        "type": "stats",
                        "data": stats
                    })
                
                elif message.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": "2025-08-25T12:00:00Z"
                    })
            
            except asyncio.TimeoutError:
                # Send periodic heartbeat
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": "2025-08-25T12:00:00Z"
                })
            
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON message"
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
    finally:
        # Remove connection from service
        if websocket in service.websocket_connections:
            service.websocket_connections.remove(websocket)


# Health check endpoint
@router.get("/health")
async def health_check(
    service: AsyncSmartOperationsService = Depends(get_async_service)
):
    """Health check for async smart operations service"""
    try:
        stats = await service.get_operation_stats_async()
        
        return {
            "status": "healthy",
            "timestamp": "2025-08-25T12:00:00Z",
            "service": "AsyncSmartOperationsService",
            "active_jobs": stats.get("active_jobs", 0),
            "queued_jobs": stats.get("queued_jobs", 0),
            "total_operations": stats.get("total_operations", 0),
            "websocket_connections": len(service.websocket_connections)
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "timestamp": "2025-08-25T12:00:00Z",
                "error": str(e)
            }
        )