
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.sql import func
from app.domain.file_change_request.model import FileChangeRequest
from app.domain.file_change_request.repository import FileChangeRequestRepository

class FileChangeRequestRepositoryImpl(FileChangeRequestRepository):
    def __init__(self, session: Session):
        self.session = session

    def save(self, request: FileChangeRequest) -> FileChangeRequest:
        self.session.add(request)
        self.session.commit()
        self.session.refresh(request)
        return request

    def find_by_id(self, request_id: int) -> Optional[FileChangeRequest]:
        return self.session.get(FileChangeRequest, request_id)

    def find_all(self, skip: int = 0, limit: int = 10) -> List[FileChangeRequest]:
        statement = select(FileChangeRequest).offset(skip).limit(limit)
        return self.session.exec(statement).all()

    def count_all(self) -> int:
        statement = select(func.count(FileChangeRequest.id))
        return self.session.exec(statement).one()
