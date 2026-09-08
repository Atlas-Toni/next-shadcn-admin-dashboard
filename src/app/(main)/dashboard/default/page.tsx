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

import { MetricCards } from "./_components/metric-cards";
import { PerformanceOverview } from "./_components/performance-overview";
import { RecentTraces } from "./_components/recent-traces";

export const dynamic = "force-dynamic";

export default async function Page() {
  let metrics: AtlasMetrics;
  let dailyTraces: DailyTracePoint[];
  let recentTraces: RecentTraceRow[];
  try {
    [metrics, dailyTraces, recentTraces] = await Promise.all([
      getAtlasMetrics(),
      getTracesPerDay90d(),
      getRecentTraces(10),
    ]);
  } catch (err) {
    console.error("[dashboard] Logfire fetch failed:", err);
    metrics = emptyMetrics();
    dailyTraces = emptyDailyTraces();
    recentTraces = emptyRecentTraces();
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards metrics={metrics} />
      <PerformanceOverview data={dailyTraces} />
      <RecentTraces data={recentTraces} />
    </div>
  );
}
