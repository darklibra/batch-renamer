# Clear File

다양한 파일명을 정해진 포멧으로 변경하는 프로젝트입니다.

## 1. 핵심 기능

- **파일 인덱싱**: 지정된 디렉토리 내의 모든 파일을 스캔하여 파일명, 경로, 크기 등의 메타데이터를 데이터베이스에 저장합니다.
- **API 제공**: FastAPI를 통해 파일 인덱싱 기능을 외부에서 호출할 수 있는 REST API를 제공합니다.
- **파일명 변경 패턴 관리**: 사용자가 파일명을 특정 형태로 변경할 수 있는 패턴(정규식, 교체 형식)을 생성, 조회, 수정, 삭제할 수 있습니다.
- **패턴 테스트**: 선택된 파일에 대해 정의된 패턴이 어떻게 적용되는지 미리 테스트할 수 있습니다.

## 2. 기술 스택

- **백엔드 웹 프레임워크**: FastAPI
- **프론트엔드 프레임워크**: React
- **패키지 관리자**: uv
- **ORM**: SQLModel (SQLAlchemy 기반)
- **데이터베이스**: SQLite (로컬 환경)
- **설정 관리**: Pydantic Settings

## 3. 프로젝트 구조

이 프로젝트는 백엔드와 프론트엔드가 분리된 구조를 가집니다.

```
project/
├── backend/         # FastAPI 백엔드 애플리케이션
│   ├── app/         # FastAPI 소스 코드
│   ├── tests/       # 백엔드 테스트 코드
│   ├── .env.local   # 백엔드 로컬 환경 변수
│   └── ...
├── frontend/        # React 프론트엔드 애플리케이션
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── .env         # 프론트엔드 환경 변수 (Git에 포함되지 않음)
│   └── ...
├── db/              # SQLite 데이터베이스 파일
├── .gitignore       # Git 무시 파일 설정
├── GEMINI.md        # 프로젝트 코딩 스타일 및 가이드
├── README.md        # 프로젝트 설명 및 사용법
├── REQUIREMENTS.md  # 프로젝트 요구사항
├── requirements.txt # Python 의존성
└── uv.lock          # uv 패키지 잠금 파일
```

백엔드 애플리케이션은 계층형 아키텍처(Layered Architecture)를 따르며, 각 계층의 역할은 다음과 같습니다.

-   **Domain**: 핵심 비즈니스 로직과 엔티티를 포함합니다. (`backend/app/domain`)
-   **Application**: 유즈케이스를 정의하고 도메인 계층을 조율합니다. (`backend/app/application`)
-   **Infrastructure**: 데이터베이스, 외부 API 등 외부 시스템과의 연동을 책임집니다. (`backend/app/infrastructure`)
-   **Interface**: FastAPI 라우터, DTO 등 외부와의 상호작용을 담당합니다. (`backend/app/interfaces`)

자세한 코딩 스타일 및 아키텍처 가이드는 `GEMINI.md` 파일을 참고하세요.

## 4. 시작하기

### 4.1. 사전 요구사항

-   Python 3.8 이상
-   `uv` (Python 패키지 관리자)
-   Node.js 및 npm/yarn (프론트엔드 개발 시)

### 4.2. 설치 및 실행

1.  **저장소 복제**

    ```bash
    git clone <repository_url>
    cd clear-file
    ```

2.  **가상 환경 생성 및 활성화**

    `uv`를 사용하여 가상 환경을 생성하고 활성화합니다.

    ```bash
    uv venv
    source .venv/bin/activate
    ```

3.  **백엔드 의존성 설치 및 실행**

    백엔드 디렉토리로 이동하여 의존성을 설치하고 애플리케이션을 실행합니다. 프론트엔드와의 통신을 위해 CORS가 설정되어 있습니다.

    ```bash
    cd backend
    uv pip install -r requirements.txt
    export ENV_NAME=local
    uvicorn app.main:app --reload
    ```

    서버가 정상적으로 실행되면 `http://127.0.0.1:8000` 주소로 접속할 수 있습니다.

### 4.3. API 문서 (Swagger UI)

애플리케이션이 실행되면, 다음 URL에서 대화형 API 문서를 확인할 수 있습니다.

-   **Swagger UI**: `http://127.0.0.1:8000/docs`
-   **ReDoc**: `http://127.0.0.1:8000/redoc`

4.  **프론트엔드 설치 및 실행 (선택 사항)**

    `frontend` 디렉토리로 이동하여 React 프로젝트를 설치하고 실행합니다.

    ```bash
    cd ../frontend
    # 백엔드 URL 설정을 위한 .env 파일 생성 (Git에 포함되지 않음)
    # 예시: REACT_APP_BACKEND_URL=http://localhost:8000
    echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env
    npm install # 또는 yarn install
    npm start   # 또는 yarn start
    ```

## 5. 환경 설정

이 프로젝트는 `ENV_NAME` 환경 변수를 통해 설정을 관리합니다. (`local`, `dev`, `prod` 등)

-   **환경 변수 로드**: `backend/app/infrastructure/config.py`
-   **환경별 설정 파일**: `backend/app/infrastructure/config/`
-   **환경 변수 파일**: `backend/.env.{env_name}` (예: `backend/.env.local`)

`ENV_NAME`을 설정하지 않으면 기본값으로 `local` 환경이 사용됩니다.

## 6. 패턴 테스트 기능

패턴 테스트 기능은 사용자가 정의한 패턴(정규식)이 실제 파일에 어떻게 적용되는지 미리 확인해 볼 수 있는 도구입니다.

### 6.1. 사용 방법

1.  **패턴 입력**: 테스트할 정규식 패턴을 입력 필드에 입력합니다.
2.  **파일 선택**: "파일 선택" 버튼을 클릭하여 팝업에서 테스트할 파일을 하나 이상 선택합니다.
    *   팝업에서는 파일 목록을 검색하고 페이징하여 원하는 파일을 쉽게 찾을 수 있습니다.
    *   체크박스를 사용하여 여러 파일을 동시에 선택할 수 있습니다.
    *   선택된 파일 목록은 페이지를 이동하거나 팝업을 다시 열어도 유지됩니다.
3.  **테스트 실행**: "테스트 실행" 버튼을 클릭하면, 선택된 각 파일에 대해 입력된 패턴이 적용된 결과가 하단에 표시됩니다.

### 6.2. 기술적 구현

*   **프론트엔드**: `frontend/src/PatternTester.js` 컴포넌트에서 패턴 입력, 파일 선택 팝업 제어, 테스트 실행 로직을 담당합니다.
*   **파일 선택 팝업**: `frontend/src/FileSelectionPopup.js` 컴포넌트에서 파일 목록 조회, 다중 선택, 페이징 기능을 제공합니다.
*   **백엔드 API**: `backend/app/interfaces/api/v1/routers/files.py`의 `/files` 엔드포인트가 파일 목록 조회 및 ID 기반 필터링을 지원합니다.
*   **데이터 프로바이더**: `frontend/src/dataProvider.js`에서 `react-admin`의 데이터 요청을 백엔드 API 형식에 맞게 변환합니다.