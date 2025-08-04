import pytest
from unittest.mock import MagicMock
from typing import List

from app.application.use_cases.file_change_pattern.get_file_change_patterns import GetFileChangePatternsUseCase
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository

@pytest.fixture
def mock_file_change_pattern_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileChangePatternRepository)

@pytest.fixture
def get_file_change_patterns_use_case(
    mock_file_change_pattern_repository
) -> GetFileChangePatternsUseCase:
    return GetFileChangePatternsUseCase(
        repository=mock_file_change_pattern_repository
    )

@pytest.fixture
def sample_patterns() -> List[FileChangePattern]:
    return [
        FileChangePattern(id=1, name="Pattern 1", regex_pattern="", replacement_pattern=""),
        FileChangePattern(id=2, name="Pattern 2", regex_pattern="", replacement_pattern=""),
    ]

def test_get_pattern_by_id(get_file_change_patterns_use_case,
                           mock_file_change_pattern_repository,
                           sample_patterns):
    """특정 ID로 패턴을 조회할 때 해당 패턴이 리스트에 담겨 반환되는지 확인"""
    mock_file_change_pattern_repository.find_by_id.return_value = sample_patterns[0]

    result = get_file_change_patterns_use_case.execute(pattern_id=1)

    assert len(result) == 1
    assert result[0] == sample_patterns[0]
    mock_file_change_pattern_repository.find_by_id.assert_called_once_with(1)
    mock_file_change_pattern_repository.find_all.assert_not_called()

def test_get_pattern_by_id_not_found(get_file_change_patterns_use_case,
                                     mock_file_change_pattern_repository):
    """특정 ID로 패턴을 조회했지만 해당 패턴이 없을 때 빈 리스트가 반환되는지 확인"""
    mock_file_change_pattern_repository.find_by_id.return_value = None

    result = get_file_change_patterns_use_case.execute(pattern_id=999)

    assert len(result) == 0
    mock_file_change_pattern_repository.find_by_id.assert_called_once_with(999)
    mock_file_change_pattern_repository.find_all.assert_not_called()

def test_get_all_patterns(get_file_change_patterns_use_case,
                          mock_file_change_pattern_repository,
                          sample_patterns):
    """모든 패턴을 조회할 때 find_all이 호출되고 모든 패턴이 반환되는지 확인"""
    mock_file_change_pattern_repository.find_all.return_value = sample_patterns

    result = get_file_change_patterns_use_case.execute()

    assert len(result) == len(sample_patterns)
    assert result == sample_patterns
    mock_file_change_pattern_repository.find_all.assert_called_once()
    mock_file_change_pattern_repository.find_by_id.assert_not_called()
