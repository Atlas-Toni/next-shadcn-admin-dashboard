import { readFileSync } from "fs";
try {
  readFileSync(".env.local", "utf-8").split("\n").forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
} catch { console.error("Kan .env.local niet lezen"); process.exit(1); }

const HOST = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com";
const PK = process.env.LANGFUSE_PUBLIC_KEY;
const SK = process.env.LANGFUSE_SECRET_KEY;
if (!PK || !SK) { console.error("Missing LANGFUSE_PUBLIC_KEY of LANGFUSE_SECRET_KEY"); process.exit(1); }

console.log(`Host:       ${HOST}`);
console.log(`Public key: ${PK.slice(0, 12)}...`);

const auth = "Basic " + Buffer.from(`${PK}:${SK}`).toString("base64");
const to = new Date().toISOString();
const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const url = new URL(`${HOST}/api/public/metrics/daily`);
url.searchParams.set("fromTimestamp", from);
url.searchParams.set("toTimestamp", to);

console.log(`\nFetching daily metrics 7d...`);
const res = await fetch(url.toString(), { headers: { Authorization: auth } });
console.log(`Status: ${res.status} ${res.statusText}`);
if (!res.ok) { console.error(await res.text()); process.exit(1); }

const days = (await res.json()).data || [];
console.log(`Aantal dagen data: ${days.length}`);
if (days[0]) console.log(`Eerste dag (raw):`, JSON.stringify(days[0], null, 2));

const t = days.reduce((a, d) => ({
  traces: a.traces + d.countTraces,
  obs:    a.obs + d.countObservations,
  tokens: a.tokens + (d.usage?.reduce((s, u) => s + (u.totalUsage || 0), 0) || 0),
  cost:   a.cost + (d.totalCost || 0),
}), { traces: 0, obs: 0, tokens: 0, cost: 0 });

console.log("\n=== Aggregaties (7d) ===");
console.log(`  Traces:    ${t.traces}`);
console.log(`  LLM Calls: ${t.obs}`);
console.log(`  Tokens:    ${t.tokens.toLocaleString()}`);
console.log(`  Cost USD:  $${t.cost.toFixed(4)}`);
