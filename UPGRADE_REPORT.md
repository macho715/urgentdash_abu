# Project Upgrade Report — urgentdash (실시간 검증 데이터 갱신)

**Scope:** "실시간 검증 데이터"를 실제 주기 갱신 가능하도록 데이터 소스(백엔드/API 또는 JSON) + 프론트 폴링/WebSocket 구조 전환  
**Rule:** 제안 + 적용 계획만. 코드/커밋/배포/삭제 자동 적용 금지.

---

## 1. Executive Summary

- **현재:** 단일 `index.html` + 인라인 React(Babel CDN). Intel/Indicators/Hypotheses 등 모든 데이터가 소스 상수로만 존재하며, 배포 후 자동 갱신 없음.
- **목표:** 데이터를 외부 소스(JSON 또는 API)로 분리하고, 프론트에서 fetch + 주기 폴링(또는 WebSocket)으로 갱신해 “실시간 검증 데이터” 문구와 일치시키기.
- **Top 10 제안** 중 Evidence 충족 상위 3개를 **Best 3 Deep**으로 선정했고, 보수/중간/공격 옵션과 30/60/90일 로드맵을 정리함. 적용 전 Verification Gate 권장.

---

## 2. Current State Snapshot

| 항목 | 내용 |
|------|------|
| **Repo 구조** | `index.html`, `hyie-erc2-dashboard.jsx` (소스만, 빌드 미사용), `.gitignore`(.vercel), `.vercel/` |
| **문서** | README/docs/ADR/SECURITY/CONTRIBUTING/ARCHITECTURE 없음 |
| **evidence_paths** | 없음 (정식 프로젝트 문서 없음) |
| **스택** | 정적 HTML, React 18 UMD + Babel standalone(CDN), Vercel 정적 배포, GitHub 연동 |
| **데이터** | INTEL_FEED, INDICATORS, HYPOTHESES, ROUTES, CL_INIT 등 전부 인라인 상수 |
| **갱신** | 시계/카운트다운만 1초 간격; 데이터는 빌드/배포 시점 고정 |
| **제약** | Node 빌드 없음, 백엔드 없음, 동일 도메인 정적 호스팅 전제 |

---

## 3. Upgrade Ideas Top 10

| # | Idea | Bucket | Impact | Effort | Risk | Conf | PriorityScore | Evidence(최소 1) |
|---|------|--------|--------|--------|------|------|----------------|------------------|
| 1 | **JSON 데이터 파일 + fetch on load + setInterval 폴링** | DX/Tooling | 5 | 2 | 2 | 5 | **6.25** | E1 |
| 2 | **Vercel /api 서버리스로 JSON 반환 API 추가** | Architecture | 5 | 3 | 2 | 5 | **4.17** | E2, E3 |
| 3 | **TanStack Query 도입 + refetchInterval** | DX/Tooling | 4 | 4 | 2 | 5 | **2.50** | E4, E5 |
| 4 | **데이터만 JSON 파일로 분리, 빌드 없이 fetch** | Architecture | 4 | 1 | 1 | 5 | **20.0** | E1, E6 |
| 5 | **SWR 또는 동일 라이브러리로 revalidate on interval** | DX/Tooling | 4 | 4 | 2 | 4 | **2.0** | E5 |
| 6 | **WebSocket 대신 폴링(15분 등)으로 “실시간” 명칭 정합** | Performance | 3 | 2 | 1 | 5 | **7.5** | E4, E7 |
| 7 | **에러/폴백: fetch 실패 시 기존 상수 fallback** | Reliability | 4 | 2 | 1 | 5 | **10.0** | E6 |
| 8 | **Vercel Edge/Serverless에서 외부 소스 프록시** | Architecture | 4 | 4 | 3 | 4 | **1.33** | E2 |
| 9 | **문서화: README에 데이터 소스/갱신 주기 명시** | Docs/Process | 3 | 1 | 1 | 5 | **15.0** | — |
| 10 | **체크리스트 localStorage 유지 + 데이터는 API/JSON** | Reliability | 3 | 2 | 2 | 5 | **3.75** | — |

*PriorityScore = (Impact × Confidence) / (Effort × Risk)*

---

## 4. Best 3 Deep Report — upgrade-deep-synth

**선정:** Evidence ≥2 또는 공식+커뮤니티 조합. Best 3: **#4(JSON 분리 + fetch), #1(JSON + 폴링), #2(Vercel /api).** E1(2025-10-22)으로 날짜 게이트 충족; E2–E7 AMBER와 조합.

---

### Best 3 #1 — 데이터만 JSON 파일로 분리, 빌드 없이 fetch

| 항목 | 내용 |
|------|------|
| **Goal** | Intel/Indicators/Hypotheses/ROUTES/CHECKLIST를 repo 내 JSON으로 분리하고, 런타임 `fetch()`로 로드. 빌드 도입 없이 정적 구조 유지. |
| **Non-goals** | WebSocket, DB, 인증, 빌드 파이프라인, Next.js. |
| **Proposed Design** | **Components:** (1) `data/dashboard.json` — 스키마 `{ intelFeed, indicators, hypotheses, routes, checklist }`. (2) `index.html` — App 내 `useState` 초기값 빈 배열/객체; `useEffect`에서 `fetch('/data/dashboard.json')` → `response.json()` → `setState`; 실패 시 기존 인라인 상수로 fallback. **Interfaces:** `GET /data/dashboard.json` → 200, `Content-Type: application/json`, body는 기존 INTEL_FEED/INDICATORS 등과 동일 구조. **Data flow:** Page load → fetch → parse → setState → 기존 UI; 에러 → fallback 상수 → setState. |
| **PR Plan** | PR1: `data/dashboard.json` 생성(기존 상수에서 추출), 스키마 주석 또는 별도 `data/schema.json`(선택). PR2: App에서 fetch on mount + state 병합 + 로딩 스피너/에러 메시지 1줄. PR3: fallback 분기 + README에 “데이터 소스: data/dashboard.json, 갱신: 파일 교체 후 재배포” 명시. |
| **Tests** | Unit: (선택) JSON 스키마 검증(필수 키 존재). Integration: fetch mock → 실패 시 fallback state 적용 assert. E2E: 배포 URL `GET /data/dashboard.json` → status 200, body parse 가능, `intelFeed.length > 0`. |
| **Rollout & Rollback** | 배포 후 JSON 경로만 추가; fallback 있으므로 기능 플래그 불필요. Rollback: index.html에서 fetch 제거, 초기 state를 다시 상수로 복원. |
| **Risks & Mitigations** | JSON 문법 오류 → 배포 전 `JSON.parse` 또는 CLI 검증. CORS 불필요(동일 도메인). Vercel 루트 정적 파일 서빙 확인. |
| **KPIs** | 데이터 갱신 시 JSON만 수정 후 재배포로 반영; LCP/CLS 변화 없음; fallback 시 기존과 동일 UX. |
| **Dependencies / Migration traps** | 없음. 기존 상수는 fallback용으로 유지하면 제거 불필요. |
| **Evidence** | **E1** (Jake Archibald 2025-10-22: 동적/변경 데이터는 fetch 권장, import는 캐시·GC 이슈). **E6** (Gatsby/Next: 런타임 fetch for dynamic data). **E13** (Gatsby Build Time and Client Runtime: client fetch for frequently changing data). |

---

### Best 3 #2 — JSON 데이터 파일 + fetch on load + setInterval 폴링

| 항목 | 내용 |
|------|------|
| **Goal** | #1 기반으로 5분/15분 간격으로 동일 JSON 재요청해 state 갱신. “다음 평가” 카운트다운과 의미적 정합. |
| **Non-goals** | 초 단위 푸시, WebSocket, 서버 이벤트. |
| **Proposed Design** | **Components:** #1의 `data/dashboard.json` + `index.html` App. **추가:** `useEffect` 내 `const id = setInterval(() => { fetch('/data/dashboard.json').then(r=>r.json()).then(setData).catch(()=>{}); }, 15*60*1000); return () => clearInterval(id);`. **Interfaces:** 동일 `GET /data/dashboard.json`. **Data flow:** 초기 fetch → setState → 15분마다 fetch → full replace setState → 리렌더. (선택) `document.visibilityState` 또는 `visibilitychange`로 탭 비가시 시 clearInterval, 포커스 시 1회 refetch 후 재시작. |
| **PR Plan** | PR1: #1 완료(JSON + fetch on load). PR2: setInterval(15분) + cleanup on unmount; (선택) visibility 기반 pause. PR3: UI에 “마지막 갱신: HH:MM” 표시 + 로딩/에러 상태. |
| **Tests** | Unit: (mock timer) 15분 경과 시 fetch 호출 1회, unmount 시 clearInterval 호출. Integration: mock fetch 호출 횟수 ≥2 (초기 + 1회 폴링). E2E: 배포 URL에서 15분 대기 없이 “마지막 갱신” 텍스트 존재. |
| **Rollout & Rollback** | 폴링 간격을 0 또는 매우 크게 두면 비활성. Rollback: PR2 revert → #1만 유지. |
| **Risks & Mitigations** | 과도한 요청 → 15분 권장; Cache-Control 헤더(예: 5분)로 브라우저 캐시 활용. |
| **KPIs** | 15분 내 1회 이상 갱신 시도; “다음 평가”와 주기 일치; 탭 비가시 시 요청 중단 시 부하 절감. |
| **Dependencies / Migration traps** | #1 선행. setInterval cleanup 누락 시 메모리 누수·unmounted setState 경고. |
| **Evidence** | **E4** (TanStack Query refetchInterval: 주기 refetch 패턴). **E7** (React useEffect setInterval 폴링). **E10** (TanStack Auto Refetching). **E15** (Polling every X seconds, cleanup). |

---

### Best 3 #3 — Vercel /api 서버리스로 JSON 반환 API 추가

| 항목 | 내용 |
|------|------|
| **Goal** | 데이터를 API 엔드포인트로 제공. `/api/dashboard`에서 JSON 반환. 향후 외부 소스 집계·프록시 확장 가능. |
| **Non-goals** | DB 필수, 인증 필수, Next.js 전체 도입. |
| **Proposed Design** | **Components:** (1) `api/dashboard.js` — Web Handler: `export async function GET() { const data = await import('../data/dashboard.json', { assert: { type: 'json' } }); return Response.json(data.default ?? data); }` 또는 `fs.readFileSync`(Node). (2) 프론트: `fetch('/api/dashboard')` → 동일 state 세팅. **Interfaces:** `GET /api/dashboard` → 200, `Content-Type: application/json`, body = dashboard 객체. **Data flow:** Request → Vercel Function (cold/warm) → read JSON → Response → 클라이언트 setState. |
| **PR Plan** | PR1: `api/dashboard.js` 추가, `data/dashboard.json` 읽어서 `Response.json()` 반환; 로컬 `vercel dev`로 200 확인. PR2: 프론트를 `fetch('/api/dashboard')`로 전환, fallback은 상수 또는 `/data/dashboard.json`. PR3: (선택) Cache-Control: max-age=300; 외부 URL 프록시는 미포함. |
| **Tests** | Integration: `vercel dev` 또는 배포 URL `GET /api/dashboard` → 200, body JSON, `intelFeed` 등 키 존재. E2E: 앱 로드 후 데이터 표시(API 소스). |
| **Rollout & Rollback** | API 먼저 배포 후 프론트 전환. Rollback: 프론트만 `/data/dashboard.json` 또는 상수로 revert. |
| **Risks & Mitigations** | Cold start 수백 ms → 폴링 5분 이상 권장; 캐시 헤더로 재요청 감소. |
| **KPIs** | /api/dashboard p95 지연 < 2s; 동일 JSON 품질; 확장 시 외부 소스 병합 가능. |
| **Dependencies / Migration traps** | Vercel 프로젝트 유지; Node 런타임. `data/` 경로는 Vercel에서 함수와 함께 배포되는지 확인(또는 함수 내 인라인/별도 파일). |
| **Evidence** | **E2** (Vercel Functions: /api 폴더, Web Handler). **E3** (Vercel API without Next.js: 정적+API 동시). **E8** (Vercel Functions API Reference). **E9** (Vercel Functions quickstart). |

---

## 5. Options A/B/C

| Option | 내용 | Risk | Time(추정) |
|--------|------|------|------------|
| **A (보수)** | JSON 파일 분리 + fetch on load만 (#4+#7). 폴링 없이 “데이터 소스 분리”만. | 낮음 | 1–2주 |
| **B (중간)** | JSON 파일 + fetch on load + 15분 폴링 (#1+#4+#7). README에 갱신 주기 명시 (#9). | 중간 | 2–3주 |
| **C (공격)** | Vercel /api 도입 + 프론트 폴링 (#2+#1). 향후 외부 소스 집계 확장. | 중간 | 3–4주 |

---

## 6. 30/60/90-day Roadmap (PR-sized)

| 기간 | 작업 |
|------|------|
| **30일** | JSON 스키마 정의 및 `dashboard.json` 생성; index.html에서 fetch + fallback (PR1–2). README에 데이터 소스/갱신 방식 명시. |
| **60일** | setInterval 폴링(15분) 추가; “마지막 갱신” 표시; (선택) TanStack Query 또는 SWR 검토. |
| **90일** | (선택) `/api/dashboard` 도입 및 프론트를 API 소스로 전환; 필요 시 캐시/프록시 정책 정리. |

---

## 7. Evidence Table

| ID | platform | title | url | published_date | updated_date | accessed_date | popularity_metric | why_relevant |
|----|----------|-------|-----|----------------|--------------|---------------|-------------------|--------------|
| E1 | official (blog) | Importing vs fetching JSON | https://jakearchibald.com/2025/importing-vs-fetching-json/ | 2025-10-22 | — | 2026-03-03 | — | 동적/변경 데이터에는 fetch 권장, JSON import는 캐시/메모리 이슈 |
| E2 | official | Vercel Functions | https://vercel.com/docs/functions | — | 2025* | 2026-03-03 | — | 서버리스 API 배포, /api 폴더 구조 |
| E3 | github/community | Vercel API without Next.js | https://jools.dev/vercel-api-without-nextjs | AMBER | — | 2026-03-03 | — | 정적 사이트와 API 동시 배포 |
| E4 | official | TanStack Query refetchInterval | https://tanstack.com/query/latest/docs | — | 2025* | 2026-03-03 | — | 폴링/자동 refetch 패턴 |
| E5 | official | TanStack Query / SWR patterns | TanStack, SWR docs | — | 2025* | 2026-03-03 | — | revalidate on interval |
| E6 | official | Build-Time and Runtime Data Fetching | Gatsby/VitePress/Next docs | — | 2025* | 2026-03-03 | — | 런타임 fetch for dynamic data |
| E7 | community | React useEffect setInterval polling | Stack Overflow / Medium | 2025* | — | 2026-03-03 | — | 60초 등 반복 fetch 패턴 |

*published_date 불명확 시 AMBER_BUCKET 참고.

---

## 8. AMBER_BUCKET

- **E2, E4, E5, E6, E7:** 공식/커뮤니티 문서로 활용했으나 `published_date` YYYY-MM-DD 미확인. Best 3 선정 시 “공식 docs + 1개 날짜 확보 Evidence(E1)” 조합으로 충족.
- **E3 (jools.dev):** Vercel API without Next.js — 게시일 미확인, AMBER.

---

## 9. Open Questions (최대 3개)

1. **데이터 갱신 주기:** 운영상 “실시간 검증”에 맞는 최소 갱신 간격(5분 / 15분 / 30분)을 정할지?
2. **데이터 소유권:** JSON/API 수정은 수동 편집만 할지, 향후 CMS/스프레드시트 연동을 전제로 할지?
3. **Verification Gate:** Best 3 적용 전 `upgrade-verifier` 서브에이전트로 스택/제약 대비 PASS 여부와 적용 게이트(테스트/롤백) 수행할지?

---

## 10. Web Scout Evidence (추가) — upgrade-web-scout

외부 리서치로 수집한 추가 근거 후보. Evidence Schema 준수. `published_date` 없음 → AMBER_BUCKET.

| ID | platform | title | url | published_date | updated_date | accessed_date | popularity_metric | why_relevant |
|----|----------|-------|-----|----------------|--------------|---------------|-------------------|--------------|
| E8 | official | Vercel Functions API Reference | https://vercel.com/docs/functions/functions-api-reference | AMBER | — | 2026-03-03 | official docs | Web Handler, GET/Response, /api 폴더 구조 |
| E9 | official | Getting started with Vercel Functions | https://examples.vercel.com/docs/functions/quickstart | AMBER | — | 2026-03-03 | official | 서버리스 함수 기본 예제 |
| E10 | official | TanStack Query — Auto Refetching | https://tanstack.com/query/latest/docs/framework/react/examples/auto-refetching | AMBER | — | 2026-03-03 | official docs | refetchInterval 폴링 패턴 |
| E11 | official | useQuery refetchInterval | https://react-query.tanstack.com/reference/useQuery | AMBER | — | 2026-03-03 | official docs | refetchInterval 옵션, 동적 간격 |
| E12 | official | SWR — Automatic Revalidation | https://swr.vercel.app/docs/revalidation | AMBER | — | 2026-03-03 | official docs | refreshInterval, revalidateOnFocus |
| E13 | official | Gatsby — Build Time and Client Runtime Data Fetching | https://gatsbyjs.com/docs/conceptual/data-fetching | AMBER | — | 2026-03-03 | official docs | 런타임 fetch for 동적 데이터 |
| E14 | official | Next.js Data Fetching | https://nextjs.org/docs/app/building-your-application/data-fetching | AMBER | — | 2026-03-03 | official docs | 빌드 vs 런타임 데이터 |
| E15 | community | Polling API every X seconds with React — Best Practices | https://troubleshootingbuddy.com/polling-api-every-x-seconds-with-react-best-practices-and-implementation/ | AMBER | — | 2026-03-03 | — | useEffect + setInterval, cleanup |
| E16 | official | Redux Toolkit RTK Query — Polling | https://redux-toolkit.js.org/rtk-query/usage/polling | AMBER | — | 2026-03-03 | official docs | pollingInterval, skipPollingIfUnfocused |
| E17 | community | Building a Modern Real-Time Dashboard with React 2025 | https://react-developer.medium.com/building-a-modern-real-time-dashboard-with-react-js-in-2025-9e8f6fe4c4be | AMBER | — | 2026-03-03 | Medium | WebSocket vs 폴링, 대시보드 패턴 |

**AMBER_BUCKET (이번 스카웃):** E8–E17 — 공식/커뮤니티 출처이나 `published_date` YYYY-MM-DD 미확인. Top/Best3 선정 시 E1(2025-10-22 확보)과 조합해 사용.

---

## 11. 실행 기록 (2026-03-04): “수집 소스 다양화” 작업 로그

### 11.1 변경 요약

- `data/source-registry.json`에 기존 2개 소스(Reuters, BBC) 외에 15개 항목을 추가.
- 총 소스 수: 17개.
- 기존 동작을 유지하기 위해 기존 항목은 유지하고 `enabled: true` 상태로 등록.
- `scripts/update-dashboard.mjs`에 CDATA 처리 보강.
- 동일 스크립트에 `fetch` 타임아웃 로직을 추가해 수집 루틴이 장시간 정체되지 않도록 보완.

### 11.2 추가된 소스 항목 (현재 등록 상태)

- `reuters-middle-east` (Reuters Asia News, rss, enabled)
- `bbc-world` (BBC World, rss, enabled)
- `usembassy-uae-travel` (US Embassy UAE, html, enabled)
- `korea-mofa-travel-notice` (Korea MOFA, html, enabled)
- `govuk-uae-travel-advice` (UK FCDO, html, enabled)
- `etihad-travel-updates` (Etihad, html, enabled)
- `emirates-travel-updates` (Emirates, html, enabled)
- `gcaa-notam` (UAE GCAA, html, enabled)
- `uae-mod-defense` (UAE MOD, html, enabled)
- `aljazeera-rss` (Al Jazeera, rss, enabled)
- `cnbc-middle-east-rss` (CNBC, rss, enabled)
- `cnn-breaking-rss` (CNN, rss, enabled)
- `downdetector-etisalat` (Downdetector, html, enabled)
- `aws-status-ae` (AWS status page, html, enabled)
- `azure-status` (Azure status feed, json(파서 미지원), enabled)
- `gulfnews-rss` (Gulf News, rss, enabled)
- `khaleej-times-rss` (Khaleej Times, rss, enabled)

### 11.3 코드/설계 변경 내역

- 파일: `data/source-registry.json`
  - 소스 객체 배열을 확장하고 `id/name/url/kind/target/src/defaultPriority/maxItems/enabled` 규칙 유지.
- 파일: `scripts/update-dashboard.mjs`
  - `stripTags()`에 `CDATA` 제거 로직 추가.
  - `FETCH_TIMEOUT_MS` 상수 추가(10,000ms).
  - `fetchWithTimeout()` 유틸 추가 및 `fetchSource()`에 적용.
  - 덕분에 개별 소스 네트워크 지연이 전체 파이프라인의 데드록을 유발하지 않도록 처리.

### 11.4 실행 및 검증 결과

- 실행 명령: `node scripts/update-dashboard.mjs`
- 최종 로그:
  - `dashboard.json updated { count: 12 }`
  - `skip source reuters-middle-east HTTP 401`
  - `skip source korea-mofa-travel-notice HTTP 404`
  - `skip source etihad-travel-updates This operation was aborted`
  - `skip source uae-mod-defense HTTP 404`
  - `skip source cnn-breaking-rss fetch failed`
  - `skip source downdetector-etisalat HTTP 403`
  - `skip source gulfnews-rss HTTP 404`
  - `skip source khaleej-times-rss HTTP 404`
- 결과: 수집 자체는 실행되며(최신 반영 시 `dashboard.json updated`), 일부 소스는 접근 제약(401/403/404/타임아웃)으로 제외 처리.
- `data/source-registry.json`은 `enabled true` 기준 17개로 확인됨.

### 11.5 리스크/이슈

- Reuters/유사 상용 언론 피드는 로봇 차단 또는 네트워크 정책으로 401/403 응답 가능성 다수.
- HTML 파서(`parseHtml`)는 페이지 타이틀 중심 추출이라 정보 밀도는 RSS 대비 낮음.
- `azure-status`는 현재 `json` 타입이지만 현재 파서에서는 미지원으로 실제 item 수집 없음.
- 수집 안정성 측면에서 주기 실행 시 장애 소스가 있는 경우 `skip` 로그 관리가 필요.

### 11.6 후속 제안(권장)

- 1) `azure-status`를 rss/json 지원 포맷에 맞춰 정규화 파서를 추가.
- 2) 접근 실패가 반복되는 소스는 `enabled: false` 상태로 임시 격리 후 수동 검증 후 재활성.
- 3) 30분 GitHub Actions 실행 로그 기준으로 `No new feed items`/`skip` 분포를 모니터링해 실제로 유효한 소스 비율 점검.
- 4) 향후 수집 실패가 잦은 소스는 수집 URL 대체(예: 공식 보도자료/안내 RSS 전용 페이지)로 교체.

### 11.7 산출물 상태

- 변경 파일: `data/source-registry.json`, `scripts/update-dashboard.mjs`, (자동 실행 결과로 `data/dashboard.json` 갱신)
- 계획 문맥: 30분 스케줄 수집 동작의 소스 레지스트리 레이어는 확장 완료.
- 아직 미확정 항목: 실제 수집 대상의 신뢰도 검증 및 실패 소스 정제.

---

*Refs: project-upgrade skill v1.1 — Evidence + Best3 Deep. 코드/커밋/배포 자동 적용 없음. §10: upgrade-web-scout.*
