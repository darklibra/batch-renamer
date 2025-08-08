
import pytest
from unittest.mock import Mock, MagicMock

# Import all models to resolve relationships before tests are run
from app.domain.file.model import File
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.extracted_data.model import ExtractedData

from app.application.use_cases.file.apply_rename_and_copy import ApplyRenameAndCopyUseCase
from app.application.exceptions import PatternNotFoundException, FileOperationException

# Resolve forward references for all models
File.model_rebuild()
FileChangePattern.model_rebuild()
ExtractedData.model_rebuild()


# 1. 성공 케이스
# 1.1. 정상적으로 파일 이름이 변경되고 지정된 경로에 복사되는 경우
def test_execute_success():
    # Given
    mock_file_repo = MagicMock()
    mock_pattern_repo = MagicMock()
    mock_extracted_data_repo = MagicMock()
    mock_file_op_service = MagicMock()

    use_case = ApplyRenameAndCopyUseCase(
        file_repository=mock_file_repo,
        file_change_pattern_repository=mock_pattern_repo,
        extracted_data_repository=mock_extracted_data_repo,
        file_operation_service=mock_file_op_service,
    )

    pattern = FileChangePattern(id=1, name="Test Pattern", regex_pattern=".*", replacement_format="{name}")
    extracted_data = [ExtractedData(id=1, file_id=101, pattern_id=1, extracted_values={"name": "test_file"})]
    file = File(id=101, filename="original.txt", full_path="/tmp/original.txt", extension="txt", extracted_info={"name": "test_file"})

    mock_pattern_repo.find_by_id.return_value = pattern
    mock_extracted_data_repo.find_by_pattern_id.return_value = extracted_data
    mock_file_repo.find_by_ids.return_value = [file]

    # When
    success, failed, details = use_case.execute(
        file_change_pattern_id=1,
        rename_pattern_string="{name}",
        destination_path="/dest"
    )

    # Then
    assert success == 1
    assert failed == 0
    mock_file_op_service.copy_file.assert_called_once_with("/tmp/original.txt", "/dest/test_file.txt")

# 2. 실패 케이스
# 2.1. 존재하지 않는 파일 변경 패턴 ID를 요청하는 경우
def test_execute_pattern_not_found():
    # Given
    mock_pattern_repo = MagicMock()
    mock_pattern_repo.find_by_id.return_value = None
    use_case = ApplyRenameAndCopyUseCase(
        file_repository=MagicMock(),
        file_change_pattern_repository=mock_pattern_repo,
        extracted_data_repository=MagicMock(),
        file_operation_service=MagicMock(),
    )

    # When / Then
    with pytest.raises(PatternNotFoundException):
        use_case.execute(1, "new_name", "/dest")

# 2.2. 패턴에 연결된 파일이 없는 경우
def test_execute_no_files_for_pattern():
    # Given
    mock_pattern_repo = MagicMock()
    mock_extracted_data_repo = MagicMock()
    
    pattern = FileChangePattern(id=1, name="Test Pattern", regex_pattern=".*", replacement_format="{name}")
    mock_pattern_repo.find_by_id.return_value = pattern
    mock_extracted_data_repo.find_by_pattern_id.return_value = [] # No extracted data

    use_case = ApplyRenameAndCopyUseCase(
        file_repository=MagicMock(),
        file_change_pattern_repository=mock_pattern_repo,
        extracted_data_repository=mock_extracted_data_repo,
        file_operation_service=MagicMock(),
    )

    # When
    success, failed, details = use_case.execute(1, "new_name", "/dest")

    # Then
    assert success == 0
    assert failed == 0
    assert details == []

# 2.3. 이름 변경 패턴에 필요한 키가 없는 경우
def test_execute_key_error_in_rename():
    # Given
    mock_file_repo = MagicMock()
    mock_pattern_repo = MagicMock()
    mock_extracted_data_repo = MagicMock()

    pattern = FileChangePattern(id=1, name="Test Pattern", regex_pattern=".*", replacement_format="{name}")
    extracted_data = [ExtractedData(id=1, file_id=101, pattern_id=1, extracted_values={"name": "test_file"})]
    file = File(id=101, filename="original.txt", full_path="/tmp/original.txt", extension="txt", extracted_info={"name": "test_file"})

    mock_pattern_repo.find_by_id.return_value = pattern
    mock_extracted_data_repo.find_by_pattern_id.return_value = extracted_data
    mock_file_repo.find_by_ids.return_value = [file]

    use_case = ApplyRenameAndCopyUseCase(
        file_repository=mock_file_repo,
        file_change_pattern_repository=mock_pattern_repo,
        extracted_data_repository=mock_extracted_data_repo,
        file_operation_service=MagicMock(),
    )

    # When
    success, failed, details = use_case.execute(1, "{missing_key}", "/dest")

    # Then
    assert success == 0
    assert failed == 1
    assert "필요한 추출된 정보 필드 누락" in details[0]["reason"]

# 2.4. 파일 복사 중 오류 발생
def test_execute_file_operation_exception():
    # Given
    mock_file_repo = MagicMock()
    mock_pattern_repo = MagicMock()
    mock_extracted_data_repo = MagicMock()
    mock_file_op_service = MagicMock()
    
    mock_file_op_service.copy_file.side_effect = FileOperationException("Permission denied")

    pattern = FileChangePattern(id=1, name="Test Pattern", regex_pattern=".*", replacement_format="{name}")
    extracted_data = [ExtractedData(id=1, file_id=101, pattern_id=1, extracted_values={"name": "test_file"})]
    file = File(id=101, filename="original.txt", full_path="/tmp/original.txt", extension="txt", extracted_info={"name": "test_file"})

    mock_pattern_repo.find_by_id.return_value = pattern
    mock_extracted_data_repo.find_by_pattern_id.return_value = extracted_data
    mock_file_repo.find_by_ids.return_value = [file]

    use_case = ApplyRenameAndCopyUseCase(
        file_repository=mock_file_repo,
        file_change_pattern_repository=mock_pattern_repo,
        extracted_data_repository=mock_extracted_data_repo,
        file_operation_service=mock_file_op_service,
    )

    # When
    success, failed, details = use_case.execute(1, "{name}", "/dest")

    # Then
    assert success == 0
    assert failed == 1
    assert "Permission denied" in details[0]["reason"]
