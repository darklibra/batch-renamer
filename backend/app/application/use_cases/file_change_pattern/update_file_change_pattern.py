from typing import Optional
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.use_cases.extracted_data.reapply_patterns_to_all_files import (
    ReapplyPatternsToAllFilesUseCase,
)
from app.application.exceptions import PatternNotFoundException


class UpdateFileChangePatternUseCase:
    def __init__(
        self,
        repository: FileChangePatternRepository,
        reapply_use_case: ReapplyPatternsToAllFilesUseCase,
    ):
        self.repository = repository
        self.reapply_use_case = reapply_use_case

    def execute(
        self,
        pattern_id: int,
        name: Optional[str] = None,
        regex_pattern: Optional[str] = None,
        replacement_format: Optional[str] = None,
    ) -> FileChangePattern:
        pattern = self.repository.find_by_id(pattern_id)
        if not pattern:
            raise PatternNotFoundException(f"패턴을 찾을 수 없습니다: {pattern_id}")

        if name:
            pattern.name = name
        if regex_pattern:
            pattern.regex_pattern = regex_pattern
        if replacement_format:
            pattern.replacement_format = replacement_format

        updated_pattern = self.repository.save(pattern)
        self.reapply_use_case.execute()  # 패턴 업데이트 후 전체 파일에 재적용
        return updated_pattern
