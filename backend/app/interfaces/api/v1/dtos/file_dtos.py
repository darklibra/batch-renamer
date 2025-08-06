from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class IndexRequest(BaseModel):
    directory_path: str
    exclude_patterns: Optional[List[str]] = None


class FileResponse(BaseModel):
    id: int
    filename: str
    extension: str
    directory: str
    full_path: str
    size: int
    extracted_info: Optional[Dict[str, Any]] # 추출된 정보 필드 추가
    extraction_failed: bool
    extraction_failure_reason: Optional[str]

    class Config:
        from_attributes = True


class IndexResponse(BaseModel):
    indexed_files: List[FileResponse]
