from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from fastapi.responses import JSONResponse
from app.application.use_cases.exclusion_pattern.create_exclusion_pattern import CreateExclusionPatternUseCase
from app.application.use_cases.exclusion_pattern.get_exclusion_patterns import GetExclusionPatternsUseCase
from app.application.use_cases.exclusion_pattern.update_exclusion_pattern import UpdateExclusionPatternUseCase
from app.application.use_cases.exclusion_pattern.delete_exclusion_pattern import DeleteExclusionPatternUseCase
from app.interfaces.api.dependencies import (
    get_create_exclusion_pattern_use_case,
    get_get_exclusion_patterns_use_case,
    get_update_exclusion_pattern_use_case,
    get_delete_exclusion_pattern_use_case
)
from app.interfaces.api.v1.dtos.exclusion_pattern_dtos import (
    ExclusionPatternCreate,
    ExclusionPatternUpdate,
    ExclusionPatternResponse
)
from app.application.exceptions import UseCaseException, PatternAlreadyExistsException, PatternNotFoundException

router = APIRouter()

@router.post(
    "/",
    response_model=ExclusionPatternResponse,
    status_code=status.HTTP_201_CREATED
)
def create_exclusion_pattern(
    request: ExclusionPatternCreate,
    use_case: CreateExclusionPatternUseCase = Depends(get_create_exclusion_pattern_use_case)
):
    try:
        pattern = use_case.execute(
            name=request.name,
            pattern=request.pattern,
            is_active=request.is_active
        )
        return ExclusionPatternResponse.model_validate(pattern)
    except PatternAlreadyExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except UseCaseException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get(
    "/",
    response_model=List[ExclusionPatternResponse]
)
def get_all_exclusion_patterns(
    use_case: GetExclusionPatternsUseCase = Depends(get_get_exclusion_patterns_use_case),
    _start: int = Query(0, alias="_start"),
    _end: int = Query(10, alias="_end"),
):
    patterns, total_count = use_case.execute(skip=_start, limit=_end - _start)

    response_data = [ExclusionPatternResponse.model_validate(p).model_dump() for p in patterns]
    
    content_range = f"exclusion-patterns {_start}-{_start + len(patterns) - 1}/{total_count}"
    
    return JSONResponse(
        content=response_data,
        headers={"Content-Range": content_range}
    )

@router.get(
    "/{pattern_id}",
    response_model=ExclusionPatternResponse
)
def get_exclusion_pattern_by_id(
    pattern_id: int,
    use_case: GetExclusionPatternsUseCase = Depends(get_get_exclusion_patterns_use_case)
):
    try:
        patterns, _ = use_case.execute(pattern_id=pattern_id)
        return ExclusionPatternResponse.model_validate(patterns[0])
    except PatternNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.put(
    "/{pattern_id}",
    response_model=ExclusionPatternResponse
)
def update_exclusion_pattern(
    pattern_id: int,
    request: ExclusionPatternUpdate,
    use_case: UpdateExclusionPatternUseCase = Depends(get_update_exclusion_pattern_use_case)
):
    try:
        updated_pattern = use_case.execute(
            pattern_id=pattern_id,
            name=request.name,
            pattern=request.pattern,
            is_active=request.is_active
        )
        return ExclusionPatternResponse.model_validate(updated_pattern)
    except PatternNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UseCaseException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete(
    "/{pattern_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_exclusion_pattern(
    pattern_id: int,
    use_case: DeleteExclusionPatternUseCase = Depends(get_delete_exclusion_pattern_use_case)
):
    use_case.execute(pattern_id=pattern_id)
    return None
