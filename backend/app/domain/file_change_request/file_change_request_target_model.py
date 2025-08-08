
from typing import Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship
from app.domain.base_model import TimestampedBase

if TYPE_CHECKING:
    from app.domain.file.model import File
    from .model import FileChangeRequest

class FileChangeRequestTarget(TimestampedBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key="filechangerequest.id")
    original_file_id: int = Field(foreign_key="file.id")
    new_filename: str
    status: str # e.g., "copied", "failed"
    message: Optional[str] = None

    request: "FileChangeRequest" = Relationship(back_populates="targets")
    original_file: "File" = Relationship()
