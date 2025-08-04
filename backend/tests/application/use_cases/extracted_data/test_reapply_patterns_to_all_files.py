import pytest
from unittest.mock import MagicMock
from typing import List

from app.application.use_cases.extracted_data.reapply_patterns_to_all_files import ReapplyPatternsToAllFilesUseCase
from app.application.use_cases.extracted_data.apply_patterns_to_file import ApplyPatternsToFileUseCase
from app.domain.file.model import File
from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository

@pytest.fixture
def mock_file_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileRepository)

@pytest.fixture
def mock_file_change_pattern_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileChangePatternRepository)

@pytest.fixture
def mock_apply_patterns_to_file_use_case(mocker) -> MagicMock:
    return mocker.MagicMock(spec=ApplyPatternsToFileUseCase)

@pytest.fixture
def reapply_patterns_to_all_files_use_case(
    mock_file_repository,
    mock_file_change_pattern_repository,
    mock_apply_patterns_to_file_use_case
) -> ReapplyPatternsToAllFilesUseCase:
    return ReapplyPatternsToAllFilesUseCase(
        file_repository=mock_file_repository,
        file_change_pattern_repository=mock_file_change_pattern_repository,
        apply_patterns_to_file_use_case=mock_apply_patterns_to_file_use_case
    )

@pytest.fixture
def sample_files() -> List[File]:
    return [
        File(id=1, filename="doc1", extension=".txt", directory="/path", full_path="/path/doc1.txt", size=100),
        File(id=2, filename="doc2", extension=".pdf", directory="/path", full_path="/path/doc2.pdf", size=200),
    ]

@pytest.fixture
def sample_patterns() -> List[FileChangePattern]:
    return [
        FileChangePattern(id=1, name="Pattern A", regex_pattern="", replacement_pattern=""),
        FileChangePattern(id=2, name="Pattern B", regex_pattern="", replacement_pattern=""),
    ]

def test_execute_no_patterns(reapply_patterns_to_all_files_use_case,
                             mock_file_repository,
                             mock_file_change_pattern_repository,
                             mock_apply_patterns_to_file_use_case,
                             sample_files):
    """패턴이 없을 때 아무 작업도 수행하지 않는지 확인"""
    mock_file_repository.find_all.return_value = sample_files
    mock_file_change_pattern_repository.find_all.return_value = []

    reapply_patterns_to_all_files_use_case.execute()

    mock_file_repository.find_all.assert_called_once()
    mock_file_change_pattern_repository.find_all.assert_called_once()
    mock_apply_patterns_to_file_use_case.execute.assert_not_called()

def test_execute_no_files(reapply_patterns_to_all_files_use_case,
                          mock_file_repository,
                          mock_file_change_pattern_repository,
                          mock_apply_patterns_to_file_use_case,
                          sample_patterns):
    """파일이 없을 때 아무 작업도 수행하지 않는지 확인"""
    mock_file_repository.find_all.return_value = []
    mock_file_change_pattern_repository.find_all.return_value = sample_patterns

    reapply_patterns_to_all_files_use_case.execute()

    mock_file_repository.find_all.assert_called_once()
    mock_file_change_pattern_repository.find_all.assert_called_once()
    mock_apply_patterns_to_file_use_case.execute.assert_not_called()

def test_execute_files_and_patterns_exist(reapply_patterns_to_all_files_use_case,
                                         mock_file_repository,
                                         mock_file_change_pattern_repository,
                                         mock_apply_patterns_to_file_use_case,
                                         sample_files, sample_patterns):
    """파일과 패턴이 모두 존재할 때 각 파일에 대해 패턴 적용이 호출되는지 확인"""
    mock_file_repository.find_all.return_value = sample_files
    mock_file_change_pattern_repository.find_all.return_value = sample_patterns

    reapply_patterns_to_all_files_use_case.execute()

    mock_file_repository.find_all.assert_called_once()
    mock_file_change_pattern_repository.find_all.assert_called_once()
    
    # Verify that apply_patterns_to_file_use_case.execute was called for each file
    assert mock_apply_patterns_to_file_use_case.execute.call_count == len(sample_files)
    mock_apply_patterns_to_file_use_case.execute.assert_any_call(sample_files[0], sample_patterns)
    mock_apply_patterns_to_file_use_case.execute.assert_any_call(sample_files[1], sample_patterns)
