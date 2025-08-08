
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class CreateFileChangeRequestDto(BaseModel):
    file_change_pattern_id: int
    rename_pattern_string: str
    destination_path: str

class FileChangeRequestResponse(BaseModel):
    id: int
    file_change_pattern_id: int
    rename_pattern_string: str
    destination_path: str
    status: str
    success_count: int
    failed_count: int
    details: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FileChangeRequestTargetResponse(BaseModel):
    id: int
    request_id: int
    original_file_id: int
    new_filename: str
    status: str
    message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FileChangeRequestDetailResponse(FileChangeRequestResponse):
    targets: List[FileChangeRequestTargetResponse]

class FileChangeRequestListResponse(BaseModel):
    id: int
    file_change_pattern_id: int
    rename_pattern_string: str
    destination_path: str
    status: str
    success_count: int
    failed_count: int
    created_at: datetime

    class Config:
        from_attributes = True
