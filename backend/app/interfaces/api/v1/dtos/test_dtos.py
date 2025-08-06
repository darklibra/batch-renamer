from pydantic import BaseModel
from typing import Dict, Any, Optional, List

class TestPatternRequest(BaseModel):
    file_ids: List[int]
    pattern_string: str

class TestPatternResponse(BaseModel):
    extracted_data: Optional[Dict[str, Any]]
