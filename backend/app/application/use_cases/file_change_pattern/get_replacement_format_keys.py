
import re
from typing import List
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.exceptions import PatternNotFoundException

class GetReplacementFormatKeysUseCase:
    def __init__(self, repository: FileChangePatternRepository):
        self.repository = repository

    def execute(self, pattern_id: int) -> List[str]:
        pattern = self.repository.find_by_id(pattern_id)
        if not pattern:
            raise PatternNotFoundException(f"Pattern with id {pattern_id} not found")
        
        # replacement_format에서 {key} 형식의 변수 추출
        keys = re.findall(r'\{(\w+)\}', pattern.replacement_format)
        return keys
