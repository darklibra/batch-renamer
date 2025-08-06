from app.domain.exclusion_pattern.repository import ExclusionPatternRepository

class DeleteExclusionPatternUseCase:
    def __init__(self, repository: ExclusionPatternRepository):
        self.repository = repository

    def execute(self, pattern_id: int) -> None:
        self.repository.delete(pattern_id)
