from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, and_, or_
from datetime import datetime, timedelta

from app.models.file_models import PatternSelectionHistory, IndexedFile, ExtractionPattern


class PatternSelectionHistoryRepository:
    """Repository for PatternSelectionHistory CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def record_selection(
        self, 
        pattern_id: int, 
        file_ids: List[int], 
        selection_context: Dict[str, Any] = None
    ) -> List[PatternSelectionHistory]:
        """
        Record files that were auto-selected for a pattern
        
        Args:
            pattern_id: ID of the pattern used for selection
            file_ids: List of file IDs that were selected
            selection_context: Analysis parameters and context
            
        Returns:
            List of created selection history records
        """
        records = []
        current_time = datetime.utcnow()
        
        for file_id in file_ids:
            # Check if there's already an active record for this pattern-file combination
            existing = self.db.query(PatternSelectionHistory).filter(
                and_(
                    PatternSelectionHistory.pattern_id == pattern_id,
                    PatternSelectionHistory.file_id == file_id,
                    PatternSelectionHistory.is_active == True
                )
            ).first()
            
            if not existing:
                # Create new selection record
                record = PatternSelectionHistory(
                    pattern_id=pattern_id,
                    file_id=file_id,
                    selected_at=current_time,
                    selection_context=selection_context or {},
                    is_active=True
                )
                self.db.add(record)
                records.append(record)
        
        if records:
            self.db.commit()
            for record in records:
                self.db.refresh(record)
        
        return records

    def get_previously_selected_files(self, pattern_id: int) -> List[int]:
        """
        Get list of file IDs that were previously selected for a pattern
        
        Args:
            pattern_id: Pattern ID to check
            
        Returns:
            List of file IDs that were previously selected
        """
        result = self.db.query(PatternSelectionHistory.file_id).filter(
            and_(
                PatternSelectionHistory.pattern_id == pattern_id,
                PatternSelectionHistory.is_active == True
            )
        ).all()
        
        return [row.file_id for row in result]

    def reset_pattern_selections(self, pattern_id: int) -> int:
        """
        Reset (deactivate) all selection history for a specific pattern
        
        Args:
            pattern_id: Pattern ID to reset
            
        Returns:
            Number of records that were reset
        """
        current_time = datetime.utcnow()
        
        updated_count = self.db.query(PatternSelectionHistory).filter(
            and_(
                PatternSelectionHistory.pattern_id == pattern_id,
                PatternSelectionHistory.is_active == True
            )
        ).update({
            'is_active': False,
            'reset_at': current_time
        }, synchronize_session=False)
        
        self.db.commit()
        return updated_count

    def reset_all_selections(self) -> int:
        """
        Reset (deactivate) all selection history for all patterns
        
        Returns:
            Number of records that were reset
        """
        current_time = datetime.utcnow()
        
        updated_count = self.db.query(PatternSelectionHistory).filter(
            PatternSelectionHistory.is_active == True
        ).update({
            'is_active': False,
            'reset_at': current_time
        }, synchronize_session=False)
        
        self.db.commit()
        return updated_count

    def get_selection_history(
        self, 
        pattern_id: Optional[int] = None,
        file_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        limit: int = 100
    ) -> List[PatternSelectionHistory]:
        """
        Get selection history with optional filtering
        
        Args:
            pattern_id: Filter by pattern ID (optional)
            file_id: Filter by file ID (optional)
            is_active: Filter by active status (optional)
            limit: Maximum number of records to return
            
        Returns:
            List of selection history records
        """
        query = self.db.query(PatternSelectionHistory)
        
        # Apply filters
        filters = []
        if pattern_id is not None:
            filters.append(PatternSelectionHistory.pattern_id == pattern_id)
        if file_id is not None:
            filters.append(PatternSelectionHistory.file_id == file_id)
        if is_active is not None:
            filters.append(PatternSelectionHistory.is_active == is_active)
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Order by most recent first
        query = query.order_by(desc(PatternSelectionHistory.selected_at))
        
        # Apply limit
        if limit > 0:
            query = query.limit(limit)
        
        return query.all()

    def get_selection_stats(self, pattern_id: int) -> Dict[str, Any]:
        """
        Get statistics about selections for a pattern
        
        Args:
            pattern_id: Pattern ID to get stats for
            
        Returns:
            Dictionary with selection statistics
        """
        # Count active selections
        active_count = self.db.query(func.count(PatternSelectionHistory.id)).filter(
            and_(
                PatternSelectionHistory.pattern_id == pattern_id,
                PatternSelectionHistory.is_active == True
            )
        ).scalar()
        
        # Count total selections (including reset ones)
        total_count = self.db.query(func.count(PatternSelectionHistory.id)).filter(
            PatternSelectionHistory.pattern_id == pattern_id
        ).scalar()
        
        # Get latest selection date
        latest_selection = self.db.query(func.max(PatternSelectionHistory.selected_at)).filter(
            and_(
                PatternSelectionHistory.pattern_id == pattern_id,
                PatternSelectionHistory.is_active == True
            )
        ).scalar()
        
        # Get latest reset date
        latest_reset = self.db.query(func.max(PatternSelectionHistory.reset_at)).filter(
            PatternSelectionHistory.pattern_id == pattern_id
        ).scalar()
        
        return {
            'pattern_id': pattern_id,
            'active_selections': active_count,
            'total_selections': total_count,
            'latest_selection_at': latest_selection.isoformat() if latest_selection else None,
            'latest_reset_at': latest_reset.isoformat() if latest_reset else None,
            'has_active_selections': active_count > 0
        }

    def get_global_stats(self) -> Dict[str, Any]:
        """
        Get global selection statistics across all patterns
        
        Returns:
            Dictionary with global selection statistics
        """
        # Count active selections across all patterns
        total_active = self.db.query(func.count(PatternSelectionHistory.id)).filter(
            PatternSelectionHistory.is_active == True
        ).scalar()
        
        # Count total selections
        total_all = self.db.query(func.count(PatternSelectionHistory.id)).scalar()
        
        # Count patterns with active selections
        patterns_with_selections = self.db.query(
            func.count(func.distinct(PatternSelectionHistory.pattern_id))
        ).filter(PatternSelectionHistory.is_active == True).scalar()
        
        # Count unique files with active selections
        files_with_selections = self.db.query(
            func.count(func.distinct(PatternSelectionHistory.file_id))
        ).filter(PatternSelectionHistory.is_active == True).scalar()
        
        return {
            'total_active_selections': total_active,
            'total_all_selections': total_all,
            'patterns_with_active_selections': patterns_with_selections,
            'files_with_active_selections': files_with_selections
        }

    def cleanup_old_records(self, days_old: int = 30) -> int:
        """
        Clean up old inactive selection records
        
        Args:
            days_old: Delete records older than this many days
            
        Returns:
            Number of records deleted
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        deleted_count = self.db.query(PatternSelectionHistory).filter(
            and_(
                PatternSelectionHistory.is_active == False,
                PatternSelectionHistory.reset_at < cutoff_date
            )
        ).delete(synchronize_session=False)
        
        self.db.commit()
        return deleted_count