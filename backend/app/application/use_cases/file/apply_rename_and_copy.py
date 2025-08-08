import os
from typing import List, Dict, Any, Tuple
from app.domain.file.repository import FileRepository
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.domain.extracted_data.repository import ExtractedDataRepository
from app.infrastructure.services.file_operation_service import FileOperationService
from app.application.exceptions import (
    PatternNotFoundException,
    FileOperationException
)

class ApplyRenameAndCopyUseCase:
    def __init__(
        self,
        file_repository: FileRepository,
        file_change_pattern_repository: FileChangePatternRepository,
        extracted_data_repository: ExtractedDataRepository,
        file_operation_service: FileOperationService,
    ):
        self.file_repository = file_repository
        self.file_change_pattern_repository = file_change_pattern_repository
        self.extracted_data_repository = extracted_data_repository
        self.file_operation_service = file_operation_service

    def execute(
        self,
        file_change_pattern_id: int,
        rename_pattern_string: str,
        destination_path: str,
    ) -> Tuple[int, int, List[Dict[str, Any]]]:
        # 1. 파일 변경 패턴 조회
        file_change_pattern = self.file_change_pattern_repository.find_by_id(
            file_change_pattern_id
        )
        if not file_change_pattern:
            raise PatternNotFoundException(
                f"파일 변경 패턴을 찾을 수 없습니다: {file_change_pattern_id}"
            )

        # 2. 해당 패턴에 연결된 ExtractedData 조회
        extracted_data_list = self.extracted_data_repository.find_by_pattern_id(
            file_change_pattern_id
        )

        if not extracted_data_list:
            return 0, 0, [] # 처리할 파일이 없음

        # 3. 관련 파일 정보 가져오기
        file_ids = [ed.file_id for ed in extracted_data_list]
        files = self.file_repository.find_by_ids(file_ids)
        files_map = {file.id: file for file in files}

        success_count = 0
        failed_count = 0
        details = []

        for extracted_data in extracted_data_list:
            file = files_map.get(extracted_data.file_id)
            if not file:
                failed_count += 1
                details.append({
                    "original_path": "N/A",
                    "new_path": "N/A",
                    "status": "failed",
                    "reason": f"원본 파일을 찾을 수 없습니다: ID {extracted_data.file_id}"
                })
                continue

            original_full_path = file.full_path
            new_full_path = "N/A"
            try:
                # 4. 새 파일 이름 생성
                # extracted_info가 None일 경우 빈 딕셔너리로 대체
                extracted_info = file.extracted_info if file.extracted_info is not None else {}
                
                # rename_pattern_string에 .extension이 포함되어 있지 않으면 추가
                if not rename_pattern_string.endswith(f".{file.extension}"):
                    # 확장자를 포함한 새 파일 이름 생성
                    new_filename_base = rename_pattern_string.format(**extracted_info)
                    new_filename = f"{new_filename_base}.{file.extension}"
                else:
                    # 확장자가 이미 포함된 경우 그대로 사용
                    new_filename = rename_pattern_string.format(**extracted_info)

                # 5. 대상 경로 구성
                new_full_path = os.path.join(destination_path, new_filename)

                # 6. 파일 복사
                self.file_operation_service.copy_file(original_full_path, new_full_path)
                success_count += 1
                details.append({
                    "original_path": original_full_path,
                    "new_path": new_full_path,
                    "status": "success",
                    "reason": ""
                })
            except KeyError as e:
                failed_count += 1
                details.append({
                    "original_path": original_full_path,
                    "new_path": new_full_path,
                    "status": "failed",
                    "reason": f"이름 변경 패턴에 필요한 추출된 정보 필드 누락: {e}"
                })
            except FileOperationException as e:
                failed_count += 1
                details.append({
                    "original_path": original_full_path,
                    "new_path": new_full_path,
                    "status": "failed",
                    "reason": str(e)
                })
            except Exception as e:
                failed_count += 1
                details.append({
                    "original_path": original_full_path,
                    "new_path": new_full_path,
                    "status": "failed",
                    "reason": f"알 수 없는 오류 발생: {e}"
                })
        
        return success_count, failed_count, details
