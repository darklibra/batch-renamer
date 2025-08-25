from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from datetime import datetime

from app.models.file_models import IndexedFile, ExclusionPattern, ExtractionPattern, IndexingJob

class FileRepository:
    """Repository for file operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_file(self, file_data: Dict) -> IndexedFile:
        """Create a single file record"""
        file_obj = IndexedFile(**file_data)
        self.db.add(file_obj)
        self.db.commit()
        self.db.refresh(file_obj)
        return file_obj
    
    def bulk_create_files(self, file_data_list: List[Dict]) -> List[IndexedFile]:
        """Efficiently insert multiple files"""
        files = [IndexedFile(**data) for data in file_data_list]
        self.db.add_all(files)
        self.db.commit()
        
        # Refresh all objects to get IDs
        for file_obj in files:
            self.db.refresh(file_obj)
        
        return files
    
    def find_existing_files(self, full_paths: List[str]) -> List[str]:
        """Check which files already exist in database"""
        if not full_paths:
            return []
            
        existing = self.db.query(IndexedFile.full_path).filter(
            IndexedFile.full_path.in_(full_paths)
        ).all()
        return [path[0] for path in existing]
    
    def get_file_by_id(self, file_id: int) -> Optional[IndexedFile]:
        """Get file by ID"""
        return self.db.query(IndexedFile).filter(IndexedFile.id == file_id).first()
    
    def get_file_by_path(self, full_path: str) -> Optional[IndexedFile]:
        """Get file by full path"""
        return self.db.query(IndexedFile).filter(IndexedFile.full_path == full_path).first()
    
    def update_file_metadata(self, file_id: int, metadata: Dict) -> Optional[IndexedFile]:
        """Update file with extracted metadata"""
        file_obj = self.db.query(IndexedFile).filter(IndexedFile.id == file_id).first()
        if file_obj:
            file_obj.extracted_data = metadata
            file_obj.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(file_obj)
        return file_obj
    
    def update_file_extracted_data(self, file_id: int, extracted_data: Dict, pattern_id: int) -> Optional[IndexedFile]:
        """Update file with extracted data and pattern_id"""
        file_obj = self.db.query(IndexedFile).filter(IndexedFile.id == file_id).first()
        if file_obj:
            file_obj.extracted_data = extracted_data
            file_obj.pattern_id = pattern_id
            file_obj.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(file_obj)
        return file_obj
    
    def get_files_by_pattern(self, pattern_id: int, limit: Optional[int] = None) -> List[IndexedFile]:
        """Get files that match a specific pattern"""
        query = self.db.query(IndexedFile).filter(
            IndexedFile.pattern_id == pattern_id
        )
        
        if limit:
            query = query.limit(limit)
            
        return query.all()
    
    def get_files_paginated(self, 
                           page: int = 1, 
                           per_page: int = 10, 
                           sort_field: str = "indexed_at", 
                           sort_order: str = "desc",
                           filters: Dict = None) -> Dict:
        """Get files with pagination, sorting, and filtering"""
        query = self.db.query(IndexedFile)
        
        # Apply filters
        if filters:
            if 'extension' in filters and filters['extension']:
                query = query.filter(IndexedFile.extension == filters['extension'])
            if 'path' in filters and filters['path']:
                query = query.filter(IndexedFile.path.contains(filters['path']))
            if 'filename' in filters and filters['filename']:
                query = query.filter(IndexedFile.filename.contains(filters['filename']))
        
        # Get total count before pagination
        total = query.count()
        
        # Apply sorting
        sort_column = getattr(IndexedFile, sort_field, IndexedFile.indexed_at)
        if sort_order.lower() == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)
        
        # Apply pagination
        offset = (page - 1) * per_page
        files = query.offset(offset).limit(per_page).all()
        
        return {
            'files': files,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    
    def get_files_by_ids(self, file_ids: List[int]) -> List[IndexedFile]:
        """Get multiple files by IDs"""
        return self.db.query(IndexedFile).filter(IndexedFile.id.in_(file_ids)).all()
    
    def delete_file(self, file_id: int) -> bool:
        """Delete a file record"""
        file_obj = self.db.query(IndexedFile).filter(IndexedFile.id == file_id).first()
        if file_obj:
            self.db.delete(file_obj)
            self.db.commit()
            return True
        return False
    
    def get_file_count(self) -> int:
        """Get total count of indexed files"""
        return self.db.query(func.count(IndexedFile.id)).scalar()
    
    def get_files_with_metadata_count(self) -> int:
        """Get count of files that have extracted metadata"""
        return self.db.query(func.count(IndexedFile.id)).filter(
            IndexedFile.extracted_data.isnot(None)
        ).scalar()
    
    def get_file_stats(self) -> Dict:
        """Get file statistics"""
        total_files = self.db.query(func.count(IndexedFile.id)).scalar()
        total_size = self.db.query(func.sum(IndexedFile.file_size)).scalar() or 0
        
        extensions = self.db.query(
            IndexedFile.extension,
            func.count(IndexedFile.id).label('count')
        ).group_by(IndexedFile.extension).all()
        
        return {
            'total_files': total_files,
            'total_size_bytes': total_size,
            'extensions': [{'extension': ext, 'count': count} for ext, count in extensions]
        }
    
    def get_files_for_preview(self, limit: int = 10000) -> List[IndexedFile]:
        """Get files for pattern preview with performance limits"""
        return self.db.query(IndexedFile).order_by(
            desc(IndexedFile.indexed_at)
        ).limit(limit).all()

class ExclusionPatternRepository:
    """Repository for exclusion pattern operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_pattern(self, pattern_data: Dict) -> ExclusionPattern:
        """Create new exclusion pattern"""
        pattern = ExclusionPattern(**pattern_data)
        self.db.add(pattern)
        self.db.commit()
        self.db.refresh(pattern)
        return pattern
    
    def get_active_patterns(self) -> List[ExclusionPattern]:
        """Get all active exclusion patterns"""
        return self.db.query(ExclusionPattern).filter(
            ExclusionPattern.is_active == True
        ).all()
    
    def get_all_patterns(self) -> List[ExclusionPattern]:
        """Get all exclusion patterns"""
        return self.db.query(ExclusionPattern).all()
    
    def get_pattern_by_id(self, pattern_id: int) -> Optional[ExclusionPattern]:
        """Get pattern by ID"""
        return self.db.query(ExclusionPattern).filter(
            ExclusionPattern.id == pattern_id
        ).first()
    
    def update_pattern(self, pattern_id: int, pattern_data: Dict) -> Optional[ExclusionPattern]:
        """Update exclusion pattern"""
        pattern = self.db.query(ExclusionPattern).filter(
            ExclusionPattern.id == pattern_id
        ).first()
        
        if pattern:
            for key, value in pattern_data.items():
                if hasattr(pattern, key):
                    setattr(pattern, key, value)
            pattern.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(pattern)
        
        return pattern
    
    def delete_pattern(self, pattern_id: int) -> bool:
        """Delete exclusion pattern"""
        pattern = self.db.query(ExclusionPattern).filter(
            ExclusionPattern.id == pattern_id
        ).first()
        
        if pattern:
            self.db.delete(pattern)
            self.db.commit()
            return True
        return False

class IndexingJobRepository:
    """Repository for indexing job operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_job(self, job_data: Dict) -> IndexingJob:
        """Create new indexing job"""
        job = IndexingJob(**job_data)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job
    
    def get_job_by_id(self, job_id: str) -> Optional[IndexingJob]:
        """Get job by ID"""
        return self.db.query(IndexingJob).filter(IndexingJob.id == job_id).first()
    
    def update_job_progress(self, job_id: str, progress_data: Dict) -> Optional[IndexingJob]:
        """Update job progress"""
        job = self.db.query(IndexingJob).filter(IndexingJob.id == job_id).first()
        
        if job:
            for key, value in progress_data.items():
                if hasattr(job, key):
                    setattr(job, key, value)
            
            # Set completion time if status is completed or error
            if job.status in ['completed', 'error'] and not job.completed_at:
                job.completed_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(job)
        
        return job
    
    def get_recent_jobs(self, limit: int = 10) -> List[IndexingJob]:
        """Get recent indexing jobs"""
        return self.db.query(IndexingJob).order_by(
            desc(IndexingJob.started_at)
        ).limit(limit).all()