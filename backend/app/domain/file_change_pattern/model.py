from sqlmodel import Field, Relationship
from typing import Optional, List
from app.domain.base_model import TimestampedBase

class FileChangePattern(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True) # 패턴 이름
    regex_pattern: str # 정규식 패턴
    replacement_format: str # 교체 형식 (예: {filename}_{date}.{ext})
    is_confirmed: bool = Field(default=False) # 패턴 확인 여부

    extracted_data: List["ExtractedData"] = Relationship(back_populates="pattern")
