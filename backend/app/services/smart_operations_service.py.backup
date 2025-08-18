"""
Service layer for Smart File Operations business logic
"""
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ..models.smart_operations import SmartFileOperation, SmartOperationFile
from ..models.file_models import IndexedFile, ExtractionPattern
from ..repositories.smart_operations_repository import SmartOperationsRepository
from ..repositories.file_repository import FileRepository


class SmartOperationsService:
    """Service for Smart File Operations business logic"""
    
    def __init__(self, db: Session):
        self.db = db
        self.smart_ops_repo = SmartOperationsRepository(db)
        self.file_repo = FileRepository(db)
    
    def create_operation(
        self,
        name: str,
        operation_type: str,
        source_pattern_id: int,
        target_directory: str,
        target_template: str,
        created_by: str = None
    ) -> SmartFileOperation:
        """Create a new Smart File Operation"""
        
        # Validate operation type
        if operation_type not in ['copy', 'move']:
            raise HTTPException(
                status_code=400, 
                detail="Invalid operation type. Must be 'copy' or 'move'"
            )
        
        # Validate pattern exists
        pattern = self.db.query(ExtractionPattern).filter(
            ExtractionPattern.id == source_pattern_id,
            ExtractionPattern.is_active == True
        ).first()
        
        if not pattern:
            raise HTTPException(
                status_code=404,
                detail=f"Pattern with ID {source_pattern_id} not found or inactive"
            )
        
        # Get files matching the pattern
        pattern_files = self.file_repo.get_files_by_pattern(source_pattern_id)
        
        if not pattern_files:
            raise HTTPException(
                status_code=400,
                detail="No files found for the selected pattern"
            )
        
        # Validate target directory template
        self._validate_target_template(target_template, pattern.field_mapping)
        
        # Create operation
        operation_data = {
            'id': str(uuid.uuid4()),
            'name': name,
            'operation_type': operation_type,
            'source_pattern_id': source_pattern_id,
            'source_file_count': len(pattern_files),
            'target_directory': target_directory,
            'target_template': target_template,
            'created_by': created_by,
            'status': 'pending'
        }
        
        operation = self.smart_ops_repo.create_operation(operation_data)
        
        # Create operation files
        operation_files_data = []
        for file in pattern_files:
            operation_files_data.append({
                'operation_id': operation.id,
                'file_id': file.id,
                'source_path': file.full_path,
                'status': 'pending'
            })
        
        if operation_files_data:
            self.smart_ops_repo.create_operation_files(operation_files_data)
        
        return operation
    
    def get_operation_by_id(self, operation_id: str) -> Optional[SmartFileOperation]:
        """Get operation by ID with full details"""
        return self.smart_ops_repo.get_operation_by_id(operation_id)
    
    def get_operations_list(
        self,
        skip: int = 0,
        limit: int = 100,
        status_filter: str = None,
        operation_type_filter: str = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Get operations list with pagination and filtering"""
        
        operations = self.smart_ops_repo.get_operations_list(
            skip=skip,
            limit=limit,
            status_filter=status_filter,
            operation_type_filter=operation_type_filter,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        total = self.smart_ops_repo.get_operations_count(
            status_filter=status_filter,
            operation_type_filter=operation_type_filter
        )
        
        return {
            'operations': [op.to_summary_dict() for op in operations],
            'total': total,
            'skip': skip,
            'limit': limit,
            'has_more': skip + limit < total
        }
    
    def get_operation_files(
        self,
        operation_id: str,
        status_filter: str = None,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get files for an operation"""
        
        # Verify operation exists
        operation = self.smart_ops_repo.get_operation_by_id(operation_id)
        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        operation_files = self.smart_ops_repo.get_operation_files(
            operation_id=operation_id,
            status_filter=status_filter,
            skip=skip,
            limit=limit
        )
        
        total = self.smart_ops_repo.get_operation_files_count(
            operation_id=operation_id,
            status_filter=status_filter
        )
        
        return {
            'files': [file.to_dict() for file in operation_files],
            'total': total,
            'skip': skip,
            'limit': limit,
            'has_more': skip + limit < total
        }
    
    def delete_operation(self, operation_id: str) -> bool:
        """Delete operation (only if pending)"""
        operation = self.smart_ops_repo.get_operation_by_id(operation_id)
        
        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        if not operation.can_be_deleted():
            raise HTTPException(
                status_code=400,
                detail="Only pending operations can be deleted"
            )
        
        return self.smart_ops_repo.delete_operation(operation_id)
    
    def get_operations_by_pattern(self, pattern_id: int) -> List[SmartFileOperation]:
        """Get all operations that use a specific pattern"""
        return self.smart_ops_repo.get_operations_by_pattern(pattern_id)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get Smart Operations statistics"""
        return self.smart_ops_repo.get_operations_statistics()
    
    def preview_operation(
        self,
        source_pattern_id: int,
        target_directory: str,
        target_template: str,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Preview what the operation would do without creating it"""
        
        # Validate pattern exists
        pattern = self.db.query(ExtractionPattern).filter(
            ExtractionPattern.id == source_pattern_id,
            ExtractionPattern.is_active == True
        ).first()
        
        if not pattern:
            raise HTTPException(
                status_code=404,
                detail=f"Pattern with ID {source_pattern_id} not found or inactive"
            )
        
        # Validate target template
        self._validate_target_template(target_template, pattern.field_mapping)
        
        # Get sample files
        pattern_files = self.file_repo.get_files_by_pattern(
            source_pattern_id, 
            limit=limit
        )
        
        if not pattern_files:
            return {
                'total_files': 0,
                'sample_files': [],
                'warnings': ['No files found for the selected pattern']
            }
        
        # Generate preview for sample files
        sample_previews = []
        warnings = []
        
        for file in pattern_files:
            try:
                target_path = self._generate_target_path(
                    file, target_directory, target_template
                )
                sample_previews.append({
                    'file_id': file.id,
                    'source_filename': file.filename,
                    'source_path': file.full_path,
                    'target_path': target_path,
                    'extracted_data': file.extracted_data
                })
            except Exception as e:
                warnings.append(f"Error processing {file.filename}: {str(e)}")
        
        # Get total count
        total_files = len(self.file_repo.get_files_by_pattern(source_pattern_id))
        
        return {
            'total_files': total_files,
            'sample_files': sample_previews,
            'warnings': warnings,
            'pattern_name': pattern.name,
            'target_directory': target_directory,
            'target_template': target_template
        }
    
    def _validate_target_template(self, template: str, field_mapping: Dict) -> None:
        """Validate that the target template uses valid field placeholders"""
        import re
        
        # Find all placeholders in the template
        placeholders = re.findall(r'\{([^}]+)\}', template)
        
        # Get available fields from pattern
        available_fields = list(field_mapping.keys())
        
        # Check for invalid placeholders
        invalid_fields = []
        for placeholder in placeholders:
            if placeholder not in available_fields:
                invalid_fields.append(placeholder)
        
        if invalid_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid template placeholders: {', '.join(invalid_fields)}. "
                       f"Available fields: {', '.join(available_fields)}"
            )
    
    def _generate_target_path(
        self, 
        file: IndexedFile, 
        target_directory: str, 
        target_template: str
    ) -> str:
        """Generate target path for a file using the template"""
        
        if not file.extracted_data:
            raise ValueError(f"No extracted data found for file: {file.filename}")
        
        # Replace placeholders with extracted data
        target_filename = target_template
        for field, value in file.extracted_data.items():
            placeholder = f"{{{field}}}"
            target_filename = target_filename.replace(placeholder, str(value))
        
        # Combine with target directory
        target_path = Path(target_directory) / target_filename
        return str(target_path)
    
    def start_operation_execution(self, operation_id: str) -> SmartFileOperation:
        """Start executing an operation (update status to running)"""
        operation = self.smart_ops_repo.update_operation_status(
            operation_id=operation_id,
            status='running',
            started_at=datetime.utcnow()
        )
        
        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        return operation
    
    def complete_operation_execution(
        self, 
        operation_id: str, 
        result_data: Dict = None
    ) -> SmartFileOperation:
        """Mark operation as completed"""
        operation = self.smart_ops_repo.update_operation_status(
            operation_id=operation_id,
            status='completed',
            completed_at=datetime.utcnow()
        )
        
        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        if result_data:
            operation.result_data = result_data
            self.db.commit()
        
        return operation
    
    def fail_operation_execution(
        self, 
        operation_id: str, 
        error_details: Dict = None
    ) -> SmartFileOperation:
        """Mark operation as failed"""
        operation = self.smart_ops_repo.update_operation_status(
            operation_id=operation_id,
            status='failed',
            completed_at=datetime.utcnow(),
            error_details=error_details
        )
        
        if not operation:
            raise HTTPException(status_code=404, detail="Operation not found")
        
        return operation
    
    def update_operation_progress(
        self,
        operation_id: str,
        processed_files: int,
        successful_files: int,
        failed_files: int,
        result_data: Dict = None
    ) -> SmartFileOperation:
        """Update operation progress"""
        return self.smart_ops_repo.update_operation_progress(
            operation_id=operation_id,
            processed_files=processed_files,
            successful_files=successful_files,
            failed_files=failed_files,
            result_data=result_data
        )