from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.use_cases.extracted_data.apply_patterns_to_file import (
    ApplyPatternsToFileUseCase,
)


BATCH_SIZE = 500  # 한 번에 처리할 파일 수


class ReapplyPatternsToAllFilesUseCase:
    def __init__(
        self,
        file_repository: FileRepository,
        file_change_pattern_repository: FileChangePatternRepository,
        apply_patterns_to_file_use_case: ApplyPatternsToFileUseCase,
    ):
        self.file_repository = file_repository
        self.file_change_pattern_repository = file_change_pattern_repository
        self.apply_patterns_to_file_use_case = apply_patterns_to_file_use_case

    def execute(self) -> None:
        all_patterns = self.file_change_pattern_repository.find_all()

        if not all_patterns:
            return  # 패턴이 없으면 아무것도 하지 않음

        skip = 0
        while True:
            files_batch = self.file_repository.find_all(skip=skip, limit=BATCH_SIZE)
            if not files_batch:
                break

            for file in files_batch:
                # 각 파일에 대해 모든 패턴 적용 시도
                self.apply_patterns_to_file_use_case.execute(file, all_patterns)
            
            skip += BATCH_SIZE
