from pydantic import BaseModel, ConfigDict, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime


# File-related schemas
class FileInfoResponse(BaseModel):
    id: int
    filename: str
    extension: Optional[str] = None
    path: str
    full_path: str
    file_size: int = 0
    last_modified: Optional[datetime] = None
    extracted_data: Optional[Dict[str, Any]] = None
    pattern_id: Optional[int] = None
    indexed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FileListResponse(BaseModel):
    files: List[FileInfoResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class FileStatsResponse(BaseModel):
    total_files: int
    total_size_bytes: int
    extensions: List[Dict[str, Any]]


# Indexing-related schemas
class IndexFilesRequest(BaseModel):
    directory_path: str = Field(..., description="Absolute path to directory to index")

    @validator("directory_path")
    def validate_directory_path(cls, v):
        if not v or not v.strip():
            raise ValueError("Directory path cannot be empty")
        return v.strip()


class IndexFilesResponse(BaseModel):
    job_id: str
    status: str
    message: str


class IndexingJobResponse(BaseModel):
    id: str
    directory_path: str
    status: str
    stage: str
    processed_count: int = 0
    total_count: int = 0
    newly_indexed: int = 0
    already_indexed: int = 0
    error_message: Optional[str] = None
    result_data: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# Exclusion pattern schemas
class ExclusionPatternRequest(BaseModel):
    name: str = Field(..., max_length=100)
    pattern: str = Field(..., max_length=500)
    pattern_type: str = Field(default="glob", pattern=r"^(glob|regex)$")
    description: Optional[str] = Field(None, max_length=500)
    is_active: bool = True


class ExclusionPatternResponse(BaseModel):
    id: int
    name: str
    pattern: str
    pattern_type: str
    description: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TestPatternRequest(BaseModel):
    pattern: str = Field(..., max_length=500)
    pattern_type: str = Field(default="glob", pattern=r"^(glob|regex)$")
    test_paths: List[str] = Field(..., min_items=1, max_items=100)


class TestPatternResult(BaseModel):
    path: str
    matches: bool
    error: Optional[str] = None


class TestPatternResponse(BaseModel):
    pattern: str
    pattern_type: str
    results: List[TestPatternResult]
    total_matches: int


# Extraction pattern schemas
class ExtractionPatternRequest(BaseModel):
    name: str = Field(..., max_length=100)
    regex_pattern: str = Field(..., max_length=500)
    field_mapping: Dict[str, str] = Field(
        ..., description="Mapping of field names to regex groups"
    )
    priority: int = Field(default=1, ge=1, le=100)
    is_active: bool = True


class ExtractionPatternResponse(BaseModel):
    id: int
    name: str
    regex_pattern: str
    field_mapping: Dict[str, str]
    priority: int
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
