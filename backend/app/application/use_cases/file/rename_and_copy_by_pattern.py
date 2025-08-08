
from typing import List, Tuple
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.domain.file.repository import FileRepository
from app.infrastructure.services.file_operation_service import FileOperationService
from app.application.exceptions import PatternNotFoundException, FileOperationException

class RenameAndCopyByPatternUseCase:
    def __init__(
        self, 
        file_repository: FileRepository,
        file_change_pattern_repository: FileChangePatternRepository,
        file_operation_service: FileOperationService
    ):
        self.file_repository = file_repository
        self.file_change_pattern_repository = file_change_pattern_repository
        self.file_operation_service = file_operation_service

    def execute(
        self, 
        file_change_pattern_id: int, 
        rename_pattern_string: str, 
        destination_path: str
    ) -> Tuple[int, int, List[str]]:
        pattern = self.file_change_pattern_repository.find_by_id(file_change_pattern_id)
        if not pattern:
            raise PatternNotFoundException(f"Pattern with id {file_change_pattern_id} not found")

        files = self.file_repository.find_by_pattern_id(file_change_pattern_id)
        if not files:
            return 0, 0, ["No files found for the given pattern."]

        try:
            success_count, failed_count, details = self.file_operation_service.rename_and_copy_files(
                files=files,
                rename_pattern_string=rename_pattern_string,
                destination_path=destination_path
            )
            return success_count, failed_count, details
        except Exception as e:
            raise FileOperationException(f"Failed to rename and copy files: {e}")
