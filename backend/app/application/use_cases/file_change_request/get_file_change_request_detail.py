
from typing import Optional
from app.domain.file_change_request.repository import FileChangeRequestRepository
from app.domain.file_change_request.model import FileChangeRequest
from app.application.exceptions import FileChangeRequestNotFoundException

class GetFileChangeRequestDetailUseCase:
    def __init__(self, repository: FileChangeRequestRepository):
        self.repository = repository

    def execute(self, request_id: int) -> FileChangeRequest:
        request = self.repository.find_by_id(request_id)
        if not request:
            raise FileChangeRequestNotFoundException(f"FileChangeRequest with id {request_id} not found")
        return request
