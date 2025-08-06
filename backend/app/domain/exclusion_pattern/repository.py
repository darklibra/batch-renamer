from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.exclusion_pattern.model import ExclusionPattern

class ExclusionPatternRepository(ABC):
    @abstractmethod
    def save(self, pattern: ExclusionPattern) -> ExclusionPattern:
        pass

    @abstractmethod
    def find_by_id(self, pattern_id: int) -> Optional[ExclusionPattern]:
        pass

    @abstractmethod
    def find_all(self, skip: int = 0, limit: int = 10) -> List[ExclusionPattern]:
        pass

    @abstractmethod
    def count_all(self) -> int:
        pass

    @abstractmethod
    def delete(self, pattern_id: int) -> None:
        pass
