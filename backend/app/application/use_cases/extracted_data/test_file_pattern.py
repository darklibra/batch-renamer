from typing import Dict, Any, Optional, List
from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.model import FileChangePattern
from app.application.use_cases.extracted_data.extract_data_from_file import ExtractDataFromFileUseCase

class TestFilePatternUseCase:
    def __init__(
        self,
        file_repository: FileRepository,
        extract_data_from_file_use_case: ExtractDataFromFileUseCase,
    ):
        self.file_repository = file_repository
        self.extract_data_from_file_use_case = extract_data_from_file_use_case

    def execute(self, file_ids: List[int], pattern_string: str) -> Dict[int, Optional[Dict[str, Any]]]:
        results: Dict[int, Optional[Dict[str, Any]]] = {}
        
        # FileChangePattern 모델을 직접 생성하여 사용
        # 이 부분은 실제 패턴 테스트를 위해 임시로 FileChangePattern 객체를 생성하는 방식입니다.
        # 필요에 따라 FileChangePattern 모델에 from_string_pattern과 같은 팩토리 메서드를 추가할 수 있습니다.
        temp_pattern = FileChangePattern(regex_pattern=pattern_string, replacement_format=pattern_string) 

        for file_id in file_ids:
            file = self.file_repository.find_by_id(file_id)
            if file:
                extracted_data = self.extract_data_from_file_use_case.execute(file, temp_pattern)
                results[file_id] = extracted_data
            else:
                results[file_id] = None # 파일을 찾을 수 없는 경우
        return results
