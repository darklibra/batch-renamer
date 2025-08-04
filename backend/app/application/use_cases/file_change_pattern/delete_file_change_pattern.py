from app.domain.file_change_pattern.repository import FileChangePatternRepository

class DeleteFileChangePatternUseCase:
    def __init__(self, repository: FileChangePatternRepository):
        self.repository = repository

    def execute(self, pattern_id: int) -> None:
        self.repository.delete(pattern_id)
