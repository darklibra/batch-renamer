
from typing import List, Optional, Tuple
from app.domain.file_change_request.repository import FileChangeRequestRepository
from app.domain.file_change_request.model import FileChangeRequest

class GetFileChangeRequestsUseCase:
    def __init__(self, repository: FileChangeRequestRepository):
        self.repository = repository

    def execute(self, skip: int = 0, limit: int = 10) -> Tuple[List[FileChangeRequest], int]:
        requests = self.repository.find_all(skip=skip, limit=limit)
        total_count = self.repository.count_all()
        return requests, total_count
