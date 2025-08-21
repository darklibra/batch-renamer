"""
File Indexing Job Manager - Manages indexing job lifecycle

This service handles the orchestration of indexing jobs with progress tracking,
cancellation support, and result aggregation.
"""

import asyncio
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import logging

from app.domain.file.interfaces import FileIndexingJobInterface, FileIndexerInterface
from app.repositories.file_repository import IndexingJobRepository, FileRepository
from app.models.file_models import IndexingJob, IndexedFile

logger = logging.getLogger(__name__)


class FileIndexingJobManager(FileIndexingJobInterface):
    """
    Manages the lifecycle of file indexing jobs
    
    Provides job orchestration with:
    - Progress tracking and reporting
    - Cancellation support
    - Result aggregation and storage
    - Error handling and recovery
    """

    def __init__(
        self,
        file_indexer: FileIndexerInterface,
        job_repository: IndexingJobRepository,
        file_repository: FileRepository,
        max_concurrent_jobs: int = 3
    ):
        """
        Initialize the job manager
        
        Args:
            file_indexer: Core indexing service
            job_repository: Repository for job persistence
            file_repository: Repository for file persistence
            max_concurrent_jobs: Maximum number of concurrent indexing jobs
        """
        self._indexer = file_indexer
        self._job_repo = job_repository
        self._file_repo = file_repository
        self._max_concurrent_jobs = max_concurrent_jobs
        
        # Job tracking
        self._active_jobs: Dict[str, Dict[str, Any]] = {}
        self._job_semaphore = asyncio.Semaphore(max_concurrent_jobs)
        
        logger.info(f"FileIndexingJobManager initialized (max concurrent jobs: {max_concurrent_jobs})")

    async def start_indexing_job(
        self, 
        directory_path: str, 
        scan_config: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Start a new file indexing job
        """
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        try:
            # Validate the directory path first
            validation_result = await self._indexer.validate_scan_path(directory_path)
            if not validation_result['is_valid']:
                raise ValueError(f"Invalid directory path: {validation_result['message']}")
            
            # Create job record
            job = IndexingJob(
                id=job_id,
                directory_path=directory_path,
                status='queued',
                stage='initialization',
                progress_data={
                    'total_files': 0,
                    'processed_files': 0,
                    'current_directory': directory_path,
                    'start_time': datetime.utcnow().isoformat()
                },
                created_at=datetime.utcnow()
            )
            
            # Save job to repository
            saved_job = await self._job_repo.create_job(job)
            
            # Initialize job tracking
            self._active_jobs[job_id] = {
                'status': 'queued',
                'cancel_event': asyncio.Event(),
                'task': None,
                'stats': {
                    'files_found': 0,
                    'files_indexed': 0,
                    'errors': 0,
                    'directories_scanned': 0
                }
            }
            
            # Start the job execution asynchronously
            task = asyncio.create_task(self._execute_indexing_job(job_id, directory_path, scan_config or {}))
            self._active_jobs[job_id]['task'] = task
            
            logger.info(f"Started indexing job {job_id} for directory: {directory_path}")
            
            return job_id
            
        except Exception as e:
            logger.error(f"Failed to start indexing job: {str(e)}")
            # Clean up failed job
            if job_id in self._active_jobs:
                del self._active_jobs[job_id]
            raise

    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get current status of an indexing job
        """
        try:
            # Get job from repository
            job = await self._job_repo.get_job_by_id(job_id)
            if not job:
                return {
                    'error': f'Job {job_id} not found',
                    'status': 'not_found'
                }
            
            # Get runtime stats if job is active
            runtime_stats = {}
            if job_id in self._active_jobs:
                runtime_stats = self._active_jobs[job_id]['stats'].copy()
            
            return {
                'job_id': job_id,
                'status': job.status,
                'stage': job.stage,
                'directory_path': job.directory_path,
                'progress_data': job.progress_data,
                'runtime_stats': runtime_stats,
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                'result_data': job.result_data
            }
            
        except Exception as e:
            logger.error(f"Failed to get job status for {job_id}: {str(e)}")
            return {
                'error': f'Failed to get job status: {str(e)}',
                'status': 'error'
            }

    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running indexing job
        """
        try:
            if job_id not in self._active_jobs:
                logger.warning(f"Cannot cancel job {job_id}: not found in active jobs")
                return False
            
            job_info = self._active_jobs[job_id]
            
            # Set cancellation event
            job_info['cancel_event'].set()
            
            # Cancel the task if it exists
            if job_info['task'] and not job_info['task'].done():
                job_info['task'].cancel()
            
            # Update job status in repository
            await self._job_repo.update_job_status(
                job_id, 
                'cancelled', 
                stage='cancelled',
                progress_data={'cancellation_time': datetime.utcnow().isoformat()}
            )
            
            logger.info(f"Job {job_id} cancellation requested")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel job {job_id}: {str(e)}")
            return False

    async def get_job_results(self, job_id: str) -> Dict[str, Any]:
        """
        Get results from a completed indexing job
        """
        try:
            job = await self._job_repo.get_job_by_id(job_id)
            if not job:
                return {
                    'error': f'Job {job_id} not found',
                    'status': 'not_found'
                }
            
            # Return comprehensive job results
            return {
                'job_id': job_id,
                'status': job.status,
                'directory_path': job.directory_path,
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                'duration_seconds': self._calculate_job_duration(job),
                'result_data': job.result_data or {},
                'progress_data': job.progress_data or {}
            }
            
        except Exception as e:
            logger.error(f"Failed to get job results for {job_id}: {str(e)}")
            return {
                'error': f'Failed to get job results: {str(e)}',
                'status': 'error'
            }

    async def _execute_indexing_job(
        self, 
        job_id: str, 
        directory_path: str, 
        scan_config: Dict[str, Any]
    ) -> None:
        """
        Execute the actual indexing job with progress tracking
        """
        async with self._job_semaphore:  # Limit concurrent jobs
            job_info = self._active_jobs[job_id]
            cancel_event = job_info['cancel_event']
            stats = job_info['stats']
            
            try:
                # Update job status to running
                await self._job_repo.update_job_status(
                    job_id, 
                    'running', 
                    stage='scanning',
                    progress_data={'scan_start_time': datetime.utcnow().isoformat()}
                )
                job_info['status'] = 'running'
                
                logger.info(f"Starting execution of indexing job {job_id}")
                
                # Track indexed files for batch insertion
                indexed_files = []
                batch_size = scan_config.get('batch_size', 100)
                
                # Start scanning directory
                async for indexed_file in self._indexer.scan_directory(directory_path, scan_config):
                    # Check for cancellation
                    if cancel_event.is_set():
                        logger.info(f"Job {job_id} cancelled during scanning")
                        return
                    
                    indexed_files.append(indexed_file)
                    stats['files_found'] += 1
                    
                    # Process in batches
                    if len(indexed_files) >= batch_size:
                        await self._process_file_batch(job_id, indexed_files, stats)
                        indexed_files = []
                        
                        # Update progress
                        await self._update_job_progress(job_id, stats)
                
                # Process remaining files
                if indexed_files:
                    await self._process_file_batch(job_id, indexed_files, stats)
                
                # Mark job as completed
                await self._complete_job(job_id, stats)
                
                logger.info(f"Indexing job {job_id} completed successfully")
                
            except asyncio.CancelledError:
                logger.info(f"Job {job_id} was cancelled")
                await self._job_repo.update_job_status(job_id, 'cancelled', stage='cancelled')
                
            except Exception as e:
                logger.error(f"Job {job_id} failed with error: {str(e)}")
                await self._job_repo.update_job_status(
                    job_id, 
                    'failed', 
                    stage='failed',
                    progress_data={'error': str(e), 'failure_time': datetime.utcnow().isoformat()}
                )
                stats['errors'] += 1
                
            finally:
                # Clean up job tracking
                if job_id in self._active_jobs:
                    del self._active_jobs[job_id]

    async def _process_file_batch(
        self, 
        job_id: str, 
        indexed_files: list[IndexedFile], 
        stats: Dict[str, int]
    ) -> None:
        """
        Process a batch of indexed files
        """
        try:
            # Save files to repository in batch
            saved_files = await self._file_repo.create_files_batch(indexed_files)
            stats['files_indexed'] += len(saved_files)
            
            logger.debug(f"Job {job_id}: Processed batch of {len(saved_files)} files")
            
        except Exception as e:
            logger.error(f"Failed to process file batch for job {job_id}: {str(e)}")
            stats['errors'] += 1

    async def _update_job_progress(self, job_id: str, stats: Dict[str, int]) -> None:
        """
        Update job progress in repository
        """
        try:
            progress_data = {
                'files_found': stats['files_found'],
                'files_indexed': stats['files_indexed'],
                'errors': stats['errors'],
                'last_update': datetime.utcnow().isoformat()
            }
            
            await self._job_repo.update_job_progress(job_id, progress_data)
            
        except Exception as e:
            logger.error(f"Failed to update job progress for {job_id}: {str(e)}")

    async def _complete_job(self, job_id: str, stats: Dict[str, int]) -> None:
        """
        Mark job as completed and save final results
        """
        try:
            completion_time = datetime.utcnow()
            
            result_data = {
                'total_files_found': stats['files_found'],
                'total_files_indexed': stats['files_indexed'],
                'total_errors': stats['errors'],
                'completion_time': completion_time.isoformat()
            }
            
            await self._job_repo.update_job_status(
                job_id, 
                'completed', 
                stage='completed',
                result_data=result_data,
                completed_at=completion_time
            )
            
            logger.info(f"Job {job_id} completed with results: {result_data}")
            
        except Exception as e:
            logger.error(f"Failed to complete job {job_id}: {str(e)}")

    def _calculate_job_duration(self, job: IndexingJob) -> Optional[float]:
        """
        Calculate job duration in seconds
        """
        if job.created_at and job.completed_at:
            duration = job.completed_at - job.created_at
            return duration.total_seconds()
        return None