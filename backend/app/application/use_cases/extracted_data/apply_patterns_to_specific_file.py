from typing import Optional
from app.domain.file.model import File
from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.domain.extracted_data.model import ExtractedData
from app.application.use_cases.extracted_data.apply_patterns_to_file import (
    ApplyPatternsToFileUseCase,
)


class ApplyPatternsToSpecificFileUseCase:
    def __init__(
        self,
        file_repository: FileRepository,
        file_change_pattern_repository: FileChangePatternRepository,
        apply_patterns_to_file_use_case: ApplyPatternsToFileUseCase,
    ):
        self.file_repository = file_repository
        self.file_change_pattern_repository = file_change_pattern_repository
        self.apply_patterns_to_file_use_case = apply_patterns_to_file_use_case

    def execute(self, file_id: int) -> Optional[ExtractedData]:
        file = self.file_repository.find_by_id(file_id)
        if not file:
            return None  # 또는 예외 발생

        patterns = self.file_change_pattern_repository.find_all()
        if not patterns:
            return None  # 또는 예외 발생

        # 특정 파일에 모든 패턴 적용 시도
        extracted_data = self.apply_patterns_to_file_use_case.execute(file, patterns)

        # 추출에 성공했다면, 파일의 실패 상태를 초기화
        if extracted_data:
            file.extraction_failed = False
            file.extraction_failure_reason = None
            self.file_repository.save(file)

        return extracted_data
