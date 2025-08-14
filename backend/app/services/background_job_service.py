import asyncio
import uuid
import time
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from enum import Enum

from app.repositories.pattern_repository import PatternExtractionJobRepository
from app.repositories.file_repository import IndexingJobRepository


class JobStatus(Enum):
    """Job status enumeration"""
    STARTED = "started"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


class JobPriority(Enum):
    """Job priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class JobProgress:
    """Job progress information"""
    processed: int
    total: int
    current_item: Optional[str] = None
    stage: Optional[str] = None
    
    @property
    def percentage(self) -> float:
        """Calculate completion percentage"""
        return (self.processed / self.total * 100) if self.total > 0 else 0


class BackgroundJob:
    """Individual background job"""
    
    def __init__(
        self,
        job_id: str,
        job_type: str,
        task_func: Callable,
        job_data: Dict,
        priority: JobPriority = JobPriority.NORMAL,
        timeout_minutes: int = 60
    ):
        self.job_id = job_id
        self.job_type = job_type
        self.task_func = task_func
        self.job_data = job_data
        self.priority = priority
        self.timeout_minutes = timeout_minutes
        
        self.status = JobStatus.STARTED
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.error_message: Optional[str] = None
        self.result_data: Optional[Dict] = None
        
        self.progress = JobProgress(0, job_data.get('total_count', 1))
        self.cancel_requested = False
        
    def update_progress(
        self, 
        processed: int, 
        current_item: Optional[str] = None,
        stage: Optional[str] = None
    ):
        """Update job progress"""
        self.progress.processed = processed
        if current_item:
            self.progress.current_item = current_item
        if stage:
            self.progress.stage = stage
    
    def complete(self, result_data: Optional[Dict] = None):
        """Mark job as completed"""
        self.status = JobStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.result_data = result_data
    
    def fail(self, error_message: str):
        """Mark job as failed"""
        self.status = JobStatus.ERROR
        self.completed_at = datetime.utcnow()
        self.error_message = error_message
    
    def cancel(self):
        """Request job cancellation"""
        self.cancel_requested = True
        if self.status in [JobStatus.STARTED, JobStatus.PROCESSING]:
            self.status = JobStatus.CANCELLED
            self.completed_at = datetime.utcnow()
    
    def to_dict(self) -> Dict:
        """Convert job to dictionary"""
        duration = None
        if self.started_at and self.completed_at:
            duration = (self.completed_at - self.started_at).total_seconds()
        
        return {
            'job_id': self.job_id,
            'job_type': self.job_type,
            'status': self.status.value,
            'priority': self.priority.value,
            'progress': {
                'processed': self.progress.processed,
                'total': self.progress.total,
                'percentage': self.progress.percentage,
                'current_item': self.progress.current_item,
                'stage': self.progress.stage
            },
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': duration,
            'error_message': self.error_message,
            'result_data': self.result_data
        }


class BackgroundJobService:
    """Service for managing background jobs"""
    
    def __init__(
        self,
        pattern_job_repo: PatternExtractionJobRepository,
        indexing_job_repo: IndexingJobRepository,
        max_workers: int = 4,
        max_concurrent_jobs: int = 10
    ):
        self.pattern_job_repo = pattern_job_repo
        self.indexing_job_repo = indexing_job_repo
        self.max_workers = max_workers
        self.max_concurrent_jobs = max_concurrent_jobs
        
        # Job management
        self.active_jobs: Dict[str, BackgroundJob] = {}
        self.job_queue: List[BackgroundJob] = []
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
        # Service state
        self.is_running = False
        self._shutdown_requested = False
        
        # Job type handlers
        self.job_handlers = {}
        
    def register_job_handler(self, job_type: str, handler: Callable):
        """Register a handler for a specific job type"""
        self.job_handlers[job_type] = handler
    
    async def start_service(self):
        """Start the background job service"""
        if self.is_running:
            return
        
        self.is_running = True
        self._shutdown_requested = False
        
        # Start job processor
        asyncio.create_task(self._job_processor())
        
        print("Background job service started")
    
    async def stop_service(self):
        """Stop the background job service"""
        self._shutdown_requested = True
        
        # Cancel all pending jobs
        for job in self.job_queue:
            job.cancel()
        
        # Wait for active jobs to complete (with timeout)
        timeout = 30  # seconds
        start_time = time.time()
        
        while self.active_jobs and (time.time() - start_time) < timeout:
            await asyncio.sleep(1)
        
        # Force cancel remaining jobs
        for job in self.active_jobs.values():
            job.cancel()
        
        self.executor.shutdown(wait=False)
        self.is_running = False
        
        print("Background job service stopped")
    
    def submit_job(
        self,
        job_type: str,
        job_data: Dict,
        priority: JobPriority = JobPriority.NORMAL,
        timeout_minutes: int = 60
    ) -> str:
        """
        Submit a new background job
        
        Args:
            job_type: Type of job to execute
            job_data: Data needed for job execution
            priority: Job priority level
            timeout_minutes: Job timeout in minutes
            
        Returns:
            job_id: Unique job identifier
        """
        if not self.is_running:
            raise RuntimeError("Background job service is not running")
        
        if job_type not in self.job_handlers:
            raise ValueError(f"Unknown job type: {job_type}")
        
        job_id = str(uuid.uuid4())
        task_func = self.job_handlers[job_type]
        
        job = BackgroundJob(
            job_id=job_id,
            job_type=job_type,
            task_func=task_func,
            job_data=job_data,
            priority=priority,
            timeout_minutes=timeout_minutes
        )
        
        # Add to queue (will be sorted by priority)
        self.job_queue.append(job)
        self.job_queue.sort(key=lambda j: j.priority.value, reverse=True)
        
        # Persist job to database
        self._persist_job_start(job)
        
        print(f"Job {job_id} ({job_type}) submitted to queue")
        return job_id
    
    def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get current status of a job"""
        # Check active jobs first
        if job_id in self.active_jobs:
            return self.active_jobs[job_id].to_dict()
        
        # Check queued jobs
        for job in self.job_queue:
            if job.job_id == job_id:
                return job.to_dict()
        
        # Check database for completed/failed jobs
        if job_id.count('-') == 4:  # UUID format
            # Pattern extraction job
            db_job = self.pattern_job_repo.get_job_by_id(job_id)
            if db_job:
                return db_job.to_dict()
        else:
            # Indexing job
            db_job = self.indexing_job_repo.get_job_by_id(job_id)
            if db_job:
                return db_job.to_dict()
        
        return None
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a job"""
        # Check active jobs
        if job_id in self.active_jobs:
            self.active_jobs[job_id].cancel()
            return True
        
        # Check queued jobs
        for i, job in enumerate(self.job_queue):
            if job.job_id == job_id:
                job.cancel()
                self.job_queue.pop(i)
                self._persist_job_completion(job)
                return True
        
        return False
    
    def get_active_jobs(self) -> List[Dict]:
        """Get list of all active jobs"""
        return [job.to_dict() for job in self.active_jobs.values()]
    
    def get_queued_jobs(self) -> List[Dict]:
        """Get list of all queued jobs"""
        return [job.to_dict() for job in self.job_queue]
    
    def get_service_stats(self) -> Dict:
        """Get service statistics"""
        return {
            'is_running': self.is_running,
            'active_jobs': len(self.active_jobs),
            'queued_jobs': len(self.job_queue),
            'max_workers': self.max_workers,
            'max_concurrent_jobs': self.max_concurrent_jobs,
            'registered_job_types': list(self.job_handlers.keys())
        }
    
    async def _job_processor(self):
        """Main job processing loop"""
        while not self._shutdown_requested:
            try:
                # Check if we can start new jobs
                if (len(self.active_jobs) < self.max_concurrent_jobs and 
                    self.job_queue and 
                    self.is_running):
                    
                    # Get next job from queue (highest priority first)
                    job = self.job_queue.pop(0)
                    
                    # Move to active jobs
                    self.active_jobs[job.job_id] = job
                    
                    # Start job execution
                    asyncio.create_task(self._execute_job(job))
                
                # Clean up completed jobs
                completed_jobs = [
                    job_id for job_id, job in self.active_jobs.items()
                    if job.status in [JobStatus.COMPLETED, JobStatus.ERROR, JobStatus.CANCELLED]
                ]
                
                for job_id in completed_jobs:
                    del self.active_jobs[job_id]
                
                # Wait before next iteration
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"Error in job processor: {str(e)}")
                await asyncio.sleep(5)
    
    async def _execute_job(self, job: BackgroundJob):
        """Execute a background job"""
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.utcnow()
        
        try:
            print(f"Starting job {job.job_id} ({job.job_type})")
            
            # Update database
            self._persist_job_progress(job)
            
            # Execute job with timeout
            try:
                # Run job in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                result = await asyncio.wait_for(
                    loop.run_in_executor(
                        self.executor,
                        self._run_job_sync,
                        job
                    ),
                    timeout=job.timeout_minutes * 60
                )
                
                job.complete(result)
                print(f"Job {job.job_id} completed successfully")
                
            except asyncio.TimeoutError:
                job.fail(f"Job timeout after {job.timeout_minutes} minutes")
                print(f"Job {job.job_id} timed out")
            
            except Exception as e:
                job.fail(f"Job execution failed: {str(e)}")
                print(f"Job {job.job_id} failed: {str(e)}")
        
        except Exception as e:
            job.fail(f"Critical job error: {str(e)}")
            print(f"Critical error in job {job.job_id}: {str(e)}")
        
        finally:
            # Persist final job state
            self._persist_job_completion(job)
    
    def _run_job_sync(self, job: BackgroundJob) -> Optional[Dict]:
        """Run job synchronously (called from thread pool)"""
        try:
            # Call the job handler with progress callback
            def progress_callback(processed: int, current_item: str = None, stage: str = None):
                job.update_progress(processed, current_item, stage)
                # Check for cancellation
                if job.cancel_requested:
                    raise InterruptedError("Job was cancelled")
            
            # Execute the actual job function
            result = job.task_func(job.job_data, progress_callback)
            return result
            
        except InterruptedError:
            raise  # Re-raise cancellation
        except Exception as e:
            raise RuntimeError(f"Job handler failed: {str(e)}")
    
    def _persist_job_start(self, job: BackgroundJob):
        """Persist job start to database"""
        try:
            if job.job_type.startswith('pattern_'):
                # Pattern extraction job
                job_data = {
                    'id': job.job_id,
                    'job_type': job.job_type,
                    'file_ids': job.job_data.get('file_ids', []),
                    'pattern_ids': job.job_data.get('pattern_ids', []),
                    'status': job.status.value,
                    'total_count': job.progress.total,
                    'processed_count': 0
                }
                self.pattern_job_repo.create_job(job_data)
            
            elif job.job_type.startswith('indexing_'):
                # File indexing job
                job_data = {
                    'id': job.job_id,
                    'directory_path': job.job_data.get('directory_path', ''),
                    'status': job.status.value,
                    'stage': 'initializing',
                    'total_count': job.progress.total,
                    'processed_count': 0
                }
                self.indexing_job_repo.create_job(job_data)
                
        except Exception as e:
            print(f"Failed to persist job start for {job.job_id}: {str(e)}")
    
    def _persist_job_progress(self, job: BackgroundJob):
        """Persist job progress to database"""
        try:
            update_data = {
                'status': job.status.value,
                'processed_count': job.progress.processed,
                'stage': job.progress.stage or job.progress.current_item
            }
            
            if job.job_type.startswith('pattern_'):
                self.pattern_job_repo.update_job_progress(job.job_id, update_data)
            elif job.job_type.startswith('indexing_'):
                self.indexing_job_repo.update_job_progress(job.job_id, update_data)
                
        except Exception as e:
            print(f"Failed to persist job progress for {job.job_id}: {str(e)}")
    
    def _persist_job_completion(self, job: BackgroundJob):
        """Persist job completion to database"""
        try:
            update_data = {
                'status': job.status.value,
                'processed_count': job.progress.processed,
                'completed_at': job.completed_at or datetime.utcnow(),
                'error_message': job.error_message,
                'result_data': job.result_data
            }
            
            if job.job_type.startswith('pattern_'):
                # Add pattern-specific completion data
                if job.result_data:
                    update_data.update({
                        'successful_extractions': job.result_data.get('successful', 0),
                        'failed_extractions': job.result_data.get('failed', 0)
                    })
                
                self.pattern_job_repo.update_job_progress(job.job_id, update_data)
            
            elif job.job_type.startswith('indexing_'):
                # Add indexing-specific completion data
                if job.result_data:
                    update_data.update({
                        'newly_indexed': job.result_data.get('newly_indexed', 0),
                        'already_indexed': job.result_data.get('already_indexed', 0)
                    })
                
                self.indexing_job_repo.update_job_progress(job.job_id, update_data)
                
        except Exception as e:
            print(f"Failed to persist job completion for {job.job_id}: {str(e)}")


# Job handler decorators and utilities
def background_job(job_type: str):
    """Decorator to register a function as a background job handler"""
    def decorator(func):
        func._job_type = job_type
        return func
    return decorator


class JobProgressTracker:
    """Utility class for tracking job progress"""
    
    def __init__(self, total_items: int, progress_callback: Callable):
        self.total_items = total_items
        self.progress_callback = progress_callback
        self.processed_items = 0
        self.current_stage = None
    
    def update(self, increment: int = 1, current_item: str = None, stage: str = None):
        """Update progress"""
        self.processed_items += increment
        
        if stage and stage != self.current_stage:
            self.current_stage = stage
            print(f"Job stage: {stage}")
        
        # Call the callback
        self.progress_callback(
            processed=self.processed_items,
            current_item=current_item,
            stage=stage or self.current_stage
        )
    
    def set_stage(self, stage: str):
        """Set current processing stage"""
        self.current_stage = stage
        self.progress_callback(
            processed=self.processed_items,
            stage=stage
        )
    
    def complete_item(self, item_name: str = None):
        """Mark one item as completed"""
        self.update(1, item_name)
    
    @property
    def percentage_complete(self) -> float:
        """Get completion percentage"""
        return (self.processed_items / self.total_items * 100) if self.total_items > 0 else 0


# Singleton instance (will be initialized in main application)
_job_service_instance: Optional[BackgroundJobService] = None


def get_job_service() -> BackgroundJobService:
    """Get the global job service instance"""
    global _job_service_instance
    if _job_service_instance is None:
        raise RuntimeError("Background job service not initialized")
    return _job_service_instance


def initialize_job_service(
    pattern_job_repo: PatternExtractionJobRepository,
    indexing_job_repo: IndexingJobRepository,
    max_workers: int = 4,
    max_concurrent_jobs: int = 10
) -> BackgroundJobService:
    """Initialize the global job service instance"""
    global _job_service_instance
    _job_service_instance = BackgroundJobService(
        pattern_job_repo=pattern_job_repo,
        indexing_job_repo=indexing_job_repo,
        max_workers=max_workers,
        max_concurrent_jobs=max_concurrent_jobs
    )
    return _job_service_instance


# Example job handlers
@background_job('pattern_batch_extraction')
def handle_pattern_batch_extraction(job_data: Dict, progress_callback: Callable) -> Dict:
    """Handle batch pattern extraction job"""
    from app.services.pattern_extraction_service import PatternExtractionService
    from app.core.database import get_db
    from app.repositories.file_repository import FileRepository
    from app.repositories.pattern_repository import (
        PatternRepository, PatternApplicationRepository, 
        PatternFailureRepository, PatternExtractionJobRepository
    )
    
    # Initialize service dependencies (this would be handled differently in real app)
    db = next(get_db())
    service = PatternExtractionService(
        FileRepository(db),
        PatternRepository(db),
        PatternApplicationRepository(db),
        PatternFailureRepository(db),
        PatternExtractionJobRepository(db)
    )
    
    file_ids = job_data['file_ids']
    force_reapply = job_data.get('force_reapply', False)
    
    tracker = JobProgressTracker(len(file_ids), progress_callback)
    
    successful = 0
    failed = 0
    results = []
    
    tracker.set_stage("extracting_metadata")
    
    for file_id in file_ids:
        try:
            # This would need to be adapted for sync execution
            result = service.extract_metadata_for_file(file_id, force_reapply)
            
            if result['success']:
                successful += 1
            else:
                failed += 1
            
            results.append({
                'file_id': file_id,
                'success': result['success'],
                'error': result.get('error')
            })
            
            tracker.complete_item(f"file_{file_id}")
            
        except Exception as e:
            failed += 1
            results.append({
                'file_id': file_id,
                'success': False,
                'error': str(e)
            })
            tracker.complete_item(f"file_{file_id}")
    
    return {
        'successful': successful,
        'failed': failed,
        'total_processed': len(file_ids),
        'success_rate': successful / len(file_ids) * 100 if file_ids else 0,
        'results': results[:100]  # Limit stored results
    }


@background_job('indexing_directory_scan')
def handle_directory_indexing(job_data: Dict, progress_callback: Callable) -> Dict:
    """Handle directory indexing job"""
    from app.services.file_indexing_service import FileIndexingService
    from app.core.database import get_db
    from app.repositories.file_repository import (
        FileRepository, ExclusionPatternRepository, IndexingJobRepository
    )
    
    # Initialize service dependencies
    db = next(get_db())
    service = FileIndexingService(
        FileRepository(db),
        ExclusionPatternRepository(db),
        IndexingJobRepository(db)
    )
    
    directory_path = job_data['directory_path']
    
    # This would need to be adapted for sync execution
    # For now, return a placeholder result
    return {
        'newly_indexed': 0,
        'already_indexed': 0,
        'total_files': 0,
        'errors': []
    }