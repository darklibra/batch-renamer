
from typing import List, Tuple
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.domain.file.repository import FileRepository
from app.domain.file_change_request.repository import FileChangeRequestRepository
from app.domain.file_change_request.model import FileChangeRequest
from app.domain.file_change_request.file_change_request_target_model import FileChangeRequestTarget
from app.infrastructure.services.file_operation_service import FileOperationService
from app.application.exceptions import PatternNotFoundException, FileOperationException

class CreateFileChangeRequestUseCase:
    def __init__(
        self, 
        file_repository: FileRepository,
        file_change_pattern_repository: FileChangePatternRepository,
        file_change_request_repository: FileChangeRequestRepository,
        file_operation_service: FileOperationService
    ):
        self.file_repository = file_repository
        self.file_change_pattern_repository = file_change_pattern_repository
        self.file_change_request_repository = file_change_request_repository
        self.file_operation_service = file_operation_service

    def execute(
        self, 
        file_change_pattern_id: int, 
        rename_pattern_string: str, 
        destination_path: str
    ) -> FileChangeRequest:
        pattern = self.file_change_pattern_repository.find_by_id(file_change_pattern_id)
        if not pattern:
            raise PatternNotFoundException(f"Pattern with id {file_change_pattern_id} not found")

        files = self.file_repository.find_by_pattern_id(file_change_pattern_id)
        
        success_count = 0
        failed_count = 0
        details = []
        targets = []

        if files:
            try:
                success_count, failed_count, details, copied_files_info = self.file_operation_service.rename_and_copy_files_with_details(
                    files=files,
                    rename_pattern_string=rename_pattern_string,
                    destination_path=destination_path
                )
                
                for info in copied_files_info:
                    targets.append(FileChangeRequestTarget(
                        original_file_id=info['original_file_id'],
                        new_filename=info['new_filename'],
                        status=info['status'],
                        message=info['message']
                    ))

            except Exception as e:
                failed_count = len(files)
                details = [f"Failed to rename and copy files: {e}"]

        request = FileChangeRequest(
            file_change_pattern_id=file_change_pattern_id,
            rename_pattern_string=rename_pattern_string,
            destination_path=destination_path,
            success_count=success_count,
            failed_count=failed_count,
            details=", ".join(details),
            targets=targets
        )

        return self.file_change_request_repository.save(request)
