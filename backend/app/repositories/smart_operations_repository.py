"""
Repository for Smart File Operations data access
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, func

from ..models.smart_operations import SmartFileOperation, SmartOperationFile
from ..models.file_models import IndexedFile, ExtractionPattern


class SmartOperationsRepository:
    """Repository for Smart File Operations data access"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # Smart File Operations CRUD
    
    def create_operation(self, operation_data: Dict[str, Any]) -> SmartFileOperation:
        """Create a new smart file operation"""
        operation = SmartFileOperation(**operation_data)
        self.db.add(operation)
        self.db.commit()
        self.db.refresh(operation)
        return operation
    
    def get_operation_by_id(self, operation_id: str) -> Optional[SmartFileOperation]:
        """Get operation by ID with relationships"""
        return self.db.query(SmartFileOperation).options(
            joinedload(SmartFileOperation.source_pattern),
            joinedload(SmartFileOperation.operation_files).joinedload(SmartOperationFile.file)
        ).filter(SmartFileOperation.id == operation_id).first()
    
    def get_operations_list(
        self, 
        skip: int = 0, 
        limit: int = 100,
        status_filter: Optional[str] = None,
        operation_type_filter: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> List[SmartFileOperation]:
        """Get list of operations with filtering and pagination"""
        query = self.db.query(SmartFileOperation).options(
            joinedload(SmartFileOperation.source_pattern)
        )
        
        # Apply filters
        if status_filter:
            query = query.filter(SmartFileOperation.status == status_filter)
        
        if operation_type_filter:
            query = query.filter(SmartFileOperation.operation_type == operation_type_filter)
        
        # Apply sorting
        order_column = getattr(SmartFileOperation, sort_by, SmartFileOperation.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(order_column))
        else:
            query = query.order_by(asc(order_column))
        
        return query.offset(skip).limit(limit).all()
    
    def get_operations_count(
        self,
        status_filter: Optional[str] = None,
        operation_type_filter: Optional[str] = None
    ) -> int:
        """Get total count of operations with filters"""
        query = self.db.query(func.count(SmartFileOperation.id))
        
        if status_filter:
            query = query.filter(SmartFileOperation.status == status_filter)
        
        if operation_type_filter:
            query = query.filter(SmartFileOperation.operation_type == operation_type_filter)
        
        return query.scalar()
    
    def update_operation_status(
        self, 
        operation_id: str, 
        status: str,
        started_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        error_details: Optional[Dict] = None
    ) -> Optional[SmartFileOperation]:
        """Update operation status and timestamps"""
        operation = self.db.query(SmartFileOperation).filter(
            SmartFileOperation.id == operation_id
        ).first()
        
        if not operation:
            return None
        
        operation.status = status
        if started_at:
            operation.started_at = started_at
        if completed_at:
            operation.completed_at = completed_at
        if error_details:
            operation.error_details = error_details
        
        self.db.commit()
        self.db.refresh(operation)
        return operation
    
    def update_operation_progress(
        self, 
        operation_id: str, 
        processed_files: int,
        successful_files: int,
        failed_files: int,
        result_data: Optional[Dict] = None
    ) -> Optional[SmartFileOperation]:
        """Update operation progress counters"""
        operation = self.db.query(SmartFileOperation).filter(
            SmartFileOperation.id == operation_id
        ).first()
        
        if not operation:
            return None
        
        operation.processed_files = processed_files
        operation.successful_files = successful_files
        operation.failed_files = failed_files
        if result_data:
            operation.result_data = result_data
        
        self.db.commit()
        self.db.refresh(operation)
        return operation
    
    def delete_operation(self, operation_id: str) -> bool:
        """Delete operation (only if pending)"""
        operation = self.db.query(SmartFileOperation).filter(
            SmartFileOperation.id == operation_id,
            SmartFileOperation.status == 'pending'
        ).first()
        
        if not operation:
            return False
        
        self.db.delete(operation)
        self.db.commit()
        return True
    
    def get_operations_by_pattern(self, pattern_id: int) -> List[SmartFileOperation]:
        """Get operations that use a specific pattern"""
        return self.db.query(SmartFileOperation).filter(
            SmartFileOperation.source_pattern_id == pattern_id
        ).order_by(desc(SmartFileOperation.created_at)).all()
    
    # Smart Operation Files CRUD
    
    def create_operation_files(self, operation_files_data: List[Dict[str, Any]]) -> List[SmartOperationFile]:
        """Create multiple operation files in batch"""
        operation_files = [SmartOperationFile(**file_data) for file_data in operation_files_data]
        self.db.add_all(operation_files)
        self.db.commit()
        
        for file in operation_files:
            self.db.refresh(file)
        
        return operation_files
    
    def get_operation_files(
        self, 
        operation_id: str,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[SmartOperationFile]:
        """Get files for an operation with filtering and pagination"""
        query = self.db.query(SmartOperationFile).options(
            joinedload(SmartOperationFile.file)
        ).filter(SmartOperationFile.operation_id == operation_id)
        
        if status_filter:
            query = query.filter(SmartOperationFile.status == status_filter)
        
        return query.offset(skip).limit(limit).all()
    
    def get_operation_files_count(
        self, 
        operation_id: str,
        status_filter: Optional[str] = None
    ) -> int:
        """Get count of files for an operation"""
        query = self.db.query(func.count(SmartOperationFile.id)).filter(
            SmartOperationFile.operation_id == operation_id
        )
        
        if status_filter:
            query = query.filter(SmartOperationFile.status == status_filter)
        
        return query.scalar()
    
    def update_operation_file_status(
        self, 
        operation_id: str,
        file_id: int, 
        status: str,
        target_path: Optional[str] = None,
        error_message: Optional[str] = None,
        error_details: Optional[Dict] = None,
        processed_at: Optional[datetime] = None
    ) -> Optional[SmartOperationFile]:
        """Update operation file status"""
        operation_file = self.db.query(SmartOperationFile).filter(
            SmartOperationFile.operation_id == operation_id,
            SmartOperationFile.file_id == file_id
        ).first()
        
        if not operation_file:
            return None
        
        operation_file.status = status
        if target_path:
            operation_file.target_path = target_path
        if error_message:
            operation_file.error_message = error_message
        if error_details:
            operation_file.error_details = error_details
        if processed_at is None and status in ['completed', 'failed']:
            operation_file.processed_at = datetime.utcnow()
        elif processed_at:
            operation_file.processed_at = processed_at
        
        self.db.commit()
        self.db.refresh(operation_file)
        return operation_file
    
    def update_operation_file_target_path(
        self, 
        operation_id: str,
        file_id: int, 
        target_path: str
    ) -> Optional[SmartOperationFile]:
        """Update operation file target path"""
        operation_file = self.db.query(SmartOperationFile).filter(
            SmartOperationFile.operation_id == operation_id,
            SmartOperationFile.file_id == file_id
        ).first()
        
        if not operation_file:
            return None
        
        operation_file.target_path = target_path
        self.db.commit()
        self.db.refresh(operation_file)
        return operation_file
    
    def get_operation_file_by_id(self, file_id: int) -> Optional[SmartOperationFile]:
        """Get operation file by ID"""
        return self.db.query(SmartOperationFile).options(
            joinedload(SmartOperationFile.file),
            joinedload(SmartOperationFile.operation)
        ).filter(SmartOperationFile.id == file_id).first()
    
    # Statistics and reporting
    
    def get_operations_statistics(self) -> Dict[str, Any]:
        """Get overall operations statistics"""
        total_operations = self.db.query(func.count(SmartFileOperation.id)).scalar()
        
        # Count by status
        status_counts = self.db.query(
            SmartFileOperation.status,
            func.count(SmartFileOperation.id)
        ).group_by(SmartFileOperation.status).all()
        
        # Count by operation type
        type_counts = self.db.query(
            SmartFileOperation.operation_type,
            func.count(SmartFileOperation.id)
        ).group_by(SmartFileOperation.operation_type).all()
        
        # Recent operations (last 24 hours)
        from datetime import timedelta
        recent_date = datetime.utcnow() - timedelta(days=1)
        recent_operations = self.db.query(func.count(SmartFileOperation.id)).filter(
            SmartFileOperation.created_at >= recent_date
        ).scalar()
        
        return {
            'total_operations': total_operations,
            'status_distribution': dict(status_counts),
            'type_distribution': dict(type_counts),
            'recent_operations_24h': recent_operations
        }