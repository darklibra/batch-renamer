import os
from typing import List
from pathlib import Path
from app.models.file_info import FileInfo
from app.models.file_models import IndexedFile
from app.api.schemas import FileInfoResponse

def scan_folder(path: str) -> List[FileInfoResponse]:
    """
    Legacy function: Recursively scans a directory and returns a list of files as DTOs.
    
    DEPRECATED: Use FileIndexingService for new implementations.
    This function is kept for backward compatibility.
    """
    files = []
    base_path = Path(path).resolve()
    
    for root, _, filenames in os.walk(path):
        for filename in filenames:
            file_path = os.path.join(root, filename)
            
            try:
                # Use the new IndexedFile model method for consistency
                file_data = IndexedFile.from_file_path(file_path, str(base_path))
                
                # Convert to legacy format for backward compatibility
                legacy_response = FileInfoResponse(
                    id=0,  # Legacy compatibility - no ID for non-persisted files
                    filename=file_data['filename'],
                    extension=file_data['extension'],
                    path=file_data['path'],
                    full_path=file_data['full_path'],
                    file_size=file_data['file_size'],
                    last_modified=file_data['last_modified']
                )
                files.append(legacy_response)
                
            except (OSError, FileNotFoundError, PermissionError):
                # Skip files that can't be accessed
                continue
                
    return files

def get_file_info(file_path: str) -> FileInfoResponse:
    """
    Get detailed information about a single file
    """
    try:
        file_data = IndexedFile.from_file_path(file_path)
        return FileInfoResponse(
            id=0,
            filename=file_data['filename'],
            extension=file_data['extension'],
            path=file_data['path'],
            full_path=file_data['full_path'],
            file_size=file_data['file_size'],
            last_modified=file_data['last_modified']
        )
    except Exception as e:
        raise ValueError(f"Could not access file {file_path}: {str(e)}")

def validate_directory_path(path: str) -> bool:
    """
    Validate that a directory path is accessible and safe
    """
    try:
        path_obj = Path(path).resolve()
        return path_obj.exists() and path_obj.is_dir()
    except Exception:
        return False
