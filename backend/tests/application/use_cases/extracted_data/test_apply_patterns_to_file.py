import pytest
from unittest.mock import MagicMock
from typing import List

from app.application.use_cases.extracted_data.apply_patterns_to_file import ApplyPatternsToFileUseCase
from app.application.use_cases.extracted_data.extract_data_from_file import ExtractDataFromFileUseCase
from app.domain.file.model import File
from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.extracted_data.model import ExtractedData
from app.domain.extracted_data.repository import ExtractedDataRepository

@pytest.fixture
def mock_extracted_data_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=ExtractedDataRepository)

@pytest.fixture
def mock_extract_data_from_file_use_case(mocker) -> MagicMock:
    return mocker.MagicMock(spec=ExtractDataFromFileUseCase)

@pytest.fixture
def mock_file_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileRepository)

@pytest.fixture
def apply_patterns_to_file_use_case(
    mock_extracted_data_repository,
    mock_extract_data_from_file_use_case,
    mock_file_repository
) -> ApplyPatternsToFileUseCase:
    return ApplyPatternsToFileUseCase(
        extracted_data_repository=mock_extracted_data_repository,
        extract_data_from_file_use_case=mock_extract_data_from_file_use_case,
        file_repository=mock_file_repository
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
    )

@pytest.fixture
def sample_patterns() -> List[FileChangePattern]:
    return [
        FileChangePattern(
            id=1,
            name="Pattern A",
            regex_pattern=r"doc(?P<num>\d+)",
            replacement_pattern="",
        ),
        FileChangePattern(
            id=2,
            name="Pattern B",
            regex_pattern=r"doc(?P<num>\d+)\.(?P<ext>\w+)",
            replacement_pattern="",
        ),
        FileChangePattern(
            id=3,
            name="Pattern C",
            regex_pattern=r"non_matching_pattern",
            replacement_pattern="",
        ),
    ]

def test_apply_patterns_best_match(apply_patterns_to_file_use_case, 
                                   mock_extracted_data_repository, 
                                   mock_extract_data_from_file_use_case, 
                                   mock_file_repository,
                                   sample_file, sample_patterns):
    """여러 패턴 중 최적의 패턴이 적용되고 데이터가 저장되는지 확인"""
    # Mock extract_data_from_file_use_case.execute to return different results for patterns
    mock_extract_data_from_file_use_case.execute.side_effect = [
        {"num": "ument"},  # Pattern A: 1 field
        {"num": "ument", "ext": "pdf"}, # Pattern B: 2 fields (best match)
        None # Pattern C: No match
    ]

    # Mock save methods
    mock_extracted_data_repository.save.side_effect = lambda x: x
    mock_file_repository.save.side_effect = lambda x: x

    result = apply_patterns_to_file_use_case.execute(sample_file, sample_patterns)

    assert result is not None
    assert result.file_id == sample_file.id
    assert result.pattern_id == sample_patterns[1].id # Pattern B should be chosen
    assert result.extracted_values == {"num": "ument", "ext": "pdf"}

    mock_extracted_data_repository.delete_by_file_id.assert_called_once_with(sample_file.id)
    mock_extracted_data_repository.save.assert_called_once()
    mock_file_repository.save.assert_called_once_with(sample_file)
    assert not sample_file.extraction_failed
    assert sample_file.extraction_failure_reason is None

def test_apply_patterns_no_match(apply_patterns_to_file_use_case, 
                                 mock_extracted_data_repository, 
                                 mock_extract_data_from_file_use_case, 
                                 mock_file_repository,
                                 sample_file, sample_patterns):
    """모든 패턴이 일치하지 않을 때 파일의 추출 실패 상태가 올바르게 기록되는지 확인"""
    mock_extract_data_from_file_use_case.execute.return_value = None
    mock_file_repository.save.side_effect = lambda x: x

    result = apply_patterns_to_file_use_case.execute(sample_file, sample_patterns)

    assert result is None
    mock_extracted_data_repository.delete_by_file_id.assert_not_called()
    mock_extracted_data_repository.save.assert_not_called()
    mock_file_repository.save.assert_called_once_with(sample_file)
    assert sample_file.extraction_failed
    assert sample_file.extraction_failure_reason == "모든 패턴을 적용했지만 데이터를 추출하지 못했습니다."

def test_apply_patterns_existing_data_deleted(apply_patterns_to_file_use_case, 
                                              mock_extracted_data_repository, 
                                              mock_extract_data_from_file_use_case, 
                                              mock_file_repository,
                                              sample_file, sample_patterns):
    """새로운 최적의 패턴이 발견되었을 때, 기존에 추출된 데이터가 삭제되는지 확인"""
    mock_extract_data_from_file_use_case.execute.side_effect = [
        {"num": "ument", "ext": "pdf"}, # Pattern B is best
        None, None
    ]
    mock_extracted_data_repository.save.side_effect = lambda x: x
    mock_file_repository.save.side_effect = lambda x: x

    apply_patterns_to_file_use_case.execute(sample_file, sample_patterns)

    mock_extracted_data_repository.delete_by_file_id.assert_called_once_with(sample_file.id)

def test_apply_patterns_no_extracted_fields(apply_patterns_to_file_use_case, 
                                            mock_extracted_data_repository, 
                                            mock_extract_data_from_file_use_case, 
                                            mock_file_repository,
                                            sample_file, sample_patterns):
    """패턴은 일치하지만 추출된 필드가 없을 때 (예: 그룹이 없는 패턴), 파일의 추출 실패 상태가 올바르게 기록되는지 확인"""
    # Mock extract_data_from_file_use_case.execute to return empty dict for a match
    mock_extract_data_from_file_use_case.execute.side_effect = [
        {}, # Pattern A matches but extracts no fields
        None, None
    ]
    mock_file_repository.save.side_effect = lambda x: x

    result = apply_patterns_to_file_use_case.execute(sample_file, sample_patterns)

    assert result is None
    mock_extracted_data_repository.delete_by_file_id.assert_not_called()
    mock_extracted_data_repository.save.assert_not_called()
    mock_file_repository.save.assert_called_once_with(sample_file)
    assert sample_file.extraction_failed
    assert sample_file.extraction_failure_reason == "모든 패턴을 적용했지만 데이터를 추출하지 못했습니다."
