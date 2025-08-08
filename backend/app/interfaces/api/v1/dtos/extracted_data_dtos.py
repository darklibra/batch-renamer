from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime

class ExtractedDataResponse(BaseModel):
    id: int
    file_id: int
    pattern_id: int
    extracted_values: Dict[str, Any]
    is_completed: Optional[bool] = None
    episode_start_date: Optional[datetime] = None
    episode_end_date: Optional[datetime] = None
    author: Optional[str] = None

    class Config:
        from_attributes = True
