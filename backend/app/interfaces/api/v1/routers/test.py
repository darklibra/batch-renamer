from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from app.application.use_cases.extracted_data.test_file_pattern import TestFilePatternUseCase
from app.interfaces.api.dependencies import get_test_file_pattern_use_case
from app.interfaces.api.v1.dtos.test_dtos import TestPatternRequest

router = APIRouter()

@router.post(
    "/test-pattern",
    response_model=Dict[int, Optional[Dict[str, Any]]], # 반환 타입 변경
    status_code=status.HTTP_200_OK
)
def test_pattern(
    request: TestPatternRequest,
    use_case: TestFilePatternUseCase = Depends(get_test_file_pattern_use_case)
):
    results = use_case.execute(request.file_ids, request.pattern_string)
    # 모든 파일에 대해 추출 실패 시 404 반환 (선택 사항)
    # if all(v is None for v in results.values()):
    #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No data extracted for any of the selected files.")
    return results
