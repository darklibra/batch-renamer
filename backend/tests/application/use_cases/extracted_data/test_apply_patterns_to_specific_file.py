import pytest
from unittest.mock import MagicMock
from typing import List

from app.application.use_cases.extracted_data.apply_patterns_to_specific_file import ApplyPatternsToSpecificFileUseCase
from app.application.use_cases.extracted_data.apply_patterns_to_file import ApplyPatternsToFileUseCase
from app.domain.file.model import File
from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.domain.extracted_data.model import ExtractedData

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
def apply_patterns_to_specific_file_use_case(
    mock_file_repository,
    mock_file_change_pattern_repository,
    mock_apply_patterns_to_file_use_case
) -> ApplyPatternsToSpecificFileUseCase:
    return ApplyPatternsToSpecificFileUseCase(
        file_repository=mock_file_repository,
        file_change_pattern_repository=mock_file_change_pattern_repository,
        apply_patterns_to_file_use_case=mock_apply_patterns_to_file_use_case
    )

@pytest.fixture
def sample_file() -> File:
    return File(
        id=1,
        filename="document",
        extension=".pdf",
        directory="/path/to/docs",
        full_path="/path/to/docs/document.pdf",
        size=1024,
        extraction_failed=True, # Simulate a previously failed extraction
        extraction_failure_reason="Previous failure"
    )

@pytest.fixture
def sample_patterns() -> List[FileChangePattern]:
    return [
        FileChangePattern(id=1, name="Pattern A", regex_pattern="", replacement_pattern=""),
        FileChangePattern(id=2, name="Pattern B", regex_pattern="", replacement_pattern=""),
    ]

def test_execute_success(apply_patterns_to_specific_file_use_case,
                         mock_file_repository,
                         mock_file_change_pattern_repository,
                         mock_apply_patterns_to_file_use_case,
                         sample_file, sample_patterns):
    """파일과 패턴이 모두 존재하고 추출 성공 시 올바른 데이터 반환 및 파일 상태 초기화 확인"""
    mock_file_repository.find_by_id.return_value = sample_file
    mock_file_change_pattern_repository.find_all.return_value = sample_patterns
    
    mock_extracted_data = ExtractedData(file_id=sample_file.id, pattern_id=1, extracted_values={"key": "value"})
    mock_apply_patterns_to_file_use_case.execute.return_value = mock_extracted_data
    mock_file_repository.save.side_effect = lambda x: x # Mock save to update the file object

    result = apply_patterns_to_specific_file_use_case.execute(sample_file.id)

    assert result == mock_extracted_data
    mock_file_repository.find_by_id.assert_called_once_with(sample_file.id)
    mock_file_change_pattern_repository.find_all.assert_called_once()
    mock_apply_patterns_to_file_use_case.execute.assert_called_once_with(sample_file, sample_patterns)
    mock_file_repository.save.assert_called_once_with(sample_file)
    assert not sample_file.extraction_failed
    assert sample_file.extraction_failure_reason is None

def test_execute_file_not_found(apply_patterns_to_specific_file_use_case,
                                mock_file_repository,
                                mock_file_change_pattern_repository,
                                mock_apply_patterns_to_file_use_case):
    """파일이 존재하지 않을 때 None이 반환되는지 확인"""
    mock_file_repository.find_by_id.return_value = None

    result = apply_patterns_to_specific_file_use_case.execute(999)

    assert result is None
    mock_file_repository.find_by_id.assert_called_once_with(999)
    mock_file_change_pattern_repository.find_all.assert_not_called()
    mock_apply_patterns_to_file_use_case.execute.assert_not_called()

def test_execute_no_patterns(apply_patterns_to_specific_file_use_case,
                             mock_file_repository,
                             mock_file_change_pattern_repository,
                             mock_apply_patterns_to_file_use_case,
                             sample_file):
    """패턴이 존재하지 않을 때 None이 반환되는지 확인"""
    mock_file_repository.find_by_id.return_value = sample_file
    mock_file_change_pattern_repository.find_all.return_value = []

    result = apply_patterns_to_specific_file_use_case.execute(sample_file.id)

    assert result is None
    mock_file_repository.find_by_id.assert_called_once_with(sample_file.id)
    mock_file_change_pattern_repository.find_all.assert_called_once()
    mock_apply_patterns_to_file_use_case.execute.assert_not_called()

def test_execute_apply_patterns_fails(apply_patterns_to_specific_file_use_case,
                                     mock_file_repository,
                                     mock_file_change_pattern_repository,
                                     mock_apply_patterns_to_file_use_case,
                                     sample_file, sample_patterns):
    """패턴 적용이 실패했을 때 None이 반환되고 파일 상태가 유지되는지 확인"""
    mock_file_repository.find_by_id.return_value = sample_file
    mock_file_change_pattern_repository.find_all.return_value = sample_patterns
    mock_apply_patterns_to_file_use_case.execute.return_value = None
    mock_file_repository.save.side_effect = lambda x: x # Mock save to update the file object

    result = apply_patterns_to_specific_file_use_case.execute(sample_file.id)

    assert result is None
    mock_file_repository.find_by_id.assert_called_once_with(sample_file.id)
    mock_file_change_pattern_repository.find_all.assert_called_once()
    mock_apply_patterns_to_file_use_case.execute.assert_called_once_with(sample_file, sample_patterns)
    # file.extraction_failed and extraction_failure_reason should remain as they were
    assert sample_file.extraction_failed is True
    assert sample_file.extraction_failure_reason == "Previous failure"
    mock_file_repository.save.assert_not_called() # No need to save if extraction failed
