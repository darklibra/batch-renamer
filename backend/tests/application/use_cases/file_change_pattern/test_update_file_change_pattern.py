import pytest
from unittest.mock import MagicMock

from app.application.use_cases.file_change_pattern.update_file_change_pattern import UpdateFileChangePatternUseCase
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
def update_file_change_pattern_use_case(
    mock_file_change_pattern_repository,
    mock_reapply_use_case
) -> UpdateFileChangePatternUseCase:
    return UpdateFileChangePatternUseCase(
        repository=mock_file_change_pattern_repository,
        reapply_use_case=mock_reapply_use_case
    )

@pytest.fixture
def sample_pattern() -> FileChangePattern:
    return FileChangePattern(
        id=1,
        name="Original Name",
        regex_pattern="original_regex",
        replacement_format="original_format",
    )

def test_update_pattern_success(update_file_change_pattern_use_case,
                               mock_file_change_pattern_repository,
                               mock_reapply_use_case,
                               sample_pattern):
    """패턴이 올바르게 업데이트되고 저장되며, 재적용이 호출되는지 확인"""
    mock_file_change_pattern_repository.find_by_id.return_value = sample_pattern
    mock_file_change_pattern_repository.save.side_effect = lambda pattern: pattern

    updated_name = "Updated Name"
    updated_regex = "updated_regex"
    updated_format = "updated_format"

    result = update_file_change_pattern_use_case.execute(
        pattern_id=sample_pattern.id,
        name=updated_name,
        regex_pattern=updated_regex,
        replacement_format=updated_format
    )

    assert result is not None
    assert result.name == updated_name
    assert result.regex_pattern == updated_regex
    assert result.replacement_format == updated_format

    mock_file_change_pattern_repository.find_by_id.assert_called_once_with(sample_pattern.id)
    mock_file_change_pattern_repository.save.assert_called_once_with(sample_pattern)
    mock_reapply_use_case.execute.assert_called_once()

def test_update_pattern_not_found(update_file_change_pattern_use_case,
                                 mock_file_change_pattern_repository,
                                 mock_reapply_use_case):
    """패턴이 존재하지 않을 때 None이 반환되는지 확인"""
    mock_file_change_pattern_repository.find_by_id.return_value = None

    result = update_file_change_pattern_use_case.execute(pattern_id=999, name="New Name")

    assert result is None
    mock_file_change_pattern_repository.find_by_id.assert_called_once_with(999)
    mock_file_change_pattern_repository.save.assert_not_called()
    mock_reapply_use_case.execute.assert_not_called()

def test_update_pattern_partial_update(update_file_change_pattern_use_case,
                                      mock_file_change_pattern_repository,
                                      mock_reapply_use_case,
                                      sample_pattern):
    """일부 필드만 업데이트 요청이 왔을 때 해당 필드만 변경되는지 확인"""
    mock_file_change_pattern_repository.find_by_id.return_value = sample_pattern
    mock_file_change_pattern_repository.save.side_effect = lambda pattern: pattern

    updated_name = "Only Name Changed"

    result = update_file_change_pattern_use_case.execute(
        pattern_id=sample_pattern.id,
        name=updated_name
    )

    assert result is not None
    assert result.name == updated_name
    assert result.regex_pattern == sample_pattern.regex_pattern # Should remain unchanged
    assert result.replacement_format == sample_pattern.replacement_format # Should remain unchanged

    mock_file_change_pattern_repository.find_by_id.assert_called_once_with(sample_pattern.id)
    mock_file_change_pattern_repository.save.assert_called_once_with(sample_pattern)
    mock_reapply_use_case.execute.assert_called_once()
