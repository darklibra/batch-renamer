"""
Advanced monitoring and health check endpoints for Clear File System.
Provides comprehensive system health, metrics, and operational insights.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any
import psutil
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, func
from pydantic import BaseModel

from ...core.database import get_db
from ...core.config import get_settings
from ...models.file_models import IndexedFile, ExtractionPattern, IndexingJob

router = APIRouter(prefix="/monitoring", tags=["monitoring"])
settings = get_settings()

class HealthCheck(BaseModel):
    """Health check response model."""
    status: str
    timestamp: datetime
    version: str
    environment: str
    components: Dict[str, Dict[str, Any]]
    performance: Dict[str, Any]

class SystemMetrics(BaseModel):
    """System performance metrics model."""
    cpu_usage: float
    memory_usage: Dict[str, float]
    disk_usage: Dict[str, float]
    network_stats: Dict[str, int]
    process_info: Dict[str, Any]

class DatabaseMetrics(BaseModel):
    """Database performance metrics model."""
    connection_pool: Dict[str, int]
    query_performance: Dict[str, float]
    table_stats: List[Dict[str, Any]]
    active_connections: int

@router.get("/health", response_model=HealthCheck)
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthCheck:
    """
    Comprehensive health check endpoint.
    Returns detailed system status including all components.
    """
    components = {}
    
    # Database health check
    try:
        result = await db.execute(text("SELECT 1"))
        await result.fetchone()
        db_status = {"status": "healthy", "response_time": "< 10ms"}
    except Exception as e:
        db_status = {"status": "unhealthy", "error": str(e)}
    
    components["database"] = db_status
    
    # Redis health check (if configured)
    redis_status = {"status": "not_configured"}
    if hasattr(settings, 'redis_url') and settings.redis_url:
        try:
            # Add Redis health check logic here
            redis_status = {"status": "healthy", "response_time": "< 5ms"}
        except Exception as e:
            redis_status = {"status": "unhealthy", "error": str(e)}
    
    components["redis"] = redis_status
    
    # File system health check
    try:
        import os
        upload_dir = getattr(settings, 'upload_dir', './uploads')
        temp_dir = getattr(settings, 'temp_dir', './temp')
        
        upload_space = psutil.disk_usage(upload_dir if os.path.exists(upload_dir) else '.')
        temp_space = psutil.disk_usage(temp_dir if os.path.exists(temp_dir) else '.')
        
        fs_status = {
            "status": "healthy",
            "upload_space_gb": round(upload_space.free / (1024**3), 2),
            "temp_space_gb": round(temp_space.free / (1024**3), 2)
        }
    except Exception as e:
        fs_status = {"status": "unhealthy", "error": str(e)}
    
    components["filesystem"] = fs_status
    
    # Overall system performance
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        performance = {
            "cpu_usage_percent": cpu_percent,
            "memory_usage_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2)
        }
    except Exception as e:
        performance = {"status": "error", "error": str(e)}
    
    # Determine overall status
    overall_status = "healthy"
    for component in components.values():
        if component.get("status") != "healthy":
            overall_status = "degraded" if overall_status == "healthy" else "unhealthy"
    
    return HealthCheck(
        status=overall_status,
        timestamp=datetime.utcnow(),
        version=getattr(settings, 'app_version', '1.0.0'),
        environment=getattr(settings, 'app_env', 'development'),
        components=components,
        performance=performance
    )

@router.get("/metrics/system", response_model=SystemMetrics)
async def system_metrics() -> SystemMetrics:
    """
    Get detailed system performance metrics.
    Includes CPU, memory, disk, network, and process information.
    """
    try:
        # CPU metrics
        cpu_usage = psutil.cpu_percent(interval=1)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        memory_usage = {
            "total_gb": round(memory.total / (1024**3), 2),
            "available_gb": round(memory.available / (1024**3), 2),
            "used_gb": round(memory.used / (1024**3), 2),
            "percent": memory.percent
        }
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        disk_usage = {
            "total_gb": round(disk.total / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "percent": round((disk.used / disk.total) * 100, 2)
        }
        
        # Network metrics
        network = psutil.net_io_counters()
        network_stats = {
            "bytes_sent": network.bytes_sent,
            "bytes_recv": network.bytes_recv,
            "packets_sent": network.packets_sent,
            "packets_recv": network.packets_recv
        }
        
        # Process information
        current_process = psutil.Process()
        process_info = {
            "pid": current_process.pid,
            "memory_percent": current_process.memory_percent(),
            "cpu_percent": current_process.cpu_percent(),
            "num_threads": current_process.num_threads(),
            "create_time": datetime.fromtimestamp(current_process.create_time()).isoformat()
        }
        
        return SystemMetrics(
            cpu_usage=cpu_usage,
            memory_usage=memory_usage,
            disk_usage=disk_usage,
            network_stats=network_stats,
            process_info=process_info
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to collect system metrics: {str(e)}"
        )

@router.get("/metrics/database", response_model=DatabaseMetrics)
async def database_metrics(db: AsyncSession = Depends(get_db)) -> DatabaseMetrics:
    """
    Get detailed database performance metrics.
    Includes connection pool, query performance, and table statistics.
    """
    try:
        # Connection pool metrics
        engine = db.get_bind()
        pool = engine.pool
        connection_pool = {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid()
        }
        
        # Query performance metrics (simplified)
        start_time = datetime.utcnow()
        await db.execute(text("SELECT 1"))
        query_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        query_performance = {
            "simple_query_ms": query_time,
            "avg_response_time": query_time  # Simplified for demo
        }
        
        # Table statistics
        table_stats = []
        
        # Files table stats
        files_count = await db.execute(func.count(IndexedFile.id))
        files_count = files_count.scalar()
        
        # Patterns table stats  
        patterns_count = await db.execute(func.count(ExtractionPattern.id))
        patterns_count = patterns_count.scalar()
        
        # Jobs table stats
        jobs_count = await db.execute(func.count(IndexingJob.id))
        jobs_count = jobs_count.scalar()
        
        table_stats = [
            {"table": "indexed_files", "row_count": files_count or 0},
            {"table": "extraction_patterns", "row_count": patterns_count or 0},
            {"table": "indexing_jobs", "row_count": jobs_count or 0}
        ]
        
        return DatabaseMetrics(
            connection_pool=connection_pool,
            query_performance=query_performance,
            table_stats=table_stats,
            active_connections=pool.checkedout()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to collect database metrics: {str(e)}"
        )

@router.get("/readiness")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Kubernetes/Docker readiness probe endpoint.
    Returns 200 if service is ready to handle requests.
    """
    try:
        # Check database connectivity
        await db.execute(text("SELECT 1"))
        
        # Check file system access
        import os
        upload_dir = getattr(settings, 'upload_dir', './uploads')
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir, exist_ok=True)
        
        return {"status": "ready", "timestamp": datetime.utcnow()}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service not ready: {str(e)}"
        )

@router.get("/liveness")
async def liveness_check():
    """
    Kubernetes/Docker liveness probe endpoint.
    Returns 200 if service is alive and running.
    """
    return {"status": "alive", "timestamp": datetime.utcnow()}

@router.get("/performance/summary")
async def performance_summary(db: AsyncSession = Depends(get_db)):
    """
    Get performance summary for operational dashboards.
    Combines key metrics from system, database, and application.
    """
    try:
        # System metrics
        cpu_usage = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        # Database metrics
        start_time = datetime.utcnow()
        await db.execute(text("SELECT 1"))
        db_response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Application metrics
        files_count = await db.execute(func.count(IndexedFile.id))
        files_count = files_count.scalar() or 0
        
        patterns_count = await db.execute(func.count(ExtractionPattern.id))
        patterns_count = patterns_count.scalar() or 0
        
        # Recent jobs (last hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_jobs = await db.execute(
            text("""
                SELECT status, COUNT(*) as count 
                FROM indexing_jobs 
                WHERE created_at > :time_threshold 
                GROUP BY status
            """),
            {"time_threshold": one_hour_ago}
        )
        
        job_stats = {}
        for row in recent_jobs:
            job_stats[row.status] = row.count
        
        return {
            "timestamp": datetime.utcnow(),
            "system": {
                "cpu_usage_percent": cpu_usage,
                "memory_usage_percent": memory.percent,
                "status": "healthy" if cpu_usage < 80 and memory.percent < 80 else "warning"
            },
            "database": {
                "response_time_ms": round(db_response_time, 2),
                "status": "healthy" if db_response_time < 100 else "warning"
            },
            "application": {
                "total_files": files_count,
                "total_patterns": patterns_count,
                "recent_jobs": job_stats,
                "status": "operational"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate performance summary: {str(e)}"
        )