
from abc import ABC, abstractmethod
from typing import List, Optional
from .model import FileChangeRequest

class FileChangeRequestRepository(ABC):
    @abstractmethod
    def save(self, request: FileChangeRequest) -> FileChangeRequest:
        pass

    @abstractmethod
    def find_by_id(self, request_id: int) -> Optional[FileChangeRequest]:
        pass

    @abstractmethod
    def find_all(self, skip: int = 0, limit: int = 10) -> List[FileChangeRequest]:
        pass

    @abstractmethod
    def count_all(self) -> int:
        pass
