from typing import List, Set, Optional
from sqlmodel import Session, select
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

    def find_all(self) -> List[File]:
        statement = select(File)
        return self.session.exec(statement).all()

    def find_by_id(self, file_id: int) -> Optional[File]:
        return self.session.get(File, file_id)
