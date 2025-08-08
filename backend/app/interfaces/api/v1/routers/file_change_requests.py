
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import List
# from fastapi.responses import JSONResponse
from app.domain.file_change_request.model import FileChangeRequest
from app.interfaces.api.v1.dtos.file_change_request_dtos import CreateFileChangeRequestDto, FileChangeRequestResponse, FileChangeRequestListResponse, FileChangeRequestDetailResponse
from app.application.use_cases.file_change_request.create_file_change_request import CreateFileChangeRequestUseCase
from app.application.use_cases.file_change_request.get_file_change_requests import GetFileChangeRequestsUseCase
from app.application.use_cases.file_change_request.get_file_change_request_detail import GetFileChangeRequestDetailUseCase
from app.interfaces.api.dependencies import get_create_file_change_request_use_case, get_get_file_change_requests_use_case, get_get_file_change_request_detail_use_case
from app.application.exceptions import FileChangeRequestNotFoundException

router = APIRouter()

@router.post("/", response_model=FileChangeRequestResponse, status_code=status.HTTP_201_CREATED)
def create_file_change_request(
    request: CreateFileChangeRequestDto,
    use_case: CreateFileChangeRequestUseCase = Depends(get_create_file_change_request_use_case),
):
    try:
        change_request = use_case.execute(
            file_change_pattern_id=request.file_change_pattern_id,
            rename_pattern_string=request.rename_pattern_string,
            destination_path=request.destination_path,
        )
        return FileChangeRequestResponse.model_validate(change_request)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[FileChangeRequestListResponse])
def get_all_file_change_requests(
    use_case: GetFileChangeRequestsUseCase = Depends(get_get_file_change_requests_use_case),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    response: Response = None
):
    requests, total_count = use_case.execute(skip=(page - 1) * per_page, limit=per_page)

    content_range_start = (page - 1) * per_page
    content_range_end = content_range_start + len(requests) - 1
    content_range = f"file-change-requests {content_range_start}-{content_range_end}/{total_count}"

    response.headers["Content-Range"] = content_range

    return [FileChangeRequestListResponse.model_validate(r) for r in requests]

@router.get("/{request_id}", response_model=FileChangeRequestDetailResponse)
def get_file_change_request_detail(
    request_id: int,
    use_case: GetFileChangeRequestDetailUseCase = Depends(get_get_file_change_request_detail_use_case),
):
    try:
        change_request = use_case.execute(request_id)
        return FileChangeRequestDetailResponse.model_validate(change_request)
    except FileChangeRequestNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
