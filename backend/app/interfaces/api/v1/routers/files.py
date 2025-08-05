from fastapi import APIRouter, Depends, HTTPException, status  # status 추가
from typing import List
from app.application.use_cases.index_files import IndexFilesUseCase
from app.interfaces.api.dependencies import (
    get_index_files_use_case,
    get_file_repository,
    get_apply_patterns_to_specific_file_use_case,
)  # get_apply_patterns_to_specific_file_use_case 추가
from app.interfaces.api.v1.dtos.file_dtos import (
    IndexRequest,
    FileResponse,
    IndexResponse,
)
from app.domain.file.repository import FileRepository
from app.application.use_cases.extracted_data.apply_patterns_to_specific_file import (
    ApplyPatternsToSpecificFileUseCase,
)  # 추가

router = APIRouter()


@router.post("/index", response_model=IndexResponse)
def index_files(
    request: IndexRequest,
    use_case: IndexFilesUseCase = Depends(get_index_files_use_case),
):
    indexed_files = use_case.execute(request.directory_path)

    response_files = [
        FileResponse(
            id=f.id,
            filename=f.filename,
            extension=f.extension,
            directory=f.directory,
            full_path=f.full_path,
            size=f.size,
            extraction_failed=f.extraction_failed,
            extraction_failure_reason=f.extraction_failure_reason,
        )
        for f in indexed_files
    ]

    return IndexResponse(indexed_files=response_files)


@router.get("/", response_model=List[FileResponse])
def get_all_files(file_repository: FileRepository = Depends(get_file_repository)):
    files = file_repository.find_all()
    return [
        FileResponse(
            id=f.id,
            filename=f.filename,
            extension=f.extension,
            directory=f.directory,
            full_path=f.full_path,
            size=f.size,
            extraction_failed=f.extraction_failed,
            extraction_failure_reason=f.extraction_failure_reason,
        )
        for f in files
    ]


@router.post(
    "/{file_id}/apply-patterns",
    response_model=FileResponse,  # 추출된 데이터 반환 또는 파일 정보 반환
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

    # 추출 성공 후 업데이트된 파일 정보를 반환
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
