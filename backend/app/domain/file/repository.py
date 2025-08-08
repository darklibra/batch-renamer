from abc import ABC, abstractmethod
from typing import List, Set, Optional
from .model import File

class FileRepository(ABC):
    @abstractmethod
    def save(self, file: File) -> File:
        pass

    @abstractmethod
    def save_all(self, files: List[File]) -> List[File]:
        pass

    @abstractmethod
    def find_by_paths(self, paths: Set[str]) -> List[File]:
        pass

    @abstractmethod
    def find_by_ids(self, ids: List[int]) -> List[File]:
        pass

    @abstractmethod
    def find_all(self, skip: int = 0, limit: int = 10, sort_field: Optional[str] = None, sort_order: Optional[str] = None, filename: Optional[str] = None) -> List[File]:
        pass

    @abstractmethod
    def count_all(self) -> int:
        pass

    @abstractmethod
    def find_by_id(self, file_id: int) -> Optional[File]:
        pass

    @abstractmethod
    def find_by_pattern_id(self, pattern_id: int) -> List[File]:
        pass
