from typing import List, Optional
from sqlmodel import Session, select
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository

class FileChangePatternRepositoryImpl(FileChangePatternRepository):
    def __init__(self, session: Session):
        self.session = session

    def save(self, pattern: FileChangePattern) -> FileChangePattern:
        self.session.add(pattern)
        self.session.commit()
        self.session.refresh(pattern)
        return pattern

    def find_by_id(self, pattern_id: int) -> Optional[FileChangePattern]:
        return self.session.get(FileChangePattern, pattern_id)

    def find_all(self) -> List[FileChangePattern]:
        statement = select(FileChangePattern)
        return self.session.exec(statement).all()

    def delete(self, pattern_id: int) -> None:
        pattern = self.session.get(FileChangePattern, pattern_id)
        if pattern:
            self.session.delete(pattern)
            self.session.commit()
