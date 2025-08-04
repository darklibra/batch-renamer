from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.file_change_pattern.model import FileChangePattern

class FileChangePatternRepository(ABC):
    @abstractmethod
    def save(self, pattern: FileChangePattern) -> FileChangePattern:
        pass

    @abstractmethod
    def find_by_id(self, pattern_id: int) -> Optional[FileChangePattern]:
        pass

    @abstractmethod
    def find_all(self) -> List[FileChangePattern]:
        pass

    @abstractmethod
    def delete(self, pattern_id: int) -> None:
        pass
