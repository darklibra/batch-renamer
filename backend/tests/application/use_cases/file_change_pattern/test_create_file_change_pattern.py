import pytest
from unittest.mock import MagicMock

from app.application.use_cases.file_change_pattern.create_file_change_pattern import CreateFileChangePatternUseCase
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.use_cases.extracted_data.reapply_patterns_to_all_files import ReapplyPatternsToAllFilesUseCase

@pytest.fixture
def mock_file_change_pattern_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileChangePatternRepository)

@pytest.fixture
def mock_reapply_use_case(mocker) -> MagicMock:
    return mocker.MagicMock(spec=ReapplyPatternsToAllFilesUseCase)

@pytest.fixture
def create_file_change_pattern_use_case(
    mock_file_change_pattern_repository,
    mock_reapply_use_case
) -> CreateFileChangePatternUseCase:
    return CreateFileChangePatternUseCase(
        repository=mock_file_change_pattern_repository,
        reapply_use_case=mock_reapply_use_case
    )

def test_create_pattern_and_reapply(create_file_change_pattern_use_case,
                                    mock_file_change_pattern_repository,
                                    mock_reapply_use_case):
    """새로운 패턴이 생성되고 저장되며, 모든 파일에 패턴 재적용이 호출되는지 확인"""
    name = "Test Pattern"
    regex_pattern = r"test_regex"
    replacement_format = "test_format"

    # Mock the save method to return a FileChangePattern instance
    mock_file_change_pattern_repository.save.side_effect = lambda pattern: pattern

    result = create_file_change_pattern_use_case.execute(name, regex_pattern, replacement_format)

    assert isinstance(result, FileChangePattern)
    assert result.name == name
    assert result.regex_pattern == regex_pattern
    assert result.replacement_format == replacement_format

    mock_file_change_pattern_repository.save.assert_called_once()
    mock_reapply_use_case.execute.assert_called_once()
