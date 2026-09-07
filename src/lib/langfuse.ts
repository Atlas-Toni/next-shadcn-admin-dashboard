const HOST = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com";
const PK = process.env.LANGFUSE_PUBLIC_KEY || "";
const SK = process.env.LANGFUSE_SECRET_KEY || "";

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

const auth = () => `Basic ${Buffer.from(`${PK}:${SK}`).toString("base64")}`;

interface DailyMetric {
  date: string;
  countTraces: number;
  countObservations: number;
}

async function fetchDaily(fromISO: string, toISO: string): Promise<DailyMetric[]> {
  const url = new URL(`${HOST}/api/public/metrics/daily`);
  url.searchParams.set("fromTimestamp", fromISO);
  url.searchParams.set("toTimestamp", toISO);
  const res = await fetch(url.toString(), { headers: { Authorization: auth() }, cache: "no-store" });
  if (!res.ok) throw new Error(`Langfuse daily ${res.status}`);
  return (await res.json()).data || [];
}

async function countTracesByName(name: string, fromISO: string, toISO: string): Promise<number> {
  const url = new URL(`${HOST}/api/public/traces`);
  url.searchParams.set("name", name);
  url.searchParams.set("fromTimestamp", fromISO);
  url.searchParams.set("toTimestamp", toISO);
  url.searchParams.set("limit", "100");
  const res = await fetch(url.toString(), { headers: { Authorization: auth() }, cache: "no-store" });
  if (!res.ok) throw new Error(`Langfuse traces ${res.status}`);
  const json = await res.json();
  return json.meta?.totalItems ?? (json.data?.length || 0);
}

function pct(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}
const aggDaily = (days: DailyMetric[]) => ({
  traces: days.reduce((s, d) => s + d.countTraces, 0),
  spans: days.reduce((s, d) => s + d.countObservations, 0),
});

export async function getAtlasMetrics(): Promise<AtlasMetrics> {
  if (!PK || !SK) throw new Error("Langfuse keys ontbreken in env");
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const to = new Date(now).toISOString();
  const from7 = new Date(now - 7 * day).toISOString();
  const from14 = new Date(now - 14 * day).toISOString();

  const [dailyCur, dailyPrev, gateCur, gatePrev, scanCur, scanPrev] = await Promise.all([
    fetchDaily(from7, to),
    fetchDaily(from14, from7),
    countTracesByName("gate.decision", from7, to),
    countTracesByName("gate.decision", from14, from7),
    countTracesByName("agent.scan", from7, to),
    countTracesByName("agent.scan", from14, from7),
  ]);

  const cur = aggDaily(dailyCur);
  const prev = aggDaily(dailyPrev);

  return {
    traces: { current: cur.traces, previous: prev.traces, pctChange: pct(cur.traces, prev.traces) },
    spans: { current: cur.spans, previous: prev.spans, pctChange: pct(cur.spans, prev.spans) },
    gateDecisions: { current: gateCur, previous: gatePrev, pctChange: pct(gateCur, gatePrev) },
    agentScans: { current: scanCur, previous: scanPrev, pctChange: pct(scanCur, scanPrev) },
  };
}

export function emptyMetrics(): AtlasMetrics {
  const zero: MetricPair = { current: 0, previous: 0, pctChange: 0 };
  return { traces: zero, spans: zero, gateDecisions: zero, agentScans: zero };
}

// --- Chart & tabel data voor default dashboard (A2) ---

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

export async function getTracesPerDay90d(): Promise<DailyTracePoint[]> {
  if (!PK || !SK) throw new Error("Langfuse keys ontbreken in env");
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const from = new Date(now - 89 * day).toISOString();
  const to = new Date(now).toISOString();
  const days = await fetchDaily(from, to);
  const byDate = new Map<string, number>(days.map((d) => [d.date.slice(0, 10), d.countTraces]));
  const out: DailyTracePoint[] = [];
  for (let i = 89; i >= 0; i--) {
    const key = new Date(now - i * day).toISOString().slice(0, 10);
    out.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  return out;
}

interface RawTrace {
  id: string;
  name: string | null;
  timestamp: string;
  latency: number | null;
  output: unknown;
}

function extractStatus(output: unknown): "OK" | "Error" {
  if (!output || typeof output !== "object") return "OK";
  const o = output as Record<string, unknown>;
  if (o.error) return "Error";
  const result = o.result;
  if (result && typeof result === "object" && (result as Record<string, unknown>).error) return "Error";
  return "OK";
}

export async function getRecentTraces(limit = 10): Promise<RecentTraceRow[]> {
  if (!PK || !SK) throw new Error("Langfuse keys ontbreken in env");
  const url = new URL(`${HOST}/api/public/traces`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("orderBy", "timestamp.desc");
  const res = await fetch(url.toString(), { headers: { Authorization: auth() }, cache: "no-store" });
  if (!res.ok) throw new Error(`Langfuse recent traces ${res.status}`);
  const json = await res.json();
  const rows: RawTrace[] = json.data || [];
  return rows.map(
    (t): RecentTraceRow => ({
      id: t.id,
      name: t.name ?? "(unnamed)",
      timestamp: t.timestamp,
      latency: t.latency ?? 0,
      status: extractStatus(t.output),
    }),
  );
}

export function emptyDailyTraces(): DailyTracePoint[] {
  return [];
}
export function emptyRecentTraces(): RecentTraceRow[] {
  return [];
}
