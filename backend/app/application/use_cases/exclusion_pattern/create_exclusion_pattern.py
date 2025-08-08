from app.domain.exclusion_pattern.model import ExclusionPattern
from app.domain.exclusion_pattern.repository import ExclusionPatternRepository
from app.application.exceptions import PatternAlreadyExistsException

class CreateExclusionPatternUseCase:
    def __init__(self, repository: ExclusionPatternRepository):
        self.repository = repository

    def execute(self, name: str, pattern: str, is_active: bool = True) -> ExclusionPattern:
        existing_pattern = self.repository.find_by_name(name)
        if existing_pattern:
            raise PatternAlreadyExistsException(name)
        
        exclusion_pattern = ExclusionPattern(name=name, pattern=pattern, is_active=is_active)
        return self.repository.save(exclusion_pattern)
