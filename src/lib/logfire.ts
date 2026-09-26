// ATLAS HUD -- Logfire data-layer (drop-in vervanging voor langfuse.ts)
// Query API: POST https://logfire-eu.pydantic.dev/v2/query
// Body: { sql: string, min_timestamp: ISO } -- min_timestamp is verplicht (partition-pruning)
// Response: { schema: {...}, data: Array<Record<string, unknown>> }

const BASE_URL = process.env.LOGFIRE_BASE_URL || "https://logfire-eu.pydantic.dev";
const TOKEN = process.env.LOGFIRE_READ_TOKEN || "";

export interface MetricPair {
  current: number;
  previous: number;
  pctChange: number;
}

export interface AtlasMetrics {
  traces: MetricPair;
  spans: MetricPair;
  gateDecisions: MetricPair;
  agentScans: MetricPair;
}

export interface DailyTracePoint {
  date: string;
  count: number;
}

export interface RecentTraceRow {
  id: string;
  name: string;
  timestamp: string;
  latency: number;
  status: "OK" | "Error";
}

interface LogfireQueryResponse<Row = Record<string, unknown>> {
  schema: unknown;
  data: Row[];
}

// Cache: 120s per query; gelijktijdige identieke queries delen één verzoek;
// bij een fout (bv. 429) wordt het laatste goede antwoord teruggegeven.
// Tijdstempels worden in de sleutel afgerond op het uur: stabiel binnen een uur,
// maar verschillende vensters (deze week / vorige week) krijgen een eigen sleutel.
const CACHE_TTL_MS = 120_000;
type CacheEntry = { expires: number; value?: unknown[]; pending?: Promise<unknown[]> };
const g = globalThis as unknown as { __logfireCache?: Map<string, CacheEntry> };
g.__logfireCache ??= new Map();
const queryCache: Map<string, CacheEntry> = g.__logfireCache;
const cacheKey = (sql: string) =>
  sql
    .replace(/(\d{4}-\d{2}-\d{2}T\d{2})[0-9:.]*Z/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

async function runQuery<Row = Record<string, unknown>>(sql: string, minTimestampISO: string): Promise<Row[]> {
  const key = cacheKey(sql);
  const hit = queryCache.get(key);
  if (hit?.value && hit.expires > Date.now()) return hit.value as Row[];
  if (hit?.pending) return hit.pending as Promise<Row[]>;
  const pending = fetchQuery<Row>(sql, minTimestampISO);
  queryCache.set(key, { expires: hit?.expires ?? 0, value: hit?.value, pending });
  try {
    const value = await pending;
    queryCache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
    return value;
  } catch (err) {
    if (hit?.value) {
      queryCache.set(key, { expires: Date.now() + CACHE_TTL_MS, value: hit.value });
      return hit.value as Row[];
    }
    queryCache.delete(key);
    throw err;
  }
}

async function fetchQuery<Row = Record<string, unknown>>(sql: string, minTimestampISO: string): Promise<Row[]> {
  if (!TOKEN) throw new Error("LOGFIRE_READ_TOKEN ontbreekt in env");
  const res = await fetch(`${BASE_URL}/v2/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ sql, min_timestamp: minTimestampISO }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Logfire query ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as LogfireQueryResponse<Row>;
  return json.data || [];
}

function pct(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

// --- Metrics: current 7d vs previous 7d ---

interface MetricsRow {
  traces: number | string;
  spans: number | string;
  gate_decisions: number | string;
  agent_scans: number | string;
}

async function fetchMetricsWindow(
  fromISO: string,
  toISO: string,
): Promise<{ traces: number; spans: number; gateDecisions: number; agentScans: number }> {
  const sql = `
    SELECT
      COUNT(DISTINCT trace_id) AS traces,
      COUNT(*) AS spans,
      SUM(CASE WHEN span_name = 'gate.decision' THEN 1 ELSE 0 END) AS gate_decisions,
      SUM(CASE WHEN span_name = 'agent.scan' THEN 1 ELSE 0 END) AS agent_scans
    FROM records
    WHERE start_timestamp >= '${fromISO}'
      AND start_timestamp <  '${toISO}'
  `;
  const rows = await runQuery<MetricsRow>(sql, fromISO);
  const r = rows[0] ?? { traces: 0, spans: 0, gate_decisions: 0, agent_scans: 0 };
  return {
    traces: Number(r.traces) || 0,
    spans: Number(r.spans) || 0,
    gateDecisions: Number(r.gate_decisions) || 0,
    agentScans: Number(r.agent_scans) || 0,
  };
}

export async function getAtlasMetrics(): Promise<AtlasMetrics> {
  const toISO = new Date().toISOString();
  const from7 = isoAgo(7 * DAY_MS);
  const from14 = isoAgo(14 * DAY_MS);
  const [cur, prev] = await Promise.all([fetchMetricsWindow(from7, toISO), fetchMetricsWindow(from14, from7)]);
  return {
    traces: { current: cur.traces, previous: prev.traces, pctChange: pct(cur.traces, prev.traces) },
    spans: { current: cur.spans, previous: prev.spans, pctChange: pct(cur.spans, prev.spans) },
    gateDecisions: {
      current: cur.gateDecisions,
      previous: prev.gateDecisions,
      pctChange: pct(cur.gateDecisions, prev.gateDecisions),
    },
    agentScans: {
      current: cur.agentScans,
      previous: prev.agentScans,
      pctChange: pct(cur.agentScans, prev.agentScans),
    },
  };
}

export function emptyMetrics(): AtlasMetrics {
  const zero: MetricPair = { current: 0, previous: 0, pctChange: 0 };
  return { traces: zero, spans: zero, gateDecisions: zero, agentScans: zero };
}

// --- 90d chart ---

interface DailyRow {
  day: string;
  count: number | string;
}

export async function getTracesPerDay90d(): Promise<DailyTracePoint[]> {
  const from = isoAgo(89 * DAY_MS);
  const sql = `
    SELECT
      DATE_TRUNC('day', start_timestamp) AS day,
      COUNT(DISTINCT trace_id) AS count
    FROM records
    WHERE start_timestamp >= '${from}'
    GROUP BY 1
    ORDER BY 1
  `;
  const rows = await runQuery<DailyRow>(sql, from);
  const byDate = new Map<string, number>(rows.map((r) => [String(r.day).slice(0, 10), Number(r.count) || 0]));
  const out: DailyTracePoint[] = [];
  const now = Date.now();
  for (let i = 89; i >= 0; i--) {
    const key = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    out.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  return out;
}

export function emptyDailyTraces(): DailyTracePoint[] {
  return [];
}

// --- Recent traces ---

interface RecentRow {
  trace_id: string;
  span_name: string;
  start_timestamp: string;
  duration: number | string | null;
  level: number;
}

export async function getRecentTraces(limit = 10): Promise<RecentTraceRow[]> {
  const from = isoAgo(7 * DAY_MS);
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 10;
  const sql = `
    SELECT
      trace_id,
      span_name,
      start_timestamp,
      duration,
      level
    FROM records
    WHERE start_timestamp >= '${from}'
      AND span_name NOT LIKE 'Failed to introspect%'
    ORDER BY start_timestamp DESC
    LIMIT ${safeLimit}
  `;
  const rows = await runQuery<RecentRow>(sql, from);
  return rows.map(
    (r): RecentTraceRow => ({
      id: r.trace_id,
      name: r.span_name || "(unnamed)",
      timestamp: r.start_timestamp,
      latency: Number(r.duration) || 0,
      status: Number(r.level) >= 17 ? "Error" : "OK",
    }),
  );
}

export function emptyRecentTraces(): RecentTraceRow[] {
  return [];
}

// --- Vandaag: aantallen per span-naam sinds middernacht (lokale tijd) ---

export async function getTodaySpanCounts(): Promise<Record<string, number>> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const from = midnight.toISOString();
  const sql = `
    SELECT span_name, COUNT(*) AS n
    FROM records
    WHERE start_timestamp >= '${from}'
    GROUP BY span_name
  `;
  const rows = await runQuery<{ span_name: string; n: number | string }>(sql, from);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.span_name || "(unnamed)"] = Number(r.n) || 0;
  return out;
}
