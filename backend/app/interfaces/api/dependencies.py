from fastapi import Depends
from sqlmodel import Session

from app.infrastructure.app_config import get_session
from app.application.use_cases.file_change_pattern.create_file_change_pattern import (
    CreateFileChangePatternUseCase,
)
from app.application.use_cases.file_change_pattern.confirm_file_change_pattern import (
    ConfirmFileChangePatternUseCase,
)  # New import
from app.application.use_cases.file_change_pattern.delete_file_change_pattern import (
    DeleteFileChangePatternUseCase,
)
from app.application.use_cases.file_change_pattern.get_file_change_patterns import (
    GetFileChangePatternsUseCase,
)
from app.application.use_cases.file_change_pattern.update_file_change_pattern import (
    UpdateFileChangePatternUseCase,
)
from app.application.use_cases.index_files import IndexFilesUseCase
from app.domain.extracted_data.repository import ExtractedDataRepository
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.infrastructure.persistence.extracted_data_repository_impl import (
    ExtractedDataRepositoryImpl,
)
from app.infrastructure.persistence.file_change_pattern_repository_impl import (
    FileChangePatternRepositoryImpl,
)
from app.infrastructure.persistence.file_repository_impl import FileRepositoryImpl

# Exclusion Pattern imports
from app.domain.exclusion_pattern.repository import ExclusionPatternRepository
from app.infrastructure.persistence.exclusion_pattern_repository_impl import (
    ExclusionPatternRepositoryImpl,
)
from app.application.use_cases.exclusion_pattern.create_exclusion_pattern import (
    CreateExclusionPatternUseCase,
)
from app.application.use_cases.exclusion_pattern.get_exclusion_patterns import (
    GetExclusionPatternsUseCase,
)
from app.application.use_cases.exclusion_pattern.update_exclusion_pattern import (
    UpdateExclusionPatternUseCase,
)
from app.application.use_cases.exclusion_pattern.delete_exclusion_pattern import (
    DeleteExclusionPatternUseCase,
)
from app.domain.file.repository import FileRepository
from app.application.use_cases.extracted_data.apply_patterns_to_file import (
    ApplyPatternsToFileUseCase,
)
from app.application.use_cases.extracted_data.apply_patterns_to_specific_file import (
    ApplyPatternsToSpecificFileUseCase,
)
from app.application.use_cases.extracted_data.extract_data_from_file import (
    ExtractDataFromFileUseCase,
)
from app.application.use_cases.extracted_data.reapply_patterns_to_all_files import (
    ReapplyPatternsToAllFilesUseCase,
)
from app.application.use_cases.file.get_files import GetFilesUseCase
from app.application.use_cases.file.apply_rename_and_copy import ApplyRenameAndCopyUseCase # New import
from app.infrastructure.services.file_operation_service import FileOperationService


def get_file_repository(session: Session = Depends(get_session)) -> FileRepository:
    return FileRepositoryImpl(session=session)


# Exclusion Pattern Dependencies
def get_exclusion_pattern_repository(
    session: Session = Depends(get_session),
) -> ExclusionPatternRepository:
    return ExclusionPatternRepositoryImpl(session=session)


def get_index_files_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    exclusion_pattern_repository: ExclusionPatternRepository = Depends(
        get_exclusion_pattern_repository
    ),
) -> IndexFilesUseCase:
    return IndexFilesUseCase(
        file_repository=file_repository,
        exclusion_pattern_repository=exclusion_pattern_repository,
    )


def get_file_change_pattern_repository(
    session: Session = Depends(get_session),
) -> FileChangePatternRepository:
    return FileChangePatternRepositoryImpl(session=session)


def get_extracted_data_repository(
    session: Session = Depends(get_session),
) -> ExtractedDataRepository:
    return ExtractedDataRepositoryImpl(session=session)


def get_extract_data_from_file_use_case() -> ExtractDataFromFileUseCase:
    return ExtractDataFromFileUseCase()


def get_apply_patterns_to_file_use_case(
    extracted_data_repository: ExtractedDataRepository = Depends(
        get_extracted_data_repository
    ),
    extract_data_from_file_use_case: ExtractDataFromFileUseCase = Depends(
        get_extract_data_from_file_use_case
    ),
    file_repository: FileRepository = Depends(get_file_repository),
) -> ApplyPatternsToFileUseCase:
    return ApplyPatternsToFileUseCase(
        extracted_data_repository=extracted_data_repository,
        extract_data_from_file_use_case=extract_data_from_file_use_case,
        file_repository=file_repository,
    )


def get_reapply_patterns_to_all_files_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    file_change_pattern_repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    apply_patterns_to_file_use_case: ApplyPatternsToFileUseCase = Depends(
        get_apply_patterns_to_file_use_case
    ),
) -> ReapplyPatternsToAllFilesUseCase:
    return ReapplyPatternsToAllFilesUseCase(
        file_repository=file_repository,
        file_change_pattern_repository=file_change_pattern_repository,
        apply_patterns_to_file_use_case=apply_patterns_to_file_use_case,
    )


def get_create_file_change_pattern_use_case(
    repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    file_repository: FileRepository = Depends(get_file_repository),
    extract_data_from_file_use_case: ExtractDataFromFileUseCase = Depends(
        get_extract_data_from_file_use_case
    ),
) -> CreateFileChangePatternUseCase:
    return CreateFileChangePatternUseCase(
        repository=repository,
        file_repository=file_repository,
        extract_data_from_file_use_case=extract_data_from_file_use_case,
    )


def get_confirm_file_change_pattern_use_case(
    repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    reapply_use_case: ReapplyPatternsToAllFilesUseCase = Depends(
        get_reapply_patterns_to_all_files_use_case
    ),
) -> ConfirmFileChangePatternUseCase:
    return ConfirmFileChangePatternUseCase(
        repository=repository, reapply_use_case=reapply_use_case
    )


def get_get_file_change_patterns_use_case(
    repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
) -> GetFileChangePatternsUseCase:
    return GetFileChangePatternsUseCase(repository=repository)


def get_update_file_change_pattern_use_case(
    repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    reapply_use_case: ReapplyPatternsToAllFilesUseCase = Depends(
        get_reapply_patterns_to_all_files_use_case
    ),
) -> UpdateFileChangePatternUseCase:
    return UpdateFileChangePatternUseCase(
        repository=repository, reapply_use_case=reapply_use_case
    )


def get_delete_file_change_pattern_use_case(
    repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
) -> DeleteFileChangePatternUseCase:
    return DeleteFileChangePatternUseCase(repository=repository)


def get_apply_patterns_to_specific_file_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    file_change_pattern_repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    apply_patterns_to_file_use_case: ApplyPatternsToFileUseCase = Depends(
        get_apply_patterns_to_file_use_case
    ),
) -> ApplyPatternsToSpecificFileUseCase:
    return ApplyPatternsToSpecificFileUseCase(
        file_repository=file_repository,
        file_change_pattern_repository=file_change_pattern_repository,
        apply_patterns_to_file_use_case=apply_patterns_to_file_use_case,
    )


from app.application.use_cases.file_change_pattern.apply_saved_pattern import (
    ApplySavedPatternUseCase,
)
from app.application.use_cases.extracted_data.test_file_pattern import (
    TestFilePatternUseCase,
)

# ... (생략)

def get_apply_saved_pattern_use_case(
    file_change_pattern_repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    file_repository: FileRepository = Depends(get_file_repository),
    extracted_data_repository: ExtractedDataRepository = Depends(
        get_extracted_data_repository
    ),
    extract_data_from_file_use_case: ExtractDataFromFileUseCase = Depends(
        get_extract_data_from_file_use_case
    ),
) -> ApplySavedPatternUseCase:
    return ApplySavedPatternUseCase(
        file_change_pattern_repository=file_change_pattern_repository,
        file_repository=file_repository,
        extracted_data_repository=extracted_data_repository,
        extract_data_from_file_use_case=extract_data_from_file_use_case,
    )


def get_test_file_pattern_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    extract_data_from_file_use_case: ExtractDataFromFileUseCase = Depends(
        get_extract_data_from_file_use_case
    ),
) -> TestFilePatternUseCase:
    return TestFilePatternUseCase(
        file_repository=file_repository,
        extract_data_from_file_use_case=extract_data_from_file_use_case,
    )


def get_create_exclusion_pattern_use_case(
    repository: ExclusionPatternRepository = Depends(get_exclusion_pattern_repository),
) -> CreateExclusionPatternUseCase:
    return CreateExclusionPatternUseCase(repository=repository)


def get_get_exclusion_patterns_use_case(
    repository: ExclusionPatternRepository = Depends(get_exclusion_pattern_repository),
) -> GetExclusionPatternsUseCase:
    return GetExclusionPatternsUseCase(repository=repository)


def get_update_exclusion_pattern_use_case(
    repository: ExclusionPatternRepository = Depends(get_exclusion_pattern_repository),
) -> UpdateExclusionPatternUseCase:
    return UpdateExclusionPatternUseCase(repository=repository)


def get_delete_exclusion_pattern_use_case(
    repository: ExclusionPatternRepository = Depends(get_exclusion_pattern_repository),
) -> DeleteExclusionPatternUseCase:
    return DeleteExclusionPatternUseCase(repository=repository)


def get_get_files_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
) -> GetFilesUseCase:
    return GetFilesUseCase(file_repository=file_repository)


def get_file_operation_service() -> FileOperationService:
    return FileOperationService()


from app.application.use_cases.file.rename_and_copy_by_pattern import RenameAndCopyByPatternUseCase

from app.domain.file_change_request.repository import FileChangeRequestRepository
from app.infrastructure.persistence.file_change_request_repository_impl import FileChangeRequestRepositoryImpl
from app.application.use_cases.file_change_request.create_file_change_request import CreateFileChangeRequestUseCase

from app.application.use_cases.file_change_request.get_file_change_requests import GetFileChangeRequestsUseCase
from app.application.use_cases.file_change_request.get_file_change_request_detail import GetFileChangeRequestDetailUseCase

def get_file_change_request_repository(
    session: Session = Depends(get_session)
) -> FileChangeRequestRepository:
    return FileChangeRequestRepositoryImpl(session)

def get_create_file_change_request_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    file_change_pattern_repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    file_change_request_repository: FileChangeRequestRepository = Depends(
        get_file_change_request_repository
    ),
    file_operation_service: FileOperationService = Depends(FileOperationService),
) -> CreateFileChangeRequestUseCase:
    return CreateFileChangeRequestUseCase(
        file_repository=file_repository,
        file_change_pattern_repository=file_change_pattern_repository,
        file_change_request_repository=file_change_request_repository,
        file_operation_service=file_operation_service,
    )

def get_get_file_change_requests_use_case(
    repository: FileChangeRequestRepository = Depends(get_file_change_request_repository),
) -> GetFileChangeRequestsUseCase:
    return GetFileChangeRequestsUseCase(repository=repository)

def get_get_file_change_request_detail_use_case(
    repository: FileChangeRequestRepository = Depends(get_file_change_request_repository),
) -> GetFileChangeRequestDetailUseCase:
    return GetFileChangeRequestDetailUseCase(repository=repository)

def get_apply_rename_and_copy_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    file_change_pattern_repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    file_operation_service: FileOperationService = Depends(FileOperationService),
) -> ApplyRenameAndCopyUseCase:
    return ApplyRenameAndCopyUseCase(
        file_repository=file_repository,
        file_change_pattern_repository=file_change_pattern_repository,
        file_operation_service=file_operation_service,
    )

def get_rename_and_copy_by_pattern_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    file_change_pattern_repository: FileChangePatternRepository = Depends(
        get_file_change_pattern_repository
    ),
    file_operation_service: FileOperationService = Depends(FileOperationService),
) -> RenameAndCopyByPatternUseCase:
    return RenameAndCopyByPatternUseCase(
        file_repository=file_repository,
        file_change_pattern_repository=file_change_pattern_repository,
        file_operation_service=file_operation_service,
    )
