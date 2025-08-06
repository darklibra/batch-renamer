from app.domain.exclusion_pattern.model import ExclusionPattern
from app.domain.exclusion_pattern.repository import ExclusionPatternRepository

class CreateExclusionPatternUseCase:
    def __init__(self, repository: ExclusionPatternRepository):
        self.repository = repository

    def execute(self, name: str, pattern: str, is_active: bool = True) -> ExclusionPattern:
        exclusion_pattern = ExclusionPattern(name=name, pattern=pattern, is_active=is_active)
        return self.repository.save(exclusion_pattern)
