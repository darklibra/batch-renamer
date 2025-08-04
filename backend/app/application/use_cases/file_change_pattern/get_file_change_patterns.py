from typing import List, Optional
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository

class GetFileChangePatternsUseCase:
    def __init__(self, repository: FileChangePatternRepository):
        self.repository = repository

    def execute(self, pattern_id: Optional[int] = None) -> List[FileChangePattern]:
        if pattern_id:
            pattern = self.repository.find_by_id(pattern_id)
            return [pattern] if pattern else []
        return self.repository.find_all()
