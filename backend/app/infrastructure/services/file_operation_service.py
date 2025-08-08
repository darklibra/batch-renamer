import shutil
import os
import re
from typing import List, Tuple
from app.domain.file.model import File
from app.application.exceptions import FileOperationException

class FileOperationService:
    def _generate_new_filename(self, file: File, rename_pattern_string: str) -> str:
        def replace_func(match):
            key = match.group(1)
            return str(file.extracted_info.get(key, '[NA]'))
        
        new_filename = re.sub(r"\{(\w+)\}", replace_func, rename_pattern_string)
        return new_filename

    def rename_and_copy_files_with_details(
        self, files: List[File], rename_pattern_string: str, destination_path: str
    ) -> Tuple[int, int, List[str], List[dict]]:
        success_count = 0
        failed_count = 0
        details = []
        copied_files_info = []

        if not os.path.exists(destination_path):
            os.makedirs(destination_path)

        for file in files:
            try:
                new_filename = self._generate_new_filename(file, rename_pattern_string)
                destination_file_path = os.path.join(destination_path, new_filename)
                shutil.copy(file.full_path, destination_file_path)
                success_count += 1
                message = f"Successfully copied to {new_filename}"
                details.append(f"{file.filename}: {message}")
                copied_files_info.append({
                    'original_file_id': file.id,
                    'new_filename': new_filename,
                    'status': 'copied',
                    'message': message
                })
            except Exception as e:
                failed_count += 1
                message = f"Failed to copy: {e}"
                details.append(f"{file.filename}: {message}")
                copied_files_info.append({
                    'original_file_id': file.id,
                    'new_filename': file.filename,
                    'status': 'failed',
                    'message': message
                })
        
        return success_count, failed_count, details, copied_files_info

    def copy_file(self, source_path: str, destination_path: str) -> None:
        try:
            os.makedirs(os.path.dirname(destination_path), exist_ok=True)
            shutil.copy2(source_path, destination_path)
        except FileNotFoundError:
            raise FileOperationException(f"원본 파일을 찾을 수 없습니다: {source_path}")
        except PermissionError:
            raise FileOperationException(f"파일 복사 권한이 없습니다: {destination_path}")
        except Exception as e:
            raise FileOperationException(f"파일 복사 중 알 수 없는 오류 발생: {e}")