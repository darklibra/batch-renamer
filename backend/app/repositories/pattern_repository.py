from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, and_, or_
from datetime import datetime, timedelta

from app.models.file_models import (
    ExtractionPattern, 
    PatternApplication, 
    PatternFailure, 
    PatternExtractionJob,
    IndexedFile
)


class PatternRepository:
    """Repository for ExtractionPattern CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_pattern(self, pattern_data: Dict) -> ExtractionPattern:
        """Create a new extraction pattern"""
        pattern = ExtractionPattern(**pattern_data)
        self.db.add(pattern)
        self.db.commit()
        self.db.refresh(pattern)
        return pattern

    def get_pattern_by_id(self, pattern_id: int) -> Optional[ExtractionPattern]:
        """Get pattern by ID"""
        return self.db.query(ExtractionPattern).filter(ExtractionPattern.id == pattern_id).first()

    def get_pattern_by_name(self, name: str) -> Optional[ExtractionPattern]:
        """Get pattern by name"""
        return self.db.query(ExtractionPattern).filter(ExtractionPattern.name == name).first()

    def get_all_patterns(self) -> List[ExtractionPattern]:
        """Get all patterns ordered by priority"""
        return self.db.query(ExtractionPattern).order_by(desc(ExtractionPattern.priority)).all()

    def get_active_patterns(self) -> List[ExtractionPattern]:
        """Get all active patterns ordered by priority"""
        return self.db.query(ExtractionPattern).filter(
            ExtractionPattern.is_active == True
        ).order_by(desc(ExtractionPattern.priority)).all()

    def get_patterns_paginated(
        self, 
        page: int = 1, 
        per_page: int = 20,
        is_active: Optional[bool] = None,
        sort_by: str = 'priority',
        sort_order: str = 'desc'
    ) -> Dict:
        """Get patterns with pagination and filtering"""
        query = self.db.query(ExtractionPattern)
        
        if is_active is not None:
            query = query.filter(ExtractionPattern.is_active == is_active)
        
        # Sorting
        sort_column = getattr(ExtractionPattern, sort_by, ExtractionPattern.priority)
        if sort_order.lower() == 'desc':
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        total = query.count()
        patterns = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'patterns': patterns,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }

    def update_pattern(self, pattern_id: int, update_data: Dict) -> Optional[ExtractionPattern]:
        """Update an extraction pattern"""
        pattern = self.get_pattern_by_id(pattern_id)
        if not pattern:
            return None
        
        for key, value in update_data.items():
            if hasattr(pattern, key):
                setattr(pattern, key, value)
        
        pattern.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(pattern)
        return pattern

    def delete_pattern(self, pattern_id: int) -> bool:
        """Delete an extraction pattern (soft delete by marking inactive)"""
        pattern = self.get_pattern_by_id(pattern_id)
        if not pattern:
            return False
        
        pattern.is_active = False
        pattern.updated_at = datetime.utcnow()
        self.db.commit()
        return True

    def hard_delete_pattern(self, pattern_id: int) -> bool:
        """Hard delete an extraction pattern and related records"""
        pattern = self.get_pattern_by_id(pattern_id)
        if not pattern:
            return False
        
        # Delete related applications and failures first
        self.db.query(PatternApplication).filter(
            PatternApplication.pattern_id == pattern_id
        ).delete()
        
        self.db.query(PatternFailure).filter(
            PatternFailure.resolved_by_pattern_id == pattern_id
        ).update({'resolved_by_pattern_id': None})
        
        # Delete the pattern
        self.db.delete(pattern)
        self.db.commit()
        return True

    def get_pattern_usage_stats(self, pattern_id: int) -> Dict:
        """Get usage statistics for a pattern"""
        pattern = self.get_pattern_by_id(pattern_id)
        if not pattern:
            return {}
        
        # Count applications
        total_applications = self.db.query(PatternApplication).filter(
            PatternApplication.pattern_id == pattern_id
        ).count()
        
        current_applications = self.db.query(PatternApplication).filter(
            and_(
                PatternApplication.pattern_id == pattern_id,
                PatternApplication.is_current == True
            )
        ).count()
        
        # Average extraction score
        avg_score = self.db.query(func.avg(PatternApplication.extraction_score)).filter(
            PatternApplication.pattern_id == pattern_id
        ).scalar() or 0
        
        # Recent performance (last 30 days)
        recent_date = datetime.utcnow() - timedelta(days=30)
        recent_applications = self.db.query(PatternApplication).filter(
            and_(
                PatternApplication.pattern_id == pattern_id,
                PatternApplication.applied_at >= recent_date
            )
        ).count()
        
        return {
            'pattern_id': pattern_id,
            'pattern_name': pattern.name,
            'total_applications': total_applications,
            'current_applications': current_applications,
            'average_extraction_score': round(avg_score, 2),
            'recent_applications_30d': recent_applications
        }


class PatternApplicationRepository:
    """Repository for PatternApplication CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_application(self, application_data: Dict) -> PatternApplication:
        """Create a new pattern application record"""
        application = PatternApplication(**application_data)
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        return application

    def get_application_by_id(self, application_id: int) -> Optional[PatternApplication]:
        """Get application by ID"""
        return self.db.query(PatternApplication).filter(
            PatternApplication.id == application_id
        ).first()

    def get_current_application_for_file(self, file_id: int) -> Optional[PatternApplication]:
        """Get current pattern application for a file"""
        return self.db.query(PatternApplication).filter(
            and_(
                PatternApplication.file_id == file_id,
                PatternApplication.is_current == True
            )
        ).first()

    def get_applications_for_file(self, file_id: int) -> List[PatternApplication]:
        """Get all applications for a file, ordered by applied date"""
        return self.db.query(PatternApplication).filter(
            PatternApplication.file_id == file_id
        ).order_by(desc(PatternApplication.applied_at)).all()

    def get_applications_for_pattern(self, pattern_id: int, limit: int = 100) -> List[PatternApplication]:
        """Get applications for a pattern"""
        return self.db.query(PatternApplication).filter(
            PatternApplication.pattern_id == pattern_id
        ).order_by(desc(PatternApplication.applied_at)).limit(limit).all()

    def mark_previous_applications_as_old(self, file_id: int) -> int:
        """Mark all previous applications for a file as not current"""
        updated_count = self.db.query(PatternApplication).filter(
            and_(
                PatternApplication.file_id == file_id,
                PatternApplication.is_current == True
            )
        ).update({'is_current': False})
        
        self.db.commit()
        return updated_count

    def get_files_with_extractions_count(self) -> int:
        """Count files that have successful pattern extractions"""
        return self.db.query(func.count(func.distinct(PatternApplication.file_id))).filter(
            PatternApplication.is_current == True
        ).scalar() or 0

    def get_total_applications_count(self) -> int:
        """Count total pattern applications"""
        return self.db.query(PatternApplication).count()

    def get_pattern_performance_stats(self, pattern_id: int) -> Dict:
        """Get detailed performance statistics for a pattern"""
        # Basic counts
        total_applications = self.db.query(PatternApplication).filter(
            PatternApplication.pattern_id == pattern_id
        ).count()
        
        current_applications = self.db.query(PatternApplication).filter(
            and_(
                PatternApplication.pattern_id == pattern_id,
                PatternApplication.is_current == True
            )
        ).count()
        
        # Performance metrics
        performance_stats = self.db.query(
            func.avg(PatternApplication.extraction_score).label('avg_score'),
            func.min(PatternApplication.extraction_score).label('min_score'),
            func.max(PatternApplication.extraction_score).label('max_score'),
            func.avg(PatternApplication.processing_time_ms).label('avg_time'),
            func.min(PatternApplication.processing_time_ms).label('min_time'),
            func.max(PatternApplication.processing_time_ms).label('max_time')
        ).filter(PatternApplication.pattern_id == pattern_id).first()
        
        # Recent performance (last 7 days)
        recent_date = datetime.utcnow() - timedelta(days=7)
        recent_performance = self.db.query(
            func.count(PatternApplication.id).label('recent_count'),
            func.avg(PatternApplication.extraction_score).label('recent_avg_score'),
            func.avg(PatternApplication.processing_time_ms).label('recent_avg_time')
        ).filter(
            and_(
                PatternApplication.pattern_id == pattern_id,
                PatternApplication.applied_at >= recent_date
            )
        ).first()
        
        return {
            'pattern_id': pattern_id,
            'total_applications': total_applications,
            'current_applications': current_applications,
            'average_extraction_score': round(performance_stats.avg_score or 0, 2),
            'min_extraction_score': performance_stats.min_score or 0,
            'max_extraction_score': performance_stats.max_score or 0,
            'average_processing_time_ms': round(performance_stats.avg_time or 0, 2),
            'min_processing_time_ms': performance_stats.min_time or 0,
            'max_processing_time_ms': performance_stats.max_time or 0,
            'recent_applications_7d': recent_performance.recent_count or 0,
            'recent_avg_score_7d': round(recent_performance.recent_avg_score or 0, 2),
            'recent_avg_time_ms_7d': round(recent_performance.recent_avg_time or 0, 2)
        }

    def get_applications_paginated(
        self,
        page: int = 1,
        per_page: int = 50,
        file_id: Optional[int] = None,
        pattern_id: Optional[int] = None,
        is_current: Optional[bool] = None
    ) -> Dict:
        """Get pattern applications with pagination and filtering"""
        query = self.db.query(PatternApplication)
        
        if file_id is not None:
            query = query.filter(PatternApplication.file_id == file_id)
        
        if pattern_id is not None:
            query = query.filter(PatternApplication.pattern_id == pattern_id)
        
        if is_current is not None:
            query = query.filter(PatternApplication.is_current == is_current)
        
        query = query.order_by(desc(PatternApplication.applied_at))
        
        total = query.count()
        applications = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'applications': applications,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }


class PatternFailureRepository:
    """Repository for PatternFailure CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_failure(self, failure_data: Dict) -> PatternFailure:
        """Create a new pattern failure record"""
        failure = PatternFailure(**failure_data)
        self.db.add(failure)
        self.db.commit()
        self.db.refresh(failure)
        return failure

    def get_failure_by_id(self, failure_id: int) -> Optional[PatternFailure]:
        """Get failure by ID"""
        return self.db.query(PatternFailure).filter(
            PatternFailure.id == failure_id
        ).first()

    def get_failures_for_file(self, file_id: int) -> List[PatternFailure]:
        """Get all failures for a specific file"""
        return self.db.query(PatternFailure).filter(
            PatternFailure.file_id == file_id
        ).order_by(desc(PatternFailure.created_at)).all()

    def get_unresolved_failures(self, limit: int = 100) -> List[PatternFailure]:
        """Get unresolved failures that require user input"""
        return self.db.query(PatternFailure).filter(
            and_(
                PatternFailure.resolved_at.is_(None),
                PatternFailure.requires_user_input == True
            )
        ).order_by(desc(PatternFailure.created_at)).limit(limit).all()

    def get_failures_paginated(
        self,
        page: int = 1,
        per_page: int = 50,
        requires_user_input: Optional[bool] = None,
        resolved: Optional[bool] = None
    ) -> Dict:
        """Get failures with pagination and filtering"""
        query = self.db.query(PatternFailure)
        
        if requires_user_input is not None:
            query = query.filter(PatternFailure.requires_user_input == requires_user_input)
        
        if resolved is not None:
            if resolved:
                query = query.filter(PatternFailure.resolved_at.isnot(None))
            else:
                query = query.filter(PatternFailure.resolved_at.is_(None))
        
        query = query.order_by(desc(PatternFailure.created_at))
        
        total = query.count()
        failures = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'failures': failures,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }

    def resolve_failure(self, failure_id: int, pattern_id: int) -> bool:
        """Mark a failure as resolved"""
        failure = self.get_failure_by_id(failure_id)
        if not failure:
            return False
        
        failure.resolved_at = datetime.utcnow()
        failure.resolved_by_pattern_id = pattern_id
        self.db.commit()
        return True

    def get_total_failures_count(self) -> int:
        """Count total pattern failures"""
        return self.db.query(PatternFailure).count()

    def get_failure_stats(self) -> Dict:
        """Get failure statistics"""
        total_failures = self.db.query(PatternFailure).count()
        
        unresolved_failures = self.db.query(PatternFailure).filter(
            PatternFailure.resolved_at.is_(None)
        ).count()
        
        user_input_required = self.db.query(PatternFailure).filter(
            and_(
                PatternFailure.resolved_at.is_(None),
                PatternFailure.requires_user_input == True
            )
        ).count()
        
        # Recent failures (last 7 days)
        recent_date = datetime.utcnow() - timedelta(days=7)
        recent_failures = self.db.query(PatternFailure).filter(
            PatternFailure.created_at >= recent_date
        ).count()
        
        return {
            'total_failures': total_failures,
            'unresolved_failures': unresolved_failures,
            'user_input_required': user_input_required,
            'recent_failures_7d': recent_failures,
            'resolution_rate': round((total_failures - unresolved_failures) / total_failures * 100, 2) if total_failures > 0 else 0
        }


class PatternExtractionJobRepository:
    """Repository for PatternExtractionJob CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_job(self, job_data: Dict) -> PatternExtractionJob:
        """Create a new pattern extraction job"""
        job = PatternExtractionJob(**job_data)
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_job_by_id(self, job_id: str) -> Optional[PatternExtractionJob]:
        """Get job by ID"""
        return self.db.query(PatternExtractionJob).filter(
            PatternExtractionJob.id == job_id
        ).first()

    def update_job_progress(self, job_id: str, update_data: Dict) -> Optional[PatternExtractionJob]:
        """Update job progress"""
        job = self.get_job_by_id(job_id)
        if not job:
            return None
        
        for key, value in update_data.items():
            if hasattr(job, key):
                setattr(job, key, value)
        
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_recent_jobs(self, limit: int = 20) -> List[PatternExtractionJob]:
        """Get recent jobs ordered by start time"""
        return self.db.query(PatternExtractionJob).order_by(
            desc(PatternExtractionJob.started_at)
        ).limit(limit).all()

    def get_active_jobs(self) -> List[PatternExtractionJob]:
        """Get currently active jobs"""
        return self.db.query(PatternExtractionJob).filter(
            PatternExtractionJob.status.in_(['started', 'processing'])
        ).all()

    def get_jobs_paginated(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[str] = None,
        job_type: Optional[str] = None
    ) -> Dict:
        """Get jobs with pagination and filtering"""
        query = self.db.query(PatternExtractionJob)
        
        if status:
            query = query.filter(PatternExtractionJob.status == status)
        
        if job_type:
            query = query.filter(PatternExtractionJob.job_type == job_type)
        
        query = query.order_by(desc(PatternExtractionJob.started_at))
        
        total = query.count()
        jobs = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'jobs': jobs,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }

    def cleanup_old_jobs(self, days_old: int = 30) -> int:
        """Clean up old completed jobs"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        deleted_count = self.db.query(PatternExtractionJob).filter(
            and_(
                PatternExtractionJob.status.in_(['completed', 'error']),
                PatternExtractionJob.completed_at < cutoff_date
            )
        ).delete()
        
        self.db.commit()
        return deleted_count

    def get_job_stats(self) -> Dict:
        """Get job execution statistics"""
        total_jobs = self.db.query(PatternExtractionJob).count()
        
        completed_jobs = self.db.query(PatternExtractionJob).filter(
            PatternExtractionJob.status == 'completed'
        ).count()
        
        failed_jobs = self.db.query(PatternExtractionJob).filter(
            PatternExtractionJob.status == 'error'
        ).count()
        
        active_jobs = self.db.query(PatternExtractionJob).filter(
            PatternExtractionJob.status.in_(['started', 'processing'])
        ).count()
        
        # Average processing stats for completed jobs
        avg_stats = self.db.query(
            func.avg(PatternExtractionJob.total_count).label('avg_files'),
            func.avg(PatternExtractionJob.successful_extractions).label('avg_success'),
            func.avg(PatternExtractionJob.failed_extractions).label('avg_failures')
        ).filter(PatternExtractionJob.status == 'completed').first()
        
        return {
            'total_jobs': total_jobs,
            'completed_jobs': completed_jobs,
            'failed_jobs': failed_jobs,
            'active_jobs': active_jobs,
            'success_rate': round(completed_jobs / total_jobs * 100, 2) if total_jobs > 0 else 0,
            'average_files_per_job': round(avg_stats.avg_files or 0, 2),
            'average_successful_extractions': round(avg_stats.avg_success or 0, 2),
            'average_failed_extractions': round(avg_stats.avg_failures or 0, 2)
        }