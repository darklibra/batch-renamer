import pytest
import asyncio
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.repositories.file_repository import FileRepository, ExclusionPatternRepository, IndexingJobRepository
from app.services.file_indexing_service import FileIndexingService, ExclusionPatternService
from app.models.file_models import IndexedFile

@pytest.fixture
def test_db():
    """Create in-memory SQLite database for testing"""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

@pytest.fixture
def file_repo(test_db):
    return FileRepository(test_db)

@pytest.fixture
def exclusion_repo(test_db):
    return ExclusionPatternRepository(test_db)

@pytest.fixture
def job_repo(test_db):
    return IndexingJobRepository(test_db)

@pytest.fixture
def indexing_service(file_repo, exclusion_repo, job_repo):
    return FileIndexingService(file_repo, exclusion_repo, job_repo)

@pytest.fixture
def exclusion_service(exclusion_repo):
    return ExclusionPatternService(exclusion_repo)

def test_file_repository_crud(file_repo, tmp_path: Path):
    """Test file repository CRUD operations"""
    # Create test file
    test_file = tmp_path / "test.txt"
    test_file.write_text("test content")
    
    # Create file record
    file_data = IndexedFile.from_file_path(str(test_file))
    
    created_file = file_repo.create_file(file_data)
    assert created_file.id is not None
    assert created_file.filename == "test.txt"
    assert created_file.extension == "txt"
    
    # Retrieve file
    retrieved_file = file_repo.get_file_by_id(created_file.id)
    assert retrieved_file is not None
    assert retrieved_file.filename == "test.txt"
    
    # Test bulk create
    file2 = tmp_path / "test2.py"
    file2.write_text("python content")
    file_data_list = [
        IndexedFile.from_file_path(str(file2)),
    ]
    
    bulk_created = file_repo.bulk_create_files(file_data_list)
    assert len(bulk_created) == 1
    assert bulk_created[0].extension == "py"

def test_file_repository_pagination(file_repo, tmp_path: Path):
    """Test file repository pagination"""
    # Create multiple test files
    for i in range(15):
        test_file = tmp_path / f"file_{i:02d}.txt"
        test_file.write_text(f"content {i}")
        file_data = IndexedFile.from_file_path(str(test_file))
        file_repo.create_file(file_data)
    
    # Test pagination
    result = file_repo.get_files_paginated(page=1, per_page=10)
    assert result['total'] == 15
    assert len(result['files']) == 10
    assert result['total_pages'] == 2
    
    # Test second page
    result_page2 = file_repo.get_files_paginated(page=2, per_page=10)
    assert len(result_page2['files']) == 5

def test_exclusion_pattern_service(exclusion_service):
    """Test exclusion pattern service"""
    # Create pattern
    pattern_data = {
        "name": "Python Cache",
        "pattern": "__pycache__*",
        "pattern_type": "glob",
        "description": "Exclude Python cache directories"
    }
    
    created_pattern = exclusion_service.create_exclusion_pattern(pattern_data)
    assert created_pattern["name"] == "Python Cache"
    assert created_pattern["pattern"] == "__pycache__*"
    
    # Test pattern validation - invalid regex
    with pytest.raises(ValueError, match="Invalid regex pattern"):
        exclusion_service.create_exclusion_pattern({
            "name": "Invalid Regex",
            "pattern": "[unclosed",
            "pattern_type": "regex"
        })
    
    # Test pattern
    test_result = exclusion_service.test_pattern(
        "__pycache__*",
        "glob",
        ["__pycache__/test.pyc", "regular_file.py", "__pycache__"]
    )
    
    assert test_result["total_matches"] == 2  # __pycache__ directory and file
    assert test_result["results"][0]["matches"] == True
    assert test_result["results"][1]["matches"] == False
    assert test_result["results"][2]["matches"] == True

def test_exclusion_pattern_regex(exclusion_service):
    """Test regex patterns"""
    # Create regex pattern
    pattern_data = {
        "name": "Temp Files",
        "pattern": r".*\.tmp$",
        "pattern_type": "regex",
        "description": "Exclude temporary files"
    }
    
    created_pattern = exclusion_service.create_exclusion_pattern(pattern_data)
    
    # Test regex pattern
    test_result = exclusion_service.test_pattern(
        r".*\.tmp$",
        "regex",
        ["file.tmp", "file.txt", "data.tmp", "script.py"]
    )
    
    assert test_result["total_matches"] == 2
    matches = [r["matches"] for r in test_result["results"]]
    assert matches == [True, False, True, False]

def test_indexing_job_repository(job_repo):
    """Test indexing job repository"""
    # Create job
    job_data = {
        "id": "test-job-123",
        "directory_path": "/test/path",
        "status": "started",
        "stage": "discovery"
    }
    
    created_job = job_repo.create_job(job_data)
    assert created_job.id == "test-job-123"
    assert created_job.status == "started"
    
    # Update job progress
    updated_job = job_repo.update_job_progress("test-job-123", {
        "status": "processing",
        "processed_count": 10
    })
    
    assert updated_job.status == "processing"
    assert updated_job.processed_count == 10

@pytest.mark.asyncio
async def test_file_indexing_service_start_job(indexing_service, tmp_path: Path):
    """Test starting an indexing job"""
    # Create test files
    (tmp_path / "test1.txt").write_text("content1")
    (tmp_path / "test2.py").write_text("content2")
    
    # Start indexing job
    job_id = await indexing_service.start_indexing_job(str(tmp_path))
    assert job_id is not None
    
    # Check job was created
    progress = indexing_service.get_job_progress(job_id)
    assert progress is not None
    assert progress["directory_path"] == str(tmp_path)
    assert progress["status"] == "started"

def test_file_indexing_service_exclusion_patterns(indexing_service, tmp_path: Path):
    """Test that exclusion patterns work correctly"""
    # Create test service
    service = indexing_service
    
    # Create various files
    (tmp_path / "regular.txt").write_text("regular")
    (tmp_path / ".hidden").write_text("hidden")
    (tmp_path / "__pycache__").mkdir()
    (tmp_path / "__pycache__" / "cache.pyc").write_text("cache")
    (tmp_path / "temp.tmp").write_text("temp")
    
    # Test exclusion logic
    from app.models.file_models import ExclusionPattern
    patterns = []  # Empty patterns for this test
    
    discovered_files = list(service._discover_files(str(tmp_path), patterns))
    
    # Should exclude common patterns like __pycache__ and .hidden
    filenames = [f['filename'] for f in discovered_files]
    
    # regular.txt should be included
    assert "regular.txt" in filenames
    
    # Hidden files and cache should be excluded by default
    assert ".hidden" not in filenames
    assert "cache.pyc" not in filenames

def test_indexing_service_file_metadata(tmp_path: Path):
    """Test file metadata extraction"""
    # Create test file with known content
    test_file = tmp_path / "metadata_test.txt"
    test_content = "This is test content for metadata extraction"
    test_file.write_text(test_content)
    
    # Extract metadata
    file_data = IndexedFile.from_file_path(str(test_file), str(tmp_path))
    
    assert file_data['filename'] == "metadata_test.txt"
    assert file_data['extension'] == "txt"
    assert file_data['path'] == "."  # Relative to base path
    assert file_data['file_size'] == len(test_content)
    assert file_data['last_modified'] is not None

def test_exclusion_service_pattern_crud(exclusion_service):
    """Test full CRUD operations for exclusion patterns"""
    # Create
    pattern_data = {
        "name": "Test Pattern",
        "pattern": "*.test",
        "pattern_type": "glob",
        "description": "Test pattern for testing"
    }
    
    created = exclusion_service.create_exclusion_pattern(pattern_data)
    pattern_id = created["id"]
    
    # Read
    patterns = exclusion_service.get_exclusion_patterns()
    assert len(patterns) >= 1
    assert any(p["id"] == pattern_id for p in patterns)
    
    # Update
    updated = exclusion_service.update_exclusion_pattern(pattern_id, {
        "description": "Updated description"
    })
    assert updated["description"] == "Updated description"
    
    # Delete
    success = exclusion_service.delete_exclusion_pattern(pattern_id)
    assert success == True
    
    # Verify deletion
    patterns_after = exclusion_service.get_exclusion_patterns()
    assert not any(p["id"] == pattern_id for p in patterns_after)

def test_file_stats(file_repo, tmp_path: Path):
    """Test file statistics generation"""
    # Create files of different types
    (tmp_path / "doc1.txt").write_text("text document")
    (tmp_path / "doc2.txt").write_text("another text")
    (tmp_path / "image.jpg").write_text("fake image data")
    (tmp_path / "script.py").write_text("python code")
    
    # Add files to repository
    for file_path in tmp_path.iterdir():
        if file_path.is_file():
            file_data = IndexedFile.from_file_path(str(file_path))
            file_repo.create_file(file_data)
    
    # Get stats
    stats = file_repo.get_file_stats()
    
    assert stats['total_files'] == 4
    assert stats['total_size_bytes'] > 0
    
    # Check extension distribution
    ext_counts = {ext['extension']: ext['count'] for ext in stats['extensions']}
    assert ext_counts['txt'] == 2
    assert ext_counts['jpg'] == 1
    assert ext_counts['py'] == 1