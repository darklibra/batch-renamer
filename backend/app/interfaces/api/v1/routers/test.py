from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from app.application.use_cases.extracted_data.test_file_pattern import TestFilePatternUseCase
from app.interfaces.api.dependencies import get_test_file_pattern_use_case
from app.interfaces.api.v1.dtos.test_dtos import TestPatternRequest
from app.application.exceptions import FileNotFoundException

router = APIRouter()

@router.post(
    "/test-pattern",
    response_model=Dict[int, Optional[Dict[str, Any]]],
    status_code=status.HTTP_200_OK
)
def test_pattern(
    request: TestPatternRequest,
    use_case: TestFilePatternUseCase = Depends(get_test_file_pattern_use_case)
):
    try:
        results = use_case.execute(request.file_ids, request.pattern_string)
        return results
    except FileNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
