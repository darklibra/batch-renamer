import os
import fnmatch
from typing import List, Optional
from app.domain.file.model import File
from app.domain.file.repository import FileRepository
from app.domain.exclusion_pattern.repository import ExclusionPatternRepository

BATCH_SIZE = 500  # 한 번에 처리할 파일 수

class IndexFilesUseCase:
    def __init__(self, file_repository: FileRepository, exclusion_pattern_repository: ExclusionPatternRepository):
        self.file_repository = file_repository
        self.exclusion_pattern_repository = exclusion_pattern_repository

    def _discover_files_generator(self, directory_path: str, exclude_patterns: Optional[List[str]] = None):
        """지정된 디렉토리에서 파일을 탐색하고 File 객체를 생성하는 제너레이터입니다."""
        if exclude_patterns is None:
            exclude_patterns = []

        for root, _, filenames in os.walk(directory_path):
            for filename in filenames:
                full_path = os.path.join(root, filename)
                
                # 제외 패턴에 일치하는지 확인
                if any(fnmatch.fnmatch(full_path, pattern) for pattern in exclude_patterns):
                    continue

                try:
                    file_size = os.path.getsize(full_path)
                    base_name, extension = os.path.splitext(filename)
                    # 확장자에서 선행하는 점(.) 제거
                    if extension.startswith('.'):
                        extension = extension[1:]
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

    def execute(self, directory_path: str, exclude_patterns: Optional[List[str]] = None) -> List[File]:
        """지정된 디렉토리의 파일을 인덱싱하고 결과를 반환합니다."""
        # DB에서 활성화된 제외 패턴을 가져옵니다.
        db_exclusion_patterns = [p.pattern for p in self.exclusion_pattern_repository.find_all() if p.is_active]
        
        # API 요청으로 받은 패턴과 DB 패턴을 결합합니다.
        combined_exclusion_patterns = []
        if exclude_patterns:
            combined_exclusion_patterns.extend(exclude_patterns)
        combined_exclusion_patterns.extend(db_exclusion_patterns)

        total_saved_files = []
        batch = []
        
        for file_obj in self._discover_files_generator(directory_path, combined_exclusion_patterns):
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
