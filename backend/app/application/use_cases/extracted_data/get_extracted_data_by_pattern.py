from typing import List
from app.domain.extracted_data.model import ExtractedData
from app.domain.extracted_data.repository import ExtractedDataRepository

class GetExtractedDataByPatternUseCase:
    def __init__(self, repository: ExtractedDataRepository):
        self.repository = repository

    def execute(self, pattern_id: int) -> List[ExtractedData]:
        return self.repository.find_by_pattern_id(pattern_id)
