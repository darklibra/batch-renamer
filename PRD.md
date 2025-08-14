# Clear File - Product Requirements Document (PRD)

## 1. Executive Summary

### 1.1 Product Overview
**Clear File**은 다양한 파일명을 정해진 포맷으로 변경하는 파일 관리 시스템입니다. 사용자는 정규표현식 패턴을 통해 파일명에서 구조화된 정보를 추출하고, 이를 체계적으로 관리할 수 있습니다.

### 1.2 Business Objectives
- 파일명의 일관성 있는 관리 및 정리
- 파일명에서 메타데이터 자동 추출
- 패턴 기반 파일 정보 구조화
- 웹 기반 직관적 사용자 인터페이스 제공

## 2. Product Goals

### 2.1 Primary Goals
1. **파일 스캐닝 및 DB화**: 지정된 폴더의 파일들을 자동으로 스캔하여 데이터베이스에 저장
2. **패턴 기반 정보 추출**: 정규표현식을 통한 파일명에서 구조화된 데이터 추출
3. **웹 UI 제공**: React.js 기반의 직관적인 사용자 인터페이스
4. **패턴 관리**: 다양한 파일명 패턴을 등록하고 관리하는 시스템

### 2.2 Success Metrics
- 패턴 매칭 성공률 85% 이상
- 파일 처리 성능: 1000개 파일 기준 30초 이내
- 사용자 패턴 등록 성공률 95% 이상

## 3. Target Audience

### 3.1 Primary Users
- **디지털 콘텐츠 관리자**: 대량의 파일을 체계적으로 관리해야 하는 사용자
- **개발자**: 프로젝트 파일들의 네이밍 컨벤션을 관리하는 개발자
- **아카이브 관리자**: 문서나 미디어 파일을 정리하고 분류하는 담당자

### 3.2 User Personas
- **파일 정리 담당자**: 일관된 파일명 규칙이 필요한 사용자
- **데이터 분석가**: 파일명에서 메타데이터를 추출하여 분석하는 사용자

## 4. Product Features

### 4.1 Core Features

#### 4.1.1 파일 스캐닝 및 데이터베이스 관리
- **파일 인덱싱**: 지정된 폴더에서 파일을 스캔하여 DB에 저장
- **메타데이터 추출**: 파일명, 확장자, Path, FullPath를 별도 필드로 저장
- **제외 패턴**: 특정 패턴의 파일을 스캔에서 제외하는 기능

#### 4.1.2 패턴 관리 시스템
- **패턴 등록**: 정규표현식 기반 파일명 패턴 등록
- **패턴 우선순위**: 여러 패턴 적용 시 가장 많은 데이터를 추출한 패턴 사용
- **실패 관리**: 패턴 매칭 실패 파일에 대한 별도 관리 및 재시도 기능

#### 4.1.3 데이터 추출 및 변환
- **구조화된 데이터 추출**: 완결여부, 에피소드 시작일, 에피소드 종료일, 작가 정보 추출
- **JSON 형태 저장**: 추출된 정보를 JSON 포맷으로 데이터베이스에 저장
- **패턴 매핑**: `{"name": "$0:s$", "start": "$1:d$", "end": "$2:d$"}` 형태의 패턴 매핑 지원

### 4.2 Web UI Features

#### 4.2.1 파일 목록 관리
- **파일 목록 조회**: 페이징, 정렬, 필터링 기능을 포함한 파일 목록 조회
- **ID 기반 필터링**: 특정 파일 ID 목록으로 필터링 지원
- **다중 선택**: 파일 선택 팝업에서 다중 파일 선택 및 상태 유지

#### 4.2.2 패턴 테스트 시스템
- **실시간 테스트**: 패턴을 실제 파일명에 적용하여 결과 미리보기
- **테스트 페이지**: 패턴 효과를 확인할 수 있는 전용 테스트 인터페이스
- **선택 상태 유지**: 페이지 이동 및 팝업 재오픈 시 선택 상태 유지

#### 4.2.3 패턴 관리 인터페이스
- **패턴 CRUD**: 패턴 생성, 조회, 수정, 삭제 기능
- **정규표현식 편집기**: 정규표현식 작성을 도와주는 편집기
- **매핑 규칙 설정**: 추출 데이터와 필드 매핑 규칙 설정

## 5. Technical Requirements

### 5.1 Technology Stack

#### 5.1.1 Backend
- **언어**: Python
- **프레임워크**: FastAPI
- **데이터베이스**: SQLite3
- **ORM**: SQLAlchemy (추천)

#### 5.1.2 Frontend
- **프레임워크**: React.js
- **상태 관리**: Context API 또는 Redux
- **UI 라이브러리**: react-admin

#### 5.1.3 Development Tools
- **API 문서화**: FastAPI 자동 생성 Swagger
- **테스팅**: pytest (Backend), Jest (Frontend)

### 5.2 Architecture

#### 5.2.1 Database Schema
```sql
-- Files Table
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    extension TEXT,
    path TEXT NOT NULL,
    full_path TEXT UNIQUE NOT NULL,
    extracted_data JSON,
    pattern_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patterns Table
CREATE TABLE patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    regex_pattern TEXT NOT NULL,
    field_mapping JSON NOT NULL,
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5.2.2 API Endpoints
- **GET /api/files**: 파일 목록 조회 (페이징, 정렬, 필터링)
- **POST /api/files/scan**: 파일 스캔 실행
- **GET /api/patterns**: 패턴 목록 조회
- **POST /api/patterns**: 패턴 생성
- **PUT /api/patterns/{id}**: 패턴 수정
- **DELETE /api/patterns/{id}**: 패턴 삭제
- **POST /api/patterns/test**: 패턴 테스트 실행

### 5.3 Environment Configuration
- **개발 환경**: `development.env`
- **프로덕션 환경**: `production.env`
- **데이터베이스 위치**: `{product_root}/db/{env_name}.sqlite3`

## 6. User Experience

### 6.1 User Journey

#### 6.1.1 파일 스캐닝 프로세스
1. 사용자가 스캔할 폴더 경로 입력
2. 제외할 파일 패턴 설정 (선택사항)
3. 스캔 실행 버튼 클릭
4. 스캔 진행률 표시
5. 스캔 완료 후 결과 요약 표시

#### 6.1.2 패턴 관리 프로세스
1. 패턴 관리 페이지 접근
2. 새 패턴 등록 또는 기존 패턴 수정
3. 정규표현식 입력 및 필드 매핑 설정
4. 패턴 테스트 페이지에서 검증
5. 패턴 저장 및 활성화

#### 6.1.3 파일 정보 확인 프로세스
1. 파일 목록 페이지 접근
2. 필터링 및 정렬 적용
3. 특정 파일 클릭하여 상세 정보 확인
4. 추출된 JSON 데이터 확인
5. 필요시 패턴 수정 요청

### 6.2 UI/UX Guidelines
- **반응형 디자인**: 데스크톱과 태블릿 환경 지원
- **직관적 네비게이션**: 명확한 메뉴 구조
- **실시간 피드백**: 사용자 액션에 대한 즉각적인 반응
- **에러 핸들링**: 친화적인 에러 메시지 및 복구 가이드

## 7. Quality Assurance

### 7.1 Testing Strategy

#### 7.1.1 Unit Testing
- **Backend**: `extracted_data`, `file_change_pattern`, `index_files` 모듈별 유닛 테스트
- **Frontend**: 컴포넌트별 단위 테스트
- **Coverage Target**: 80% 이상

#### 7.1.2 Integration Testing
- **API 테스트**: 엔드포인트별 통합 테스트
- **데이터베이스 테스트**: CRUD 작업 검증
- **패턴 매칭 테스트**: 다양한 파일명 패턴 검증

#### 7.1.3 User Acceptance Testing
- **사용자 시나리오**: 실제 사용 케이스 기반 테스트
- **성능 테스트**: 대용량 파일 처리 성능 검증

### 7.2 Performance Requirements
- **파일 스캔 성능**: 1000개 파일 기준 30초 이내
- **패턴 매칭 성능**: 파일 1개당 100ms 이내
- **웹 페이지 로딩**: 3초 이내 초기 렌더링

## 8. Security & Compliance

### 8.1 Security Considerations
- **파일 시스템 접근 제한**: 지정된 폴더 외부 접근 방지
- **SQL 인젝션 방지**: 파라미터화된 쿼리 사용
- **정규표현식 보안**: ReDoS 공격 방지를 위한 패턴 검증

### 8.2 Data Privacy
- **로컬 데이터**: 모든 데이터를 로컬에서 처리
- **민감 정보**: 파일 내용이 아닌 파일명만 처리

## 9. Deployment & Operations

### 9.1 Deployment Strategy
- **로컬 설치**: 개발자 로컬 환경에서 직접 실행
- **Docker 컨테이너**: 간편한 배포를 위한 컨테이너화
- **환경별 설정**: 환경별 설정 파일을 통한 관리

### 9.2 Monitoring & Maintenance
- **로그 관리**: 애플리케이션 로그 및 에러 로그
- **백업 전략**: SQLite 데이터베이스 백업 계획
- **업데이트 관리**: 새로운 패턴 및 기능 업데이트 방법

## 10. Future Enhancements

### 10.1 Phase 2 Features
- **클라우드 동기화**: 여러 환경 간 패턴 동기화
- **AI 기반 패턴 추천**: 머신러닝을 통한 패턴 자동 생성
- **배치 처리**: 대용량 파일 처리를 위한 백그라운드 작업

### 10.2 Advanced Features
- **플러그인 시스템**: 사용자 정의 확장 기능
- **API 확장**: 외부 시스템 연동을 위한 REST API
- **모바일 앱**: iOS/Android 모바일 애플리케이션

## 11. Risk Assessment

### 11.1 Technical Risks
- **정규표현식 복잡성**: 복잡한 패턴으로 인한 성능 저하 위험
- **대용량 파일**: 메모리 부족으로 인한 처리 실패 위험
- **SQLite 한계**: 동시 접근 및 용량 제한 이슈

### 11.2 Mitigation Strategies
- **성능 최적화**: 패턴 캐싱 및 병렬 처리
- **메모리 관리**: 스트리밍 방식의 파일 처리
- **데이터베이스 최적화**: 인덱스 설정 및 쿼리 최적화

## 12. Success Criteria

### 12.1 Minimum Viable Product (MVP)
- [ ] 파일 스캔 및 DB 저장 기능
- [ ] 기본 패턴 등록 및 적용 기능
- [ ] 웹 UI를 통한 파일 목록 조회
- [ ] 패턴 테스트 기능

### 12.2 Launch Criteria
- [ ] 모든 핵심 기능 구현 완료
- [ ] 85% 이상의 테스트 커버리지 달성
- [ ] 사용자 문서 및 가이드 완성
- [ ] 성능 기준 충족 (1000개 파일 30초 이내)

---

**Document Version**: 1.0  
**Last Updated**: 2025-08-14  
**Next Review**: 2025-09-14