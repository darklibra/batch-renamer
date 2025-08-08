from typing import Dict, Any, Optional, List
from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.use_cases.extracted_data.extract_data_from_file import ExtractDataFromFileUseCase


class CreateFileChangePatternUseCase:
    def __init__(
        self,
        repository: FileChangePatternRepository,
        file_repository: FileRepository,
        extract_data_from_file_use_case: ExtractDataFromFileUseCase,
    ):
        self.repository = repository
        self.file_repository = file_repository
        self.extract_data_from_file_use_case = extract_data_from_file_use_case

    def execute(
        self, name: str, regex_pattern: str, replacement_format: str, file_ids: List[int]
    ) -> Dict[int, Optional[Dict[str, Any]]]:
        results: Dict[int, Optional[Dict[str, Any]]] = {}

        # 임시 패턴 객체 생성 (저장하지 않음)
        temp_pattern = FileChangePattern(
            name=name,
            regex_pattern=regex_pattern,
            replacement_format=replacement_format,
            is_confirmed=False # 테스트용이므로 False
        )

        for file_id in file_ids:
            file = self.file_repository.find_by_id(file_id)
            if file:
                extracted_data = self.extract_data_from_file_use_case.execute(file, temp_pattern)
                results[file_id] = extracted_data
            else:
                results[file_id] = None # 파일을 찾을 수 없는 경우
        return results
