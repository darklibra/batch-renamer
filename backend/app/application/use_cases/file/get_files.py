from typing import List, Optional, Tuple
from app.domain.file.model import File
from app.domain.file.repository import FileRepository

class GetFilesUseCase:
    def __init__(self, file_repository: FileRepository):
        self.file_repository = file_repository

    def execute(
        self,
        page: int = 1,
        per_page: int = 10,
        sort_field: Optional[str] = None,
        sort_order: Optional[str] = None,
        ids: Optional[List[int]] = None,
        filename: Optional[str] = None,
    ) -> Tuple[List[File], int]:
        if ids:
            files = self.file_repository.find_by_ids(ids)
            total_count = len(files)
        else:
            skip = (page - 1) * per_page
            limit = per_page
            files = self.file_repository.find_all(
                skip=skip,
                limit=limit,
                sort_field=sort_field,
                sort_order=sort_order,
                filename=filename,
            )
            total_count = self.file_repository.count_all(filename=filename)
        return files, total_count
