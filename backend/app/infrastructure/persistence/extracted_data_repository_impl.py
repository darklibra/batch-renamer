from typing import List
from sqlmodel import Session, select
from app.domain.extracted_data.model import ExtractedData
from app.domain.extracted_data.repository import ExtractedDataRepository


class ExtractedDataRepositoryImpl(ExtractedDataRepository):
    def __init__(self, session: Session):
        self.session = session

    def save(self, extracted_data: ExtractedData) -> ExtractedData:
        self.session.add(extracted_data)
        self.session.commit()
        self.session.refresh(extracted_data)
        return extracted_data

    def find_by_file_id(self, file_id: int) -> List[ExtractedData]:
        statement = select(ExtractedData).where(ExtractedData.file_id == file_id)
        return self.session.exec(statement).all()

    def delete_by_file_id(self, file_id: int) -> None:
        statement = select(ExtractedData).where(ExtractedData.file_id == file_id)
        results = self.session.exec(statement).all()
        for data in results:
            self.session.delete(data)
        self.session.commit()
