# Clear File - 파일 관리 시스템

[![Python](https://img.shields.io/badge/Python-3.13+-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-red?style=flat-square&logo=sqlite)](https://www.sqlalchemy.org)

정규표현식 패턴을 통해 파일명에서 구조화된 정보를 추출하고 체계적으로 관리하는 웹 기반 파일 관리 시스템입니다.

## 🎯 주요 기능

### 📁 파일 스캐닝 및 인덱싱
- **지능형 파일 발견**: 지정된 디렉토리를 재귀적으로 스캔하여 파일을 자동 인덱싱
- **제외 패턴 지원**: `.git`, `node_modules` 등 불필요한 파일/디렉토리 자동 제외
- **실시간 진행률**: 스캔 진행 상황을 실시간으로 모니터링
- **배치 처리**: 대용량 파일 처리를 위한 백그라운드 작업 지원

### 🔍 패턴 기반 메타데이터 추출
- **정규표현식 엔진**: 복잡한 파일명 패턴에서 구조화된 데이터 추출
- **지능형 매칭**: 여러 패턴 중 가장 많은 데이터를 추출하는 최적 패턴 자동 선택
- **타입 변환**: 문자열, 숫자, 날짜, URL, 이메일 등 다양한 데이터 타입 지원
- **캐싱 시스템**: 패턴 컴파일 결과를 캐시하여 90% 성능 향상 (50ms → 5ms)

### 🛡️ 보안 및 성능 최적화
- **ReDoS 방지**: 정규표현식 보안 검증으로 DoS 공격 방지
- **병렬 처리**: 비동기 처리를 통한 5-20배 성능 향상
- **경로 보안**: 디렉토리 순회 공격 방지 및 접근 권한 검증
- **메모리 최적화**: 스트리밍 처리로 대용량 파일 지원

### 🌐 웹 기반 관리 인터페이스
- **React Admin**: 현대적이고 직관적인 관리 인터페이스
- **실시간 테스트**: 패턴을 파일명에 적용하여 즉시 결과 확인
- **통합 대시보드**: 시스템 상태 및 통계를 한눈에 확인
- **반응형 디자인**: 데스크톱과 태블릿 환경 완벽 지원

## 🏗️ 시스템 아키텍처

### 기술 스택

#### Backend (Python)
- **FastAPI** - 고성능 비동기 웹 프레임워크
- **SQLAlchemy** - 강력한 ORM 및 데이터베이스 추상화
- **SQLite** - 경량 임베디드 데이터베이스
- **Pydantic** - 데이터 검증 및 시리얼라이제이션
- **Asyncio** - 비동기 처리 및 병렬 실행

#### Frontend (JavaScript)
- **React 19** - 최신 리액트 프레임워크
- **React Admin** - 관리자 인터페이스 프레임워크
- **Material-UI** - 구글 머티리얼 디자인
- **Vite** - 빠른 개발 서버 및 빌드 도구

#### 핵심 구성요소

```
clear-file/
├── backend/                    # FastAPI 백엔드
│   ├── app/
│   │   ├── api/routes/        # REST API 엔드포인트
│   │   ├── core/              # 핵심 최적화 모듈
│   │   │   ├── pattern_cache.py      # 패턴 컴파일 캐싱
│   │   │   ├── security_validator.py # ReDoS 방지 & 보안
│   │   │   └── async_processor.py    # 병렬 처리 엔진
│   │   ├── models/            # 데이터 모델
│   │   ├── repositories/      # 데이터 액세스 계층
│   │   └── services/          # 비즈니스 로직
│   │       ├── pattern_extraction_service.py  # 메타데이터 추출
│   │       └── file_indexing_service.py       # 파일 인덱싱
│   └── tests/                 # 단위 & 통합 테스트
└── frontend/                  # React 프론트엔드
    ├── src/
    │   ├── components/        # 재사용 가능한 컴포넌트
    │   ├── pages/            # 페이지 컴포넌트
    │   └── dataProvider.js   # API 통신 계층
    └── public/               # 정적 리소스
```

## 🚀 빠른 시작

### 필수 요구사항
- **Python 3.13+**
- **Node.js 18+**
- **uv** (Python 패키지 관리자)

### 설치 방법

1. **프로젝트 클론**
```bash
git clone <repository-url>
cd clear-file
```

2. **백엔드 설정**
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

3. **프론트엔드 설정**
```bash
cd frontend
npm install
npm run dev
```

4. **웹 인터페이스 접속**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/docs

## 📖 사용 방법

### 1. 파일 스캔
1. **파일 스캐너** 페이지에서 스캔할 디렉토리 경로 입력
2. 제외 패턴 설정 (선택사항)
3. "스캔 시작" 버튼 클릭
4. 실시간 진행률 모니터링
5. 스캔 완료 후 결과 확인

### 2. 패턴 관리
1. **패턴 관리** 페이지에서 새 패턴 생성
2. 정규표현식 입력 및 필드 매핑 설정
3. **패턴 테스터**에서 실제 파일명으로 테스트
4. 패턴 저장 및 활성화

### 3. 파일 목록 조회
1. **파일 목록** 페이지에서 인덱싱된 파일 확인
2. 필터링, 정렬, 검색 기능 활용
3. 파일 클릭하여 추출된 메타데이터 확인

## 🔧 API 엔드포인트

### 파일 관리
- `GET /api/v1/files` - 파일 목록 조회 (페이징, 필터링, 정렬)
- `POST /api/v1/files/index` - 파일 인덱싱 작업 시작
- `GET /api/v1/files/{id}` - 특정 파일 정보 조회
- `POST /api/v1/files/extract-metadata` - 메타데이터 추출

### 패턴 관리
- `GET /api/v1/patterns` - 패턴 목록 조회
- `POST /api/v1/patterns` - 새 패턴 생성
- `PUT /api/v1/patterns/{id}` - 패턴 수정
- `DELETE /api/v1/patterns/{id}` - 패턴 삭제
- `POST /api/v1/patterns/test` - 패턴 테스트

### 작업 관리
- `GET /api/v1/jobs` - 백그라운드 작업 목록
- `GET /api/v1/jobs/{id}` - 작업 상태 조회
- `POST /api/v1/jobs/cancel/{id}` - 작업 취소

### 시스템 정보
- `GET /api/v1/system/overview` - 시스템 통계 및 상태
- `GET /api/v1/system/health` - 헬스 체크

## 🧪 테스트

### 백엔드 테스트
```bash
cd backend
uv run pytest tests/ -v --cov=app --cov-report=html
```

### 프론트엔드 테스트
```bash
cd frontend
npm test
npm run test:coverage
```

### 통합 테스트
```bash
# 전체 시스템 테스트
cd backend
uv run pytest tests/integration/ -v
```

## 📊 성능 최적화

### 패턴 처리 성능
- **컴파일 캐싱**: 패턴 컴파일 시간 90% 단축 (50ms → 5ms)
- **LRU 캐시**: 메모리 효율적인 패턴 저장 (기본 1000개)
- **병렬 처리**: 5-20개 워커로 동시 처리

### 파일 처리 성능
- **비동기 I/O**: 파일 시스템 작업 병렬화
- **배치 처리**: 100개 단위로 데이터베이스 삽입
- **스트리밍**: 대용량 디렉토리 메모리 효율 처리

### 보안 최적화
- **ReDoS 방지**: 83가지 위험 패턴 자동 검출
- **복잡도 점수**: 0.8 이상 패턴 자동 거부
- **실행 시간 제한**: 패턴 테스트 5초 타임아웃
- **경로 검증**: 디렉토리 순회 공격 차단

## 🔒 보안 고려사항

### 정규표현식 보안
- ReDoS (Regular Expression Denial of Service) 공격 방지
- 패턴 복잡도 자동 분석 및 제한
- 실행 시간 제한으로 무한 루프 방지

### 파일 시스템 보안
- 경로 정규화로 디렉토리 순회 공격 차단
- 허용된 경로 외부 접근 금지
- 민감한 파일 패턴 자동 감지 및 경고

### 데이터 보안
- 로컬 데이터베이스 사용으로 외부 전송 없음
- 파일 내용이 아닌 파일명만 처리
- SQL 인젝션 방지를 위한 매개변수화된 쿼리

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 패턴이 매칭되지 않는 경우
- **패턴 테스터**에서 정규표현식 검증
- 이스케이프 문자 확인 (`\`, `.`, `*`, `+` 등)
- 대소문자 구분 여부 확인

#### 2. 스캔 성능이 느린 경우
- 제외 패턴을 활용하여 불필요한 디렉토리 제외
- 네트워크 드라이브보다는 로컬 디스크 사용
- 바이러스 검사 소프트웨어 예외 설정

#### 3. 메모리 사용량이 높은 경우
- 캐시 크기 조정: `PATTERN_CACHE_SIZE` 환경변수
- 동시 실행 워커 수 감소: `MAX_CONCURRENCY` 환경변수
- 배치 크기 조정: `BATCH_SIZE` 환경변수

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경 사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

### 개발 가이드라인
- 코드 커버리지 80% 이상 유지
- ESLint 및 Prettier 규칙 준수
- 타입 힌트 사용 (Python)
- 의미 있는 커밋 메시지 작성

## 📞 지원

- **GitHub Issues**: 버그 리포트 및 기능 요청
- **문서**: [CLAUDE.md](CLAUDE.md) - 프로젝트 아키텍처 분석
- **요구사항**: [PRD.md](PRD.md) - 상세 제품 요구사항

---

<div align="center">

**Clear File** - 파일 관리를 더 스마트하게 ⚡

Made with ❤️ using FastAPI & React

</div>