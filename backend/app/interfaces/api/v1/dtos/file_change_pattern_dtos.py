from pydantic import BaseModel
from typing import Optional, List

class FileChangePatternCreate(BaseModel):
    name: str
    regex_pattern: str
    replacement_format: str

class FileChangePatternUpdate(BaseModel):
    name: Optional[str] = None
    regex_pattern: Optional[str] = None
    replacement_format: Optional[str] = None

class FileChangePatternResponse(BaseModel):
    id: int
    name: str
    regex_pattern: str
    replacement_format: str

    class Config:
        from_attributes = True

class FileChangePatternListResponse(BaseModel):
    patterns: List[FileChangePatternResponse]
