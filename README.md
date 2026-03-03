# urgentdash 실시간 검증 데이터 갱신

## 데이터 소스
- Dashboard 데이터는 `data/dashboard.json` 파일에서 읽어옵니다.
- 정적 JSON(`data/dashboard.json`)이 `INTEL_FEED`, `INDICATORS`, `HYPOTHESES`, `ROUTES`, `CHECKLIST`에 대응하는 핵심 데이터의 단일 소스입니다.

## 배포/운영 방식
- 소스코드는 정적 HTML만 사용하며 빌드 파이프라인이 필요 없습니다.
- 데이터를 변경하려면 `data/dashboard.json` 파일만 수정하고 재배포합니다.

## 동작 방식
- 앱 로드 시 `./data/dashboard.json`을 fetch해 최신 데이터를 반영합니다.
- 로딩 후 15분(900초) 간격으로 다시 fetch해 갱신을 시도합니다.
- fetch 실패 시 화면은 기존 인라인 fallback 데이터(빌드 기본 상수)를 유지하고 오류 메시지를 표시합니다.

## 선택: 매시간 스크랩 후 데이터 반영 (자동화)

현재 화면은 `data/dashboard.json`을 소스로 사용합니다.  
원하면 아래 파이프라인으로 소스 데이터를 매시간 갱신한 뒤 `dashboard.json`을 덮어쓸 수 있습니다.

- 스크래퍼: `scripts/update-dashboard.mjs`
- 수집 소스 설정: `data/source-registry.json`
  - `enabled: true`인 소스만 수집 대상이 됩니다.
  - `kind`는 `rss` / `html` 형태를 지원합니다.
  - 출력은 기본적으로 `intelFeed` 항목을 갱신합니다.

### 수동 실행

```bash
node scripts/update-dashboard.mjs
```

성공 시 `data/dashboard.json`의 `intelFeed`가 갱신되며, 기존 `indicators/hypotheses/routes/checklist`는 유지됩니다.

### GitHub Actions 자동 실행(매시간)

- 워크플로우: [`.github/workflows/hourly-dashboard-update.yml`](.github/workflows/hourly-dashboard-update.yml)
- 설정된 스케줄: 매 정각(`0 * * * *`)
- 변경분이 있으면 `data/dashboard.json`을 커밋 후 푸시합니다.

## 즉시 반영된 4개 핫픽스

- `verified`는 더 이상 상수 하드코딩에 의존하지 않고, 소스 수 기반(`MIN_EVIDENCE_SOURCES = 2`)으로 자동 산출합니다.
- `ts`는 `tsIso`로 정규화되어 UI는 동일 기준으로 렌더합니다.
- `EgressLossETA`는 대시보드에서 입력하고, 변경값으로 Urgency 계산을 반영합니다. (`metadata.egressLossETA`)
- 수집기는 `LOCK` 기반 동시 실행 방지와 `hash` 기반 업서트/중복 제거를 사용합니다.
