import os
import pytest
from pathlib import Path
from app.services.file_service import scan_folder, get_file_info, validate_directory_path
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
    file_names = {file.filename for file in files}  # Updated to use filename
    expected_names = {"file1.txt", "file2.jpg", "sub_file1.txt"}
    assert file_names == expected_names
    
    # Verify file extensions are properly extracted
    extensions = {file.extension for file in files if file.extension}
    expected_extensions = {"txt", "jpg"}
    assert extensions == expected_extensions

def test_scan_folder_empty(tmp_path: Path):
    # 1. Arrange: An empty directory
    # 2. Act: Call the function
    files = scan_folder(str(tmp_path))

    # 3. Assert: The result should be an empty list
    assert len(files) == 0
    assert files == []

def test_get_file_info(tmp_path: Path):
    # 1. Arrange: Create a test file
    test_file = tmp_path / "test.txt"
    test_file.write_text("test content")
    
    # 2. Act: Get file info
    file_info = get_file_info(str(test_file))
    
    # 3. Assert: Verify file information
    assert isinstance(file_info, FileInfoResponse)
    assert file_info.filename == "test.txt"
    assert file_info.extension == "txt"
    assert file_info.file_size == len("test content")
    assert file_info.full_path == str(test_file.resolve())

def test_get_file_info_nonexistent():
    # Test with non-existent file
    with pytest.raises(ValueError, match="Could not access file"):
        get_file_info("/nonexistent/path/file.txt")

def test_validate_directory_path(tmp_path: Path):
    # Test valid directory
    assert validate_directory_path(str(tmp_path)) == True
    
    # Test non-existent directory
    assert validate_directory_path("/nonexistent/path") == False
    
    # Test file path (not directory)
    test_file = tmp_path / "test.txt"
    test_file.write_text("test")
    assert validate_directory_path(str(test_file)) == False

def test_scan_folder_various_extensions(tmp_path: Path):
    # Create files with various extensions
    (tmp_path / "document.pdf").write_text("pdf")
    (tmp_path / "image.png").write_text("png")
    (tmp_path / "no_extension").write_text("no ext")
    
    files = scan_folder(str(tmp_path))
    
    # Group by extension
    extensions = {file.extension for file in files}
    assert "pdf" in extensions
    assert "png" in extensions
    assert "" in extensions  # No extension file
    
    # Verify file without extension
    no_ext_file = next(f for f in files if f.filename == "no_extension")
    assert no_ext_file.extension == ""