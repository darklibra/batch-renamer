from typing import List
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.domain.file.repository import FileRepository
from app.domain.extracted_data.repository import ExtractedDataRepository
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file.model import File
from app.domain.extracted_data.model import ExtractedData
import re
import json

class ApplySavedPatternUseCase:
    def __init__(
        self,
        file_change_pattern_repository: FileChangePatternRepository,
        file_repository: FileRepository,
        extracted_data_repository: ExtractedDataRepository,
    ):
        self.file_change_pattern_repository = file_change_pattern_repository
        self.file_repository = file_repository
        self.extracted_data_repository = extracted_data_repository

    def execute(self, pattern_ids: List[int], file_ids: List[int]):
        patterns = self.file_change_pattern_repository.find_by_ids(pattern_ids)
        
        if file_ids == ['all']:
            files = self.file_repository.find_all()
        else:
            files = self.file_repository.find_by_ids(file_ids)

        for file in files:
            best_pattern = None
            max_extracted_count = -1

            for pattern in patterns:
                try:
                    with open(file.full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    match = re.search(pattern.regex_pattern, content)
                    if match:
                        extracted_data_count = len(match.groups())
                        if extracted_data_count > max_extracted_count:
                            max_extracted_count = extracted_data_count
                            best_pattern = pattern
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Error processing file {file.full_path} with pattern {pattern.name}: {e}")

            if best_pattern:
                try:
                    with open(file.full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    match = re.search(best_pattern.regex_pattern, content)
                    if match:
                        extracted_values = self._extract_values(match, best_pattern.replacement_format)
                        existing_data = self.extracted_data_repository.find_by_file_and_pattern(
                            file.id,
                            best_pattern.id
                        )
                        if existing_data:
                            existing_data.extracted_values.update(extracted_values)
                            self.extracted_data_repository.update(existing_data)
                        else:
                            new_data = ExtractedData(
                                file_id=file.id,
                                pattern_id=best_pattern.id,
                                extracted_values=extracted_values
                            )
                            self.extracted_data_repository.create(new_data)
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Error applying best pattern for file {file.full_path}: {e}")

    def _extract_values(self, match, replacement_format):
        try:
            format_dict = json.loads(replacement_format)
            extracted_values = {}
            for key, value_format in format_dict.items():
                extracted_values[key] = match.expand(value_format)
            return extracted_values
        except json.JSONDecodeError:
            return {}
