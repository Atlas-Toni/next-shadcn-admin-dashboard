import {
  type AtlasMetrics,
  type DailyTracePoint,
  emptyDailyTraces,
  emptyMetrics,
  getAtlasMetrics,
  getTracesPerDay90d,
} from "@/lib/langfuse";

import { MetricCards } from "./_components/metric-cards";
import { PerformanceOverview } from "./_components/performance-overview";
import { SubscriberOverview } from "./_components/subscriber-overview";

export const dynamic = "force-dynamic";

export default async function Page() {
  let metrics: AtlasMetrics;
  let dailyTraces: DailyTracePoint[];
  try {
    [metrics, dailyTraces] = await Promise.all([getAtlasMetrics(), getTracesPerDay90d()]);
  } catch (err) {
    console.error("[dashboard] Langfuse fetch failed:", err);
    metrics = emptyMetrics();
    dailyTraces = emptyDailyTraces();
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards metrics={metrics} />
      <PerformanceOverview data={dailyTraces} />
      <SubscriberOverview />
    </div>
  );
}
