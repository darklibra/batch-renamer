# Smart File Manager Frontend

현대적 React 기반 프론트엔드 - 지능형 파일 관리 및 Smart File Operations UI

[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![React Admin](https://img.shields.io/badge/React_Admin-5.10+-purple?style=flat-square)](https://marmelab.com/react-admin)
[![Material-UI](https://img.shields.io/badge/Material_UI-5+-0081CB?style=flat-square&logo=mui)](https://mui.com)
[![Vite](https://img.shields.io/badge/Vite-7+-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)

**코드베이스**: 2,000+ LoC | **컴포넌트**: 15+ UI 컴포넌트 | **상태**: Production Ready

## 🚀 핵심 기능

### 🔥 Smart File Manager (v2.1 신규)
- **템플릿 기반 파일 조작**: 메타데이터를 활용한 지능형 복사/이동 UI
- **실시간 미리보기**: 파일명 변경 결과를 사전에 확인하는 Preview 다이얼로그
- **배치 작업 모니터링**: 다중 파일 처리 실시간 진행률 및 상태 추적
- **패턴 기반 자동 선택**: 특정 패턴으로 파일을 자동 선택하는 지능형 시스템
- **충돌 해결 인터페이스**: 건너뛰기, 덮어쓰기, 자동 이름 변경 설정
- **템플릿 검증**: 실시간 파일명 템플릿 검증 및 오류 표시

### 🔍 파일 스캐닝 시스템
- **디렉토리 브라우저**: 대화형 디렉토리 선택 및 파일 스캐닝
- **스캔 설정**: 파일 타입 필터, 크기 제한, 재귀 깊이 커스터마이징
- **실시간 진행률**: 스캔 작업 중 라이브 진행률 업데이트
- **스캔 결과**: 파일 타입 요약 및 에러 상세 정보 제공

### 📊 패턴 관리 시스템
- **패턴 생성**: 정규표현식 검증 및 필드 매핑을 통한 시각적 패턴 생성
- **패턴 테스트**: 선택된 파일에 대한 패턴 테스트 및 상세 결과 표시
- **패턴 성능**: 패턴 통계 및 성능 메트릭 실시간 모니터링
- **패턴 검증**: 정규표현식 구문 및 필드 매핑 클라이언트 측 검증

### 📁 고급 파일 관리
- **파일 목록**: 메타데이터 표시를 포함한 포괄적 파일 리스팅
- **메타데이터 추출**: 적용된 패턴에서 추출된 메타데이터 시각화
- **고급 검색**: 내용, 메타데이터, 추출 상태별 파일 검색
- **배치 작업**: 대량 메타데이터 추출 및 파일 작업 지원

### 📈 대시보드 및 분석
- **시스템 개요**: 파일, 패턴, 메타데이터에 대한 실시간 통계
- **빠른 작업**: 일반적인 작업에 대한 원클릭 액세스
- **성능 메트릭**: 패턴 효율성 및 시스템 상태 모니터링

## 🏗️ 기술 스택

### 핵심 프레임워크
- **React 19** - 최신 React 기능을 활용한 현대적 프론트엔드
- **react-admin 5.10** - 관리자 인터페이스 전용 프레임워크
- **Material-UI 5** - 구글 머티리얼 디자인 컴포넌트 시스템
- **Vite 7** - 초고속 개발 서버 및 빌드 도구
- **React Router 6** - 클라이언트 측 라우팅 및 내비게이션

### 상태 관리 및 통신
- **React Admin Data Provider** - RESTful API 통합 및 데이터 관리
- **React Hooks** - 현대적 상태 관리 및 사이드 이펙트 처리
- **Fetch API** - 백엔드 API와의 비동기 통신
- **WebSocket (계획)** - 실시간 작업 상태 업데이트

### UI/UX 라이브러리
- **@mui/material** - Material Design 컴포넌트
- **@mui/icons-material** - Material Design 아이콘 세트
- **@mui/lab** - 실험적 컴포넌트 및 고급 기능

## 🏗️ 컴포넌트 아키텍처

### 핵심 컴포넌트 구조

```
frontend/src/
├── components/               # 재사용 가능한 UI 컴포넌트
│   ├── SmartFileManager.jsx          # Smart File Operations 핵심 UI (883 LoC)
│   ├── PatternBasedFileSelector.jsx  # 패턴 기반 자동 파일 선택
│   ├── FileScanner.jsx              # 파일 스캐닝 인터페이스
│   └── PatternManager.jsx           # 패턴 관리 컴포넌트
├── pages/                   # 전체 페이지 컴포넌트
│   ├── SmartFileManagerPage.jsx     # Smart File Manager 통합 페이지 (620 LoC)
│   ├── Dashboard.jsx               # 대시보드 및 시스템 개요
│   └── FileList.jsx               # 파일 목록 및 관리
├── dataProvider.js          # API 통신 및 데이터 제공자 (Smart Operations 통합)
├── App.jsx                  # 메인 애플리케이션 및 라우팅
└── utils/                   # 유틸리티 함수 및 헬퍼
```

### Smart File Manager 컴포넌트 상세

**SmartFileManager.jsx** (883 LoC)
- 템플릿 기반 파일 복사/이동 UI
- 실시간 템플릿 검증 및 미리보기
- 패턴 선택 및 메타데이터 추출 인터페이스
- 배치 작업 진행률 모니터링
- 충돌 해결 및 백업 옵션 설정

**SmartFileManagerPage.jsx** (620 LoC)
- 파일 선택 테이블 (페이징, 필터링, 검색)
- Smart File Manager 컴포넌트 통합
- 패턴 기반 자동 파일 선택
- 시스템 통계 및 대시보드
- 실시간 작업 완료 알림

## 🚀 설치 및 설정

### 필수 요구사항

- **Node.js 18+** 및 npm
- **Smart File Manager 백엔드** (포트 8000에서 실행 중)

### 1. 의존성 설치

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# 의존성 설치
npm install

# 개발 의존성 포함 설치
npm install --include=dev
```

### 2. 환경 변수 설정

`.env` 파일에서 환경 변수 구성:

```env
# 백엔드 API 기본 URL
REACT_APP_BACKEND_URL=http://localhost:8000
VITE_REACT_APP_API_BASE_URL=http://127.0.0.1:8000

# 개발 모드 설정
NODE_ENV=development
VITE_MODE=development

# API 통신 설정
VITE_API_TIMEOUT=30000
VITE_MAX_FILE_SIZE=100MB
```

### 3. 개발 서버 실행

```bash
# 개발 서버 시작 (Hot Reload 지원)
npm run dev

# 특정 포트에서 실행
npm run dev -- --port 3000

# 네트워크 액세스 허용
npm run dev -- --host 0.0.0.0
```

**서비스 접속**:
- **개발 서버**: http://localhost:5173
- **네트워크 액세스**: http://[IP]:5173

### 4. 프로덕션 빌드

```bash
# 프로덕션 빌드 생성
npm run build

# 빌드 결과 미리보기
npm run preview

# 빌드 파일 크기 분석
npm run build -- --analyze
```

빌드 결과물은 `dist/` 디렉토리에 생성됩니다.

## 📖 사용 가이드

### 🚀 Smart File Manager 워크플로우 (핵심 기능)

#### 1. 파일 선택 및 설정
1. **Smart File Manager 페이지 접속** (`/smart-file-manager`)
2. **파일 선택**: 좌측 테이블에서 체크박스로 복사/이동할 파일들 선택
3. **작업 유형 선택**: 복사(원본 유지) 또는 이동(원본 삭제) 라디오 버튼 선택
4. **패턴 선택** (선택사항): 드롭다운에서 메타데이터 추출에 사용할 패턴 선택

#### 2. 템플릿 설정 및 검증
1. **대상 디렉토리 입력**: 파일이 복사/이동될 절대 경로 입력
2. **파일명 템플릿 작성**: `{name}_{start}_{end}.{extension}` 형식으로 템플릿 입력
3. **실시간 검증**: 템플릿 유효성 검사 결과 및 샘플 출력 확인
4. **도움말 활용**: 템플릿 입력창 우측 도움말 버튼으로 예시 및 필드 확인

#### 3. 미리보기 및 실행
1. **미리보기 생성**: "Preview" 버튼으로 변경될 파일명 사전 확인
2. **결과 검토**: 미리보기 다이얼로그에서 원본 파일명 → 새 파일명 매핑 확인
3. **고급 옵션 설정**: 충돌 해결 방식, 백업 생성 여부 선택
4. **작업 시작**: "Start Copy/Move" 버튼으로 배치 작업 실행

#### 4. 실시간 모니터링
1. **진행률 추적**: 선형 진행률 바 및 퍼센티지 표시
2. **상태 모니터링**: 성공/실패 건수 실시간 업데이트
3. **작업 취소**: 필요시 "Cancel" 버튼으로 작업 중단
4. **완료 알림**: 작업 완료 시 성공 메시지 및 결과 요약 표시

### 📁 파일 스캐닝 프로세스

1. **파일 스캐너 접속** (`/scanner`)
2. **디렉토리 선택**: 디렉토리 브라우저로 스캔 위치 선택
3. **스캔 설정**: 파일 타입, 크기 제한, 재귀 깊이 설정
4. **스캔 시작**: 실시간 진행률 모니터링
5. **결과 확인**: 스캔 통계 검토 및 파일 목록으로 이동

### 🔍 패턴 관리 워크플로우

1. **패턴 관리자 접속** (`/pattern-manager`)
2. **패턴 생성**:
   - 패턴 이름 및 설명 입력
   - 파일명 매칭용 정규표현식 작성
   - JSON 형식으로 필드 매핑 정의
   - 우선순위 및 활성화 상태 설정
3. **패턴 테스트**: 테스트 파일 선택 및 패턴 효과 검증
4. **성능 모니터링**: 패턴 통계 및 성공률 확인

### 📊 대시보드 및 시스템 모니터링

1. **시스템 통계**: 총 파일 수, 메타데이터 보유 파일 수, 확장자 종류
2. **실시간 선택 현황**: 현재 선택된 파일 수 표시
3. **필터링 및 검색**: 파일명, 확장자, 메타데이터 상태별 필터링
4. **페이지네이션**: 대량 파일 효율적 탐색

## 🧪 테스트 및 개발

### 현재 테스트 상태

현재 특정 프론트엔드 테스트는 구성되어 있지 않습니다. 향후 테스트를 위해 고려할 수 있는 방법:

### 계획된 테스트 프레임워크

**단위 테스트**:
```bash
# Vitest 설정 (계획)
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# 컴포넌트 테스트 실행
npm run test

# 커버리지 포함 테스트
npm run test:coverage
```

**E2E 테스트**:
```bash
# Playwright 설정 (계획)
npm install --save-dev @playwright/test

# E2E 테스트 실행
npm run test:e2e
```

**테스트 대상 컴포넌트**:
- SmartFileManager.jsx - 파일 조작 워크플로우
- PatternBasedFileSelector.jsx - 자동 파일 선택
- SmartFileManagerPage.jsx - 통합 페이지 테스트

### 개발 도구

```bash
# ESLint 실행
npm run lint

# Prettier 코드 포맷팅
npm run format

# 타입 체크 (TypeScript 도입 시)
npm run type-check
```

## 🚀 성능 최적화

### 번들 크기 최적화
- **Vite Tree Shaking**: 사용되지 않는 코드 자동 제거
- **동적 임포트**: 라우트별 코드 분할
- **Material-UI 최적화**: 필요한 컴포넌트만 선택적 임포트

### 런타임 성능
- **React.memo**: 불필요한 리렌더링 방지
- **useMemo/useCallback**: 계산 비용이 높은 작업 메모이제이션
- **가상화**: 대량 파일 목록 효율적 렌더링

### 사용자 경험
- **로딩 상태**: 모든 비동기 작업에 로딩 인디케이터
- **에러 바운더리**: 컴포넌트 에러 우아한 처리
- **Progressive Web App**: PWA 기능 지원 (계획)

---

**Smart File Manager Frontend** - Modern React UI for Intelligent File Operations 🎨