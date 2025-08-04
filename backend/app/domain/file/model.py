from sqlmodel import Field, Relationship
from typing import Optional, List
from app.domain.base_model import TimestampedBase

class File(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    extension: str
    directory: str
    full_path: str = Field(unique=True, index=True)
    size: int

    extraction_failed: bool = Field(default=False) # 추출 실패 여부
    extraction_failure_reason: Optional[str] = Field(default=None) # 추출 실패 이유

    extracted_data: List["ExtractedData"] = Relationship(back_populates="file")
