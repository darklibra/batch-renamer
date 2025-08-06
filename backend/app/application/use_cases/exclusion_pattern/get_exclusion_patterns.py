from typing import List, Optional
from app.domain.exclusion_pattern.model import ExclusionPattern
from app.domain.exclusion_pattern.repository import ExclusionPatternRepository

class GetExclusionPatternsUseCase:
    def __init__(self, repository: ExclusionPatternRepository):
        self.repository = repository

    def execute(self, pattern_id: Optional[int] = None, skip: int = 0, limit: int = 10) -> List[ExclusionPattern]:
        if pattern_id:
            pattern = self.repository.find_by_id(pattern_id)
            return [pattern] if pattern else []
        return self.repository.find_all(skip=skip, limit=limit)

    def count(self) -> int:
        return self.repository.count_all()
