import os
from typing import List
from app.domain.file.model import File
from app.domain.file.repository import FileRepository

BATCH_SIZE = 500  # 한 번에 처리할 파일 수

class IndexFilesUseCase:
    def __init__(self, file_repository: FileRepository):
        self.file_repository = file_repository

    def _discover_files_generator(self, directory_path: str):
        """지정된 디렉토리에서 파일을 탐색하고 File 객체를 생성하는 제너레이터입니다."""
        for root, _, filenames in os.walk(directory_path):
            for filename in filenames:
                full_path = os.path.join(root, filename)
                try:
                    file_size = os.path.getsize(full_path)
                    base_name, extension = os.path.splitext(filename)
                    directory = os.path.dirname(full_path)
                    yield File(
                        filename=base_name,
                        extension=extension,
                        directory=directory,
                        full_path=full_path,
                        size=file_size,
                    )
                except OSError:
                    # 접근할 수 없는 파일은 건너뜁니다.
                    continue

    def _process_batch(self, batch_files: List[File]) -> List[File]:
        """파일 배치를 처리하여 중복되지 않은 새 파일만 DB에 저장합니다."""
        batch_paths = {file.full_path for file in batch_files}

        # DB에서 이미 존재하는 파일 경로 조회
        existing_files = self.file_repository.find_by_paths(list(batch_paths))
        existing_paths = {file.full_path for file in existing_files}

        # 중복되지 않은 파일만 필터링
        new_files_in_batch = [
            file for file in batch_files if file.full_path not in existing_paths
        ]

        if new_files_in_batch:
            return self.file_repository.save_all(new_files_in_batch)
        
        return []

    def execute(self, directory_path: str) -> List[File]:
        """지정된 디렉토리의 파일을 인덱싱하고 결과를 반환합니다."""
        total_saved_files = []
        batch = []
        
        for file_obj in self._discover_files_generator(directory_path):
            batch.append(file_obj)
            if len(batch) >= BATCH_SIZE:
                saved_batch = self._process_batch(batch)
                total_saved_files.extend(saved_batch)
                batch = []

        # 마지막 남은 배치 처리
        if batch:
            saved_batch = self._process_batch(batch)
            total_saved_files.extend(saved_batch)

        return total_saved_files
