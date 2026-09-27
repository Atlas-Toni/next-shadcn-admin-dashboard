import {
  type AtlasMetrics,
  type DailyTracePoint,
  emptyDailyTraces,
  emptyMetrics,
  emptyRecentTraces,
  getAtlasMetrics,
  getRecentTraces,
  getTodaySpanCounts,
  getTracesPerDay90d,
  type RecentTraceRow,
} from "@/lib/logfire";
import { getProposalsSnapshot } from "@/lib/proposals";
import { getSystemStatus } from "@/lib/system";
import { getUsage } from "@/lib/usage";

import { OceanBento } from "./_components/ocean-bento";

export const dynamic = "force-dynamic";

export default async function Page() {
  let metrics: AtlasMetrics;
  let dailyTraces: DailyTracePoint[];
  let recentTraces: RecentTraceRow[];
  const snapshotPromise = getProposalsSnapshot();
  const usagePromise = getUsage();
  const systemPromise = getSystemStatus();
  const todayPromise = getTodaySpanCounts().catch((err) => {
    console.error("[dashboard] Logfire vandaag-telling mislukt:", err);
    return {} as Record<string, number>;
  });
  try {
    [metrics, dailyTraces, recentTraces] = await Promise.all([
      getAtlasMetrics(),
      getTracesPerDay90d(),
      getRecentTraces(40),
    ]);
  } catch (err) {
    console.error("[dashboard] Logfire fetch failed:", err);
    metrics = emptyMetrics();
    dailyTraces = emptyDailyTraces();
    recentTraces = emptyRecentTraces();
  }
  const [snapshot, today, usage, system] = await Promise.all([
    snapshotPromise,
    todayPromise,
    usagePromise,
    systemPromise,
  ]);

  return (
    <OceanBento
      metrics={metrics}
      daily={dailyTraces}
      traces={recentTraces}
      today={today}
      snapshot={snapshot}
      system={system}
      usage={usage}
    />
  );
}
