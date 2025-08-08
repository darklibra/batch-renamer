from typing import List, Optional, Tuple
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.exceptions import PatternNotFoundException

class GetFileChangePatternsUseCase:
    def __init__(self, repository: FileChangePatternRepository):
        self.repository = repository

    def execute(self, pattern_id: Optional[int] = None, skip: int = 0, limit: int = 10) -> Tuple[List[FileChangePattern], int]:
        if pattern_id:
            pattern = self.repository.find_by_id(pattern_id)
            if not pattern:
                raise PatternNotFoundException(f"패턴을 찾을 수 없습니다: {pattern_id}")
            return [pattern], 1
        
        patterns = self.repository.find_all(skip=skip, limit=limit)
        total_count = self.repository.count_all()
        return patterns, total_count
