from sqlmodel import Field
from typing import Optional
from app.domain.base_model import TimestampedBase

class ExclusionPattern(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True) # 패턴 이름
    pattern: str # 제외할 파일 경로 패턴 (glob 형식)
    is_active: bool = Field(default=True) # 활성화 여부
