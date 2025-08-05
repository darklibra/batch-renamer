import re
from typing import Dict, Any, Optional
from app.domain.file.model import File
from app.domain.file_change_pattern.model import FileChangePattern


class ExtractDataFromFileUseCase:
    def execute(
        self, file: File, pattern: FileChangePattern
    ) -> Optional[Dict[str, Any]]:
        match = re.search(pattern.regex_pattern, file.full_path)
        if match:
            extracted_values: Dict[str, Any] = {}

            # 1. 정규식의 명명된 그룹 추출
            if match.groupdict():
                extracted_values.update(match.groupdict())
            else:
                # 2. 명명된 그룹이 없는 경우 위치 그룹 추출
                for i, value in enumerate(match.groups()):
                    extracted_values[f"group_{i}"] = value

            # 3. 파일 자체의 속성 추가
            extracted_values["filename"] = file.filename
            extracted_values["extension"] = file.extension
            extracted_values["directory"] = file.directory
            extracted_values["full_path"] = file.full_path
            extracted_values["size"] = file.size

            return extracted_values
        return None
