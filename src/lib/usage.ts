// Kostenmeter: haalt gebruik van gratis limieten op (ATLAS-API + Logfire).
const API_URL = process.env.ATLAS_API_URL ?? "http://127.0.0.1:8787";
const LOGFIRE_URL = "https://logfire-eu.pydantic.dev/v2/query";
const LOGFIRE_LIMIT = 10_000_000;

export type UsageBar = {
  key: string;
  label: string;
  used: number;
  limit: number;
  pct: number;
  resets: string;
  unit: string;
  note?: string;
};

export type Usage = { online: boolean; activeVoice: string | null; bars: UsageBar[] };

type ApiUsage = {
  active_voice: string | null;
  tts: { family: string; used: number; limit: number; pct: number; resets: string }[];
  groq: { requests: number; limit_requests: number; pct: number; remaining_requests: number | null };
  logfire: { resets: string };
};

const FAMILY_LABEL: Record<string, string> = {
  chirp3: "Stem Charon (Chirp3)",
  wavenet: "Stem Wavenet-B (terugval 1)",
  standard: "Stem Standard-B (terugval 2)",
};

let logfireCache: { month: string; value: number; at: number } | null = null;
let logfireFailAt = 0;

async function logfireMonthCount(): Promise<number | null> {
  const token = process.env.LOGFIRE_READ_TOKEN ?? "";
  if (token === "") return null;
  const month = new Date().toISOString().slice(0, 7);
  if (logfireCache && logfireCache.month === month && Date.now() - logfireCache.at < 10 * 60_000) {
    return logfireCache.value;
  }
  if (Date.now() - logfireFailAt < 5 * 60_000) return null;
  try {
    const res = await fetch(LOGFIRE_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sql: "SELECT COUNT(*) AS n FROM records", min_timestamp: `${month}-01T00:00:00Z` }),
    });
    if (res.ok === false) {
      logfireFailAt = Date.now();
      return null;
    }
    const data = await res.json();
    const n = Number(data?.data?.[0]?.n);
    if (Number.isFinite(n) === false) return null;
    logfireCache = { month, value: n, at: Date.now() };
    return n;
  } catch {
    logfireFailAt = Date.now();
    return null;
  }
}

export async function getUsage(): Promise<Usage> {
  const logfirePromise = logfireMonthCount();
  let s: ApiUsage | null = null;
  try {
    const res = await fetch(`${API_URL}/usage`, { cache: "no-store" });
    if (res.ok) s = (await res.json()) as ApiUsage;
  } catch {
    s = null;
  }
  const lf = await logfirePromise;
  const bars: UsageBar[] = [];
  if (s) {
    const g = s.groq;
    bars.push({
      key: "groq",
      label: "Brein (Groq)",
      used: g.requests,
      limit: g.limit_requests,
      pct: g.pct,
      resets: "dagelijks",
      unit: "verzoeken",
      note: typeof g.remaining_requests === "number" ? `Groq meldt nog ${g.remaining_requests} over` : undefined,
    });
    for (const t of s.tts) {
      bars.push({
        key: `tts-${t.family}`,
        label: FAMILY_LABEL[t.family] ?? t.family,
        used: t.used,
        limit: t.limit,
        pct: t.pct,
        resets: t.resets,
        unit: "tekens",
      });
    }
  }
  bars.push({
    key: "logfire",
    label: "Logboek (Logfire)",
    used: lf ?? 0,
    limit: LOGFIRE_LIMIT,
    pct: lf === null ? 0 : Math.round((1000 * lf) / LOGFIRE_LIMIT) / 10,
    resets: s?.logfire?.resets ?? "1e van de maand",
    unit: "records",
    note: lf === null ? "niet uit te lezen" : undefined,
  });
  bars.push({
    key: "cloudflare",
    label: "Beelden (Cloudflare)",
    used: 0,
    limit: 10_000,
    pct: 0,
    resets: "02:00 NL",
    unit: "neurons",
    note: "nog niet in gebruik",
  });
  return { online: s !== null, activeVoice: s?.active_voice ?? null, bars };
}
