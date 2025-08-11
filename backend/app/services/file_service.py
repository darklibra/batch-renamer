import os
from typing import List
from app.models.file_info import FileInfo
from app.api.schemas import FileInfoResponse

def scan_folder(path: str) -> List[FileInfoResponse]:
    """
    Recursively scans a directory and returns a list of files as DTOs.
    """
    files = []
    for root, _, filenames in os.walk(path):
        for filename in filenames:
            file_path = os.path.join(root, filename)
            # Convert entity to DTO before appending
            file_entity = FileInfo(name=filename, path=file_path)
            files.append(FileInfoResponse(name=file_entity.name, path=file_entity.path))
    return files
