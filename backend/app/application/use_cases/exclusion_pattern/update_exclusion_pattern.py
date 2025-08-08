from typing import Optional
from app.domain.exclusion_pattern.model import ExclusionPattern
from app.domain.exclusion_pattern.repository import ExclusionPatternRepository
from app.application.exceptions import PatternNotFoundException

class UpdateExclusionPatternUseCase:
    def __init__(self, repository: ExclusionPatternRepository):
        self.repository = repository

    def execute(self, pattern_id: int, name: Optional[str] = None, pattern: Optional[str] = None, is_active: Optional[bool] = None) -> ExclusionPattern:
        exclusion_pattern = self.repository.find_by_id(pattern_id)
        if not exclusion_pattern:
            raise PatternNotFoundException(f"제외 패턴을 찾을 수 없습니다: {pattern_id}")

        if name: exclusion_pattern.name = name
        if pattern: exclusion_pattern.pattern = pattern
        if is_active is not None: exclusion_pattern.is_active = is_active

        return self.repository.save(exclusion_pattern)
