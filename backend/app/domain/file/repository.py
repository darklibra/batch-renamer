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
    def find_all(self) -> List[File]:
        pass

    @abstractmethod
    def find_by_id(self, file_id: int) -> Optional[File]:
        pass
