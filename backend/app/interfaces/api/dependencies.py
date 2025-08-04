from backend.app.application.use_cases.extracted_data.reapply_patterns_to_all_files import ReapplyPatternsToAllFilesUseCase

def get_file_repository(session: Session = Depends(get_session)) -> FileRepository:
    return FileRepositoryImpl(session=session)

def get_index_files_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
) -> IndexFilesUseCase:
    return IndexFilesUseCase(file_repository=file_repository)

def get_file_change_pattern_repository(session: Session = Depends(get_session)) -> FileChangePatternRepository:
    return FileChangePatternRepositoryImpl(session=session)

def get_reapply_patterns_to_all_files_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    file_change_pattern_repository: FileChangePatternRepository = Depends(get_file_change_pattern_repository),
    apply_patterns_to_file_use_case: ApplyPatternsToFileUseCase = Depends(get_apply_patterns_to_file_use_case)
) -> ReapplyPatternsToAllFilesUseCase:
    return ReapplyPatternsToAllFilesUseCase(
        file_repository=file_repository,
        file_change_pattern_repository=file_change_pattern_repository,
        apply_patterns_to_file_use_case=apply_patterns_to_file_use_case
    )

def get_create_file_change_pattern_use_case(
    repository: FileChangePatternRepository = Depends(get_file_change_pattern_repository),
    reapply_use_case: ReapplyPatternsToAllFilesUseCase = Depends(get_reapply_patterns_to_all_files_use_case)
) -> CreateFileChangePatternUseCase:
    return CreateFileChangePatternUseCase(repository=repository, reapply_use_case=reapply_use_case)

def get_get_file_change_patterns_use_case(
    repository: FileChangePatternRepository = Depends(get_file_change_pattern_repository),
) -> GetFileChangePatternsUseCase:
    return GetFileChangePatternsUseCase(repository=repository)

def get_update_file_change_pattern_use_case(
    repository: FileChangePatternRepository = Depends(get_file_change_pattern_repository),
    reapply_use_case: ReapplyPatternsToAllFilesUseCase = Depends(get_reapply_patterns_to_all_files_use_case)
) -> UpdateFileChangePatternUseCase:
    return UpdateFileChangePatternUseCase(repository=repository, reapply_use_case=reapply_use_case)

def get_delete_file_change_pattern_use_case(
    repository: FileChangePatternRepository = Depends(get_file_change_pattern_repository),
) -> DeleteFileChangePatternUseCase:
    return DeleteFileChangePatternUseCase(repository=repository)

def get_extracted_data_repository(session: Session = Depends(get_session)) -> ExtractedDataRepository:
    return ExtractedDataRepositoryImpl(session=session)

def get_extract_data_from_file_use_case(
    extracted_data_repository: ExtractedDataRepository = Depends(get_extracted_data_repository),
) -> ExtractDataFromFileUseCase:
    return ExtractDataFromFileUseCase(extracted_data_repository=extracted_data_repository)

def get_apply_patterns_to_file_use_case(
    extracted_data_repository: ExtractedDataRepository = Depends(get_extracted_data_repository),
    extract_data_from_file_use_case: ExtractDataFromFileUseCase = Depends(get_extract_data_from_file_use_case),
    file_repository: FileRepository = Depends(get_file_repository)
) -> ApplyPatternsToFileUseCase:
    return ApplyPatternsToFileUseCase(
        extracted_data_repository=extracted_data_repository,
        extract_data_from_file_use_case=extract_data_from_file_use_case,
        file_repository=file_repository
    )

def get_apply_patterns_to_specific_file_use_case(
    file_repository: FileRepository = Depends(get_file_repository),
    file_change_pattern_repository: FileChangePatternRepository = Depends(get_file_change_pattern_repository),
    apply_patterns_to_file_use_case: ApplyPatternsToFileUseCase = Depends(get_apply_patterns_to_file_use_case)
) -> ApplyPatternsToSpecificFileUseCase:
    return ApplyPatternsToSpecificFileUseCase(
        file_repository=file_repository,
        file_change_pattern_repository=file_change_pattern_repository,
        apply_patterns_to_file_use_case=apply_patterns_to_file_use_case
    )
