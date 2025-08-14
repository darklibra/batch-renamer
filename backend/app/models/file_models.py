from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from app.core.database import Base

class IndexedFile(Base):
    """
    Model for indexed files with complete metadata
    """
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    extension = Column(String(50))
    path = Column(String(500), nullable=False)        # Relative directory path
    full_path = Column(String(1000), unique=True, nullable=False)  # Absolute path
    file_size = Column(Integer, default=0)
    last_modified = Column(DateTime)
    extracted_data = Column(JSON)                     # Pattern extraction results
    pattern_id = Column(Integer, ForeignKey('patterns.id'), nullable=True)
    indexed_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to pattern
    pattern = relationship("ExtractionPattern", back_populates="files")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_files_path', 'path'),
        Index('idx_files_extension', 'extension'),
        Index('idx_files_filename', 'filename'),
        Index('idx_files_full_path', 'full_path'),
    )
    
    @classmethod
    def from_file_path(cls, file_path: str, base_path: str = None) -> Dict:
        """Create file data dict from file path"""
        path_obj = Path(file_path)
        
        if not path_obj.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        stat = path_obj.stat()
        
        # Calculate relative path if base_path provided
        if base_path:
            try:
                relative_path = str(path_obj.parent.relative_to(Path(base_path)))
            except ValueError:
                relative_path = str(path_obj.parent)
        else:
            relative_path = str(path_obj.parent)
        
        return {
            'filename': path_obj.name,
            'extension': path_obj.suffix[1:] if path_obj.suffix else '',
            'path': relative_path,
            'full_path': str(path_obj.resolve()),
            'file_size': stat.st_size,
            'last_modified': datetime.fromtimestamp(stat.st_mtime)
        }
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'filename': self.filename,
            'extension': self.extension,
            'path': self.path,
            'full_path': self.full_path,
            'file_size': self.file_size,
            'last_modified': self.last_modified.isoformat() if self.last_modified else None,
            'extracted_data': self.extracted_data,
            'pattern_id': self.pattern_id,
            'indexed_at': self.indexed_at.isoformat() if self.indexed_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ExclusionPattern(Base):
    """
    Model for exclusion patterns to filter files during scanning
    """
    __tablename__ = "exclusion_patterns"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    pattern = Column(String(500), nullable=False)     # Glob or regex pattern
    pattern_type = Column(String(20), default='glob') # 'glob' or 'regex'
    description = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'name': self.name,
            'pattern': self.pattern,
            'pattern_type': self.pattern_type,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ExtractionPattern(Base):
    """
    Model for data extraction patterns
    """
    __tablename__ = "patterns"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    regex_pattern = Column(String(500), nullable=False)
    field_mapping = Column(JSON, nullable=False)
    priority = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to files
    files = relationship("IndexedFile", back_populates="pattern")
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'name': self.name,
            'regex_pattern': self.regex_pattern,
            'field_mapping': self.field_mapping,
            'priority': self.priority,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class IndexingJob(Base):
    """
    Model for tracking file indexing jobs
    """
    __tablename__ = "indexing_jobs"
    
    id = Column(String(36), primary_key=True)  # UUID
    directory_path = Column(String(1000), nullable=False)
    status = Column(String(20), default='started')  # started, processing, completed, error
    stage = Column(String(50), default='initializing')
    processed_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    newly_indexed = Column(Integer, default=0)
    already_indexed = Column(Integer, default=0)
    error_message = Column(String(1000))
    result_data = Column(JSON)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'directory_path': self.directory_path,
            'status': self.status,
            'stage': self.stage,
            'processed_count': self.processed_count,
            'total_count': self.total_count,
            'newly_indexed': self.newly_indexed,
            'already_indexed': self.already_indexed,
            'error_message': self.error_message,
            'result_data': self.result_data,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }