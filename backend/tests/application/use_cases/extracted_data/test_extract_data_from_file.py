import pytest
from app.application.use_cases.extracted_data.extract_data_from_file import ExtractDataFromFileUseCase
from app.domain.file.model import File
from app.domain.file_change_pattern.model import FileChangePattern

@pytest.fixture
def extract_data_use_case() -> ExtractDataFromFileUseCase:
    return ExtractDataFromFileUseCase()

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

def test_extract_with_named_groups(extract_data_use_case, sample_file):
    """명명된 그룹이 있는 패턴으로 데이터가 올바르게 추출되는지 확인"""
    pattern = FileChangePattern(
        id=1,
        name="Doc Pattern",
        regex_pattern=r"/path/to/docs/(?P<doc_name>\w+)\.(?P<ext>\w+)",
        replacement_pattern="",
    )
    
    extracted_data = extract_data_use_case.execute(sample_file, pattern)
    
    assert extracted_data is not None
    assert extracted_data["doc_name"] == "document"
    assert extracted_data["ext"] == "pdf"
    assert extracted_data["filename"] == "document"
    assert extracted_data["extension"] == ".pdf"
    assert extracted_data["directory"] == "/path/to/docs"
    assert extracted_data["full_path"] == "/path/to/docs/document.pdf"
    assert extracted_data["size"] == 1024

def test_extract_with_positional_groups(extract_data_use_case, sample_file):
    """위치 그룹만 있는 패턴으로 데이터가 올바르게 추출되는지 확인"""
    pattern = FileChangePattern(
        id=2,
        name="Positional Pattern",
        regex_pattern=r"/path/to/docs/(\w+)\.(\w+)",
        replacement_pattern="",
    )
    
    extracted_data = extract_data_use_case.execute(sample_file, pattern)
    
    assert extracted_data is not None
    assert extracted_data["group_0"] == "document"
    assert extracted_data["group_1"] == "pdf"
    assert extracted_data["filename"] == "document"
    assert extracted_data["extension"] == ".pdf"

def test_extract_no_match(extract_data_use_case, sample_file):
    """패턴이 파일 경로와 일치하지 않을 때 None이 반환되는지 확인"""
    pattern = FileChangePattern(
        id=3,
        name="No Match Pattern",
        regex_pattern=r"/non/matching/path/",
        replacement_pattern="",
    )
    
    extracted_data = extract_data_use_case.execute(sample_file, pattern)
    
    assert extracted_data is None

def test_extract_empty_groups(extract_data_use_case, sample_file):
    """그룹이 없는 패턴이 일치할 때 파일 속성만 반환되는지 확인"""
    pattern = FileChangePattern(
        id=4,
        name="Empty Group Pattern",
        regex_pattern=r"/path/to/docs/document.pdf",
        replacement_pattern="",
    )
    
    extracted_data = extract_data_use_case.execute(sample_file, pattern)
    
    assert extracted_data is not None
    assert "group_0" not in extracted_data
    assert "doc_name" not in extracted_data
    assert extracted_data["filename"] == "document"
    assert extracted_data["extension"] == ".pdf"
