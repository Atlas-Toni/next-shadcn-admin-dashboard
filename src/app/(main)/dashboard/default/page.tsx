import {
  type AtlasMetrics,
  type DailyTracePoint,
  emptyDailyTraces,
  emptyMetrics,
  emptyRecentTraces,
  getAtlasMetrics,
  getRecentTraces,
  getTracesPerDay90d,
  type RecentTraceRow,
} from "@/lib/logfire";
import { getProposalsSnapshot } from "@/lib/proposals";

import { OceanBento } from "./_components/ocean-bento";

export const dynamic = "force-dynamic";

export default async function Page() {
  let metrics: AtlasMetrics;
  let dailyTraces: DailyTracePoint[];
  let recentTraces: RecentTraceRow[];
  const snapshotPromise = getProposalsSnapshot();
  try {
    [metrics, dailyTraces, recentTraces] = await Promise.all([
      getAtlasMetrics(),
      getTracesPerDay90d(),
      getRecentTraces(18),
    ]);
  } catch (err) {
    console.error("[dashboard] Logfire fetch failed:", err);
    metrics = emptyMetrics();
    dailyTraces = emptyDailyTraces();
    recentTraces = emptyRecentTraces();
  }
  const snapshot = await snapshotPromise;

  return <OceanBento metrics={metrics} daily={dailyTraces} traces={recentTraces} snapshot={snapshot} />;
}
