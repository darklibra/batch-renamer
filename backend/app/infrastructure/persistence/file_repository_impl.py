from typing import List, Set, Optional
from sqlmodel import Session, select
from sqlalchemy.sql import func
import unicodedata # Added import
from app.domain.file.model import File
from app.domain.extracted_data.model import ExtractedData
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

    def find_by_ids(self, ids: List[int]) -> List[File]:
        statement = select(File).where(File.id.in_(ids))
        return self.session.exec(statement).all()

    def find_all(self, skip: int = 0, limit: int = 10, sort_field: Optional[str] = None, sort_order: Optional[str] = None, filename: Optional[str] = None) -> List[File]:
        statement = select(File)
        if filename:
            normalized_filename = unicodedata.normalize("NFC", filename)
            statement = statement.where(File.filename.ilike(f"%{normalized_filename}%"))
        if sort_field:
            if sort_order and sort_order.lower() == "desc":
                statement = statement.order_by(getattr(File, sort_field).desc())
            else:
                statement = statement.order_by(getattr(File, sort_field).asc())
        statement = statement.offset(skip).limit(limit)
        return self.session.exec(statement).all()

    def count_all(self, filename: Optional[str] = None) -> int:
        statement = select(func.count(File.id))
        if filename:
            normalized_filename = unicodedata.normalize("NFC", filename)
            statement = statement.where(File.filename.ilike(f"%{normalized_filename}%"))
        return self.session.exec(statement).one()

    def find_by_id(self, file_id: int) -> Optional[File]:
        return self.session.get(File, file_id)

    def find_by_pattern_id(self, pattern_id: int) -> List[File]:
        statement = (
            select(File)
            .join(ExtractedData)
            .where(ExtractedData.pattern_id == pattern_id)
            .distinct()
        )
        return self.session.exec(statement).all()
