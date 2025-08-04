from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.application.use_cases.file_change_pattern.create_file_change_pattern import CreateFileChangePatternUseCase
from app.application.use_cases.file_change_pattern.get_file_change_patterns import GetFileChangePatternsUseCase
from app.application.use_cases.file_change_pattern.update_file_change_pattern import UpdateFileChangePatternUseCase
from app.application.use_cases.file_change_pattern.delete_file_change_pattern import DeleteFileChangePatternUseCase
from app.interfaces.api.dependencies import (
    get_create_file_change_pattern_use_case,
    get_get_file_change_patterns_use_case,
    get_update_file_change_pattern_use_case,
    get_delete_file_change_pattern_use_case
)
from app.interfaces.api.v1.dtos.file_change_pattern_dtos import (
    FileChangePatternCreate,
    FileChangePatternUpdate,
    FileChangePatternResponse,
    FileChangePatternListResponse
)

router = APIRouter()

@router.post(
    "/",
    response_model=FileChangePatternResponse,
    status_code=status.HTTP_201_CREATED
)
def create_pattern(
    request: FileChangePatternCreate,
    use_case: CreateFileChangePatternUseCase = Depends(get_create_file_change_pattern_use_case)
):
    try:
        pattern = use_case.execute(
            name=request.name,
            regex_pattern=request.regex_pattern,
            replacement_format=request.replacement_format
        )
        return FileChangePatternResponse.model_validate(pattern)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get(
    "/",
    response_model=FileChangePatternListResponse
)
def get_all_patterns(
    use_case: GetFileChangePatternsUseCase = Depends(get_get_file_change_patterns_use_case)
):
    patterns = use_case.execute()
    return FileChangePatternListResponse(patterns=[FileChangePatternResponse.model_validate(p) for p in patterns])

@router.get(
    "/{pattern_id}",
    response_model=FileChangePatternResponse
)
def get_pattern_by_id(
    pattern_id: int,
    use_case: GetFileChangePatternsUseCase = Depends(get_get_file_change_patterns_use_case)
):
    patterns = use_case.execute(pattern_id=pattern_id)
    if not patterns:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pattern not found")
    return FileChangePatternResponse.model_validate(patterns[0])

@router.put(
    "/{pattern_id}",
    response_model=FileChangePatternResponse
)
def update_pattern(
    pattern_id: int,
    request: FileChangePatternUpdate,
    use_case: UpdateFileChangePatternUseCase = Depends(get_update_file_change_pattern_use_case)
):
    updated_pattern = use_case.execute(
        pattern_id=pattern_id,
        name=request.name,
        regex_pattern=request.regex_pattern,
        replacement_format=request.replacement_format
    )
    if not updated_pattern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pattern not found")
    return FileChangePatternResponse.model_validate(updated_pattern)

@router.delete(
    "/{pattern_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_pattern(
    pattern_id: int,
    use_case: DeleteFileChangePatternUseCase = Depends(get_delete_file_change_pattern_use_case)
):
    use_case.execute(pattern_id=pattern_id)
    return None
