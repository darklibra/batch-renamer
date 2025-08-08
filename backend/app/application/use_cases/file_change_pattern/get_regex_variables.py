
import re
from typing import List, Optional
from app.domain.file_change_pattern.repository import FileChangePatternRepository
from app.application.exceptions import PatternNotFoundException

class GetRegexVariablesUseCase:
    def __init__(self, repository: FileChangePatternRepository):
        self.repository = repository

    def execute(self, regex_pattern: str) -> List[str]:
        # 정규표현식에서 그룹 이름 추출
        # 예: (?P<filename>.*?) - filename 추출
        # 예: (.*?) - 그룹 이름 없음
        # (?P<name>...) 형태의 명명된 그룹만 추출
        variables = []
        for m in re.finditer(r'\(\?P<(\w+)>.*?\)', regex_pattern):
            variables.append(m.group(1))
            
        return variables
