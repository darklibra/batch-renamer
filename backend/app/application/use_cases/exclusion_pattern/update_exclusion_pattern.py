from typing import Optional
from app.domain.exclusion_pattern.model import ExclusionPattern
from app.domain.exclusion_pattern.repository import ExclusionPatternRepository

class UpdateExclusionPatternUseCase:
    def __init__(self, repository: ExclusionPatternRepository):
        self.repository = repository

    def execute(self, pattern_id: int, name: Optional[str] = None, pattern: Optional[str] = None, is_active: Optional[bool] = None) -> Optional[ExclusionPattern]:
        exclusion_pattern = self.repository.find_by_id(pattern_id)
        if not exclusion_pattern:
            return None

        if name: exclusion_pattern.name = name
        if pattern: exclusion_pattern.pattern = pattern
        if is_active is not None: exclusion_pattern.is_active = is_active

        return self.repository.save(exclusion_pattern)
