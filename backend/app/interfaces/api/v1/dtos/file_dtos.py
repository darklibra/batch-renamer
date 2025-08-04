from pydantic import BaseModel
from typing import List

class IndexRequest(BaseModel):
    directory_path: str

class FileResponse(BaseModel):
    id: int
    filename: str
    extension: str
    directory: str
    full_path: str
    size: int
    extraction_failed: bool
    extraction_failure_reason: Optional[str]

class IndexResponse(BaseModel):
    indexed_files: List[FileResponse]
