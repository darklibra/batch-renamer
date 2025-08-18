"""
Service layer for Smart File Operations business logic
"""
import uuid
import shutil
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from sqlalchemy.orm import Session
from fastapi import HTTPException
import threading
import time

from ..models.smart_operations import SmartFileOperation, SmartOperationFile
from ..models.file_models import IndexedFile, ExtractionPattern
from ..repositories.smart_operations_repository import SmartOperationsRepository
from ..repositories.file_repository import FileRepository

# 로거 설정
logger = logging.getLogger(__name__)

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
        
        # Get available fields from pattern + standard file fields
        available_fields = list(field_mapping.keys())
        
        # Add standard file fields that are always available
        standard_fields = ['filename', 'extension', 'name']
        available_fields.extend(standard_fields)
        
        # Remove duplicates
        available_fields = list(set(available_fields))
        
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
        
        # Create combined data from extracted data and standard file fields
        combined_data = {}
        
        # Add extracted data if available
        if file.extracted_data:
            combined_data.update(file.extracted_data)
        
        # Add standard file fields
        filename_without_ext = Path(file.filename).stem if file.filename else 'unknown'
        extension = file.extension or Path(file.filename).suffix if file.filename else ''
        
        standard_fields = {
            'filename': file.filename or 'unknown',
            'extension': extension.lstrip('.') if extension else '',
            'name': filename_without_ext
        }
        combined_data.update(standard_fields)
        
        # Replace placeholders with combined data
        target_filename = target_template
        for field, value in combined_data.items():
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
        
        # 백그라운드에서 실제 파일 처리 시작
        self._start_background_processing(operation_id)
        
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
    
    def _start_background_processing(self, operation_id: str):
        """백그라운드에서 파일 처리 시작"""
        def process_operation():
            try:
                logger.info(f"Starting background processing for operation {operation_id}")
                self._execute_operation_files(operation_id)
                logger.info(f"Background processing completed for operation {operation_id}")
            except Exception as e:
                logger.error(f"Background processing failed for operation {operation_id}: {str(e)}", exc_info=True)
                
                # 처리 중 예외 발생 시 작업을 실패로 마킹 시도
                try:
                    from ..core.database import get_db_session
                    db = get_db_session()
                    bg_service = SmartOperationsService(db)
                    bg_service.fail_operation_execution(operation_id, {
                        'error': str(e),
                        'error_type': type(e).__name__,
                        'stage': 'background_processing_startup'
                    })
                    db.commit()
                    db.close()
                    logger.info(f"Operation {operation_id} marked as failed due to background processing error")
                except Exception as fail_e:
                    logger.error(f"Failed to mark operation {operation_id} as failed: {str(fail_e)}", exc_info=True)
        
        try:
            # 별도 스레드에서 실행
            processing_thread = threading.Thread(
                target=process_operation, 
                name=f"SmartOps-{operation_id[:8]}"
            )
            processing_thread.daemon = True
            processing_thread.start()
            logger.debug(f"Background thread started for operation {operation_id}")
        except Exception as e:
            logger.error(f"Failed to start background thread for operation {operation_id}: {str(e)}", exc_info=True)
            raise
    
    def _execute_operation_files(self, operation_id: str):
        """실제 파일 처리 실행"""
        db = None
        bg_service = None
        processed = 0
        successful = 0
        failed = 0
        
        try:
            # 새로운 DB 세션 생성 (스레드 안전)
            from ..core.database import get_db_session
            db = get_db_session()
            
            # 백그라운드 스레드 전용 Repository 인스턴스 생성
            bg_smart_ops_repo = SmartOperationsRepository(db)
            bg_file_repo = FileRepository(db)
            bg_service = SmartOperationsService(db)
            
            # 작업 존재 확인
            operation = bg_smart_ops_repo.get_operation_by_id(operation_id)
            if not operation:
                logger.error(f"Operation {operation_id} not found in database")
                return
            
            # 작업 상태 확인
            if operation.status != 'running':
                logger.warning(f"Operation {operation_id} is not in running state (current: {operation.status})")
                return
                
            # 작업 파일 목록 가져오기
            try:
                operation_files = bg_smart_ops_repo.get_operation_files(
                    operation_id=operation_id,
                    status_filter='pending',
                    skip=0,
                    limit=1000  # 모든 파일 처리
                )
            except Exception as e:
                logger.error(f"Failed to retrieve operation files for {operation_id}: {str(e)}", exc_info=True)
                raise
            
            total_files = len(operation_files)
            logger.info(f"Processing {total_files} files for operation {operation_id}")
            
            # 파일이 없는 경우 처리
            if total_files == 0:
                logger.warning(f"No pending files found for operation {operation_id}")
                bg_service.complete_operation_execution(operation_id, {
                    'total_processed': 0,
                    'successful': 0,
                    'failed': 0,
                    'message': 'No files to process'
                })
                return
            
            # 각 파일 처리
            for op_file in operation_files:
                try:
                    logger.debug(f"Processing file {op_file.file_id} (path: {op_file.source_path})")
                    
                    # 파일 상태를 processing으로 변경
                    try:
                        bg_smart_ops_repo.update_operation_file_status(
                            operation_id, op_file.file_id, 'processing'
                        )
                        db.commit()
                    except Exception as e:
                        logger.error(f"Failed to update file {op_file.file_id} status to processing: {str(e)}", exc_info=True)
                        # 상태 업데이트 실패해도 파일 처리는 계속 시도
                    
                    # 실제 파일 처리
                    try:
                        success = self._process_single_file_bg(operation, op_file, bg_file_repo)
                        
                        if success:
                            successful += 1
                            try:
                                bg_smart_ops_repo.update_operation_file_status(
                                    operation_id, op_file.file_id, 'completed'
                                )
                                db.commit()
                                logger.debug(f"File {op_file.file_id} processed successfully")
                            except Exception as e:
                                logger.error(f"Failed to update file {op_file.file_id} status to completed: {str(e)}", exc_info=True)
                        else:
                            failed += 1
                            try:
                                bg_smart_ops_repo.update_operation_file_status(
                                    operation_id, op_file.file_id, 'failed'
                                )
                                db.commit()
                                logger.warning(f"File {op_file.file_id} processing failed")
                            except Exception as e:
                                logger.error(f"Failed to update file {op_file.file_id} status to failed: {str(e)}", exc_info=True)
                    
                    except Exception as e:
                        failed += 1
                        logger.error(f"Exception during file {op_file.file_id} processing: {str(e)}", exc_info=True)
                        try:
                            bg_smart_ops_repo.update_operation_file_status(
                                operation_id, op_file.file_id, 'failed'
                            )
                            db.commit()
                        except Exception as status_e:
                            logger.error(f"Failed to update failed file {op_file.file_id} status: {str(status_e)}", exc_info=True)
                        
                except Exception as e:
                    failed += 1
                    logger.error(f"Critical error processing file {op_file.file_id}: {str(e)}", exc_info=True)
                
                processed += 1
                
                # 진행률 업데이트
                try:
                    bg_service.update_operation_progress(
                        operation_id=operation_id,
                        processed_files=processed,
                        successful_files=successful,
                        failed_files=failed
                    )
                    db.commit()
                except Exception as e:
                    logger.error(f"Failed to update operation progress: {str(e)}", exc_info=True)
                    # 진행률 업데이트 실패해도 처리는 계속
                
                # 짧은 지연 (데모용 - 실제로는 제거 가능)
                time.sleep(0.5)
            
            # 작업 완료 처리
            try:
                if failed == 0:
                    logger.info(f"Operation {operation_id} completed successfully. Processed: {processed}, Successful: {successful}")
                    bg_service.complete_operation_execution(operation_id, {
                        'total_processed': processed,
                        'successful': successful,
                        'failed': failed
                    })
                else:
                    # 일부 실패가 있어도 완료로 처리 (부분 성공)
                    logger.warning(f"Operation {operation_id} completed with errors. Processed: {processed}, Successful: {successful}, Failed: {failed}")
                    bg_service.complete_operation_execution(operation_id, {
                        'total_processed': processed,
                        'successful': successful,
                        'failed': failed,
                        'status': 'completed_with_errors'
                    })
                db.commit()
            except Exception as e:
                logger.error(f"Failed to mark operation {operation_id} as completed: {str(e)}", exc_info=True)
                # 완료 마킹 실패 시 실패로 처리
                raise
                
        except Exception as e:
            logger.error(f"Operation {operation_id} failed with critical error: {str(e)}", exc_info=True)
            
            # 실패 상태로 마킹 시도
            try:
                if bg_service:
                    bg_service.fail_operation_execution(operation_id, {
                        'error': str(e),
                        'error_type': type(e).__name__,
                        'processed_files': processed,
                        'successful_files': successful,
                        'failed_files': failed
                    })
                    if db:
                        db.commit()
            except Exception as fail_e:
                logger.error(f"Failed to mark operation {operation_id} as failed: {str(fail_e)}", exc_info=True)
                
        finally:
            # DB 세션 정리
            if db:
                try:
                    db.close()
                    logger.debug(f"DB session closed for operation {operation_id}")
                except Exception as e:
                    logger.error(f"Error closing DB session: {str(e)}", exc_info=True)
    
    def _process_single_file(self, operation: SmartFileOperation, op_file) -> bool:
        """단일 파일 처리 (메인 스레드용)"""
        try:
            source_path = Path(op_file.source_path)
            if not source_path.exists():
                print(f"Source file not found: {source_path}")
                return False
            
            # 대상 경로 생성
            file_obj = self.file_repo.get_file_by_id(op_file.file_id)
            if not file_obj:
                return False
                
            target_path = self._generate_target_path(
                file_obj, 
                operation.target_directory, 
                operation.target_template
            )
            
            target_path_obj = Path(target_path)
            
            # 대상 디렉토리 생성
            target_path_obj.parent.mkdir(parents=True, exist_ok=True)
            
            # 파일 복사 또는 이동
            if operation.operation_type == 'copy':
                shutil.copy2(source_path, target_path_obj)
            elif operation.operation_type == 'move':
                shutil.move(str(source_path), str(target_path_obj))
            
            # 성공 시 대상 경로 업데이트
            self.smart_ops_repo.update_operation_file_target_path(
                operation.id, op_file.file_id, str(target_path_obj)
            )
            
            return True
            
        except Exception as e:
            print(f"Error processing file {op_file.file_id}: {str(e)}")
            return False
    
    def _process_single_file_bg(self, operation: SmartFileOperation, op_file, bg_file_repo: FileRepository) -> bool:
        """단일 파일 처리 (백그라운드 스레드용)"""
        try:
            # 소스 파일 존재 확인
            source_path = Path(op_file.source_path)
            if not source_path.exists():
                logger.warning(f"Source file not found: {source_path}")
                return False
            
            if not source_path.is_file():
                logger.warning(f"Source path is not a file: {source_path}")
                return False
            
            # 파일 객체 가져오기
            try:
                file_obj = bg_file_repo.get_file_by_id(op_file.file_id)
                if not file_obj:
                    logger.error(f"File object not found in database for ID: {op_file.file_id}")
                    return False
            except Exception as e:
                logger.error(f"Database error retrieving file {op_file.file_id}: {str(e)}", exc_info=True)
                return False
                
            # 대상 경로 생성
            try:
                target_path = self._generate_target_path(
                    file_obj, 
                    operation.target_directory, 
                    operation.target_template
                )
            except Exception as e:
                logger.error(f"Failed to generate target path for file {op_file.file_id}: {str(e)}", exc_info=True)
                return False
            
            target_path_obj = Path(target_path)
            
            # 대상 경로 유효성 검사
            try:
                # 대상 디렉토리 생성
                target_path_obj.parent.mkdir(parents=True, exist_ok=True)
                
                # 대상 파일이 이미 존재하는지 확인
                if target_path_obj.exists():
                    logger.warning(f"Target file already exists: {target_path_obj}")
                    # 기존 파일 백업 (선택적)
                    # backup_path = f"{target_path_obj}.backup.{int(time.time())}"
                    # shutil.copy2(target_path_obj, backup_path)
                    # logger.info(f"Existing file backed up to: {backup_path}")
                
            except Exception as e:
                logger.error(f"Failed to prepare target directory for {target_path_obj}: {str(e)}", exc_info=True)
                return False
            
            # 파일 복사 또는 이동 실행
            try:
                if operation.operation_type == 'copy':
                    shutil.copy2(source_path, target_path_obj)
                    logger.info(f"Successfully copied: {source_path} -> {target_path_obj}")
                elif operation.operation_type == 'move':
                    shutil.move(str(source_path), str(target_path_obj))
                    logger.info(f"Successfully moved: {source_path} -> {target_path_obj}")
                else:
                    logger.error(f"Unknown operation type: {operation.operation_type}")
                    return False
                    
            except PermissionError as e:
                logger.error(f"Permission denied for file operation {op_file.file_id}: {str(e)}", exc_info=True)
                return False
            except OSError as e:
                logger.error(f"OS error during file operation {op_file.file_id}: {str(e)}", exc_info=True)
                return False
            except Exception as e:
                logger.error(f"Unexpected error during file operation {op_file.file_id}: {str(e)}", exc_info=True)
                return False
            
            # 대상 파일이 실제로 생성되었는지 확인
            if not target_path_obj.exists():
                logger.error(f"Target file was not created: {target_path_obj}")
                return False
            
            # 대상 경로를 데이터베이스에 업데이트 (성공 시에만)
            try:
                from ..repositories.smart_operations_repository import SmartOperationsRepository
                db = bg_file_repo.db  # 같은 세션 사용
                bg_smart_ops_repo = SmartOperationsRepository(db)
                bg_smart_ops_repo.update_operation_file_target_path(
                    operation.id, op_file.file_id, str(target_path_obj)
                )
                db.commit()
                logger.debug(f"Updated target path for file {op_file.file_id}: {target_path_obj}")
            except Exception as e:
                logger.error(f"Failed to update target path in database for file {op_file.file_id}: {str(e)}", exc_info=True)
                # 데이터베이스 업데이트 실패해도 파일 처리는 성공으로 간주
            
            return True
            
        except Exception as e:
            logger.error(f"Critical error processing file {op_file.file_id}: {str(e)}", exc_info=True)
            return False