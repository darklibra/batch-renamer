from sqlmodel import Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from app.domain.base_model import TimestampedBase

if TYPE_CHECKING:
    from app.domain.extracted_data.model import ExtractedData
    from app.domain.file_change_request.model import FileChangeRequest

class FileChangePattern(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True) # 패턴 이름
    regex_pattern: str # 정규식 패턴
    replacement_format: str # 교체 형식 (예: {filename}_{date}.{ext})
    is_confirmed: bool = Field(default=False) # 패턴 확인 여부

    extracted_data: List["ExtractedData"] = Relationship(back_populates="pattern")
    change_requests: List["FileChangeRequest"] = Relationship(back_populates="pattern")
