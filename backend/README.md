# 백엔드

이 폴더는 Clear File 프로젝트의 Python FastAPI 백엔드를 포함합니다.

## ⚙️ 요구 사항

- Python 3.10 이상
- `uv` Python 패키지 관리자

## 🚀 설치 및 설정

1.  **백엔드 디렉토리로 이동:**
    ```bash
    cd backend
    ```

2.  **가상 환경 생성 및 의존성 설치:**
    `uv sync`는 가상 환경을 생성(존재하지 않는 경우)하고 `pyproject.toml`에 나열된 의존성을 설치합니다.
    ```bash
    uv sync
    ```

3.  **개발 서버 실행:**
    이 명령은 자동 재로드(auto-reload)가 활성화된 FastAPI 서버를 시작합니다.
    ```bash
    uv run uvicorn app.main:app --reload
    ```
    API는 `http://localhost:8000`에서 사용할 수 있습니다.

## 🧪 테스트

이 프로젝트는 테스트를 위해 `pytest`를 사용합니다.

1.  **테스트 의존성 설치:**
    테스트 의존성은 `pyproject.toml`의 `[project.optional-dependencies]` 아래에 나열되어 있습니다. 다음 명령으로 설치합니다:
    ```bash
    uv sync --extra test
    ```

2.  **테스트 실행:**
    `tests/` 디렉토리의 모든 테스트를 실행하려면 다음 명령을 실행합니다:
    ```bash
    uv run pytest
    ```