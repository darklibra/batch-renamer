import os
from pathlib import Path
from app.services.file_service import scan_folder
from app.api.schemas import FileInfoResponse

def test_scan_folder_with_files_and_folders(tmp_path: Path):
    # 1. Arrange: Create a temporary directory structure with files
    sub_dir = tmp_path / "sub"
    sub_dir.mkdir()
    (tmp_path / "file1.txt").write_text("hello")
    (tmp_path / "file2.jpg").write_text("image")
    (sub_dir / "sub_file1.txt").write_text("world")

    # 2. Act: Call the function to be tested
    files = scan_folder(str(tmp_path))

    # 3. Assert: Verify the results
    assert len(files) == 3
    # Check if the returned objects are of the DTO type
    assert all(isinstance(f, FileInfoResponse) for f in files)
    
    # Verify the names of the files found
    file_names = {file.name for file in files}
    expected_names = {"file1.txt", "file2.jpg", "sub_file1.txt"}
    assert file_names == expected_names

def test_scan_folder_empty(tmp_path: Path):
    # 1. Arrange: An empty directory
    # 2. Act: Call the function
    files = scan_folder(str(tmp_path))

    # 3. Assert: The result should be an empty list
    assert len(files) == 0
    assert files == []