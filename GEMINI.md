# GEMINI

## Guide
항상 답변은 한국어로 해주세요.
`.venv` 폴더는 제외 합니다.

## FastAPI 코딩 스타일 가이드

### 소개
이 스타일 가이드는 FastAPI 프로젝트를 개발할 때 따라야 할 코딩 규칙을 제시합니다.
대부분의 코딩은 PEP8(https://peps.python.org/pep-0008/)을 따릅니다.
이 가이드에 작성하는 내용은 PEP8과 다르거나 PEP8에 없는 내용을 추가합니다.

### 핵심원칙
- 일관성: 모든 FastAPI 프로젝트에서 동일한 스타일을 유지합니다.
- 가독성: 코드는 명확하고 이해하기 쉬워야 합니다.
- 유지보수성: 코드 변경과 확장이 용이해야 합니다.
- 표준 준수: FastAPI와 Python 커뮤니티 표준을 따릅니다.

### 디렉토리 구조
```text
project/
myapp/
├── backend/                # FastAPI 백엔드
│   ├── app/
│   │   ├── domain/
│   │   │   ├── [aggregate]/
│   │   │   │   ├── model.py
│   │   │   │   └── repository.py
│   │   ├── application/
│   │   │   ├── use_cases/
│   │   │   │   └── [use_case_name].py
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   └── [repository]_impl.py
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── interfaces/
│   │   │   ├── api/
│   │   │   │   ├── v1/
│   │   │   │   │   ├── routers/
│   │   │   │   │   ├── dtos/
│   │   │   │   │   │   └── [domain]_dtos.py
│   │   │   │   └── dependencies.py
│   │   └── main.py
│   ├── tests/
│   │   ├── domain/
│   │   │   └── test_[domain].py
│   │   ├── application/
│   │   │   └── use_cases/
│   │   │       └── test_[use_case_name].py
│   │   ├── interfaces/
│   │   │   └── api/
│   │   │       └── v1/
│   │   │           └── test_[router_name].py
│   │   ├── infrastructure/
│   │   │   └── persistence/
│   │   │       └── test_[repository]_impl.py
│   │   └── conftest.py
├── frontend/               # React 프론트엔드 (Vite 또는 CRA 등)
│   ├── public/
│   ├── src/
│   └── package.json
│
├── deploy/                 # 배포 스크립트 (Docker, nginx config 등)
│   ├── nginx.conf
│   └── Dockerfile
├── README.md

```
### 환경 분리 가이드 (Local / Dev / Stage / Prod)

#### 📌 목적

개발, 테스트, 운영 환경 간 설정 차이와 리스크를 분리하여 안전하고 일관된 서비스를 운영합니다. 각 환경은 다음과 같이 정의합니다.

| 환경    | 용도                          | 접근 대상                |
| ------- | ----------------------------- | ------------------------ |
| `local` | 개발자가 로컬에서 개발/테스트 | 개인 개발자 PC           |
| `dev`   | 개발 서버에서 통합 테스트     | 사내 개발자              |
| `stage` | 실제 운영과 유사한 사전 검증  | QA, PO, 일부 내부 사용자 |
| `prod`  | 실제 운영 서비스              | 고객 (End User)          |

#### ⚙️ 설정 관리 방식

pydantic의 BaseSettings를 활용해 환경별 설정을 구성합니다.

**📄 config/settings_base.py**
```python
from pydantic import BaseSettings

class BaseConfig(BaseSettings):
    APP_NAME: str = "GEMINI"
    DEBUG: bool = False
    DATABASE_URL: str

    class Config:
        env_file = ".env"
```

**config/settings_local.py**
```python
from .settings_base import BaseConfig

class LocalConfig(BaseConfig):
    DEBUG = True
    class Config:
        env_file = ".env.local"
```
각 환경별로 settings_dev.py, settings_stage.py, settings_prod.py 도 같은 방식으로 작성

#### 📄 .env 예시 (.env.dev, .env.prod 등)
```python
DATABASE_URL=postgresql://user:password@host:5432/gemini_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=super-secret-key
```

#### 🧠 설정 로딩 방식
```python
import os
import importlib

def get_settings():
    env = os.getenv("ENV_NAME", "local").lower()
    try:
        module_path = f"config.settings_{env}"
        module = importlib.import_module(module_path)
        config_class_name = f"{env.capitalize()}Config"
        config_class = getattr(module, config_class_name)
        return config_class()
    except (ImportError, AttributeError):
        # 기본 설정 또는 에러 처리
        from config.settings_base import BaseConfig
        return BaseConfig()

settings = get_settings()
```
.env 파일을 .gitignore로 관리하여 보안을 유지하세요.

#### 🚀 실행 시 환경 설정 예시
```shell
# 로컬에서 실행
cd backend
export ENV_NAME=local
uvicorn app.main:app --reload

# 스테이징에서 실행
cd backend
export ENV_NAME=stage
gunicorn main:app
```

### 계층 분리 (Layered Architecture)
| Layer          | 설명                                          | 역할                  |
| -------------- | --------------------------------------------- | --------------------- |
| Domain         | 비즈니스 모델, 엔티티, 값 객체, 도메인 서비스 | 순수 비즈니스 규칙    |
| Application    | 유즈케이스, 워크플로우, 트랜잭션 조정         | 도메인 조립           |
| Infrastructure | 외부 시스템과의 연동, DB, 메시지큐            | 구현 세부사항         |
| Interface      | HTTP API, FastAPI Router, Schema              | 사용자와의 인터페이스 |

#### 클래스 기반 유즈케이스
DDD 아키텍처에서 유즈케이스(UseCase)는 도메인 객체들을 orchestration(조정)하여 하나의 목적을 달성하는 애플리케이션 계층의 핵심 책임입니다.
유즈케이스는 항상 단일 책임 원칙(SRP) 을 따르며, 명시적인 입력과 출력을 갖고, 도메인과 외부 시스템을 연결하는 트랜잭션 단위로 동작해야 합니다.

##### 기본 구조
```python
# application/use_cases/issue_coupon.py

class IssueCouponUseCase:
    def __init__(self, coupon_repo: CouponRepository):
        self.coupon_repo = coupon_repo

    def execute(self, request: IssueCouponRequestDto) -> CouponIssuedResponseDto:
        coupon = Coupon.create(request.user_id, request.amount)
        self.coupon_repo.save(coupon)
        return CouponIssuedResponseDto.model_validate(coupon)
```

##### 유즈케이스 작성 원칙
| 항목        | 가이드                                         |
| ----------- | ---------------------------------------------- |
| 파일 이름   | `PascalCase + UseCase`                         |
| 클래스 이름 | `PascalCase + UseCase`                         |
| 메서드 이름 | `execute()` 또는 `__call__()`                  |
| 입력        | 명시적 `RequestDto` 사용                       |
| 출력        | `ResponseDto` 또는 단순 값 객체                |
| 의존성 주입 | 생성자 주입 방식 (`__init__`)                  |
| 도메인 호출 | 도메인 모델이나 도메인 서비스 이용             |
| 예외 처리   | 도메인 또는 애플리케이션 계층에서 처리 후 전달 |

##### `__call__` 사용 예시(함수 처럼 호출 가능)
간단한 유즈케이스에서는 `execute()` 대신 `__call__()`을 사용해 함수형 사용감을 줄 수 있습니다.

```python
class IssueCouponUseCase:
    def __init__(self, coupon_repo: CouponRepository):
        self.coupon_repo = coupon_repo

    def __call__(self, request: IssueCouponRequestDto) -> CouponIssuedResponseDto:
        ...
```

##### 의존성 주입 예시 (FastAPI 기준)

```python
# routers/coupon.py

from fastapi import APIRouter, Depends
from app.interfaces.api.v1.dtos.coupon_dtos import IssueCouponRequestDto, CouponIssuedResponseDto
from app.application.use_cases.issue_coupon import IssueCouponUseCase
from app.interfaces.api.dependencies import get_issue_coupon_use_case

router = APIRouter()

@router.post("/issue", response_model=CouponIssuedResponseDto)
def issue_coupon_handler(
    request: IssueCouponRequestDto,
    use_case: IssueCouponUseCase = Depends(get_issue_coupon_use_case)
):
    return use_case.execute(request)

# dependencies.py
from app.infrastructure.persistence.sqlalchemy_coupon_repository_impl import SqlAlchemyCouponRepositoryImpl
from app.domain.coupon.repository import CouponRepository
from app.application.use_cases.extracted_data.extract_data_from_file import ExtractDataFromFileUseCase

def get_issue_coupon_use_case(coupon_repo: CouponRepository = Depends(SqlAlchemyCouponRepositoryImpl)) -> IssueCouponUseCase:
    return IssueCouponUseCase(coupon_repo=coupon_repo)

def get_extract_data_from_file_use_case(
) -> ExtractDataFromFileUseCase:
    return ExtractDataFromFileUseCase()
```

##### 예외처리 권장 방식
```python
class IssueCouponUseCase:
    def execute(self, request: IssueCouponRequestDto) -> CouponIssuedResponseDto:
        try:
            coupon = Coupon.create(request.user_id, request.amount)
            self.coupon_repo.save(coupon)
        except InvalidAmountException as e:
            raise UseCaseException(str(e))
        return CouponIssuedResponseDto.model_validate(coupon)
```
### 예외처리

| 구분                      | 예시                           | 정의 위치                   | 설명                               |
| ------------------------- | ------------------------------ | --------------------------- | ---------------------------------- |
| `DomainException`         | `InvalidCouponAmountException` | `domain.exceptions`         | 도메인 불변조건 위반               |
| `UseCaseException`        | `CouponAlreadyIssuedException` | `application.exceptions`    | 유즈케이스 처리 중 오류            |
| `InfrastructureException` | `DatabaseConnectionException`  | `infrastructure.exceptions` | DB, 외부 API 등 외부 의존성 오류   |
| `HttpException`           | `HTTPException(400, ...)`      | `interface`                 | FastAPI 전용, 라우터에서 변환 처리 |

#### 도메인 계층 예외
```python
# domain/exceptions.py

class DomainException(Exception):
    """도메인 규칙 위반 시 발생"""
    pass

class InvalidCouponAmountException(DomainException):
    def __init__(self, amount: int):
        super().__init__(f"유효하지 않은 쿠폰 금액: {amount}")
```
#### 유즈케이스 계층 예외
```python
# application/exceptions.py

class UseCaseException(Exception):
    """UseCase 처리 중 발생하는 예외"""
    pass

class CouponAlreadyIssuedException(UseCaseException):
    def __init__(self, user_id: int):
        super().__init__(f"사용자 {user_id}는 이미 쿠폰을 발급받았습니다.")
```

**유즈케이스 내 예외 사용 예시**
```python
from application.exceptions import CouponAlreadyIssuedException

class IssueCouponUseCase:
    def execute(self, request: IssueCouponRequestDto) -> CouponIssuedResponseDto:
        if self.coupon_repo.exists_by_user(request.user_id):
            raise CouponAlreadyIssuedException(request.user_id)

        coupon = Coupon.create(request.user_id, request.amount)
        self.coupon_repo.save(coupon)
        return CouponIssuedResponseDto.model_validate(coupon)
```
#### HTTP 예외로 변환 (FastAPI 핸들러)
```python
# interfaces/exception_handler.py

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from application.exceptions import UseCaseException
from domain.exceptions import DomainException

def register_exception_handlers(app):
    @app.exception_handler(UseCaseException)
    async def use_case_exception_handler(request: Request, exc: UseCaseException):
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.exception_handler(DomainException)
    async def domain_exception_handler(request: Request, exc: DomainException):
        return JSONResponse(status_code=422, content={"detail": str(exc)})
```

### 네이밍 컨벤션
| 타입                  | 예시                              | 규칙                     |
| --------------------- | --------------------------------- | ------------------------ |
| 엔티티                | `Coupon`, `User`                  | 대문자 시작, 단수형      |
| 값 객체               | `Email`, `Money`                  | 도메인 내 의미 있는 단위 |
| 리포지토리 인터페이스 | `CouponRepository`                | 도메인에 위치            |
| 리포지토리 구현체     | `SqlAlchemyCouponRepository`      | Infrastructure에 위치    |
| 유스케이스            | `IssueCouponUseCase`              | 동사 + 명사 형태         |
| API 핸들러            | `issue_coupon_handler()`          | 유스케이스 단위로 대응   |
| Pydantic 스키마       | `CouponRequest`, `CouponResponse` | Interface 계층 전용      |

### 의존성 규칙
- 도메인은 외부에 의존하지 않는다.
  - 도메인 → Application / Interface 참조 금지
- Application은 도메인을 참조할 수 있다.
- Interface는 Application을 참조할 수 있다.
- Infrastructure는 어떤 계층이든 참조 가능하지만, 다른 계층에서 Infrastructure에 직접 의존하지 않도록 주의
- 유즈케이스는 필요한 최소한의 의존성만 주입받아야 한다. (예: `TestFilePatternUseCase`에서 불필요한 `FileChangePatternRepository` 제거)

### 유즈케이스 작성 가이드
```python
# application/use_cases/issue_coupon.py
class IssueCouponUseCase:
    def __init__(self, coupon_repo: CouponRepository):
        self.coupon_repo = coupon_repo

    def execute(self, request: IssueCouponRequestDto) -> CouponIssuedResponseDto:
        coupon = Coupon.create(request.user_id, request.amount)
        self.coupon_repo.save(coupon)
        return CouponIssuedResponseDto.model_validate(coupon)
```
### 라우터 작성 가이드

```python
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from app.interfaces.api.v1.dtos.coupon_dtos import IssueCouponRequestDto, CouponIssuedResponseDto
from app.application.use_cases.issue_coupon import IssueCouponUseCase
from app.interfaces.api.dependencies import get_issue_coupon_use_case, get_file_repository
from app.interfaces.api.v1.dtos.file_dtos import FileResponse
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/coupon/issue", response_model=CouponIssuedResponseDto)
def issue_coupon_handler(
    request: IssueCouponRequestDto,
    use_case: IssueCouponUseCase = Depends(get_issue_coupon_use_case)
):
    return use_case.execute(request)

@router.get("/files", response_model=List[FileResponse])
def get_all_files(
    file_repository: FileRepository = Depends(get_file_repository),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    _sort_field: Optional[str] = Query(None, alias="_sort"),
    _sort_order: Optional[str] = Query(None, alias="_order"),
    ids: Optional[List[int]] = Query(None),
):
    if ids:
        files = file_repository.find_by_ids(ids)
        total_count = len(files)
        response_data = [FileResponse.model_validate(f).model_dump() for f in files]
        content_range = f"files 0-{len(files) - 1}/{total_count}"
    else:
        skip = (page - 1) * per_page
        limit = per_page
        files = file_repository.find_all(
            skip=skip,
            limit=limit,
            sort_field=_sort_field,
            sort_order=_sort_order
        )
        total_count = file_repository.count_all()

        content_range_start = skip
        content_range_end = skip + len(files) - 1
        content_range = f"files {content_range_start}-{content_range_end}/{total_count}"

        response_data = [FileResponse.model_validate(f).model_dump() for f in files]

    return JSONResponse(
        content=response_data,
        headers={"Content-Range": content_range}
    )
```
#### 라우터에 포함되면 안되는 코드
| 포함된 로직          | 예시                      | 이동 대상             |
| -------------------- | ------------------------- | --------------------- |
| **유효성 검사**      | `if amount < 0:`          | DTO 또는 도메인       |
| **도메인 객체 생성** | `coupon = Coupon(...)`    | UseCase 또는 도메인   |
| **저장 처리**        | `repo.save(...)`          | UseCase               |
| **비즈니스 분기**    | `if user.is_vip:`         | UseCase               |
| **예외 처리 로직**   | `try: ... except:`        | UseCase 내부에서 처리 |
| **권한 검사**        | `if user.id != owner_id:` | UseCase               |

#### 라우터의 검증 로직을 유즈케이스로 이동하라
- 비즈니스 규칙(존재 여부, 권한 체크 등)을 라우터에서 제거하여 유즈케이스 중심의 구조를 유지
- 코드 중복 최소화 및 테스트 용이성 확보
- 유즈케이스는 "요청을 수행할 수 있는 조건인지"를 판단하고, 그 결과를 책임지도록 한다

**안티패턴: 라우터에서 책임을 떠안는 예시**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.domain.post.model import Post
from app.application.use_cases.post import GetPostUseCase, UpdatePostUseCase
from app.interfaces.api.v1.dtos.post_dtos import PostUpdateRequest
from app.interfaces.api.dependencies import get_current_user, get_db

router = APIRouter()

@router.put("/posts/{post_id}")
def update_post(
    post_id: int,
    post_in: PostUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_post = get_use_case.execute(post_id=post_id)
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    if db_post.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="게시글을 수정할 권한이 없습니다.")
    
    updated_post = update_use_case.execute(db_post=db_post, post_in=post_in)
    return updated_post
```
- ❌ 존재 유무, 권한 체크가 라우터에 있음
- ❌ 유즈케이스에 대한 캡슐화가 부족함
- ❌ 재사용과 테스트 어려움

##### 리팩터링 가이드

**라우터는 입출력만 책임진다**
```python
from fastapi import APIRouter, Depends, HTTPException
from app.application.use_cases.post import UpdatePostUseCase
from app.interfaces.api.v1.dtos.post_dtos import PostUpdateRequest, PostResponse
from app.interfaces.api.dependencies import get_current_user

router = APIRouter()

@router.put("/posts/{post_id}", response_model=PostResponse)
def update_post_handler(
    post_id: int,
    post_in: PostUpdateRequest,
    current_user: User = Depends(get_current_user),
    use_case: UpdatePostUseCase = Depends(),
):
    try:
        return use_case.execute(post_id=post_id, post_in=post_in, current_user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
```
- ✅ 유효성/권한 체크는 유즈케이스에서 수행
- ✅ 라우터는 DTO 변환 및 전달만 담당
- ✅ 유스케이스에서 발생한 예외를 라우터에서 처리

**유즈케이스에서 모든 비즈니스 조건 처리**
```python
class UpdatePostUseCase:
    def __init__(self, post_repo: PostRepository):
        self.post_repo = post_repo

    def execute(self, post_id: int, post_in: PostUpdateRequest, current_user: User) -> Post:
        post = self.post_repo.get_by_id(post_id)
        if post is None:
            raise ValueError("Post not found")
        
        if post.owner_id != current_user.id:
            raise PermissionError("게시글을 수정할 권한이 없습니다.")

        post_data = post_in.model_dump(exclude_unset=True)
        post.sqlmodel_update(post_data)
        return self.post_repo.save(post)
```

**커스텀 예외 정의 예시 (현재 프로젝트에서는 ValueError, PermissionError 사용)**
```python
# domain/exceptions.py (예시)
class DomainException(Exception):
    pass

class PostNotFoundException(DomainException):
    def __init__(self, post_id: int):
        super().__init__(f"Post with ID {post_id} not found")

class NoPermissionException(DomainException):
    def __init__(self, message: str):
        super().__init__(message)
```

**라우터에서 커스텀 예외를 변환 (현재 프로젝트에서는 HTTPException 사용)**
```python
# 라우터 핸들러 내에서 직접 처리
from fastapi import APIRouter, Depends, HTTPException
from app.application.use_cases.post import UpdatePostUseCase
from app.interfaces.api.v1.dtos.post_dtos import PostUpdateRequest, PostResponse
from app.interfaces.api.dependencies import get_current_user

router = APIRouter()

@router.put("/posts/{post_id}", response_model=PostResponse)
def update_post_handler(
    post_id: int,
    post_in: PostUpdateRequest,
    current_user: User = Depends(get_current_user),
    use_case: UpdatePostUseCase = Depends(),
):
    try:
        return use_case.execute(post_id=post_id, post_in=post_in, current_user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
```

### 테스트 전략
| 계층           | 테스트 종류       | 예시                               |
| -------------- | ----------------- | ---------------------------------- |
| Domain         | 단위 테스트       | `test_coupon_discount_logic()`     |
| Application    | 유즈케이스 테스트 | `test_issue_coupon_use_case()`     |
| Interface      | API 테스트        | `test_issue_coupon_api()`          |
| Infrastructure | 통합 테스트       | `test_coupon_repository_with_db()` |

#### 테스트 관행
| 항목                       | 권장 사항                                                                                                                                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 테스트 프레임워크          | `pytest` 사용 권장                                                                                                                                                                                                                                             |
| 이름 규칙                  | `test_<기능명>_<상황>_<예상결과>()`                                                                                                                                                                                                                            |
| 범위 제한                  | 계층 단위로 테스트 작성, 상위 계층 통합 금지                                                                                                                                                                                                                   |
| 커버리지 기준              | 도메인 로직 100%, 유즈케이스 80% 이상                                                                                                                                                                                                                          |
| 테스트 더블                | `unittest.mock`, `pytest-mock` 또는 `FakeRepository` 활용                                                                                                                                                                                                      |
| 속도                       | 1초 이상 소요 시 별도 태그 `@pytest.mark.slow`                                                                                                                                                                                                                 |
| **환경 설정**              | `pytest` 실행 시 `PYTHONPATH=.`를 사용하여 프로젝트 루트를 Python 경로에 추가해야 합니다. (예: `PYTHONPATH=. pytest`)                                                                                                                                          |
| **의존성 주입 오버라이딩** | FastAPI 애플리케이션의 의존성 주입을 테스트 환경에서 재정의할 때, `app.dependency_overrides`를 사용합니다. 특히 `get_db`와 같은 데이터베이스 세션 의존성은 테스트용 세션으로 오버라이딩해야 합니다. (예: `app.dependency_overrides[get_db] = override_get_db`) |

#### 도메인 계층 테스트 (domain/)
- 무조건 순수 함수 기반 단위 테스트
- 외부 의존성 없이 실행 가능해야 함
- 비즈니스 로직 테스트 집중

```python
def test_coupon_discount_logic():
    coupon = Coupon(id=1, amount=10000)
    discounted = coupon.apply_discount(3000)
    assert discounted.amount == 7000
```

#### 유즈케이스 테스트 (application/)
- Mock 객체로 리포지토리 주입
- 트랜잭션 흐름, 도메인 조합이 정확히 수행되는지 검증

```python
def test_issue_coupon_use_case(mocker):
    mock_repo = mocker.Mock(spec=CouponRepository)
    use_case = IssueCouponUseCase(coupon_repo=mock_repo)

    request = IssueCouponRequestDto(user_id=1, amount=10000)
    response = use_case.execute(request)

    mock_repo.save.assert_called_once()
    assert response.user_id == 1
```
#### API 테스트 (interface/api)
- `TestClient`를 사용한 실제 라우팅 테스트
- validation, 인증, 응답 스키마 확인

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_issue_coupon_api():
    response = client.post("/api/v1/coupons/issue", json={"user_id": 1, "amount": 10000})
    assert response.status_code == 200
    assert "coupon_id" in response.json()
```

#### 통합 테스트 (infrastructure/)
- 실제 DB 또는 외부 시스템 연동 확인
- pytest fixture를 통한 세팅/정리 필수

```python
import pytest
from app.infrastructure.persistence.sqlalchemy_coupon_repository_impl import SqlAlchemyCouponRepositoryImpl
from app.domain.coupon.model import Coupon

@pytest.mark.integration
def test_coupon_repository_with_db(db_session):
    repo = SqlAlchemyCouponRepositoryImpl(db=db_session)
    coupon = Coupon(id=1, amount=10000)
    repo.save(coupon)

    result = repo.get_by_id(1)
    assert result.amount == 10000
```

### 기타 스타일 가이드
- `pydantic.BaseModel`은 Interface 계층 전용
- 도메인 모델은 가능하면 불변 객체(Value Object) 지향
- 도메인 로직은 도메인 서비스 또는 엔티티 안에서 처리
- 유즈케이스는 Input/Output DTO를 명확히 구분
- `Depends(...)`는 Interface 계층 또는 FastAPI 진입점에만 사용
- **SQLModel 사용 시 주의사항**:
  - `SQLModel` 클래스는 `pydantic.BaseModel`을 상속받으므로, `SQLModel` 모델에 `BaseModel`의 `update`와 같은 메서드를 직접 정의할 경우 `F811` (재정의) 린트 오류가 발생할 수 있습니다.
  - 이를 피하려면 `SQLModel` 모델에서는 `update`와 같은 메서드를 직접 정의하지 않거나, 다른 이름으로 정의해야 합니다.
  - `SQLModel` 모델의 필드 정의 시 `Optional`과 같은 타입 힌트를 중복해서 임포트하지 않도록 주의해야 합니다. (예: `from typing import Optional`과 `from sqlmodel import Optional` 동시 사용)

#### 유즈케이스 메서드 분리

유즈케이스의 `execute` 메서드가 너무 길어지거나 여러 책임을 갖게 될 경우, 가독성과 유지보수성을 높이기 위해 역할에 따라 private 메서드로 분리하는 것을 권장합니다.

- **(예시) 파일 인덱싱 유즈케이스**
  - `_discover_files`: 파일 시스템 탐색
  - `_process_batch`: 배치 단위로 중복 확인 및 저장
  - `execute`: 전체 흐름을 조율

```python
class IndexFilesUseCase:
    def __init__(self, file_repo: FileRepository):
        self.file_repo = file_repo

    def _discover_files(self, directory_path: str) -> List[File]:
        # ... 파일 탐색 로직 ...

    def _process_batch(self, batch: List[File]) -> List[File]:
        # ... 배치 처리 로직 ...

    def execute(self, directory_path: str) -> List[File]:
        all_files = self._discover_files(directory_path)
        # ... 배치 루프 및 _process_batch 호출 ...
```

#### 대용량 데이터 처리 (배치 프로세싱)

수천 개 이상의 데이터를 한 번에 처리해야 할 경우, 메모리 사용량과 데이터베이스 부하를 줄이기 위해 **배치 처리(batch processing)** 방식을 사용합니다.

- **원칙**: 전체 데이터를 작은 묶음(batch)으로 나누어 순차적으로 처리합니다.
- **구현**: `for` 루프와 리스트 슬라이싱을 사용하여 구현할 수 있습니다.
- **크기**: 배치 크기(`BATCH_SIZE`)는 시스템 환경과 데이터의 성격에 따라 조절합니다. (예: 500 ~ 1000)

```python
BATCH_SIZE = 500

all_items = get_all_items() # 10,000개의 아이템

for i in range(0, len(all_items), BATCH_SIZE):
    batch = all_items[i:i + BATCH_SIZE]
    process_batch(batch)
```

### DTO(Data Transfer Object) 설계 가이드
DDD에서는 계층 간 의존성을 최소화하고 역할을 분리하기 위해 DTO를 명확히 정의해야 합니다. 
특히 FastAPI + DDD 구조에서는 Interface ↔ Application ↔ Domain 간의 경계를 DTO로 관리합니다

#### DTO 계층별 역할
| 위치                    | DTO 종류                | 목적                                        | 예시                                |
| ----------------------- | ----------------------- | ------------------------------------------- | ----------------------------------- |
| Interface → Application | **Request DTO**         | API 입력값을 유즈케이스로 전달              | `IssueCouponRequestDto`             |
| Application → Interface | **Response DTO**        | 유즈케이스 결과를 API 응답으로 변환         | `CouponIssuedResponseDto`           |
| Application 내부        | **Command / Query DTO** | 유즈케이스 간 내부 전송                     | `CreateUserCommand`, `GetUserQuery` |
| Domain ↔ Application    | **Domain DTO (선택적)** | 비즈니스 객체를 도메인 외부로 안전하게 추출 | `CouponDto`                         |

#### DTO 네이밍 컨벤션
- `[Domain]Request`: 클라이언트로부터 받는 입력
- `[Domain]Response`: 클라이언트에 반환되는 출력
- `[Domain]Command`, `[Domain]Query`: 유즈케이스 실행에 필요한 명령/질의 객체
- `[Domain]Dto`: 도메인 모델을 외부에서 표현할 때 (필요한 경우)

#### DTO 작성 규칙

- Pydantic 기반 정의
  - DTO는 pydantic.BaseModel을 상속
  - `model_validate` 또는 `from_attributes=True` 설정 시 도메인 객체 변환 가능
  - 유효성 검증을 통해 API 계층에서 방어

```python
# interfaces/api/v1/dtos/coupon_dtos.py
from pydantic import BaseModel, Field
from typing import List

class IssueCouponRequestDto(BaseModel):
    user_id: int = Field(..., gt=0)
    amount: int = Field(..., gt=0, description="쿠폰 금액")

class CouponIssuedResponseDto(BaseModel):
    coupon_id: int
    user_id: int
    amount: int

# interfaces/api/v1/dtos/test_dtos.py (예시)
class TestPatternRequest(BaseModel):
    file_ids: List[int]
    pattern_string: str
```

#### DTO ↔ 도메인 변환 책임
- 유즈케이스 내부에서 DTO ↔ 도메인 객체 변환 처리
- 변환 로직은 `model_validate` 또는 `from_attributes=True` 등의 static method로 관리

```python
class CouponIssuedResponseDto(BaseModel):
    ...

    @staticmethod
    def from_entity(coupon: Coupon) -> "CouponIssuedResponseDto":
        return CouponIssuedResponseDto.model_validate(coupon)
```

#### 주의사항
- DTO는 절대 도메인 객체로 사용하지 말 것
- 도메인 객체는 validation이 없어도 비즈니스 불변조건을 지켜야 함
- API 계층에서 도메인 객체를 직접 반환하지 말 것 (Pydantic + ORM 모델 혼용 금지)
- DTO에 @validator 로직을 추가해도 비즈니스 규칙이 아닌 입력 검증 수준만 처리)

### 환경 설정 (Environment Configuration)

애플리케이션은 Local, Dev, Stage, Prod의 4가지 환경으로 분리하여 운영됩니다. 각 환경은 독립적인 설정 파일을 가지며, 애플리케이션은 실행 시 현재 환경에 맞는 설정을 로드합니다.

#### 환경별 설정 파일

- `app/infrastructure/config.py`: 기본 설정 및 환경 변수 로드 로직
- `app/infrastructure/config_local.py`: 로컬 개발 환경 설정
- `app/infrastructure/config_dev.py`: 개발 환경 설정
- `app/infrastructure/config_stage.py`: 스테이징 환경 설정
- `app/infrastructure/config_prod.py`: 운영 환경 설정

#### 환경 변수

애플리케이션의 환경은 `ENV_NAME` 환경 변수를 통해 제어됩니다. `ENV_NAME` 값에 따라 로드되는 설정 파일이 달라집니다.

- `ENV_NAME=local` (기본값): 로컬 개발 환경
- `ENV_NAME=dev`: 개발 환경
- `ENV_NAME=stage`: 스테이징 환경
- `ENV_NAME=prod`: 운영 환경

#### 설정 로드 우선순위

1. `app/infrastructure/config.py`의 기본 설정
2. `ENV_NAME`에 해당하는 환경별 설정 파일 (기본 설정을 오버라이드)
3. 환경 변수 (환경별 설정 파일을 오버라이드)

#### 예시: `config.py`

```python
# app/infrastructure/config.py
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # 기본 설정
    DATABASE_URL: str = "sqlite:///./blog.db"
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

def get_settings():
    env = os.getenv("ENV_NAME", "local")
    if env == "local":
        from .config_local import LocalSettings
        return LocalSettings()
    elif env == "dev":
        from .config_dev import DevSettings
        return DevSettings()
    elif env == "stage":
        from .config_stage import StageSettings
        return StageSettings()
    elif env == "prod":
        from .config_prod import ProdSettings
        return ProdSettings()
    else:
        return Settings() # 기본 설정 반환

settings = get_settings()
```

#### 예시: `config_dev.py`

```python
# app/infrastructure/config_dev.py
from .config import Settings

class DevSettings(Settings):
    DATABASE_URL: str = "postgresql://dev_user:dev_password@dev_db:5432/dev_blog_db"
    # 개발 환경에 특화된 다른 설정들
```

#### 사용 예시

```python
# main.py 또는 다른 모듈
from app.infrastructure.config import settings

# settings.DATABASE_URL 등을 통해 환경에 맞는 설정 값 사용
```


## 기술 스택

| 기술             | 설명                     |
| ---------------- | ------------------------ |
| FastAPI          | 백엔드 웹 프레임워크     |
| React.js         | 프론트엔드 웹 프레임워크 |
| SQLModel         | ORM (SQLAlchemy 기반)    |
| SQLite           | 데이터베이스 (개발용)    |
| python-jose      | JWT 인증                 |
| python-multipart | 폼 데이터 처리           |
| email-validator  | 이메일 유효성 검사       |
| uv               | 패키지 관리자            |
| ruff             | 린터                     |
| pytest           | 테스트 프레임워크        |

### uv

#### 가상환경 생성 및 패키지 설치
uv는 기본적으로 .venv 디렉토리에 가상환경을 생성합니다.
```
uv venv
source .venv/bin/activate  # 또는 Windows: .venv\Scripts\activate
```

#### 🧹 캐시 정리
```
uv cache clean
```

## Git 커밋 메시지 작성 가이드
커밋 메시지는 한글로 작성한다.

### 기본 형식
```
<타입>[옵션]: <커밋 메시지 제목>

[본문 설명 - 선택 사항]

[이슈 트래킹 번호 - 선택 사항]
```

**예시**
```
feat(post): 게시글 생성 유즈케이스 추가

게시글 작성 시 제목, 내용, 작성자 정보를 저장합니다.
- Post 엔티티 추가
- PostRepository 인터페이스 정의
- CreatePostUseCase 구현

Closes #123
```

**커밋 타입**
| 타입       | 설명                                                   |
| ---------- | ------------------------------------------------------ |
| `feat`     | 새로운 기능 추가                                       |
| `fix`      | 버그 수정                                              |
| `refactor` | 리팩토링 (기능 변화 없이 내부 코드 개선)               |
| `chore`    | 빌드, 설정, 테스트 코드 등 변경 (유즈케이스/기능 무관) |
| `docs`     | 문서 수정                                              |
| `style`    | 코드 스타일 수정 (세미콜론, 들여쓰기 등)               |
| `test`     | 테스트 코드 추가/수정                                  |
| `perf`     | 성능 향상 관련 변경                                    |
| `ci`       | CI/CD 설정 변경                                        |
| `revert`   | 커밋 되돌리기                                          |

### 커밋 메시지 제목 작성 규칙
- 최대 50자 이내, 명령문 형태 사용 (예: Add, Fix, Remove 등)
- 마침표(.) 사용 ❌
- 첫 글자는 소문자 사용 (관례적으로 유지)
- “무엇을 왜”보다 “무엇을” 중심으로 짧고 명확하게 작성
  
⛔️ Bad
```
fix: 게시글 조회가 안 되는 문제를 고침
```

✅ Good
```
fix(post): 게시글 조회 실패 버그 수정
```
### 📚 본문 작성 가이드
- 무엇을, 왜 변경했는지 설명
- 변경 전/후 요약이 유용할 경우 사용
- 마크다운, 리스트 가능

**예시**
```
refactor(user): 인증 로직 리팩토링

- UserService에 있던 인증 로직을 AuthUseCase로 분리
- FastAPI Depends 의존성 최소화
- 단위 테스트 작성이 쉬운 구조로 변경
```

### 커밋 예시 모음
```
feat(post): 게시글 조회 유즈케이스 추가
fix(auth): 로그인 실패 시 예외 처리 수정
refactor(coupon): 쿠폰 만료 체크 로직 분리
docs: README에 실행 방법 추가
chore(db): 로컬 DB init 스크립트 추가
style: black 포맷터 적용
test(post): 게시글 삭제 유즈케이스 테스트 추가
```