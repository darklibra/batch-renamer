from pydantic import BaseModel, Field
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


class ApplyRenameAndCopyRequestDto(BaseModel):
    file_change_pattern_id: int = Field(..., description="파일 목록을 필터링할 파일 변경 패턴 ID")
    rename_pattern_string: str = Field(..., description="새 파일 이름 생성을 위한 패턴 문자열 (예: {extracted_field_name} - {another_extracted_field}.{extension})")
    destination_path: str = Field(..., description="파일을 복사할 대상 디렉토리의 절대 경로")


class ApplyRenameAndCopyResponseDto(BaseModel):
    success_count: int
    failed_count: int
    details: List[Dict[str, Any]]
