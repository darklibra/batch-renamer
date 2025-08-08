import pytest
from unittest.mock import MagicMock
from typing import List

from app.application.use_cases.extracted_data.apply_patterns_to_specific_file import ApplyPatternsToSpecificFileUseCase
from app.application.use_cases.extracted_data.apply_patterns_to_file import ApplyPatternsToFileUseCase
from app.domain.file.model import File
from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.domain.extracted_data.model import ExtractedData
from app.application.exceptions import FileNotFoundException, PatternNotFoundException, FileProcessingException

@pytest.fixture
def mock_file_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileRepository)

@pytest.fixture
def mock_file_change_pattern_repository(mocker) -> MagicMock:
    return mocker.MagicMock(spec=FileChangePatternRepository)

@pytest.fixture
def mock_apply_patterns_to_file_use_case(mocker) -> MagicMock:
    return mocker.MagicMock(spec=ApplyPatternsToFileUseCase)

@pytest.fixture
def apply_patterns_to_specific_file_use_case(
    mock_file_repository,
    mock_file_change_pattern_repository,
    mock_apply_patterns_to_file_use_case
) -> ApplyPatternsToSpecificFileUseCase:
    return ApplyPatternsToSpecificFileUseCase(
        file_repository=mock_file_repository,
        file_change_pattern_repository=mock_file_change_pattern_repository,
        apply_patterns_to_file_use_case=mock_apply_patterns_to_file_use_case
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
        extracted_info={}, # extracted_info 초기화
        extraction_failed=False, # 초기 상태는 실패 아님
        extraction_failure_reason=None
    )

@pytest.fixture
def sample_patterns() -> List[FileChangePattern]:
    return [
        FileChangePattern(id=1, name="Pattern A", regex_pattern="", replacement_format=""),
        FileChangePattern(id=2, name="Pattern B", regex_pattern="", replacement_format=""),
    ]

def test_execute_success(apply_patterns_to_specific_file_use_case,
                         mock_file_repository,
                         mock_file_change_pattern_repository,
                         mock_apply_patterns_to_file_use_case,
                         sample_file, sample_patterns):
    """파일과 패턴이 모두 존재하고 추출 성공 시 올바른 데이터 반환 및 파일 상태 초기화 확인"""
    mock_file_repository.find_by_id.return_value = sample_file
    mock_file_change_pattern_repository.find_all.return_value = sample_patterns
    
    mock_extracted_data = ExtractedData(file_id=sample_file.id, pattern_id=1, extracted_values={"key": "value"})
    mock_apply_patterns_to_file_use_case.execute.return_value = mock_extracted_data
    mock_file_repository.save.side_effect = lambda x: x # Mock save to update the file object

    result = apply_patterns_to_specific_file_use_case.execute(sample_file.id)

    assert result == sample_file # 이제 File 객체를 반환
    mock_file_repository.find_by_id.assert_called_once_with(sample_file.id)
    mock_file_change_pattern_repository.find_all.assert_called_once()
    mock_apply_patterns_to_file_use_case.execute.assert_called_once_with(sample_file, sample_patterns)
    mock_file_repository.save.assert_called_once_with(sample_file)
    assert not sample_file.extraction_failed
    assert sample_file.extraction_failure_reason is None

def test_execute_file_not_found(apply_patterns_to_specific_file_use_case,
                                mock_file_repository):
    """파일이 존재하지 않을 때 FileNotFoundException이 발생하는지 확인"""
    mock_file_repository.find_by_id.return_value = None

    with pytest.raises(FileNotFoundException) as excinfo:
        apply_patterns_to_specific_file_use_case.execute(999)

    assert "파일을 찾을 수 없습니다: 999" in str(excinfo.value)
    mock_file_repository.find_by_id.assert_called_once_with(999)

def test_execute_no_patterns(apply_patterns_to_specific_file_use_case,
                             mock_file_repository,
                             mock_file_change_pattern_repository,
                             sample_file):
    """패턴이 존재하지 않을 때 PatternNotFoundException이 발생하는지 확인"""
    mock_file_repository.find_by_id.return_value = sample_file
    mock_file_change_pattern_repository.find_all.return_value = []

    with pytest.raises(PatternNotFoundException) as excinfo:
        apply_patterns_to_specific_file_use_case.execute(sample_file.id)

    assert "적용할 패턴이 없습니다." in str(excinfo.value)
    mock_file_repository.find_by_id.assert_called_once_with(sample_file.id)
    mock_file_change_pattern_repository.find_all.assert_called_once()

def test_execute_apply_patterns_fails(apply_patterns_to_specific_file_use_case,
                                     mock_file_repository,
                                     mock_file_change_pattern_repository,
                                     mock_apply_patterns_to_file_use_case,
                                     sample_file, sample_patterns):
    """패턴 적용이 실패했을 때 FileProcessingException이 발생하는지 확인"""
    mock_file_repository.find_by_id.return_value = sample_file
    mock_file_change_pattern_repository.find_all.return_value = sample_patterns
    mock_apply_patterns_to_file_use_case.execute.return_value = None
    mock_file_repository.save.side_effect = lambda x: x # Mock save to update the file object

    with pytest.raises(FileProcessingException) as excinfo:
        apply_patterns_to_specific_file_use_case.execute(sample_file.id)

    assert "파일에서 데이터를 추출하지 못했습니다." in str(excinfo.value)
    mock_file_repository.find_by_id.assert_called_once_with(sample_file.id)
    mock_file_change_pattern_repository.find_all.assert_called_once()
    mock_apply_patterns_to_file_use_case.execute.assert_called_once_with(sample_file, sample_patterns)
    mock_file_repository.save.assert_called_once() # 추출 실패 시에도 파일 상태 업데이트를 위해 save 호출
    assert sample_file.extraction_failed is True
    assert sample_file.extraction_failure_reason == "모든 패턴을 적용했지만 데이터를 추출하지 못했습니다."
