from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class FileChangePatternCreate(BaseModel):
    name: str
    regex_pattern: str
    replacement_format: str
    file_ids: List[int] # 테스트할 파일 ID 목록

class ConfirmFileChangePatternRequest(BaseModel):
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
    is_confirmed: bool # is_confirmed 필드 추가

    class Config:
        from_attributes = True

class FileChangePatternListResponse(BaseModel):
    patterns: List[FileChangePatternResponse]

class TestPatternResultResponse(BaseModel):
    results: Dict[int, Optional[Dict[str, Any]]]

from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Union

class ApplySavedPatternRequest(BaseModel):
    pattern_ids: List[int]
    file_ids: List[Union[int, str]]
