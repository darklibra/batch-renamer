import os
import fnmatch
import re
from typing import List, Dict, Generator, Optional, Callable, Any
from pathlib import Path
from datetime import datetime
import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor
import logging

from app.repositories.file_repository import FileRepository, ExclusionPatternRepository, IndexingJobRepository
from app.models.file_models import IndexedFile, ExclusionPattern, IndexingJob

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FileIndexingService:
    """
    Enhanced file indexing service with exclusion patterns and progress tracking
    """
    
    def __init__(self, 
                 file_repo: FileRepository,
                 exclusion_repo: ExclusionPatternRepository,
                 job_repo: IndexingJobRepository,
                 batch_size: int = 100,
                 max_workers: int = 4):
        self.file_repo = file_repo
        self.exclusion_repo = exclusion_repo
        self.job_repo = job_repo
        self.batch_size = batch_size
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
    
    async def start_indexing_job(self, directory_path: str) -> str:
        """
        Start a new indexing job and return job ID
        """
        if not os.path.isdir(directory_path):
            raise ValueError(f"Directory not found: {directory_path}")
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        
        # Create job record
        job_data = {
            'id': job_id,
            'directory_path': directory_path,
            'status': 'started',
            'stage': 'initializing'
        }
        
        self.job_repo.create_job(job_data)
        
        # Start background indexing
        asyncio.create_task(self._perform_indexing(job_id, directory_path))
        
        return job_id
    
    async def _perform_indexing(self, job_id: str, directory_path: str):
        """
        Background task for file indexing
        """
        try:
            logger.info(f"Starting indexing job {job_id} for {directory_path}")
            
            # Update job status
            await self._update_job_progress(job_id, {
                'status': 'processing',
                'stage': 'discovery'
            })
            
            # Get active exclusion patterns
            exclusion_patterns = self.exclusion_repo.get_active_patterns()
            
            # Discover files with progress tracking
            discovered_files = []
            processed_count = 0
            
            for file_data in self._discover_files(directory_path, exclusion_patterns):
                discovered_files.append(file_data)
                processed_count += 1
                
                # Progress update every 100 files
                if processed_count % 100 == 0:
                    await self._update_job_progress(job_id, {
                        'stage': 'discovery',
                        'processed_count': processed_count
                    })
            
            logger.info(f"Discovery complete: {len(discovered_files)} files found")
            
            # Update job with discovery results
            await self._update_job_progress(job_id, {
                'stage': 'checking_existing',
                'total_count': len(discovered_files)
            })
            
            # Check for existing files to avoid duplicates
            full_paths = [f['full_path'] for f in discovered_files]
            existing_paths = set(self.file_repo.find_existing_files(full_paths))
            
            # Filter out existing files
            new_files = [f for f in discovered_files if f['full_path'] not in existing_paths]
            
            logger.info(f"Found {len(new_files)} new files to index, {len(existing_paths)} already exist")
            
            # Update job status
            await self._update_job_progress(job_id, {
                'stage': 'indexing',
                'already_indexed': len(existing_paths),
                'processed_count': 0
            })
            
            # Batch insert new files
            indexed_files = []
            for i in range(0, len(new_files), self.batch_size):
                batch = new_files[i:i + self.batch_size]
                
                try:
                    batch_results = self.file_repo.bulk_create_files(batch)
                    indexed_files.extend(batch_results)
                    
                    # Update progress
                    await self._update_job_progress(job_id, {
                        'processed_count': len(indexed_files)
                    })
                    
                    logger.info(f"Indexed batch: {len(indexed_files)}/{len(new_files)} files")
                    
                except Exception as e:
                    logger.error(f"Error indexing batch: {str(e)}")
                    # Continue with next batch
                    continue
            
            # Final job update
            result_data = {
                'total_discovered': len(discovered_files),
                'already_indexed': len(existing_paths),
                'newly_indexed': len(indexed_files),
                'indexed_file_ids': [f.id for f in indexed_files]
            }
            
            await self._update_job_progress(job_id, {
                'status': 'completed',
                'stage': 'complete',
                'newly_indexed': len(indexed_files),
                'result_data': result_data
            })
            
            logger.info(f"Indexing job {job_id} completed successfully")
            
        except Exception as e:
            error_msg = f"Indexing failed: {str(e)}"
            logger.error(f"Job {job_id} failed: {error_msg}")
            
            await self._update_job_progress(job_id, {
                'status': 'error',
                'stage': 'error',
                'error_message': error_msg
            })
    
    async def _update_job_progress(self, job_id: str, progress_data: Dict):
        """Update job progress in database"""
        try:
            self.job_repo.update_job_progress(job_id, progress_data)
        except Exception as e:
            logger.error(f"Failed to update job progress: {str(e)}")
    
    def _discover_files(self, 
                       directory_path: str, 
                       exclusion_patterns: List[ExclusionPattern]) -> Generator[Dict, None, None]:
        """
        Recursively discover files, applying exclusion patterns
        """
        base_path = Path(directory_path).resolve()
        
        for root, dirs, files in os.walk(base_path):
            # Apply exclusion patterns to directories (modify dirs in-place)
            dirs[:] = [d for d in dirs if not self._is_excluded(
                os.path.join(root, d), exclusion_patterns, base_path
            )]
            
            for filename in files:
                full_path = os.path.join(root, filename)
                
                # Apply exclusion patterns to files
                if self._is_excluded(full_path, exclusion_patterns, base_path):
                    continue
                
                try:
                    # Extract file metadata using the model method
                    file_data = IndexedFile.from_file_path(full_path, str(base_path))
                    yield file_data
                    
                except (OSError, FileNotFoundError, PermissionError) as e:
                    logger.warning(f"Could not process file {full_path}: {str(e)}")
                    continue
    
    def _is_excluded(self, 
                    file_path: str, 
                    patterns: List[ExclusionPattern], 
                    base_path: Path) -> bool:
        """
        Check if file matches any exclusion pattern
        """
        path_obj = Path(file_path)
        
        # Common exclusions (always apply)
        common_exclusions = [
            ('.*', 'glob'),          # Hidden files
            ('__pycache__*', 'glob'), # Python cache
            ('node_modules*', 'glob'),# Node.js modules
            ('.git*', 'glob'),        # Git directory
            ('*.tmp', 'glob'),        # Temporary files
            ('*.log', 'glob'),        # Log files
            ('*.swp', 'glob'),        # Vim swap files
            ('*.pyc', 'glob'),        # Python compiled
            ('Thumbs.db', 'glob'),    # Windows thumbnails
            ('.DS_Store', 'glob'),    # macOS metadata
        ]
        
        # Check common exclusions first
        for pattern, pattern_type in common_exclusions:
            if self._match_pattern(str(path_obj.name), pattern, pattern_type):
                return True
        
        # Check custom exclusion patterns
        try:
            relative_path = path_obj.relative_to(base_path) if path_obj.is_absolute() else path_obj
        except ValueError:
            relative_path = path_obj
        
        for exclusion in patterns:
            if self._match_pattern(str(relative_path), exclusion.pattern, exclusion.pattern_type):
                return True
        
        return False
    
    def _match_pattern(self, path: str, pattern: str, pattern_type: str) -> bool:
        """Match path against pattern based on type"""
        try:
            if pattern_type == 'glob':
                return fnmatch.fnmatch(path, pattern)
            elif pattern_type == 'regex':
                return re.match(pattern, path) is not None
            return False
        except (re.error, fnmatch.error):
            logger.warning(f"Invalid pattern: {pattern} (type: {pattern_type})")
            return False
    
    def get_job_progress(self, job_id: str) -> Optional[Dict]:
        """Get current progress of indexing job"""
        job = self.job_repo.get_job_by_id(job_id)
        return job.to_dict() if job else None
    
    def get_recent_jobs(self, limit: int = 10) -> List[Dict]:
        """Get recent indexing jobs"""
        jobs = self.job_repo.get_recent_jobs(limit)
        return [job.to_dict() for job in jobs]

class ExclusionPatternService:
    """
    Service for managing exclusion patterns
    """
    
    def __init__(self, exclusion_repo: ExclusionPatternRepository):
        self.exclusion_repo = exclusion_repo
    
    def create_exclusion_pattern(self, pattern_data: Dict) -> Dict:
        """Create new exclusion pattern"""
        # Validate pattern
        self._validate_pattern(pattern_data['pattern'], pattern_data.get('pattern_type', 'glob'))
        
        pattern = self.exclusion_repo.create_pattern(pattern_data)
        return pattern.to_dict()
    
    def get_exclusion_patterns(self, active_only: bool = False) -> List[Dict]:
        """Get exclusion patterns"""
        if active_only:
            patterns = self.exclusion_repo.get_active_patterns()
        else:
            patterns = self.exclusion_repo.get_all_patterns()
        
        return [pattern.to_dict() for pattern in patterns]
    
    def update_exclusion_pattern(self, pattern_id: int, pattern_data: Dict) -> Optional[Dict]:
        """Update exclusion pattern"""
        if 'pattern' in pattern_data:
            pattern_type = pattern_data.get('pattern_type', 'glob')
            self._validate_pattern(pattern_data['pattern'], pattern_type)
        
        pattern = self.exclusion_repo.update_pattern(pattern_id, pattern_data)
        return pattern.to_dict() if pattern else None
    
    def delete_exclusion_pattern(self, pattern_id: int) -> bool:
        """Delete exclusion pattern"""
        return self.exclusion_repo.delete_pattern(pattern_id)
    
    def test_pattern(self, pattern: str, pattern_type: str, test_paths: List[str]) -> Dict:
        """Test pattern against list of paths"""
        self._validate_pattern(pattern, pattern_type)
        
        results = []
        for path in test_paths:
            try:
                if pattern_type == 'glob':
                    matches = fnmatch.fnmatch(path, pattern)
                else:  # regex
                    matches = re.match(pattern, path) is not None
                
                results.append({
                    'path': path,
                    'matches': matches
                })
            except Exception as e:
                results.append({
                    'path': path,
                    'matches': False,
                    'error': str(e)
                })
        
        return {
            'pattern': pattern,
            'pattern_type': pattern_type,
            'results': results,
            'total_matches': sum(1 for r in results if r.get('matches', False))
        }
    
    def _validate_pattern(self, pattern: str, pattern_type: str):
        """Validate pattern syntax"""
        if not pattern:
            raise ValueError("Pattern cannot be empty")
        
        if pattern_type not in ['glob', 'regex']:
            raise ValueError("Pattern type must be 'glob' or 'regex'")
        
        if pattern_type == 'regex':
            try:
                re.compile(pattern)
            except re.error as e:
                raise ValueError(f"Invalid regex pattern: {str(e)}")
        
        # Check pattern length to prevent abuse
        if len(pattern) > 500:
            raise ValueError("Pattern too long (max 500 characters)")