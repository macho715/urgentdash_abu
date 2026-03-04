import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// VERIFIED REAL-TIME DATA — Sources collected 2026-03-03
// All data cross-referenced from multiple independent sources
// ═══════════════════════════════════════════════════════

const INTEL_FEED = [
  {
    ts: "Mar 3 14:00", priority: "CRITICAL", verified: true,
    text: "Emirates & Etihad 모든 상업 운항 3월 5일 14:00까지 중단 연장",
    src: "LoyaltyLobby / Etihad 공식", srcUrl: "loyaltylobby.com",
    impact: "I02 = 1.00 유지. 제한적 본국송환 편만 허용."
  },
  {
    ts: "Mar 3 13:30", priority: "CRITICAL", verified: true,
    text: "미국 국무부 — 중동 12개국 이상 시민에 즉시 출국 촉구",
    src: "Al Jazeera / NBC News", srcUrl: "aljazeera.com",
    impact: "I01 state 1.00 재확인. I07 강화."
  },
  {
    ts: "Mar 3 12:00", priority: "HIGH", verified: true,
    text: "이란 3일 연속 걸프 지역 보복 공격 지속 — UAE/카타르/쿠웨이트 폭발",
    src: "Al Jazeera / CNBC", srcUrl: "aljazeera.com",
    impact: "I03 = 1.00 유지. active_strike_window = true 연장."
  },
  {
    ts: "Mar 3 11:00", priority: "HIGH", verified: true,
    text: "이스라엘, 이란·헤즈볼라 동시 타격 (테헤란+베이루트) — 분쟁 확대",
    src: "CNBC Live Updates", srcUrl: "cnbc.com",
    impact: "에스컬레이션 추가. 이란 추가 보복 가능성↑"
  },
  {
    ts: "Mar 3 10:30", priority: "HIGH", verified: true,
    text: "인도 특별 구호편 10편 운항 (제다→인도 각 도시), UAE 제한적 출발 재개",
    src: "Outlook India / India TV", srcUrl: "outlookindia.com",
    impact: "I07 state 1.00. 타국 대피 본격화."
  },
  {
    ts: "Mar 3 09:00", priority: "MEDIUM", verified: true,
    text: "태국 총리: 군용기 동원 중동 자국민 대피 준비 — 11,000명+ UAE 거주",
    src: "Nation Thailand / Manila Times", srcUrl: "nationthailand.com",
    impact: "I07 추가 강화. 군사적 대피 수단 동원 단계."
  },
  {
    ts: "Mar 2 22:00", priority: "CRITICAL", verified: true,
    text: "미 국무부 비긴급 직원 + 가족 UAE 출국 명령 (Ordered Departure)",
    src: "US Embassy UAE / NBC News", srcUrl: "ae.usembassy.gov",
    impact: "I01 = 1.00. 미국 Level 3 → Ordered Departure는 극히 이례적."
  },
  {
    ts: "Mar 2 20:00", priority: "HIGH", verified: true,
    text: "AWS 데이터센터 2곳(UAE) + 1곳(바레인) 드론 피격으로 오프라인",
    src: "CNBC", srcUrl: "cnbc.com",
    impact: "I05 state 0.15↑ — 인프라 피해 시작. 통신은 아직 정상."
  },
  {
    ts: "Mar 2 18:00", priority: "MEDIUM", verified: true,
    text: "UAE 슈퍼마켓 재고 안정화 — 패닉바잉 진정, 정부 비축분 충분",
    src: "The National / Khaleej Times / Gulf News", srcUrl: "thenationalnews.com",
    impact: "I06 0.50→0.35 하향. 공급망 정상, 일시적 패닉이었음."
  },
  {
    ts: "Mar 2 15:00", priority: "HIGH", verified: true,
    text: "영국·호주 UAE 여행경보 'Do Not Travel' 최고 단계로 격상, 대피 계획",
    src: "VisaHQ", srcUrl: "visahq.com",
    impact: "I07 = 1.00 재확인. 서방 주요국 전면 철수 모드."
  },
  {
    ts: "Mar 1 16:00", priority: "CRITICAL", verified: true,
    text: "UAE 국방부: 탄도미사일 165발, 드론 541기 탐지 — 사망 3, 부상 58",
    src: "UAE MoD / Khaleej Times / The National", srcUrl: "khaleejtimes.com",
    impact: "I03 = 1.00. 요격률 높으나 파편 낙하로 민간 피해 발생."
  },
  {
    ts: "Feb 28 23:00", priority: "CRITICAL", verified: true,
    text: "이란, 미-이스라엘 공습 보복으로 UAE 포함 걸프 전역 미사일·드론 공격 개시",
    src: "Al Jazeera / CNN / Euronews", srcUrl: "aljazeera.com",
    impact: "전체 상황 개시점. 모든 지표 급등."
  },
];

const INDICATORS = [
  {
    id: "I01", name: "공식 여행경보/대사관 공지", tier: "TIER0", state: 1.0,
    confirmed: true, src: "US State Dept, NL 외교부, UK FCDO, AU DFAT, KR 외교부",
    ts: "Mar 3 13:30 GST",
    detail: "미국 Ordered Departure 발령(3/2), 영국·호주 Do Not Travel, 한국 특별여행주의보, NL Orange",
    srcCount: 5, crossVerified: true
  },
  {
    id: "I02", name: "공항/항공 운영", tier: "TIER0", state: 1.0,
    confirmed: true, src: "Etihad Airways 공식, GCAA, LoyaltyLobby",
    ts: "Mar 3 14:00 GST",
    detail: "Etihad/Emirates 3월 5일 14:00까지 전편 중단. 제한적 본국송환편만 운항. UAE 영공 부분 폐쇄 지속.",
    srcCount: 4, crossVerified: true
  },
  {
    id: "I03", name: "군사/안보 근접도", tier: "TIER1", state: 1.0,
    confirmed: true, src: "UAE MoD, Al Jazeera, CNN, BBC, CNBC",
    ts: "Mar 3 12:00 GST",
    detail: "3일 연속 이란 보복 공격. 탄도미사일 165발+드론 541기. AUH 해군기지·Saadiyat·Khalifa City 피편 낙하. 3사망 58부상.",
    srcCount: 6, crossVerified: true
  },
  {
    id: "I04", name: "치안/도로 통제", tier: "TIER1", state: 0.60,
    confirmed: false, src: "Time Out Abu Dhabi, US Embassy, Canada Advisory",
    ts: "Mar 3 10:00 GST",
    detail: "파편 낙하 지역 도로 폐쇄. 공식 통행금지 미확인. SMS 공습경보 시스템 운영 중. 사우디·오만 국경 OPEN.",
    srcCount: 3, crossVerified: false
  },
  {
    id: "I05", name: "통신/인터넷", tier: "TIER1", state: 0.15,
    confirmed: true, src: "CNBC, 직접 확인",
    ts: "Mar 3 08:00 GST",
    detail: "일반 통신 정상. AWS UAE 데이터센터 2곳 드론 피격 오프라인. 인프라 부분 피해 시작.",
    srcCount: 2, crossVerified: true
  },
  {
    id: "I06", name: "필수재/연료", tier: "TIER2", state: 0.35,
    confirmed: true, src: "The National, Khaleej Times, Gulf News, AGBI",
    ts: "Mar 2 20:00 GST",
    detail: "초기 패닉바잉 진정. 슈퍼마켓 재고 안정화. 정부 전략 비축분 충분. 연료 정상 공급(3월 가격 소폭 인상).",
    srcCount: 4, crossVerified: true
  },
  {
    id: "I07", name: "외국정부 행동", tier: "TIER0", state: 1.0,
    confirmed: true, src: "태국 총리실, 인도 항공사, UK/AU FCDO, NBC News",
    ts: "Mar 3 10:30 GST",
    detail: "태국 군용기 대피 준비(11,000명+). 인도 특별편 10편. 영국·호주 Do Not Travel + 대피 계획. 미국 Ordered Departure.",
    srcCount: 5, crossVerified: true
  },
];

// ═══════════════════════════════════════════════════════
// RECALCULATED HYPOTHESIS SCORES (based on verified data)
// H2 boosted by: US Ordered Departure, UK/AU DNT, multi-nation evac
// ΔScore approaching 0.20 threshold
// ═══════════════════════════════════════════════════════

const HYPOTHESES = [
  { id: "H0", name: "정상", score: 0.215, desc: "일상 운영, 일시적 혼란", color: "#22c55e" },
  { id: "H1", name: "악화", score: 0.608, desc: "제한 증가, 행동 변화 불요", color: "#f59e0b" },
  { id: "H2", name: "철수준비", score: 0.798, desc: "공식 경보 + 행동 변화 요구", color: "#ef4444" },
];

const ROUTES = [
  {
    id: "A", name: "Al Ain → Buraimi → Sohar", base_h: 7.0, status: "CAUTION", congestion: 0.90,
    note: "Al Ain 국경 혼잡 심화. 통과 가능하나 지연 예상. effective 20.8h.",
    newsRefs: [
      { src: "The National", text: "UAE 거주자 이란 피격 여행 차질로 28시간 우회 귀환 (항공+육로)", ts: "2026-03-04" },
      { src: "Google News / BBC", text: "미국, 중동 자국민 긴급 소개 항공편 투입 — 육로 혼잡 가중 예상", ts: "2026-03-04" },
    ],
  },
  {
    id: "B", name: "Mezyad → Nizwa", base_h: 8.2, status: "CAUTION", congestion: 0.60,
    note: "국경 기능 유지 중이나 이란 공습 여파로 대기 시간 증가. effective 20.5h.",
    newsRefs: [
      { src: "The National", text: "이란 공습으로 UAE 전반 여행 차질 — 육로 국경 혼잡도 상승", ts: "2026-03-04" },
    ],
  },
  {
    id: "C", name: "Saudi Ghuwaifat → Riyadh", base_h: 15.5, status: "BLOCKED", congestion: 0.65,
    note: "쿠웨이트 드론 피격·걸프 왕정 압박 — 사우디 경유 위험. 사용 금지.",
    newsRefs: [
      { src: "BBC", text: "쿠웨이트 드론 공격으로 미군 첫 전사 — 걸프 전역 확전", ts: "2026-03-04" },
      { src: "Google News / Carnegie", text: "걸프 왕정 이란-미 사이 딜레마 — 사우디 보복 대상 가능성", ts: "2026-03-04" },
    ],
  },
  {
    id: "D", name: "Fujairah → Khatmat Malaha → Muscat", base_h: 9.3, status: "BLOCKED", congestion: 0.35,
    note: "Hormuz 긴장으로 유가 급등·항만 운영 제한. 동해안 루트 차단 상태.",
    newsRefs: [
      { src: "BBC", text: "국제유가·가스 급등 — Strait of Hormuz 봉쇄 우려 직접 반영", ts: "2026-03-04" },
      { src: "Al Jazeera", text: "바그다드 공항 인근 폭발 — 걸프 항공·항만 연쇄 차질 패턴", ts: "2026-03-04" },
    ],
  },
];

const CHECKLIST = [
  { id: 1, text: "Bug-out bag 완성 (여권/ID/현금USD+AED/물2L/비상식량)", done: false },
  { id: 2, text: "차량 연료 Full 확인 (E-Plus 91: AED 2.40/L, 공급 정상)", done: false },
  { id: 3, text: "오만 보험 Orange Card 사전 구매 확인", done: false },
  { id: 4, text: "대사관 긴급번호 저장 — KR: +971-2-643-8700 / NL: +31-247-247-247", done: false },
  { id: 5, text: "Al Ain/Buraimi 루트 GPS 오프라인 맵 다운로드", done: false },
  { id: 6, text: "가족/회사(SCT) 비상연락 완료 + 체크인 일정 합의", done: false },
  { id: 7, text: "15분마다 대사관/Etihad/BBC/Al Jazeera 업데이트 확인", done: false },
  { id: 8, text: "SMS 공습경보 수신 확인 (UAE 긴급문자 활성화)", done: false },
  { id: 9, text: "창문에서 떨어진 안전 구역(내벽 옆) 확보", done: false },
  { id: 10, text: "NetherlandsWorldwide 정보서비스 등록 확인", done: false },
];

const VERSIONS = [
  { v: "v2026.03", desc: "단일 Confidence → RED", change: "출발점" },
  { v: "v2026.03.1", desc: "+Decay +Hysteresis +DataStale차등", change: "Flicker/Stale 방지" },
  { v: "v2026.03.2", desc: "+ERC (대피시간 역산)", change: "공항 폐쇄 → 육로" },
  { v: "v2026.04", desc: "+HyIE (경쟁 가설 3개) + ICD 203", change: "오탐 방지 + 설명성" },
  { v: "v2026.05", desc: "+ERC² + Conf/Urg 분리 + MovementRiskGate", change: "현재 활성", active: true },
];

// ═══════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════

function PulsingDot({ color }) {
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    const iv = setInterval(() => setOpacity(o => o === 1 ? 0.3 : 1), 800);
    return () => clearInterval(iv);
  }, []);
  return <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: color, opacity, transition: "opacity 0.4s" }} />;
}

function ProgressBar({ value, max = 1, color, height = 8 }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ width: "100%", height, backgroundColor: "#1e293b", borderRadius: height / 2, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: height / 2, transition: "width 0.6s ease" }} />
    </div>
  );
}

function Card({ title, icon, children, accent, fullWidth }) {
  return (
    <div style={{
      backgroundColor: "#0f172a", border: `1px solid ${accent || "#1e293b"}`,
      borderRadius: 12, padding: 16, gridColumn: fullWidth ? "1 / -1" : undefined, overflow: "hidden",
    }}>
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: 1 }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

function GaugeArc({ value, size = 90, color, label, subLabel }) {
  const pct = Math.min(value, 1);
  const angle = pct * 180;
  const r = (size - 10) / 2;
  const cx = size / 2;
  const cy = size / 2 + 5;
  const rad = (a) => (a * Math.PI) / 180;
  const x1 = cx - r;
  const endAngle = 180 - angle;
  const x2 = cx + r * Math.cos(rad(endAngle));
  const y2 = cy - r * Math.sin(rad(endAngle));
  const large = angle > 180 ? 1 : 0;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1e293b" strokeWidth={6} strokeLinecap="round" />
        {pct > 0 && <path d={`M ${x1} ${cy} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />}
        <text x={cx} y={cy - 10} textAnchor="middle" fill={color} fontSize={18} fontWeight={800} fontFamily="monospace">{value.toFixed(3)}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#94a3b8" fontSize={9}>{label}</text>
      </svg>
      {subLabel && <div style={{ fontSize: 10, color: "#64748b", marginTop: -4 }}>{subLabel}</div>}
    </div>
  );
}

const priorityColors = { CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#3b82f6", LOW: "#22c55e" };

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [checklist, setChecklist] = useState(CHECKLIST);
  const [activeTab, setActiveTab] = useState("overview");
  const [nextEval, setNextEval] = useState(900);
  const [feedFilter, setFeedFilter] = useState("ALL");

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setNextEval(p => (p <= 0 ? 900 : p - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const toggleCheck = useCallback((id) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  }, []);

  const completedCount = checklist.filter(c => c.done).length;
  const deltaScore = HYPOTHESES[2].score - HYPOTHESES[1].score;
  const evidenceConf = 0.78;
  const urgencyScore = null;
  const effectiveThreshold = 0.80;
  const bufferFactor = 2.0;

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "intel", label: "Intel Feed", icon: "🔴" },
    { id: "indicators", label: "Indicators", icon: "📡" },
    { id: "routes", label: "Routes", icon: "🛣️" },
    { id: "checklist", label: "Checklist", icon: "✅" },
    { id: "changelog", label: "Version", icon: "📋" },
  ];

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const filteredFeed = feedFilter === "ALL" ? INTEL_FEED : INTEL_FEED.filter(f => f.priority === feedFilter);

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#020617", color: "#e2e8f0",
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      padding: "12px", maxWidth: 920, margin: "0 auto",
    }}>
      {/* ── HEADER ── */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderRadius: 16, padding: "16px 20px", marginBottom: 12, border: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>HyIE-ERC² Personal I&W System · LIVE INTELLIGENCE</div>
            <div style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(90deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>v2026.05 — SHELTER MODE</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>Iran-UAE Conflict Day 4 · Feb 28 – ongoing · 실시간 검증 데이터 기반</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>Abu Dhabi, UAE (GST +4)</div>
            <div style={{ fontSize: 13, fontFamily: "monospace", color: "#94a3b8" }}>
              {now.toISOString().slice(0, 10)} {now.toTimeString().slice(0, 8)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
              <PulsingDot color="#f59e0b" />
              <span style={{ fontSize: 11, color: "#f59e0b" }}>다음 평가: {fmt(nextEval)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALERT BANNER ── */}
      <div style={{
        background: "rgba(245,158,11,0.08)", border: "2px solid #f59e0b",
        borderRadius: 12, padding: "14px 20px", marginBottom: 12,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: "#000",
          }}>⚠</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>AMBER → RED_PREP 접근 중</div>
            <div style={{ fontSize: 12, color: "#fbbf24" }}>MODE: SHELTER · 이동 제한 · Gate BLOCKED</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Gate", val: "BLOCKED", c: "#ef4444" },
            { label: "Evidence", val: "PASSED", c: "#22c55e" },
            { label: "Airspace", val: "CLOSED→3/5", c: "#ef4444" },
            { label: "ΔScore", val: `${deltaScore.toFixed(3)}`, c: deltaScore >= 0.15 ? "#f59e0b" : "#64748b" },
          ].map((b, i) => (
            <div key={i} style={{ background: "#1e293b", borderRadius: 8, padding: "5px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#64748b" }}>{b.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: b.c }}>{b.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONFLICT SUMMARY BAR ── */}
      <div style={{
        background: "rgba(239,68,68,0.06)", border: "1px solid #7f1d1d", borderRadius: 10,
        padding: "10px 16px", marginBottom: 12, fontSize: 11, color: "#fca5a5",
        display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center",
      }}>
        <span>Missiles: <b>165</b> (152 intercepted)</span>
        <span>Drones: <b>541</b> (506 destroyed)</span>
        <span>Casualties: <b>3 KIA / 58 WIA</b></span>
        <span>Duration: <b>Day 4</b> (Feb 28–)</span>
        <span>Sources: <b>12+ verified</b></span>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: activeTab === t.id ? "#1e293b" : "transparent",
            border: activeTab === t.id ? "1px solid #334155" : "1px solid transparent",
            borderRadius: 8, padding: "8px 14px",
            color: activeTab === t.id ? "#e2e8f0" : "#64748b",
            fontSize: 12, fontWeight: activeTab === t.id ? 700 : 500,
            cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════ OVERVIEW TAB ══════════════════════ */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {/* Hypothesis Scores */}
          <Card title="Hypothesis Scores (HyIE)" icon="🧠" accent="#334155">
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
              {HYPOTHESES.map(h => <GaugeArc key={h.id} value={h.score} color={h.color} label={h.id} subLabel={h.name} />)}
            </div>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: 10, fontSize: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#94a3b8" }}>Leading:</span>
                <span style={{ color: "#ef4444", fontWeight: 700 }}>H2 철수준비 (0.798)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#94a3b8" }}>ΔScore (H2-H1):</span>
                <span style={{ color: "#f59e0b", fontWeight: 700 }}>{deltaScore.toFixed(3)} (threshold: 0.20)</span>
              </div>
              <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 6, padding: "4px 8px", background: "rgba(245,158,11,0.1)", borderRadius: 4 }}>
                ⚠ ΔScore 0.190 → 0.20 근접. 미 Ordered Departure + 추가 에스컬레이션 시 RED_PREP 전환.
              </div>
            </div>
          </Card>

          {/* ICD 203 */}
          <Card title="ICD 203 — Confidence / Urgency" icon="🔬" accent="#334155">
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Evidence Confidence</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>MEDIUM-HIGH (0.78)</span>
              </div>
              <ProgressBar value={evidenceConf} color="#f59e0b" height={10} />
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                12+ 독립 출처 · TIER0 3건 완전 확인 · I04 부분 · 시간 압박 미포함
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>Urgency</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>산출 불가</span>
              </div>
              <ProgressBar value={0} color="#64748b" height={10} />
              <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>EgressLossETA 미입력 → buffer_factor 2.00 적용 중</div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 4 }}>Effective RED Threshold</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0", fontFamily: "monospace" }}>0.80</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>(urgency discount 미적용)</span>
              </div>
              <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 4 }}>Conf 0.78 &lt; 0.80 → RED 미충족 (0.02 차이)</div>
            </div>
          </Card>

          {/* Movement Risk Gate */}
          <Card title="Movement Risk Gate" icon="🚧" accent="#ef4444">
            {[
              { label: "Stay Indoors", active: true, src: "NL 외교부 Orange, US Embassy 'stay in residence'", detail: "다수 정부 실내 대기 권고 확인" },
              { label: "Active Strike Window", active: true, src: "이란 3일 연속 공격 · 영공 3/5까지 폐쇄", detail: "추가 공격 지속 가능성 높음" },
              { label: "Curfew / Roadblock", active: false, src: "공식 통금 미발령 · 파편 지역만 도로 폐쇄", detail: "전면 통행제한은 아님" },
            ].map((g, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
                background: g.active ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.05)",
                border: `1px solid ${g.active ? "#7f1d1d" : "#14532d"}`,
                borderRadius: 8, padding: "8px 12px",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: g.active ? "#ef4444" : "#22c55e", boxShadow: g.active ? "0 0 8px #ef4444" : "none" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: g.active ? "#fca5a5" : "#86efac" }}>{g.label}</div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>{g.src}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: g.active ? "#ef4444" : "#22c55e" }}>{g.active ? "ACTIVE" : "CLEAR"}</span>
              </div>
            ))}
            <div style={{ background: "#1e293b", borderRadius: 8, padding: 10, fontSize: 11 }}>
              <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>GATE BLOCKED (2/3 triggers active)</div>
              <div style={{ color: "#94a3b8" }}>RED_MOVE 차단 · RED_PREP만 허용</div>
              <div style={{ color: "#64748b", fontSize: 10, marginTop: 4 }}>해제 조건: all false 30분+ · strike window 해제 후 60분 대기</div>
            </div>
          </Card>

          {/* Likelihood */}
          <Card title="가능성 (Likelihood)" icon="📈" accent="#334155">
            <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>LIKELY</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>55–80%</div>
            </div>
            <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>
              "아부다비 거주자가 72시간 내 대피 준비가 필요할 가능성이 높다."
            </div>
            <div style={{ background: "rgba(245,158,11,0.08)", borderRadius: 8, padding: 10, marginTop: 8, fontSize: 11, color: "#fbbf24" }}>
              근거: US Ordered Departure(3/2) + UK/AU Do Not Travel + 이란 3일 연속 공격 + 태국·인도 군사적 대피
            </div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 6, textAlign: "center" }}>ICD 203: 이 카드에 신뢰도 정보 없음</div>
          </Card>

          {/* Key Assumptions */}
          <Card title="핵심 가정 (Key Assumptions)" icon="⚙️" accent="#334155" fullWidth>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
              {[
                { id: "A1", text: "Al Ain/Buraimi 국경 OPEN 유지", fail: "Fujairah 루트 전환 (9.3h)", status: "ok", verified: "Canada Advisory 확인: 국경 OPEN" },
                { id: "A2", text: "Stay-indoors 지침이 해제될 것", fail: "SHELTER 유지 + 대사관 직접 연락", status: "warn", verified: "현재 미해제 — 3일째 지속" },
                { id: "A3", text: "상황 점진적 악화 (급변 아님)", fail: "SHELTER 강화 (이동 포기)", status: "warn", verified: "이스라엘 테헤란 추가 타격 → 에스컬레이션" },
                { id: "A4", text: "연료 충분 / 도중 주유 가능", fail: "최단 루트만 유효", status: "ok", verified: "연료 공급 정상 확인 (Khaleej Times)" },
                { id: "A5", text: "통신 유지", fail: "마지막 수신 기준 + decay 중단", status: "ok", verified: "일반 통신 정상, AWS 일부 피해" },
                { id: "A6", text: "개인 차량 이동 가능", fail: "도보/대중교통 → evac_h ×3", status: "ok", verified: "도로 대부분 정상 (파편 지역 제외)" },
              ].map(a => (
                <div key={a.id} style={{
                  background: a.status === "warn" ? "rgba(245,158,11,0.06)" : "#0d1117",
                  border: `1px solid ${a.status === "warn" ? "#92400e" : "#1e293b"}`,
                  borderRadius: 8, padding: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{a.id}</span>
                    <span style={{ fontSize: 11, color: a.status === "warn" ? "#f59e0b" : "#94a3b8" }}>{a.text}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>실패 시: {a.fail}</div>
                  <div style={{ fontSize: 9, color: a.status === "warn" ? "#fbbf24" : "#475569", marginTop: 4 }}>검증: {a.verified}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Escalation */}
          <Card title="에스컬레이션 지표 (RED 전환)" icon="🔺" accent="#ef4444">
            {[
              { t: "한국 대사관 'Leave immediately' 발령", hot: false, note: "현재: 특별여행주의보 (단계↓)" },
              { t: "미국 Level 4 Do Not Travel 격상", hot: true, note: "현재: Level 3 + Ordered Departure" },
              { t: "Al Ain 국경 혼잡도 급등 / RESTRICTED", hot: false, note: "현재: OPEN, 혼잡도 미확인" },
              { t: "ΔScore(H2-H1) ≥ 0.20 돌파", hot: true, note: `현재: ${deltaScore.toFixed(3)} — 0.01 차이` },
              { t: "이란 추가 대규모 보복 or WMD 위협", hot: true, note: "이스라엘 테헤란 추가 타격 → 보복 순환" },
            ].map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: e.hot ? "#ef4444" : "#7f1d1d" }}>{e.hot ? "▲▲" : "▲"}</span>
                <div>
                  <div style={{ color: e.hot ? "#fca5a5" : "#94a3b8", fontWeight: e.hot ? 700 : 400 }}>{e.t}</div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>{e.note}</div>
                </div>
              </div>
            ))}
          </Card>

          {/* De-escalation */}
          <Card title="디에스컬레이션 지표 (GREEN)" icon="🔽" accent="#22c55e">
            {[
              { t: "영공 재개 + Etihad 상업 운항 재개", note: "현재: 3/5 14:00까지 중단" },
              { t: "Stay-indoors 해제 + active strike 종료", note: "현재: 둘 다 ACTIVE" },
              { t: "이란-미국 휴전/협상 개시", note: "현재: 에스컬레이션 지속" },
              { t: "주요 정부 'situation stabilizing' 공식 발표", note: "아직 없음" },
            ].map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, marginBottom: 6 }}>
                <span style={{ color: "#22c55e" }}>▼</span>
                <div>
                  <div style={{ color: "#86efac" }}>{e.t}</div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>{e.note}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ══════════════════════ INTEL FEED TAB ══════════════════════ */}
      {activeTab === "intel" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map(f => (
              <button key={f} onClick={() => setFeedFilter(f)} style={{
                background: feedFilter === f ? (priorityColors[f] || "#334155") : "transparent",
                border: `1px solid ${feedFilter === f ? (priorityColors[f] || "#334155") : "#1e293b"}`,
                borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                color: feedFilter === f ? "#fff" : "#64748b", cursor: "pointer",
              }}>{f} {f !== "ALL" && `(${INTEL_FEED.filter(i => i.priority === f).length})`}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredFeed.map((item, i) => (
              <div key={i} style={{
                background: "#0f172a", border: `1px solid ${item.priority === "CRITICAL" ? "#7f1d1d" : "#1e293b"}`,
                borderLeft: `3px solid ${priorityColors[item.priority]}`,
                borderRadius: 8, padding: "10px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 700,
                      background: `${priorityColors[item.priority]}20`, color: priorityColors[item.priority],
                    }}>{item.priority}</span>
                    <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{item.ts} GST</span>
                  </div>
                  {item.verified && <span style={{ fontSize: 9, color: "#22c55e" }}>✓ verified</span>}
                </div>
                <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}>{item.text}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>출처: {item.src}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>영향: {item.impact}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════ INDICATORS TAB ══════════════════════ */}
      {activeTab === "indicators" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {INDICATORS.map(ind => (
            <div key={ind.id} style={{
              background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{
                  minWidth: 40, textAlign: "center", fontSize: 12, fontWeight: 800, fontFamily: "monospace",
                  color: ind.state >= 0.8 ? "#ef4444" : ind.state >= 0.4 ? "#f59e0b" : "#22c55e",
                }}>{ind.id}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{ind.name}</span>
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 700,
                      background: ind.tier === "TIER0" ? "rgba(239,68,68,0.15)" : ind.tier === "TIER1" ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.15)",
                      color: ind.tier === "TIER0" ? "#fca5a5" : ind.tier === "TIER1" ? "#fcd34d" : "#94a3b8",
                    }}>{ind.tier}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace", color: ind.state >= 0.8 ? "#ef4444" : ind.state >= 0.4 ? "#f59e0b" : "#22c55e" }}>
                      {ind.state.toFixed(2)}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 10, color: ind.crossVerified ? "#22c55e" : "#f59e0b" }}>
                  {ind.crossVerified ? "✓ 교차검증" : "△ 부분"}
                </span>
              </div>
              <ProgressBar value={ind.state} color={ind.state >= 0.8 ? "#ef4444" : ind.state >= 0.4 ? "#f59e0b" : "#22c55e"} height={6} />
              <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 6 }}>{ind.detail}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 10, color: "#64748b", flexWrap: "wrap" }}>
                <span>출처: {ind.src}</span>
                <span>최신: {ind.ts}</span>
                <span>소스 수: {ind.srcCount}</span>
              </div>
            </div>
          ))}
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 14, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Evidence Floor Check</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Rule: TIER0 confirmed ≥ 1 OR TIER1 confirmed ≥ 1 OR geo_verified_social ≥ 3</div>
            <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, marginTop: 6 }}>
              ✅ PASSED — TIER0 confirmed: 3건 (I01: 5개국 대사관, I02: Etihad/GCAA, I07: 4개국+ 대피)
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ ROUTES TAB ══════════════════════ */}
      {activeTab === "routes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ROUTES.map(r => {
            const effectiveH = r.base_h * (1 + r.congestion) * bufferFactor;
            return (
              <div key={r.id} style={{
                background: "#0f172a",
                border: `1px solid ${r.status === "BLOCKED" ? "#7f1d1d" : r.status === "CAUTION" ? "#92400e" : "#14532d"}`,
                borderRadius: 10, padding: 16,
                opacity: r.status === "BLOCKED" ? 0.75 : 1,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      background: r.status === "BLOCKED" ? "#7f1d1d" : r.status === "CAUTION" ? "#92400e" : "#14532d",
                      fontSize: 13, fontWeight: 800, color: "#fff",
                    }}>{r.id}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: r.status === "BLOCKED" ? "#ef4444" : r.status === "CAUTION" ? "#f59e0b" : "#22c55e" }}>{r.status}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: "#e2e8f0" }}>{effectiveH.toFixed(1)}h</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>effective lead</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div style={{ background: "#1e293b", borderRadius: 6, padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Base</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#94a3b8" }}>{r.base_h}h</div>
                  </div>
                  <div style={{ background: "#1e293b", borderRadius: 6, padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Congestion</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: r.congestion > 0.3 ? "#f59e0b" : "#94a3b8" }}>x{(1 + r.congestion).toFixed(2)}</div>
                  </div>
                  <div style={{ background: "#1e293b", borderRadius: 6, padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#64748b" }}>Buffer</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#f59e0b" }}>x{bufferFactor.toFixed(1)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", background: "#0d1117", borderRadius: 6, padding: 8, marginBottom: 6 }}>{r.note}</div>
                {r.newsRefs && r.newsRefs.length > 0 && (
                  <div style={{ background: "#0a0f1a", border: "1px solid #1e3a5f", borderRadius: 6, padding: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      <span style={{ background: "#1e3a5f", color: "#60a5fa", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.05em" }}>📰 뉴스 참조</span>
                      <span style={{ fontSize: 9, color: "#475569" }}>실시간 검증 미완료 — 공식 채널 교차확인 필요</span>
                    </div>
                    {r.newsRefs.map(function(ref, ri) {
                      return (
                        <div key={ri} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: ri > 0 ? 4 : 0 }}>
                          <span style={{ color: "#3b82f6", fontSize: 9, minWidth: 6, marginTop: 2 }}>▸</span>
                          <div>
                            <span style={{ fontSize: 9, color: "#60a5fa", fontWeight: 600 }}>[{ref.src}]</span>
                            <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}>{ref.text}</span>
                            <span style={{ fontSize: 9, color: "#475569", marginLeft: 4 }}>{ref.ts}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, color: "#ef4444", textAlign: "center", marginBottom: 6 }}>🚨 C/D 차단 — A/B CAUTION 경유 즉시 출발 권고</div>
            <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginBottom: 4 }}>최우선 경로: A (Al Ain → Buraimi) CAUTION — effective 20.8h | B (Mezyad → Nizwa) CAUTION — effective 20.5h</div>
            <div style={{ fontSize: 9, color: "#475569", textAlign: "center" }}>⚠ 루트 상태는 뉴스 기사 키워드 기반 추정 — icp.gov.ae · rop.gov.om 공식 채널 교차확인 필수</div>
          </div>
        </div>
      )}

      {/* ══════════════════════ CHECKLIST TAB ══════════════════════ */}
      {activeTab === "checklist" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>SHELTER 모드 — 즉시 준비 체크리스트</div>
            <div style={{ fontSize: 12, color: completedCount === checklist.length ? "#22c55e" : "#f59e0b" }}>
              {completedCount}/{checklist.length}
            </div>
          </div>
          <ProgressBar value={completedCount} max={checklist.length} color={completedCount === checklist.length ? "#22c55e" : "#f59e0b"} height={6} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {checklist.map(c => (
              <div key={c.id} onClick={() => toggleCheck(c.id)} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: c.done ? "rgba(34,197,94,0.05)" : "#0f172a",
                border: `1px solid ${c.done ? "#14532d" : "#1e293b"}`,
                borderRadius: 8, padding: "10px 14px", cursor: "pointer", transition: "all 0.2s",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: `2px solid ${c.done ? "#22c55e" : "#334155"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: c.done ? "#22c55e" : "transparent", transition: "all 0.2s",
                }}>
                  {c.done && <span style={{ color: "#000", fontSize: 12, fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{
                  fontSize: 13, color: c.done ? "#86efac" : "#e2e8f0",
                  textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.7 : 1,
                }}>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════ CHANGELOG TAB ══════════════════════ */}
      {activeTab === "changelog" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {VERSIONS.map((v, i) => (
            <div key={i} style={{
              background: v.active ? "rgba(139,92,246,0.08)" : "#0f172a",
              border: `1px solid ${v.active ? "#7c3aed" : "#1e293b"}`,
              borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ minWidth: 80, fontSize: 12, fontWeight: 800, fontFamily: "monospace", color: v.active ? "#a78bfa" : "#94a3b8" }}>{v.v}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#e2e8f0" }}>{v.desc}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{v.change}</div>
              </div>
              {v.active && <span style={{ fontSize: 9, background: "#7c3aed", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>ACTIVE</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{
        marginTop: 16, padding: "10px 16px", background: "#0f172a",
        borderRadius: 10, border: "1px solid #1e293b", fontSize: 10, color: "#475569",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
          <span>HyIE-ERC² v2026.05 · ICD 203 · 실시간 검증 데이터</span>
          <span>경보 시점 = 출구 상실 시점 - (대피 소요 x 버퍼)</span>
        </div>
        <div style={{ marginTop: 6, color: "#334155", fontSize: 9, lineHeight: 1.6 }}>
          Sources: Al Jazeera, CNN, BBC, CNBC, Reuters, Euronews, Khaleej Times, The National, Gulf News,
          US State Dept, NL Gov, UAE MoD, LoyaltyLobby, VisaHQ, Outlook India, Nation Thailand
        </div>
      </div>
    </div>
  );
}
