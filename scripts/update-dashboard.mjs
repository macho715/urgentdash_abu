import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data", "dashboard.json");
const REGISTRY_PATH = path.join(ROOT, "data", "source-registry.json");
const LOCK_PATH = path.join(ROOT, "data", ".dashboard-update.lock");
const MAX_INTEL_ITEMS = 12;
const LOCK_RETRY_MS = 900;
const LOCK_RETRY_LIMIT = 45;
const LOCK_STALE_MS = 10 * 60 * 1000;
const MIN_EVIDENCE_SOURCES = 2;
const FETCH_TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTags(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[#\w]+;/g, (s) => decodeEntity(s))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntity(entity) {
  return {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&#8211;": "-",
    "&#8212;": "—",
    "&#8230;": "…",
  }[entity] ?? entity;
}

function extractTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? stripTags(m[1]) : "";
}

function extractAttr(block = "", tag, attr) {
  const m = block.match(
    new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, "i"),
  );
  return m ? stripTags(m[1]) : "";
}

function parseTimestamp(value) {
  const text = String(value || "").trim();
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const m = text.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/i);
  if (m) {
    const month = monthMap[m[1].toLowerCase()];
    if (month !== undefined) {
      const d = new Date();
      d.setFullYear(d.getFullYear(), month, Number(m[2]));
      d.setHours(Number(m[3]), Number(m[4]), Number(m[5] || "0"), 0);
      return d;
    }
  }
  const d = new Date(text);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toTsIso(value) {
  const d = parseTimestamp(value);
  return d ? d.toISOString() : null;
}

function splitSources(raw = "") {
  return [...new Set(
    raw
      .split(/\/|,/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\s+\(.*?\)$/, "").trim())
      .filter(Boolean),
  )];
}

function itemFingerprint(item) {
  return `${item.text}|${item.src}|${item.impact}|${item.priority}|${item.tsIso}`;
}

function toHash(source) {
  return crypto.createHash("sha256").update(source, "utf8").digest("hex");
}

// Words that are media-type tokens, not publisher names — filter after split
const MEDIA_TYPE_TOKENS = new Set([
  "html", "rss", "json", "xml", "feed", "web", "page", "rss2",
]);

function deriveEvidenceFromSources(src = "") {
  // Strip "/ <url>" patterns BEFORE splitting (RSS parser appends article links as "/ https://...")
  // Without this, URL path segments (/news/2026/3/1/article) inflate sourceCount wrongly
  const cleanSrc = src.replace(/\s*\/\s*https?:\/\/\S*/g, "");
  const sources = splitSources(cleanSrc)
    .filter((s) => s && !MEDIA_TYPE_TOKENS.has(s.toLowerCase()));
  // Deduplicate by lowercased name
  const unique = [...new Set(sources.map((s) => s.toLowerCase()))];
  const sourceCount = unique.length;
  return {
    sourceCount,
    verified: sourceCount >= MIN_EVIDENCE_SOURCES,
  };
}

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = FETCH_TIMEOUT_MS, headers = {} } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeIntelItem(raw = {}) {
  const text = String(raw.text || "").trim();
  const src = String(raw.src || "");
  const tsIso = toTsIso(raw.tsIso || raw.ts) || toTsIso(new Date().toISOString());
  const source = deriveEvidenceFromSources(src);
  const normalized = {
    ...raw,
    text,
    src,
    tsIso,
    ts: tsIso ? tsIso.slice(0, 16).replace("T", " ") : raw.ts || "",
    priority: raw.priority || "MEDIUM",
    impact: String(raw.impact || "자동 수집 반영"),
    verified: source.verified,
    sourceCount: Number.isFinite(raw.sourceCount) && raw.sourceCount > 0 ? raw.sourceCount : source.sourceCount,
    _updatedAt: Date.parse(tsIso || Date.now()),
  };
  normalized.sourceCount = Math.max(normalized.sourceCount || 0, source.sourceCount);
  normalized.hash = raw.hash || toHash(itemFingerprint(normalized));
  return normalized;
}

function normalizeIndicators(payload = []) {
  return payload.map((raw = {}) => {
    const tsIso = toTsIso(raw.tsIso || raw.ts);
    const src = String(raw.src || "");
    const evidence = deriveEvidenceFromSources(src);
    const resolvedCount = Number.isFinite(raw.srcCount) && raw.srcCount > 0 ? raw.srcCount : evidence.sourceCount;
    return {
      ...raw,
      tsIso,
      ts: tsIso ? tsIso.slice(0, 16).replace("T", " ") : raw.ts || "",
      srcCount: resolvedCount,
      cv: resolvedCount >= MIN_EVIDENCE_SOURCES,
    };
  });
}

function normalizeMetadata(raw = {}) {
  const egressLossETA = Number(raw.egressLossETA);
  return {
    egressLossETA: Number.isFinite(egressLossETA) && egressLossETA >= 0 ? egressLossETA : 2,
  };
}

function normalizeDashboard(payload = {}) {
  const intelFeed = Array.isArray(payload?.intelFeed) ? payload.intelFeed : [];
  const indicators = Array.isArray(payload?.indicators) ? payload.indicators : [];
  const hypotheses = Array.isArray(payload?.hypotheses) ? payload.hypotheses : [];
  const routes = Array.isArray(payload?.routes) ? payload.routes : [];
  const checklist = Array.isArray(payload?.checklist) ? payload.checklist : [];
  return {
    intelFeed: intelFeed.map(normalizeIntelItem),
    indicators: normalizeIndicators(indicators),
    hypotheses,
    routes,
    checklist,
    metadata: normalizeMetadata(payload?.metadata || payload?.meta || {}),
  };
}

function parseRss(xml, source) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of itemBlocks.slice(0, source.maxItems || 3)) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date");
    const summary = extractTag(block, "description");
    if (!title) continue;
    const tsIso = toTsIso(pubDate) || new Date().toISOString();
    const rawItem = {
      priority: source.defaultPriority || "MEDIUM",
      text: `${title}${summary ? ` — ${summary.slice(0, 120)}` : ""}`.slice(0, 200),
      src: `${source.src || source.name} / ${link || "RSS"}`,
      impact: "자동 수집 반영",
      tsIso,
    };
    items.push(normalizeIntelItem(rawItem));
  }

  if (items.length === 0) {
    const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    for (const block of entryBlocks.slice(0, source.maxItems || 3)) {
      const title = extractTag(block, "title");
      const link = extractAttr(block, "link", "href") || extractTag(block, "id");
      const pubDate = extractTag(block, "updated") || extractTag(block, "published");
      const summary = extractTag(block, "summary") || extractTag(block, "content");
      if (!title) continue;
      const tsIso = toTsIso(pubDate) || new Date().toISOString();
      items.push(normalizeIntelItem({
        priority: source.defaultPriority || "MEDIUM",
        text: `${title}${summary ? ` — ${summary.slice(0, 120)}` : ""}`.slice(0, 200),
        src: `${source.src || source.name} / ${link || "ATOM"}`,
        impact: "자동 수집 반영",
        tsIso,
      }));
    }
  }

  if (items.length === 0 && source.emitChannelSummary) {
    const channelTitle = extractTag(xml, "title");
    const channelDesc = extractTag(xml, "description");
    const channelLink = extractTag(xml, "link");
    const channelTs = extractTag(xml, "lastBuildDate") || extractTag(xml, "updated");
    const text = `${channelTitle}${channelDesc ? ` — ${channelDesc.slice(0, 120)}` : ""}`.trim();
    if (text) {
      items.push(normalizeIntelItem({
        priority: source.defaultPriority || "LOW",
        text: text.slice(0, 200),
        src: `${source.src || source.name}${channelLink ? ` / ${channelLink}` : ""}`,
        impact: "상태 피드 요약",
        tsIso: toTsIso(channelTs) || new Date().toISOString(),
        // Keep this stable even if feed timestamp changes frequently.
        hash: toHash(`${source.id || source.name}|channel-summary|${text}`),
      }));
    }
  }

  return items;
}

function extractMeta(html, name) {
  // Handles both name= and property= (OpenGraph)
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']{4,})["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']{4,})["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']{4,})["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']{4,})["'][^>]+property=["']${name}["']`, "i"),
  ];
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m) return stripTags(m[1]).trim();
  }
  return "";
}

function extractFirstParagraph(html) {
  // Try article / main / section context first, then any <p>
  const zones = [
    /<(?:article|main|section)[^>]*>([\s\S]*?)<\/(?:article|main|section)>/i,
  ];
  for (const zone of zones) {
    const zm = html.match(zone);
    if (zm) {
      const pm = zm[1].match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (pm) {
        const text = stripTags(pm[1]).trim();
        if (text.length > 20) return text;
      }
    }
  }
  const pm = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (pm) {
    const text = stripTags(pm[1]).trim();
    if (text.length > 20) return text;
  }
  return "";
}

function parseHtml(html, source) {
  const pageTitle = extractTag(html, "title") || "";

  // Prefer og:description → description meta → first <h1> → first meaningful <p>
  const desc =
    extractMeta(html, "og:description") ||
    extractMeta(html, "description") ||
    extractTag(html, "h1") ||
    extractFirstParagraph(html);

  const rawText = desc && desc.length > 10
    ? `${pageTitle ? pageTitle + " — " : ""}${desc}`.slice(0, 220)
    : pageTitle.slice(0, 150);

  // Reject generic / useless page titles with no description
  const JUNK_TITLES = /^(home|index|error|403|404|503|technical difficulties|access denied|just a moment|please wait|cloudflare|웹 페이지 타이틀 갱신)$/i;
  if (!rawText || JUNK_TITLES.test(rawText.trim())) {
    return []; // Skip — no useful content
  }

  // Use source.src directly — do NOT append "/ HTML" (causes false verified)
  return [
    normalizeIntelItem({
      priority: source.defaultPriority || "LOW",
      text: rawText.trim(),
      src: source.src || source.name,
      impact: "자동 수집 반영",
      tsIso: new Date().toISOString(),
    }),
  ];
}

function parseJson(body, source) {
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return [];
  }

  // Support Azure-style feeds: { incidents: [...] } or { items: [...] } or root array
  const incidents =
    (Array.isArray(data) ? data : null) ||
    data?.incidents ||
    data?.items ||
    data?.value ||
    [];

  if (!Array.isArray(incidents)) return [];

  return incidents
    .slice(0, source.maxItems || 3)
    .map((item) => {
      const title = String(
        item.title || item.name || item.summary || item.description || ""
      ).trim();
      if (!title) return null;
      const tsRaw = item.lastModifiedTime || item.modifiedOn || item.pubDate || item.date || "";
      return normalizeIntelItem({
        priority: source.defaultPriority || "MEDIUM",
        text: title.slice(0, 200),
        src: source.src || source.name,
        impact: item.status || "자동 수집 반영",
        tsIso: tsRaw ? toTsIso(tsRaw) || new Date().toISOString() : new Date().toISOString(),
      });
    })
    .filter(Boolean);
}

const parsers = {
  rss: parseRss,
  html: parseHtml,
  json: parseJson,
};

function mergeIntelItems(nextItems, existingItems) {
  const merged = [...existingItems, ...nextItems];
  const seenHash = new Set();
  const seenContent = new Set();
  const deduped = [];

  for (const item of merged) {
    if (!item.text || !item.src) continue;
    const hash = item.hash || toHash(itemFingerprint(item));
    const content = `${item.tsIso}|${item.text}|${item.src}`;
    if (seenHash.has(hash) || seenContent.has(content)) continue;
    seenHash.add(hash);
    seenContent.add(content);
    deduped.push(item);
  }

  return deduped
    .sort((a, b) => (b._updatedAt || 0) - (a._updatedAt || 0))
    .slice(0, MAX_INTEL_ITEMS)
    .map((item) => {
      const { verified, sourceCount } = deriveEvidenceFromSources(item.src);
      const nextSourceCount = Number.isFinite(item.sourceCount) ? item.sourceCount : sourceCount;
      return {
        ...item,
        verified,
        sourceCount: Math.max(nextSourceCount, 0),
        hash: item.hash || toHash(itemFingerprint(item)),
      };
    });
}

async function acquireLock() {
  for (let i = 0; i < LOCK_RETRY_LIMIT; i += 1) {
    try {
      const handle = await fs.open(LOCK_PATH, "wx");
      await handle.writeFile(JSON.stringify({
        pid: process.pid,
        createdAt: new Date().toISOString(),
      }));
      await handle.close();
      return async () => fs.rm(LOCK_PATH, { force: true });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;

      try {
        const raw = await fs.readFile(LOCK_PATH, "utf8");
        const lock = JSON.parse(raw);
        const createdAt = Date.parse(lock.createdAt);
        const stale = !Number.isFinite(createdAt) || Date.now() - createdAt > LOCK_STALE_MS;
        if (stale) {
          await fs.rm(LOCK_PATH, { force: true });
          continue;
        }
      } catch (inner) {
        if (inner.code === "ENOENT") continue;
        throw inner;
      }

      await sleep(LOCK_RETRY_MS);
    }
  }
  throw new Error("failed to acquire lock");
}

async function readJsonSafe(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function fetchSource(source) {
  const res = await fetchWithTimeout(source.url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 urgentdash-scraper/1.0",
      "accept-language": "en-US,en;q=0.9",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "cache-control": "no-cache",
      "pragma": "no-cache",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  const parser = parsers[source.kind];
  if (!parser) return [];
  return parser(body, source);
}

async function main() {
  let releaseLock;

  try {
    releaseLock = await acquireLock();

    const registry = await readJsonSafe(REGISTRY_PATH, []);
    const base = normalizeDashboard(await readJsonSafe(DATA_PATH, {}));

    if (!Array.isArray(registry) || registry.length === 0) {
      console.log("No source registry entries. Exit.");
      return;
    }

    const nextItems = [];
    for (const source of registry) {
      if (!source?.enabled) continue;
      if (source.target !== "intelFeed") continue;
      try {
        const items = await fetchSource(source);
        nextItems.push(...items);
      } catch (error) {
        console.warn(`skip source ${source.id}`, error.message);
      }
    }

    if (nextItems.length === 0) {
      console.log("No new feed items found.");
      return;
    }

    const merged = mergeIntelItems(nextItems, base.intelFeed || []);
    const next = {
      ...base,
      intelFeed: merged,
    };
    await fs.writeFile(DATA_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log("dashboard.json updated", { count: merged.length });
  } finally {
    if (releaseLock) await releaseLock();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
