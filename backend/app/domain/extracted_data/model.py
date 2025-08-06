from sqlmodel import Field, Relationship, JSON, Column
from typing import Optional, Dict, Any
from datetime import datetime
from app.domain.base_model import TimestampedBase


class ExtractedData(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    file_id: int = Field(foreign_key="file.id", index=True)
    pattern_id: int = Field(foreign_key="filechangepattern.id", index=True)
    extracted_values: Dict[str, Any] = Field(sa_column=Column(JSON))

    is_completed: Optional[bool] = Field(default=None) # 완결 여부
    episode_start_date: Optional[datetime] = Field(default=None) # 에피소드 시작일
    episode_end_date: Optional[datetime] = Field(default=None) # 에피소드 종료일
    author: Optional[str] = Field(default=None) # 작가

    # Relationships
    file: "File" = Relationship(back_populates="extracted_data")
    pattern: "FileChangePattern" = Relationship(back_populates="extracted_data")
