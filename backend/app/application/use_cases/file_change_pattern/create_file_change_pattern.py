from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.use_cases.extracted_data.reapply_patterns_to_all_files import (
    ReapplyPatternsToAllFilesUseCase,
)  # 추가


class CreateFileChangePatternUseCase:
    def __init__(
        self,
        repository: FileChangePatternRepository,
        reapply_use_case: ReapplyPatternsToAllFilesUseCase,
    ):
        self.repository = repository
        self.reapply_use_case = reapply_use_case

    def execute(
        self, name: str, regex_pattern: str, replacement_format: str
    ) -> FileChangePattern:
        pattern = FileChangePattern(
            name=name,
            regex_pattern=regex_pattern,
            replacement_format=replacement_format,
        )
        saved_pattern = self.repository.save(pattern)
        self.reapply_use_case.execute()  # 새로운 패턴 추가 후 전체 파일에 재적용
        return saved_pattern
