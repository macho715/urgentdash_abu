# PLAN_DOC — urgentdash 실시간 검증 데이터 갱신 (A~K + ㅋ)

> project-plan v1.0.0. Input: UPGRADE_REPORT.md (Current State, Best 3, Evidence).  
> 자동 코드/커밋/배포 금지. 문서만.

---

## A. Executive Summary

- **목표:** "실시간 검증 데이터" 문구와 일치하도록, 데이터를 JSON 소스로 분리하고 프론트에서 fetch + 15분 폴링으로 주기 갱신 가능하게 한다.
- **비즈니스/제품 KPI:** (1) 데이터 갱신 시 재배포 없이 JSON만 교체 가능, (2) 15분 내 1회 이상 갱신 시도, (3) fetch 실패 시 fallback으로 기존 UX 유지, (4) LCP/CLS 변화 없음, (5) "마지막 갱신" 시각 표시.
- **범위:** In-scope — Best 3 #1(JSON 분리+fetch), #2(JSON+폴링), #7(fallback), #9(README). Out-of-scope — Best 3 #3(Vercel /api)는 90일 옵션, WebSocket/DB/인증/빌드 파이프라인.
- **핵심 결정 3개:** (1) 데이터 소스를 `data/dashboard.json` 단일 파일로 분리하고 런타임 fetch, (2) 폴링 간격 15분 + unmount 시 cleanup, (3) 에러 시 인라인 상수 fallback 유지.
- **30/60/90일:** 30일 — JSON 생성 + fetch + fallback + README. 60일 — 15분 폴링 + "마지막 갱신" UI. 90일 — (선택) /api 도입.

---

## B. Context & Requirements (PRD-lite)

### B1. 문제정의
- **현재 문제:** INTEL_FEED, INDICATORS, HYPOTHESES, ROUTES, CHECKLIST가 전부 `index.html` 인라인 상수. 배포 후 데이터 갱신 불가; "실시간 검증 데이터" 문구와 불일치.
- **증거:** Current State Snapshot — 데이터 전부 인라인, 갱신은 시계/카운트다운만 1초.
- **왜 지금:** 사용자 기대(주기 갱신) 충족, 데이터 소스 단일화로 운영 부담 감소.

### B2. 사용자/페르소나
- **Primary:** 아부다비 거주자/관리자 — 대시보드를 열어 Intel/Indicators/Routes/Checklist를 주기적으로 확인.
- **Secondary:** 운영자 — JSON만 수정해 재배포 없이 내용 갱신하고 싶은 사람.

### B3. 사용자 시나리오
- **Story 1:** 사용자가 대시보드를 연다 → 최신 데이터가 로드되고, 15분마다 자동 갱신된다.
- **Story 2:** fetch 실패(네트워크/404) 시 기존 상수 데이터로 폴백되어 화면이 빈 상태로 두지 않는다.
- **Story 3:** 운영자가 `data/dashboard.json`만 수정 후 배포하면, 사용자는 재접속 또는 15분 이내에 새 데이터를 본다.

### B4. 요구사항
- **Functional:** (1) GET /data/dashboard.json 200, JSON body. (2) App 마운트 시 1회 fetch, 15분마다 재요청. (3) 실패 시 fallback 상수 사용. (4) "마지막 갱신: HH:MM" 표시. (5) README에 데이터 소스·갱신 주기 명시.
- **Non-functional:** LCP/CLS 유지; 폴링 15분으로 서버 부하 최소; 동일 도메인만 사용(CORS 불필요).
- **Constraints:** Node 빌드 없음, 백엔드 없음, Vercel 정적 + (선택) /api.

---

## C. UI/UX Plan (IA → Flow → Screens)

### C1. Information Architecture
- **Navigation:** 기존 탭 유지 — Overview, Intel Feed, Indicators, Routes, Checklist. (선택) Version 탭.
- **엔티티:** intelFeed, indicators, hypotheses, routes, checklist — 모두 `dashboard.json` 한 덩어리.

### C2. User Flow
- **Flow 1:** 진입 → fetch /data/dashboard.json → 성공 시 state 반영 → 탭별 기존 UI. 실패 시 fallback → 동일 UI.
- **Flow 2:** 15분 경과 → 자동 fetch → 성공 시 state 갱신 + "마지막 갱신" 갱신. 탭 비가시 시(선택) 폴링 일시정지.

### C3. 화면/컴포넌트
| Screen | Purpose | Key Components | Data Needed | Edge cases |
|--------|----------|-----------------|--------------|------------|
| 전체 | 단일 SPA | App, 탭 버튼, 카드/리스트 | dashboard.json | fetch 실패 → fallback |
| Header | 타이틀·시계·다음 평가 | Pulse, 시계 | now, nextEval | — |
| (신규) | 로딩/에러/마지막 갱신 | 1줄 텍스트 또는 스피너 | loading, error, lastUpdated | 빈 데이터 시 fallback 표시 |

### C4. Design System / Accessibility
- 기존 인라인 스타일 유지. 컴포넌트 라이브러리 없음.
- a11y: 기존 수준 유지; 로딩/에러 메시지는 aria-live 또는 역할 명시 권장.
- Error UI: 인라인 1줄("데이터를 불러오지 못했습니다. 기본 데이터를 표시합니다.") + 마지막 갱신 미표시.

---

## D. System Architecture (Components & Boundaries)

### D1. High-level Components
- **Frontend:** index.html (React UMD + Babel CDN). 단일 App: state(intelFeed, indicators, hypotheses, routes, checklist, loading, error, lastUpdated), useEffect(fetch + setInterval + cleanup).
- **Backend/API:** 없음. 정적 파일만.
- **Data store:** `data/dashboard.json` (정적 파일, Vercel에서 그대로 서빙).
- **External:** 없음.

### D2. Data Flow
- **Request flow:** Page load → GET /data/dashboard.json → parse → setState. 15분마다 동일 GET → setState. 탭 비가시(선택) 시 clearInterval.
- **Caching:** 브라우저 기본; (선택) Cache-Control: max-age=300 on JSON.

### D3. Boundary Rules
- 모듈: 단일 HTML 내 스크립트. 경계는 "상수 vs fetch 결과 state" 분리.
- fallback 상수는 fetch 실패 시에만 사용; 정상 시 state는 오직 fetch 결과.

---

## E. Data Model & API Contract

### E1. Data model (Entity)
| Entity | Fields (key) | Source of truth | Validation | Notes |
|--------|--------------|------------------|------------|-------|
| dashboard | intelFeed, indicators, hypotheses, routes, checklist | data/dashboard.json | JSON parse; 필수 키 존재 여부(선택) | 기존 인라인 구조와 동일 |

### E2. API (정적 리소스)
| Endpoint | Method | Auth | Request | Response | Error codes |
|----------|--------|------|---------|----------|-------------|
| /data/dashboard.json | GET | 없음 | — | 200, application/json, body = { intelFeed, indicators, hypotheses, routes, checklist } | 404 → fallback |

### E3. AuthN/AuthZ
- 없음. 공개 읽기 전용.

---

## F. Repo / Package Structure

- **Target tree (최소 변경):**
  - /data/dashboard.json (신규)
  - /index.html (수정: fetch + state + fallback + 폴링)
  - /hyie-erc2-dashboard.jsx (참조용, 배포 미사용)
  - /README.md (신규 또는 수정: 데이터 소스·갱신 주기)
  - /.gitignore, /.vercel (기존)
- **Naming:** data/ 하위 JSON만 추가. 빌드/린트/타입체크 없음.
- **Migration:** 기존 상수를 복사해 dashboard.json 생성 후, index.html에서 해당 상수를 fallback용으로만 유지.

---

## G. Implementation Plan (Epics → Stories → Tasks → PRs)

### G1. Epics
| Epic | Goal | Deliverables | Acceptance Criteria | Dependencies | Risks |
|------|------|--------------|---------------------|--------------|-------|
| E1 | 데이터 JSON 분리 + fetch | data/dashboard.json, fetch 로직, fallback | GET 200, 실패 시 fallback, LCP 유지 | — | JSON 문법 오류 |
| E2 | 15분 폴링 + UI | setInterval, cleanup, "마지막 갱신" | 15분마다 요청, unmount cleanup | E1 | setState on unmount |
| E3 | 문서화 | README | 데이터 소스·갱신 주기 명시 | — | — |

### G2. Story Breakdown
- **E1:** Story 1.1 — dashboard.json 생성(기존 상수 추출). Story 1.2 — App에서 fetch on mount + state 병합 + 로딩/에러 1줄. Story 1.3 — fallback 분기.
- **E2:** Story 2.1 — setInterval(15*60*1000) + cleanup. Story 2.2 — lastUpdated state + "마지막 갱신: HH:MM" 표시. (선택) Story 2.3 — visibilitychange로 탭 비가시 시 pause.
- **E3:** Story 3.1 — README에 데이터 소스 및 갱신 방식 작성.

### G3. PR Plan (≥6 PR 권장)
| PR | Scope | Target files/modules | Tests | Rollback note | Owner |
|----|--------|----------------------|-------|---------------|-------|
| PR1 | JSON 스키마 정의 + 파일 생성 | data/dashboard.json | (선택) JSON parse/스키마 검증 | 파일 삭제 + index revert | — |
| PR2 | fetch on mount + state | index.html | (선택) fetch mock fallback | index.html에서 fetch 제거, state 초기값 상수 | — |
| PR3 | 로딩/에러 UI + fallback | index.html | Integration: fallback 시 데이터 존재 | PR2와 동일 | — |
| PR4 | setInterval 폴링 + cleanup | index.html | Unit: cleanup 호출; Integration: fetch 횟수 | PR4 revert → fetch 1회만 | — |
| PR5 | "마지막 갱신" 표시 | index.html | E2E: 텍스트 존재 | PR5 revert | — |
| PR6 | README | README.md | — | README 수정 revert | — |

### G4. Feature Flags / Canary
- 플래그 없음. 폴링 간격을 0으로 두면 비활성화에 해당.
- Rollback 트리거: fetch 연속 실패 N회 또는 에러율 상한(정의 시).

### G5. Timeline & Resourcing
- **30일:** PR1–PR3 + PR6 (JSON, fetch, fallback, README).
- **60일:** PR4–PR5 (폴링, 마지막 갱신).
- **90일:** (선택) /api/dashboard 도입.
- 인력: 1명 개발 가능.

---

## H. Testing Strategy (Quality Gates)

### H1. Test Pyramid
- **Unit:** (선택) JSON 스키마 검증; setInterval cleanup 호출( mock timer).
- **Integration:** fetch mock → 실패 시 fallback state 적용; 폴링 시 fetch 호출 횟수 ≥2.
- **E2E:** 배포 URL에서 GET /data/dashboard.json 200, body.intelFeed.length > 0; "마지막 갱신" 텍스트 존재.
- **Perf/Security:** 없음(정적 only).

### H2. CI Gates
- 현재 CI 없음. 도입 시: (선택) JSON 린트, 정적 HTML 배포 전 링크 체크.

### H3. Test Data & Fixtures
- data/dashboard.json 자체가 fixture. Mock: fetch를 stub해 404/500 반환 후 fallback 검증.

---

## I. Observability & Operations (Runbook 포함)

### I1. Logging/Tracing/Metrics
- **Logs:** 브라우저 콘솔; (선택) fetch 실패 시 console.warn.
- **Metrics:** 없음(클라이언트만). Vercel Analytics 사용 시 페이지뷰만.
- **Dashboard:** 없음.

### I2. Alerting & On-call
- 없음. 정적 사이트.

### I3. Runbooks
- **Deploy:** Git push → Vercel 자동 배포. data/dashboard.json 포함 여부 확인.
- **Rollback:** Vercel 대시보드에서 이전 배포로 Promote, 또는 Git revert 후 push.
- **Incident:** 사용자 보고 시 — JSON 문법 확인, 배포 로그 확인. fallback으로 동작 중이면 데이터 갱신 실패만 알리면 됨.
- **Data repair:** dashboard.json 수정 후 재배포.

---

## J. Error Handling & Recovery

### J1. Error taxonomy
- **4xx/5xx:** fetch 실패(네트워크, 404, 500) → fallback 상수 사용.
- **JSON parse 오류:** catch → fallback.
- **시간초과:** fetch signal AbortController(선택, 예: 10s) → fallback.

### J2. Retry/Timeout/Idempotency
- **Timeout:** (선택) AbortController 10s.
- **Retry:** (선택) 1회 재시도 후 fallback. 폴링이 다음 주기에 재시도하므로 필수 아님.
- **Idempotency:** GET만 사용.
- **Circuit breaker / fallback:** 항상 상수 fallback.

### J3. UX Error Messaging
- "데이터를 불러오지 못했습니다. 기본 데이터를 표시합니다." (1줄). 마지막 갱신 미표시 또는 "—" 표시.

---

## K. Dependencies, Security, Risks

### K1. Dependencies
| Dependency | Type | Version policy | License | Risk | Mitigation |
|------------|------|----------------|---------|------|------------|
| React 18 UMD | CDN | 고정 18.2.0 | MIT | — | 기존 유지 |
| Babel standalone | CDN | 고정 7.23.9 | MIT | — | 기존 유지 |
| (신규 없음) | — | — | — | — | — |

### K2. Security
- Secrets 없음. 공개 JSON만.
- 권한: 읽기 전용.
- Supply-chain: CDN 기존 유지.

### K3. Risk Register
| Risk | Likelihood | Impact | Trigger | Mitigation | Owner |
|------|------------|--------|---------|------------|-------|
| JSON 문법 오류 | 중 | 중 | 배포 후 404/parse 실패 | 배포 전 JSON 검증; fallback | Dev |
| setInterval cleanup 누락 | 중 | 중 | unmount 후 setState 경고/크래시 | useEffect return에서 clearInterval | Dev |
| Vercel이 data/ 미서빙 | 낮 | 중 | 404 | Vercel 문서 확인; 루트에 data/ 배치 | Dev |
| 폴링 과다 요청 | 낮 | 낮 | 15분 유지 | 15분 고정; (선택) visibility pause | Dev |

### K4. Change Control (필수)
- **파괴적 변경:** 기존 인라인 상수 제거 시 사용자 화면 변경 가능. 따라서 상수는 fallback으로 유지(제거 금지).
- **Dry-run:** 로컬에서 index.html 열어 fetch('/data/dashboard.json') 200 확인 후 배포.
- **Change list:** PR별로 변경 파일 목록 명시( data/dashboard.json, index.html, README.md ).
- **Explicit approval:** JSON 스키마 및 필수 키 합의 후 PR1 병합.
- **Post-change verification:** 배포 URL에서 1회 로드 + (선택) 15분 후 새로고침으로 갱신 확인.

---

## ㅋ. Appendix (Evidence + Benchmarks)

### ㅋ1. Evidence Table (Ideas + Benchmarks)
| Type | platform | title/repo | url | published/created | updated/pushed | accessed_date | popularity_metric |
|------|----------|------------|-----|-------------------|----------------|---------------|-------------------|
| idea | official (blog) | Importing vs fetching JSON | https://jakearchibald.com/2025/importing-vs-fetching-json/ | 2025-10-22 | — | 2026-03-03 | — |
| idea | official | Vercel Functions | https://vercel.com/docs/functions | AMBER | — | 2026-03-03 | official docs |
| idea | official | Gatsby Build Time and Client Runtime Data Fetching | https://gatsbyjs.com/docs/conceptual/data-fetching | AMBER | — | 2026-03-03 | official docs |
| idea | official | TanStack Query Auto Refetching | https://tanstack.com/query/latest/docs/framework/react/examples/auto-refetching | AMBER | — | 2026-03-03 | official docs |
| benchmark | github | vercel-labs/json-render | https://github.com/vercel-labs/json-render | AMBER | — | 2026-03-03 | stars 11.8k+ | JSON-driven UI, Vercel |

### ㅋ2. Benchmarked repo notes
- **vercel-labs/json-render:** JSON 스펙으로 UI 렌더링, React/Vercel 생태계. 우리는 "데이터만 JSON, UI는 기존 React"로 적용.

### ㅋ3. Glossary
- **Fallback:** fetch 실패 시 사용하는 인라인 상수 데이터.
- **PriorityScore:** (Impact × Confidence) / (Effort × Risk). UPGRADE_REPORT Top 10 기준.

---

## Delivery Plan (30/60/90 + PR-sized)

| 기간 | 작업 |
|------|------|
| **30일** | PR1–PR3, PR6: data/dashboard.json 생성, fetch + fallback + 로딩/에러, README. |
| **60일** | PR4–PR5: 15분 폴링 + cleanup, "마지막 갱신" 표시. |
| **90일** | (선택) Best 3 #3: api/dashboard.js + 프론트 API 소스 전환. |

---

## Plan Verification (Quality Gates)

| Gate | 요구 | 상태 |
|------|------|------|
| Gate 0 Evidence | 핵심 결정에 evidence 연결 | PASS — E1(2025-10-22) + AMBER 조합 |
| Gate 1 Completeness | A~K + ㅋ 존재 | PASS |
| Gate 2 PR Granularity | ≥6 PR, scope/tests/rollback | PASS — 6 PR |
| Gate 3 Observability/Runbook | Runbook(Deploy/Rollback/Incident) | PASS — §I3 |
| Gate 4 Error Handling | Retry/Timeout/Fallback | PASS — §J |
| Gate 5 Dependencies/Security | 의존성·보안 | PASS — §K1, K2 |
| Gate 6 Change Control | 파괴적 변경 시 dry-run/approval | PASS — §K4 |

**Result:** PASS (문서 기준). 적용 전 plan-verifier 서브에이전트 실행 권장.

---

*Refs: project-plan v1.0.0, UPGRADE_REPORT.md, plan-template A~K+ㅋ. 코드/커밋/배포 자동 적용 없음.*
