from sqlmodel import Field, Relationship, Column
from typing import Optional, List, Dict, Any, TYPE_CHECKING
from app.domain.base_model import TimestampedBase
from app.domain.custom_types import JsonEncodedDict

if TYPE_CHECKING:
    from app.domain.extracted_data.model import ExtractedData

class File(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    extension: str
    directory: str
    full_path: str = Field(unique=True, index=True)
    size: int

    extracted_info: Dict[str, Any] = Field(default={}, sa_column=Column(JsonEncodedDict)) # 추출된 정보 필드 추가

    extraction_failed: bool = Field(default=False) # 추출 실패 여부
    extraction_failure_reason: Optional[str] = Field(default=None) # 추출 실패 이유

    extracted_data: List["ExtractedData"] = Relationship(back_populates="file")
