from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.application.use_cases.index_files import IndexFilesUseCase
from app.interfaces.api.dependencies import (
    get_index_files_use_case,
    get_apply_patterns_to_specific_file_use_case,
    get_get_files_use_case,
    get_apply_rename_and_copy_use_case,
    get_rename_and_copy_by_pattern_use_case,
)
from app.interfaces.api.v1.dtos.file_dtos import (
    IndexRequest,
    FileResponse,
    IndexResponse,
    ApplyRenameAndCopyRequestDto, # New import
    ApplyRenameAndCopyResponseDto, # New import
)
from app.application.use_cases.extracted_data.apply_patterns_to_specific_file import (
    ApplyPatternsToSpecificFileUseCase,
)
from fastapi.responses import JSONResponse
from app.application.exceptions import (
    FileNotFoundException,
    PatternNotFoundException,
    FileProcessingException,
    FileOperationException, # New import
)
from app.application.use_cases.file.get_files import GetFilesUseCase
from app.application.use_cases.file.apply_rename_and_copy import ApplyRenameAndCopyUseCase
from app.application.use_cases.file.rename_and_copy_by_pattern import RenameAndCopyByPatternUseCase

router = APIRouter()


@router.post("/index", response_model=IndexResponse)
def index_files(
    request: IndexRequest,
    use_case: IndexFilesUseCase = Depends(get_index_files_use_case),
):
    indexed_files = use_case.execute(request.directory_path, request.exclude_patterns)

    response_files = [
        FileResponse.model_validate(f) for f in indexed_files
    ]

    return IndexResponse(indexed_files=response_files)


@router.get("/", response_model=List[FileResponse])
def get_all_files(
    use_case: GetFilesUseCase = Depends(get_get_files_use_case),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    _sort_field: Optional[str] = Query(None, alias="_sort"),
    _sort_order: Optional[str] = Query(None, alias="_order"),
    ids: Optional[List[int]] = Query(None),
    filename: Optional[str] = Query(None), # filename 필터 추가
):
    files, total_count = use_case.execute(
        page=page,
        per_page=per_page,
        sort_field=_sort_field,
        sort_order=_sort_order,
        ids=ids,
        filename=filename,
    )

    content_range_start = (page - 1) * per_page
    content_range_end = content_range_start + len(files) - 1
    content_range = f"files {content_range_start}-{content_range_end}/{total_count}"

    response_data = [FileResponse.model_validate(f).model_dump() for f in files]

    return JSONResponse(
        content=response_data,
        headers={"Content-Range": content_range}
    )


@router.post(
    "/{file_id}/apply-patterns",
    response_model=FileResponse,
    status_code=status.HTTP_200_OK,
)
def apply_patterns_to_specific_file(
    file_id: int,
    use_case: ApplyPatternsToSpecificFileUseCase = Depends(
        get_apply_patterns_to_specific_file_use_case
    ),
):
    try:
        updated_file = use_case.execute(file_id)
        return FileResponse.model_validate(updated_file)
    except FileNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PatternNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except FileProcessingException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/apply-rename-and-copy",
    response_model=ApplyRenameAndCopyResponseDto,
    status_code=status.HTTP_200_OK,
)
def apply_rename_and_copy(
    request: ApplyRenameAndCopyRequestDto,
    use_case: ApplyRenameAndCopyUseCase = Depends(get_apply_rename_and_copy_use_case),
):
    try:
        success_count, failed_count, details = use_case.execute(
            file_change_pattern_id=request.file_change_pattern_id,
            rename_pattern_string=request.rename_pattern_string,
            destination_path=request.destination_path,
        )
        return ApplyRenameAndCopyResponseDto(
            success_count=success_count, failed_count=failed_count, details=details
        )
    except PatternNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except FileOperationException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

