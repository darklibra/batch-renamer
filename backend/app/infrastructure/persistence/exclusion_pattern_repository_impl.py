from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.sql import func
from app.domain.exclusion_pattern.model import ExclusionPattern
from app.domain.exclusion_pattern.repository import ExclusionPatternRepository

class ExclusionPatternRepositoryImpl(ExclusionPatternRepository):
    def __init__(self, session: Session):
        self.session = session

    def save(self, pattern: ExclusionPattern) -> ExclusionPattern:
        self.session.add(pattern)
        self.session.commit()
        self.session.refresh(pattern)
        return pattern

    def find_by_id(self, pattern_id: int) -> Optional[ExclusionPattern]:
        return self.session.get(ExclusionPattern, pattern_id)

    def find_all(self, skip: int = 0, limit: int = 10) -> List[ExclusionPattern]:
        statement = select(ExclusionPattern).offset(skip).limit(limit)
        return self.session.exec(statement).all()

    def count_all(self) -> int:
        statement = select(func.count(ExclusionPattern.id))
        return self.session.exec(statement).one()

    def delete(self, pattern_id: int) -> None:
        pattern = self.session.get(ExclusionPattern, pattern_id)
        if pattern:
            self.session.delete(pattern)
            self.session.commit()
