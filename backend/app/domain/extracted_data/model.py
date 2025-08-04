from sqlmodel import Field, Relationship
from typing import Optional, Dict, Any
from datetime import datetime
from app.domain.base_model import TimestampedBase
from pydantic import field_validator
import json

class ExtractedData(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    file_id: int = Field(foreign_key="file.id", index=True)
    pattern_id: int = Field(foreign_key="filechangepattern.id", index=True)
    extracted_values: str # 추출된 데이터 (JSON 문자열로 저장)

    is_completed: Optional[bool] = Field(default=None) # 완결 여부
    episode_start_date: Optional[datetime] = Field(default=None) # 에피소드 시작일
    episode_end_date: Optional[datetime] = Field(default=None) # 에피소드 종료일
    author: Optional[str] = Field(default=None) # 작가

    # Relationships
    file: "File" = Relationship(back_populates="extracted_data")
    pattern: "FileChangePattern" = Relationship(back_populates="extracted_data")

    @field_validator('extracted_values', mode='before')
    @classmethod
    def _validate_extracted_values(cls, v: Any) -> str:
        if isinstance(v, dict):
            return json.dumps(v)
        if isinstance(v, str):
            return v
        raise ValueError('extracted_values must be a dict or a JSON string')

    def get_extracted_values(self) -> Dict[str, Any]:
        return json.loads(self.extracted_values)
