import os
from unittest.mock import MagicMock
from typing import List
import pytest

from app.application.use_cases.index_files import IndexFilesUseCase, BATCH_SIZE
from app.domain.file.model import File
from app.domain.file.repository import FileRepository

# Mock os.walk and os.path.getsize for consistent testing
@pytest.fixture(autouse=True)
def mock_os_functions(mocker):
    mocker.patch("os.walk")
    mocker.patch("os.path.getsize")

@pytest.fixture
def mock_file_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileRepository)

@pytest.fixture
def index_files_use_case(mock_file_repository) -> IndexFilesUseCase:
    return IndexFilesUseCase(file_repository=mock_file_repository)

def _setup_mock_files(mocker, files_data: List[dict]):
    # Mock os.walk to return specified files
    walk_return_value = []
    for data in files_data:
        full_path = data["full_path"]
        root = os.path.dirname(full_path)
        filename = os.path.basename(full_path)
        # Ensure unique root for each file for simplicity in mock
        # In real os.walk, multiple files can be in the same root
        walk_return_value.append((root, [], [filename]))
    mocker.patch("os.walk", return_value=walk_return_value)

    # Mock os.path.getsize for each file
    def mock_getsize(path):
        for data in files_data:
            if data["full_path"] == path:
                return data["size"]
        raise FileNotFoundError(f"File not found: {path}")
    mocker.patch("os.path.getsize", side_effect=mock_getsize)


def test_execute_empty_directory(index_files_use_case, mock_file_repository, mocker):
    """빈 디렉토리가 주어졌을 때 파일이 저장되지 않고 빈 리스트가 반환되는지 확인"""
    _setup_mock_files(mocker, [])
    
    saved_files = index_files_use_case.execute("/test/empty_dir")

    assert saved_files == []
    mock_file_repository.find_by_paths.assert_not_called()
    mock_file_repository.save_all.assert_not_called()

def test_execute_new_files(index_files_use_case, mock_file_repository, mocker):
    """새로운 파일들이 주어졌을 때 모든 파일이 올바르게 저장되는지 확인"""
    files_data = [
        {"full_path": "/test/dir1/file1.txt", "size": 100},
        {"full_path": "/test/dir1/file2.txt", "size": 200},
    ]
    _setup_mock_files(mocker, files_data)

    # Mock find_by_paths to return no existing files
    mock_file_repository.find_by_paths.return_value = []
    # Mock save_all to return the files it was given (as if they were saved)
    mock_file_repository.save_all.side_effect = lambda files: files

    saved_files = index_files_use_case.execute("/test/dir1")

    assert len(saved_files) == 2
    assert saved_files[0].full_path == "/test/dir1/file1.txt"
    assert saved_files[1].full_path == "/test/dir1/file2.txt"
    mock_file_repository.find_by_paths.assert_called()
    mock_file_repository.save_all.assert_called_once()
    assert len(mock_file_repository.save_all.call_args[0][0]) == 2

def test_execute_existing_files(index_files_use_case, mock_file_repository, mocker):
    """이미 존재하는 파일과 새로운 파일이 섞여 있을 때, 새로운 파일만 저장되고 기존 파일은 건너뛰는지 확인"""
    files_data = [
        {"full_path": "/test/dir2/existing.txt", "size": 150},
        {"full_path": "/test/dir2/new.txt", "size": 250},
    ]
    _setup_mock_files(mocker, files_data)

    # Mock find_by_paths to return one existing file
    mock_file_repository.find_by_paths.return_value = [
        File(filename="existing", extension=".txt", directory="/test/dir2", full_path="/test/dir2/existing.txt", size=150)
    ]
    mock_file_repository.save_all.side_effect = lambda files: files

    saved_files = index_files_use_case.execute("/test/dir2")

    assert len(saved_files) == 1
    assert saved_files[0].full_path == "/test/dir2/new.txt"
    mock_file_repository.find_by_paths.assert_called()
    mock_file_repository.save_all.assert_called_once()
    assert len(mock_file_repository.save_all.call_args[0][0]) == 1
    assert mock_file_repository.save_all.call_args[0][0][0].full_path == "/test/dir2/new.txt"

def test_execute_multiple_batches(index_files_use_case, mock_file_repository, mocker):
    """BATCH_SIZE보다 많은 파일이 있을 때, 파일들이 배치 단위로 올바르게 처리되는지 확인"""
    num_files = BATCH_SIZE * 2 + 1 # 2 full batches + 1 remaining
    files_data = [
        {"full_path": f"/test/dir3/file{i}.txt", "size": 100 + i}
        for i in range(num_files)
    ]
    _setup_mock_files(mocker, files_data)

    mock_file_repository.find_by_paths.return_value = []
    mock_file_repository.save_all.side_effect = lambda files: files

    saved_files = index_files_use_case.execute("/test/dir3")

    assert len(saved_files) == num_files
    # Check that save_all was called multiple times
    assert mock_file_repository.save_all.call_count == 3 # 2 full batches + 1 partial batch
    
    # Verify the sizes of the batches passed to save_all
    calls = mock_file_repository.save_all.call_args_list
    assert len(calls[0].args[0]) == BATCH_SIZE
    assert len(calls[1].args[0]) == BATCH_SIZE
    assert len(calls[2].args[0]) == 1 # Remaining file
