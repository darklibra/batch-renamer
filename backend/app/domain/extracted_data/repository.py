from abc import ABC, abstractmethod
from typing import List
from app.domain.extracted_data.model import ExtractedData


class ExtractedDataRepository(ABC):
    @abstractmethod
    def save(self, extracted_data: ExtractedData) -> ExtractedData:
        pass

    @abstractmethod
    def find_by_file_id(self, file_id: int) -> List[ExtractedData]:
        pass

    @abstractmethod
    def delete_by_file_id(self, file_id: int) -> None:
        pass

    @abstractmethod
    @abstractmethod
    def find_by_pattern_id(self, pattern_id: int) -> List[ExtractedData]:
        pass

    @abstractmethod
    def delete_by_file_id_and_pattern_id(self, file_id: int, pattern_id: int) -> None:
        pass
