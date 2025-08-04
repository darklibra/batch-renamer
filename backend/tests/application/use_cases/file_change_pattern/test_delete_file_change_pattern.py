import pytest
from unittest.mock import MagicMock

from app.application.use_cases.file_change_pattern.delete_file_change_pattern import DeleteFileChangePatternUseCase
from app.domain.file_change_pattern.repository import FileChangePatternRepository

@pytest.fixture
def mock_file_change_pattern_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileChangePatternRepository)

@pytest.fixture
def delete_file_change_pattern_use_case(
    mock_file_change_pattern_repository
) -> DeleteFileChangePatternUseCase:
    return DeleteFileChangePatternUseCase(
        repository=mock_file_change_pattern_repository
    )

def test_delete_pattern(delete_file_change_pattern_use_case,
                        mock_file_change_pattern_repository):
    """주어진 ID로 패턴이 올바르게 삭제되는지 확인"""
    pattern_id = 1

    delete_file_change_pattern_use_case.execute(pattern_id)

    mock_file_change_pattern_repository.delete.assert_called_once_with(pattern_id)
