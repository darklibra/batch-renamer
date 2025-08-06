from pydantic import BaseModel
from typing import Optional, List

class ExclusionPatternCreate(BaseModel):
    name: str
    pattern: str
    is_active: bool = True

class ExclusionPatternUpdate(BaseModel):
    name: Optional[str] = None
    pattern: Optional[str] = None
    is_active: Optional[bool] = None

class ExclusionPatternResponse(BaseModel):
    id: int
    name: str
    pattern: str
    is_active: bool

    class Config:
        from_attributes = True

class ExclusionPatternListResponse(BaseModel):
    patterns: List[ExclusionPatternResponse]
