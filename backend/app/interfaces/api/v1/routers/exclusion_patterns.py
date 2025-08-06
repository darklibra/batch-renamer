from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
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
    ExclusionPatternResponse,
    ExclusionPatternListResponse
)

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
    except Exception as e:
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
    skip = _start
    limit = _end - _start
    patterns = use_case.execute(skip=skip, limit=limit)
    total_count = use_case.count()

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
    patterns = use_case.execute(pattern_id=pattern_id)
    if not patterns:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exclusion pattern not found")
    return ExclusionPatternResponse.model_validate(patterns[0])

@router.put(
    "/{pattern_id}",
    response_model=ExclusionPatternResponse
)
def update_exclusion_pattern(
    pattern_id: int,
    request: ExclusionPatternUpdate,
    use_case: UpdateExclusionPatternUseCase = Depends(get_update_exclusion_pattern_use_case)
):
    updated_pattern = use_case.execute(
        pattern_id=pattern_id,
        name=request.name,
        pattern=request.pattern,
        is_active=request.is_active
    )
    if not updated_pattern:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exclusion pattern not found")
    return ExclusionPatternResponse.model_validate(updated_pattern)

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
