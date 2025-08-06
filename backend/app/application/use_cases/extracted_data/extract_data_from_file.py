import re
import json # Added import
from typing import Dict, Any, Optional
import unicodedata
from app.domain.file.model import File
from app.domain.file_change_pattern.model import FileChangePattern


class ExtractDataFromFileUseCase:
    def _extract_raw_values(self, file: File, match: re.Match) -> Dict[str, Any]:
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

    def _convert_value(self, value: str, data_type: str) -> Any:
        if data_type == 'd': # 정수형
            try:
                return int(value)
            except ValueError:
                return None # 변환 실패 시 None
        else: # 문자열
            return value

    def _transform_values(self, raw_values: Dict[str, Any], format_dict: Dict[str, Any], match: re.Match) -> Dict[str, Any]:
        transformed_data: Dict[str, Any] = {}
        for key, format_str in format_dict.items():
            # $그룹번호:타입$ 형식 파싱
            match_format = re.match(r"\$(\d+):([sd])\$", format_str)
            if match_format:
                group_index = int(match_format.group(1))
                data_type = match_format.group(2)
                
                if group_index < len(match.groups()):
                    transformed_data[key] = self._convert_value(match.groups()[group_index], data_type)
                else:
                    transformed_data[key] = None # 그룹 인덱스 벗어남
            else:
                # $그룹이름:타입$ 형식 파싱 (명명된 그룹)
                match_named_format = re.match(r"\$([a-zA-Z_][a-zA-Z0-9_]*):([sd])\$", format_str)
                if match_named_format:
                    group_name = match_named_format.group(1)
                    data_type = match_named_format.group(2)
                    if group_name in match.groupdict():
                        transformed_data[key] = self._convert_value(match.groupdict()[group_name], data_type)
                    else:
                        transformed_data[key] = None # 명명된 그룹 없음
                else:
                    # 일반 문자열 또는 다른 형식
                    transformed_data[key] = format_str
        return transformed_data

    def execute(
        self, file: File, pattern: FileChangePattern
    ) -> Optional[Dict[str, Any]]:
        match = re.search(pattern.regex_pattern, file.full_path)
        if match:
            raw_values = self._extract_raw_values(file, match)

            if pattern.replacement_format:
                try:
                    format_dict = json.loads(pattern.replacement_format) # Use json.loads
                    return self._transform_values(raw_values, format_dict, match)
                except json.JSONDecodeError:
                    # 유효하지 않은 JSON 형식일 경우 처리
                    return raw_values # 변환 없이 기존 추출 값 반환
            return raw_values
        return None
