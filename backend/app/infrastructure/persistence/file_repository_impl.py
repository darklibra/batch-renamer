from typing import List, Set, Optional
from sqlmodel import Session, select
from sqlalchemy.sql import func
from app.domain.file.model import File
from app.domain.file.repository import FileRepository

class FileRepositoryImpl(FileRepository):
    def __init__(self, session: Session):
        self.session = session

    def save(self, file: File) -> File:
        self.session.add(file)
        self.session.commit()
        self.session.refresh(file)
        return file

    def save_all(self, files: List[File]) -> List[File]:
        self.session.add_all(files)
        self.session.commit()
        return files

    def find_by_paths(self, paths: Set[str]) -> List[File]:
        statement = select(File).where(File.full_path.in_(paths))
        return self.session.exec(statement).all()

    def find_all(self, skip: int = 0, limit: int = 10) -> List[File]:
        statement = select(File).offset(skip).limit(limit)
        return self.session.exec(statement).all()

    def count_all(self) -> int:
        statement = select(func.count(File.id))
        return self.session.exec(statement).one()

    def find_by_id(self, file_id: int) -> Optional[File]:
        return self.session.get(File, file_id)
