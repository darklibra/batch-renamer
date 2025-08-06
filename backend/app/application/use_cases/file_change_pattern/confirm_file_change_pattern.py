from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.use_cases.extracted_data.reapply_patterns_to_all_files import ReapplyPatternsToAllFilesUseCase

class ConfirmFileChangePatternUseCase:
    def __init__(
        self,
        repository: FileChangePatternRepository,
        reapply_use_case: ReapplyPatternsToAllFilesUseCase,
    ):
        self.repository = repository
        self.reapply_use_case = reapply_use_case

    def execute(self, name: str, regex_pattern: str, replacement_format: str) -> FileChangePattern:
        # 기존 패턴이 있는지 확인 (이름으로)
        existing_pattern = self.repository.find_by_name(name)
        if existing_pattern:
            # 기존 패턴이 있다면 업데이트
            existing_pattern.regex_pattern = regex_pattern
            existing_pattern.replacement_format = replacement_format
            existing_pattern.is_confirmed = True
            saved_pattern = self.repository.save(existing_pattern)
        else:
            # 새로운 패턴이라면 생성
            pattern = FileChangePattern(
                name=name,
                regex_pattern=regex_pattern,
                replacement_format=replacement_format,
                is_confirmed=True
            )
            saved_pattern = self.repository.save(pattern)
        
        self.reapply_use_case.execute() # 새로운 패턴 추가/업데이트 후 전체 파일에 재적용
        return saved_pattern
