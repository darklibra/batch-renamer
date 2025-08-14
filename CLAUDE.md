# Clear File - Project Architecture Analysis

## 🎯 Project Context

**Clear File**은 다양한 파일명을 정해진 포맷으로 변경하는 파일 관리 시스템입니다. 정규표현식 패턴을 통해 파일명에서 구조화된 정보를 추출하고, 이를 체계적으로 관리할 수 있는 웹 애플리케이션입니다.

### Technology Stack
- **Backend**: Python 3.13 + FastAPI + SQLAlchemy + SQLite3
- **Frontend**: React 19 + react-admin 5.10 + Vite 7
- **Testing**: pytest (Backend) + Jest (Frontend)
- **Development**: uv (Python package manager)

## 🏗️ Current Architecture State

### Architecture Score: **4/10** 
- **Status**: Early development prototype
- **Complexity**: 0.6 (Moderate)
- **Implementation Gap**: ~60% of PRD requirements missing

### Project Structure
```
clear-file/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/routes/      # API endpoints (minimal)
│   │   ├── models/          # Pydantic models (not DB)
│   │   ├── services/        # Business logic (basic)
│   │   └── core/            # Configuration (empty)
│   ├── tests/               # Unit tests
│   └── pyproject.toml       # Python dependencies
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   └── dataProvider.js  # API client (comprehensive)
│   └── package.json         # Node dependencies
├── PRD.md                   # Product requirements
└── REQUIREMENTS.md          # Original requirements
```

## 🚨 Critical Architecture Issues

### 1. Database Layer Missing (Critical)
**Problem**: No SQLAlchemy ORM implementation or database persistence
- Models are Pydantic schemas, not database entities
- No database connection or session management
- File metadata not persisted

**Impact**: Core functionality cannot work without data persistence

### 2. Backend-Frontend Mismatch (Critical)
**Problem**: Severe API expectations gap
- Frontend expects comprehensive REST API (`/api/v1/*`)
- Backend provides only basic file scanning (`/api/files`)
- DataProvider implements 335 LoC for non-existent endpoints

**Impact**: Frontend will fail completely on deployment

### 3. Missing Core Features (High)
**Problem**: 90% of PRD requirements not implemented
- Pattern management system missing
- Data extraction logic missing  
- File indexing not implemented
- Pattern testing not implemented

## 📊 Technical Analysis

### Backend Analysis
**Current State**:
```python
# Only implemented:
GET /api/files?path={directory_path}  # File scanning

# Missing critical endpoints:
POST /api/files/index                 # File indexing to DB
GET|POST|PUT|DELETE /api/patterns     # Pattern management
POST /api/test-pattern                # Pattern testing
POST /api/files/apply-rename-and-copy # File operations
```

**Lines of Code**: ~50 LoC (severely under-implemented)

### Frontend Analysis
**Current State**:
```javascript
// Comprehensive data provider with 15+ API methods
// React-admin setup with multiple components
// Pattern testing UI components
// File management interfaces
```

**Lines of Code**: ~800+ LoC (over-engineered for current backend)

### Database Schema Gap
**Required**: SQLite tables with SQLAlchemy models
```sql
-- Missing tables
CREATE TABLE files (...)
CREATE TABLE patterns (...)  
CREATE TABLE pattern_applications (...)
```

**Current**: No database integration at all

## 🎯 Architectural Recommendations

### Phase 1: Foundation (Priority 1) - 1-2 weeks

#### 1.1 Database Layer Implementation
```python
# Required SQLAlchemy models
from sqlalchemy import Column, Integer, String, JSON, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class File(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    extension = Column(String)
    path = Column(String, nullable=False)
    full_path = Column(String, unique=True, nullable=False)
    extracted_data = Column(JSON)
    pattern_id = Column(Integer, ForeignKey('patterns.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Pattern(Base):
    __tablename__ = "patterns"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    regex_pattern = Column(String, nullable=False)
    field_mapping = Column(JSON, nullable=False)
    priority = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

#### 1.2 Repository Pattern Implementation
```python
from abc import ABC, abstractmethod
from typing import List, Optional

class FileRepository(ABC):
    @abstractmethod
    def create(self, file_data: dict) -> File:
        pass
    
    @abstractmethod
    def find_by_path_pattern(self, pattern: str) -> List[File]:
        pass
    
    @abstractmethod
    def update_extracted_data(self, file_id: int, data: dict) -> File:
        pass

class SQLAlchemyFileRepository(FileRepository):
    def __init__(self, db_session):
        self.db = db_session
    
    def create(self, file_data: dict) -> File:
        file_obj = File(**file_data)
        self.db.add(file_obj)
        self.db.commit()
        return file_obj
```

#### 1.3 Service Layer Enhancement
```python
class PatternExtractionService:
    def __init__(self, file_repo: FileRepository, pattern_repo: PatternRepository):
        self.file_repo = file_repo
        self.pattern_repo = pattern_repo
    
    def extract_metadata(self, file_id: int) -> dict:
        """Apply all patterns to file and return best match"""
        file = self.file_repo.get_by_id(file_id)
        patterns = self.pattern_repo.get_active_patterns()
        
        best_match = None
        max_extracted_fields = 0
        
        for pattern in patterns:
            extracted = self._apply_pattern(file.filename, pattern)
            if len(extracted) > max_extracted_fields:
                max_extracted_fields = len(extracted)
                best_match = (pattern, extracted)
        
        return best_match
```

### Phase 2: API Completion (Priority 2) - 2-3 weeks

#### 2.1 Missing Endpoints Implementation
```python
# File management endpoints
@router.post("/files/index")
async def index_files(request: IndexFilesRequest, db: Session = Depends(get_db)):
    """Index files in specified directory"""
    pass

@router.get("/files", response_model=List[FileResponse])
async def list_files(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    sort_field: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    """List files with pagination and sorting"""
    pass

# Pattern management endpoints
@router.post("/patterns", response_model=PatternResponse)
async def create_pattern(pattern: CreatePatternRequest, db: Session = Depends(get_db)):
    """Create new extraction pattern"""
    pass

@router.post("/patterns/test")
async def test_pattern(request: TestPatternRequest, db: Session = Depends(get_db)):
    """Test pattern against selected files"""
    pass
```

#### 2.2 Error Handling & Validation
```python
from fastapi import HTTPException
from pydantic import BaseModel, validator
import re

class PatternRequest(BaseModel):
    name: str
    regex_pattern: str
    field_mapping: dict
    
    @validator('regex_pattern')
    def validate_regex(cls, v):
        try:
            re.compile(v)
        except re.error:
            raise ValueError('Invalid regex pattern')
        
        # Prevent ReDoS attacks
        if len(v) > 500:
            raise ValueError('Regex pattern too long')
            
        return v
    
    @validator('field_mapping')
    def validate_mapping(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Field mapping must be a dictionary')
        return v
```

### Phase 3: Architecture Improvements (Priority 3) - 1-2 weeks

#### 3.1 Dependency Injection
```python
# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Repository dependencies
def get_file_repository(db: Session = Depends(get_db)) -> FileRepository:
    return SQLAlchemyFileRepository(db)

def get_pattern_repository(db: Session = Depends(get_db)) -> PatternRepository:
    return SQLAlchemyPatternRepository(db)
```

#### 3.2 Configuration Management
```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./db/clear_file.db"
    cors_origins: List[str] = ["http://localhost:3000"]
    max_file_scan_size: int = 10000
    allowed_scan_paths: List[str] = ["/tmp", "/home"]
    
    class Config:
        env_file = ".env"

settings = Settings()
```

## 🛡️ Security Recommendations

### Path Traversal Protection
```python
from pathlib import Path

def validate_scan_path(path: str) -> bool:
    """Prevent path traversal attacks"""
    resolved_path = Path(path).resolve()
    
    # Check if path is within allowed directories
    for allowed_path in settings.allowed_scan_paths:
        if resolved_path.is_relative_to(Path(allowed_path)):
            return True
    
    return False
```

### Input Sanitization
```python
def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe processing"""
    # Remove potentially dangerous characters
    safe_chars = re.sub(r'[<>:"/\\|?*]', '_', filename)
    return safe_chars[:255]  # Limit length
```

## 📊 Quality Guidelines

### Testing Strategy
```python
# Unit tests for each layer
tests/
├── unit/
│   ├── test_repositories.py    # Repository layer tests
│   ├── test_services.py        # Business logic tests
│   └── test_models.py          # Model validation tests
├── integration/
│   ├── test_api_endpoints.py   # API integration tests
│   └── test_database.py        # Database integration tests
└── e2e/
    └── test_user_workflows.py  # End-to-end tests
```

### Code Quality Standards
- **Test Coverage**: Minimum 80% for backend
- **Type Hints**: All function signatures must have type hints
- **Documentation**: Docstrings for all public methods
- **Linting**: Use `black`, `isort`, `flake8`

### Performance Guidelines
- **Database**: Use SQLAlchemy async for I/O operations
- **Caching**: Implement Redis for pattern compilation caching
- **File Processing**: Use background tasks for large directories
- **API**: Implement pagination for all list endpoints

## 🚀 Development Workflow

### Environment Setup
```bash
# Backend setup
cd backend
uv venv
source .venv/bin/activate
uv sync

# Frontend setup  
cd frontend
npm install

# Database initialization
alembic init migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Development Commands
```bash
# Backend development
cd backend
uvicorn app.main:app --reload --port 8000

# Frontend development
cd frontend
npm run dev

# Testing
cd backend
pytest tests/
cd frontend  
npm test
```

## 📈 Migration Roadmap

### Week 1-2: Foundation
- [ ] SQLAlchemy models implementation
- [ ] Repository pattern setup
- [ ] Basic CRUD operations
- [ ] Database migrations setup

### Week 3-4: API Development
- [ ] File indexing endpoint
- [ ] Pattern management endpoints
- [ ] Pattern testing functionality
- [ ] Error handling and validation

### Week 5-6: Integration
- [ ] Frontend-backend integration
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security hardening

### Week 7-8: Production Ready
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Monitoring and logging
- [ ] Documentation completion

## 🔧 Immediate Next Steps

1. **Database Setup**: Implement SQLAlchemy models and migrations
2. **Core Services**: Build pattern extraction and file indexing services  
3. **API Completion**: Implement missing REST endpoints
4. **Frontend Integration**: Connect existing frontend to new backend APIs
5. **Testing**: Expand test coverage to 80%+

---

**Last Updated**: 2025-08-14  
**Architecture Version**: 1.0  
**Target Completion**: 6-8 weeks