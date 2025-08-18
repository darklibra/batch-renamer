"""
Smart File Operations Database Models
"""
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Boolean, Text, CheckConstraint
from sqlalchemy.orm import relationship
from .base import Base


class SmartFileOperation(Base):
    """
    Model for Smart File Operations - user-created file copy/move operations
    """
    __tablename__ = "smart_file_operations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)  # 사용자 정의 작업 이름
    operation_type = Column(String(10), nullable=False)  # 'copy' | 'move'
    status = Column(String(20), nullable=False, default='pending')  # 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
    
    # 소스 정보
    source_pattern_id = Column(Integer, ForeignKey('patterns.id'), nullable=False)
    source_file_count = Column(Integer, default=0)
    
    # 대상 정보
    target_directory = Column(Text, nullable=False)
    target_template = Column(Text, nullable=False)
    
    # 진행 상황
    processed_files = Column(Integer, default=0)
    successful_files = Column(Integer, default=0)
    failed_files = Column(Integer, default=0)
    
    # 결과 데이터
    result_data = Column(JSON)  # 처리 결과 상세 정보
    error_details = Column(JSON)  # 오류 상세 정보
    
    # 메타데이터
    created_by = Column(String(100))  # 생성한 사용자 (향후 확장)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    source_pattern = relationship("ExtractionPattern", back_populates="smart_operations")
    operation_files = relationship("SmartOperationFile", back_populates="operation", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            operation_type.in_(['copy', 'move']), 
            name='valid_operation_type'
        ),
        CheckConstraint(
            status.in_(['pending', 'running', 'completed', 'failed', 'cancelled']), 
            name='valid_status'
        ),
    )
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'name': self.name,
            'operation_type': self.operation_type,
            'status': self.status,
            'source_pattern_id': self.source_pattern_id,
            'source_pattern_name': self.source_pattern.name if self.source_pattern else None,
            'source_file_count': self.source_file_count,
            'target_directory': self.target_directory,
            'target_template': self.target_template,
            'processed_files': self.processed_files,
            'successful_files': self.successful_files,
            'failed_files': self.failed_files,
            'progress_percentage': self.get_progress_percentage(),
            'result_data': self.result_data,
            'error_details': self.error_details,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': self.get_duration_seconds()
        }
    
    def to_summary_dict(self) -> Dict:
        """Convert to summary dictionary for list views"""
        return {
            'id': self.id,
            'name': self.name,
            'operation_type': self.operation_type,
            'status': self.status,
            'source_pattern_name': self.source_pattern.name if self.source_pattern else 'Unknown',
            'source_file_count': self.source_file_count,
            'processed_files': self.processed_files,
            'successful_files': self.successful_files,
            'failed_files': self.failed_files,
            'progress_percentage': self.get_progress_percentage(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def get_progress_percentage(self) -> float:
        """Calculate progress percentage"""
        if self.source_file_count == 0:
            return 0.0
        return round((self.processed_files / self.source_file_count) * 100, 1)
    
    def get_duration_seconds(self) -> Optional[int]:
        """Get operation duration in seconds"""
        if not self.started_at:
            return None
        end_time = self.completed_at or datetime.utcnow()
        return int((end_time - self.started_at).total_seconds())
    
    def is_running(self) -> bool:
        """Check if operation is currently running"""
        return self.status == 'running'
    
    def is_completed(self) -> bool:
        """Check if operation is completed (successfully or failed)"""
        return self.status in ['completed', 'failed', 'cancelled']
    
    def can_be_cancelled(self) -> bool:
        """Check if operation can be cancelled"""
        return self.status in ['pending', 'running']
    
    def can_be_deleted(self) -> bool:
        """Check if operation can be deleted (only pending operations)"""
        return self.status == 'pending'


class SmartOperationFile(Base):
    """
    Model for individual files within Smart File Operations
    """
    __tablename__ = "smart_operation_files"
    
    id = Column(Integer, primary_key=True)
    operation_id = Column(String(36), ForeignKey('smart_file_operations.id', ondelete='CASCADE'), nullable=False)
    file_id = Column(Integer, ForeignKey('files.id'), nullable=False)
    
    # 처리 결과
    status = Column(String(20), nullable=False, default='pending')  # 'pending' | 'processing' | 'completed' | 'failed'
    source_path = Column(Text, nullable=False)
    target_path = Column(Text)
    
    # 오류 정보
    error_message = Column(Text)
    error_details = Column(JSON)
    
    # 처리 시간
    processed_at = Column(DateTime)
    
    # Relationships
    operation = relationship("SmartFileOperation", back_populates="operation_files")
    file = relationship("IndexedFile")
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            status.in_(['pending', 'processing', 'completed', 'failed']), 
            name='valid_file_status'
        ),
    )
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'operation_id': self.operation_id,
            'file_id': self.file_id,
            'filename': self.file.filename if self.file else None,
            'status': self.status,
            'source_path': self.source_path,
            'target_path': self.target_path,
            'error_message': self.error_message,
            'error_details': self.error_details,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }


# Update the ExtractionPattern model to include relationship
def update_extraction_pattern_relationship():
    """
    This function should be called to update the ExtractionPattern model
    to include the back_populates relationship to smart_operations
    """
    # Add this to ExtractionPattern model:
    # smart_operations = relationship("SmartFileOperation", back_populates="source_pattern")
    pass