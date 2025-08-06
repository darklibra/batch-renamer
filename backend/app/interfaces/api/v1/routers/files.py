from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.application.use_cases.index_files import IndexFilesUseCase
from app.interfaces.api.dependencies import (
    get_index_files_use_case,
    get_file_repository,
    get_apply_patterns_to_specific_file_use_case,
)
from app.interfaces.api.v1.dtos.file_dtos import (
    IndexRequest,
    FileResponse,
    IndexResponse,
)
from app.domain.file.repository import FileRepository
from app.application.use_cases.extracted_data.apply_patterns_to_specific_file import (
    ApplyPatternsToSpecificFileUseCase,
)
from fastapi.responses import JSONResponse

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
    file_repository: FileRepository = Depends(get_file_repository),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    _sort_field: Optional[str] = Query(None, alias="_sort"),
    _sort_order: Optional[str] = Query(None, alias="_order"),
    ids: Optional[List[int]] = Query(None),
    filename: Optional[str] = Query(None), # filename 필터 추가
):
    if ids:
        file_ids = ids
        files = file_repository.find_by_ids(file_ids)
        total_count = len(files) # For getMany, total_count is the number of requested ids
        response_data = [FileResponse.model_validate(f).model_dump() for f in files]
        content_range = f"files 0-{len(files) - 1}/{total_count}"
    else:
        skip = (page - 1) * per_page
        limit = per_page
        files = file_repository.find_all(
            skip=skip,
            limit=limit,
            sort_field=_sort_field,
            sort_order=_sort_order,
            filename=filename # filename 필터 전달
        )
        total_count = file_repository.count_all(filename=filename) # filename 필터 전달

        content_range_start = skip
        content_range_end = skip + len(files) - 1
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
    extracted_data = use_case.execute(file_id)
    if extracted_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or no patterns applied.",
        )

    updated_file = use_case.file_repository.find_by_id(file_id)
    if not updated_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Updated file not found."
        )

    return FileResponse(
        id=updated_file.id,
        filename=updated_file.filename,
        extension=updated_file.extension,
        directory=updated_file.directory,
        full_path=updated_file.full_path,
        size=updated_file.size,
        extraction_failed=updated_file.extraction_failed,
        extraction_failure_reason=updated_file.extraction_failure_reason,
    )
