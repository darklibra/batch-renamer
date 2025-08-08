
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship
from app.domain.base_model import TimestampedBase

if TYPE_CHECKING:
    from app.domain.file_change_pattern.model import FileChangePattern
    from .file_change_request_target_model import FileChangeRequestTarget

class FileChangeRequest(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    file_change_pattern_id: int = Field(foreign_key="filechangepattern.id")
    rename_pattern_string: str
    destination_path: str
    status: str = Field(default="completed")
    success_count: int
    failed_count: int
    details: str

    pattern: "FileChangePattern" = Relationship(back_populates="change_requests")
    targets: List["FileChangeRequestTarget"] = Relationship(back_populates="request")
