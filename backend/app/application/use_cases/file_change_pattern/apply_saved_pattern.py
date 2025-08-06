from typing import List
from fastapi import HTTPException
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.domain.file.repository import FileRepository
from app.domain.extracted_data.repository import ExtractedDataRepository
from app.domain.file_change_pattern.model import FileChangePattern
from app.domain.file.model import File
from app.domain.extracted_data.model import ExtractedData
from app.application.use_cases.extracted_data.extract_data_from_file import ExtractDataFromFileUseCase
import re
import orjson

class ApplySavedPatternUseCase:
    def __init__(
        self,
        file_change_pattern_repository: FileChangePatternRepository,
        file_repository: FileRepository,
        extracted_data_repository: ExtractedDataRepository,
        extract_data_from_file_use_case: ExtractDataFromFileUseCase, # 추가
    ):
        self.file_change_pattern_repository = file_change_pattern_repository
        self.file_repository = file_repository
        self.extracted_data_repository = extracted_data_repository
        self.extract_data_from_file_use_case = extract_data_from_file_use_case # 추가

    def execute(self, pattern_ids: List[int], file_ids: List[int]):
        patterns = self.file_change_pattern_repository.find_by_ids(pattern_ids)
        
        if not patterns:
            raise HTTPException(status_code=404, detail="적용할 패턴을 찾을 수 없습니다.")

        if file_ids == ['all']:
            BATCH_SIZE = 100
            skip = 0
            while True:
                files = self.file_repository.find_all(skip=skip, limit=BATCH_SIZE)
                if not files:
                    break
                
                self._process_files(files, patterns)
                
                skip += BATCH_SIZE
        else:
            files = self.file_repository.find_by_ids(file_ids)
            self._process_files(files, patterns)

    def _process_files(self, files: List[File], patterns: List[FileChangePattern]):
        for file in files:
            best_pattern = None
            max_extracted_fields = -1
            best_extracted_values = None

            for pattern in patterns:
                extracted_values = self.extract_data_from_file_use_case.execute(file, pattern)
                if extracted_values is not None:
                    num_fields = len(extracted_values)
                    if num_fields > max_extracted_fields:
                        max_extracted_fields = num_fields
                        best_pattern = pattern
                        best_extracted_values = extracted_values

            if best_pattern and best_extracted_values:
                try:
                    # 기존 데이터 삭제
                    self.extracted_data_repository.delete_by_file_id_and_pattern_id(file.id, best_pattern.id)

                    new_data = ExtractedData(
                        file_id=file.id,
                        pattern_id=best_pattern.id,
                        extracted_values=best_extracted_values
                    )
                    self.extracted_data_repository.save(new_data)

                    # file.extracted_info 업데이트 및 저장
                    file.extracted_info = best_extracted_values
                    self.file_repository.save(file)

                except Exception as e:
                    print(f"Error applying best pattern for file {file.full_path}: {e}")
                    continue
            else:
                # 추출된 데이터가 없는 경우 실패로 기록 (선택적)
                file.extraction_failed = True
                file.extraction_failure_reason = "모든 패턴을 적용했지만 데이터를 추출하지 못했습니다."
                file.extracted_info = {} # 추출 실패 시 extracted_info 초기화
                self.file_repository.save(file)


