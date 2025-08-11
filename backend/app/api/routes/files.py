from fastapi import APIRouter, HTTPException, Query
from typing import List
import os

from app.services.file_service import scan_folder
from app.api.schemas import FileInfoResponse

router = APIRouter()

@router.get("/files", response_model=List[FileInfoResponse])
def list_files_in_path(path: str = Query(..., description="The absolute path to the folder to scan.")):
    """
    Scans a directory and returns a list of files within it.
    """
    if not os.path.isdir(path):
        raise HTTPException(status_code=404, detail="Directory not found")
    
    try:
        return scan_folder(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
