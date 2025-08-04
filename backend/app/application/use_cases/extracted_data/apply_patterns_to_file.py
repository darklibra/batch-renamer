from typing import List, Optional, Tuple, Dict, Any
from backend.app.domain.file.model import File
from backend.app.domain.file.repository import FileRepository # 추가
from backend.app.domain.file_change_pattern.model import FileChangePattern
from backend.app.domain.extracted_data.model import ExtractedData
from backend.app.domain.extracted_data.repository import ExtractedDataRepository
from backend.app.application.use_cases.extracted_data.extract_data_from_file import ExtractDataFromFileUseCase

class ApplyPatternsToFileUseCase:
    def __init__(
        self, 
        extracted_data_repository: ExtractedDataRepository,
        extract_data_from_file_use_case: ExtractDataFromFileUseCase,
        file_repository: FileRepository # 추가
    ):
        self.extracted_data_repository = extracted_data_repository
        self.extract_data_from_file_use_case = extract_data_from_file_use_case
        self.file_repository = file_repository # 추가

    def execute(self, file: File, patterns: List[FileChangePattern]) -> Optional[ExtractedData]:
        best_match_data: Optional[Dict[str, Any]] = None
        best_match_pattern: Optional[FileChangePattern] = None
        max_extracted_fields = -1

        # 파일의 추출 실패 상태 초기화
        file.extraction_failed = False
        file.extraction_failure_reason = None

        for pattern in patterns:
            extracted_values = self.extract_data_from_file_use_case.execute(file, pattern)
            if extracted_values is not None:
                num_fields = len(extracted_values)
                if num_fields > max_extracted_fields:
                    max_extracted_fields = num_fields
                    best_match_data = extracted_values
                    best_match_pattern = pattern
        
        if best_match_data and best_match_pattern:
            # 기존에 추출된 데이터가 있다면 삭제 (새로운 최적의 패턴 적용을 위해)
            self.extracted_data_repository.delete_by_file_id(file.id)

            extracted_data = ExtractedData(
                file_id=file.id,
                pattern_id=best_match_pattern.id,
                extracted_values=best_match_data
            )
            self.file_repository.save(file) # 파일 상태 업데이트
            return self.extracted_data_repository.save(extracted_data)
        else:
            # 추출된 데이터가 없는 경우 실패로 기록
            file.extraction_failed = True
            file.extraction_failure_reason = "모든 패턴을 적용했지만 데이터를 추출하지 못했습니다."
            self.file_repository.save(file) # 파일 상태 업데이트
            return None