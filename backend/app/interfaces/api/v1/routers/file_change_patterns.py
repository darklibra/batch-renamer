from fastapi import APIRouter, Depends, HTTPException, status
from app.application.use_cases.file_change_pattern.create_file_change_pattern import CreateFileChangePatternUseCase
from app.application.use_cases.file_change_pattern.get_file_change_patterns import GetFileChangePatternsUseCase
from app.application.use_cases.file_change_pattern.update_file_change_pattern import UpdateFileChangePatternUseCase
from app.application.use_cases.file_change_pattern.delete_file_change_pattern import DeleteFileChangePatternUseCase
from app.application.use_cases.file_change_pattern.confirm_file_change_pattern import ConfirmFileChangePatternUseCase
from app.application.use_cases.file_change_pattern.apply_saved_pattern import ApplySavedPatternUseCase
from app.interfaces.api.dependencies import (
    get_create_file_change_pattern_use_case,
    get_get_file_change_patterns_use_case,
    get_update_file_change_pattern_use_case,
    get_delete_file_change_pattern_use_case,
    get_confirm_file_change_pattern_use_case,
    get_apply_saved_pattern_use_case
)
from app.interfaces.api.v1.dtos.file_change_pattern_dtos import (
    FileChangePatternCreate,
    FileChangePatternUpdate,
    FileChangePatternResponse,
    FileChangePatternListResponse,
    ConfirmFileChangePatternRequest,
    TestPatternResultResponse,
    ApplySavedPatternRequest
)
from app.application.exceptions import UseCaseException, PatternNotFoundException

router = APIRouter()

@router.post(
    "/test",
    response_model=TestPatternResultResponse,
    status_code=status.HTTP_200_OK
)
def test_and_prepare_pattern(
    request: FileChangePatternCreate,
    use_case: CreateFileChangePatternUseCase = Depends(get_create_file_change_pattern_use_case)
):
    try:
        results = use_case.execute(
            name=request.name,
            regex_pattern=request.regex_pattern,
            replacement_format=request.replacement_format,
            file_ids=request.file_ids
        )
        return TestPatternResultResponse(results=results)
    except UseCaseException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post(
    "/confirm",
    response_model=FileChangePatternResponse,
    status_code=status.HTTP_201_CREATED
)
def confirm_pattern(
    request: ConfirmFileChangePatternRequest,
    use_case: ConfirmFileChangePatternUseCase = Depends(get_confirm_file_change_pattern_use_case)
):
    try:
        pattern = use_case.execute(
            name=request.name,
            regex_pattern=request.regex_pattern,
            replacement_format=request.replacement_format
        )
        return FileChangePatternResponse.model_validate(pattern)
    except UseCaseException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

from fastapi import Query
from fastapi.responses import JSONResponse

@router.get(
    "/",
    response_model=FileChangePatternListResponse
)
def get_all_patterns(
    use_case: GetFileChangePatternsUseCase = Depends(get_get_file_change_patterns_use_case),
    _start: int = Query(0, alias="_start"),
    _end: int = Query(10, alias="_end"),
):
    patterns, total_count = use_case.execute(skip=_start, limit=_end - _start)

    response_data = [FileChangePatternResponse.model_validate(p).model_dump() for p in patterns]
    
    content_range = f"file-change-patterns {_start}-{_start + len(patterns) - 1}/{total_count}"
    
    return JSONResponse(
        content=response_data,
        headers={"Content-Range": content_range}
    )

@router.get(
    "/{pattern_id}",
    response_model=FileChangePatternResponse
)
def get_pattern_by_id(
    pattern_id: int,
    use_case: GetFileChangePatternsUseCase = Depends(get_get_file_change_patterns_use_case)
):
    try:
        patterns = use_case.execute(pattern_id=pattern_id)
        return FileChangePatternResponse.model_validate(patterns[0])
    except PatternNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.put(
    "/{pattern_id}",
    response_model=FileChangePatternResponse
)
def update_pattern(
    pattern_id: int,
    request: FileChangePatternUpdate,
    use_case: UpdateFileChangePatternUseCase = Depends(get_update_file_change_pattern_use_case)
):
    try:
        updated_pattern = use_case.execute(
            pattern_id=pattern_id,
            name=request.name,
            regex_pattern=request.regex_pattern,
            replacement_format=request.replacement_format
        )
        return FileChangePatternResponse.model_validate(updated_pattern)
    except PatternNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post(
    "/apply-saved-pattern",
    status_code=status.HTTP_200_OK
)
def apply_saved_pattern(
    request: ApplySavedPatternRequest,
    use_case: ApplySavedPatternUseCase = Depends(get_apply_saved_pattern_use_case)
):
    try:
        use_case.execute(pattern_ids=request.pattern_ids, file_ids=request.file_ids)
        return {"message": "Patterns applied successfully"}
    except PatternNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UseCaseException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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
