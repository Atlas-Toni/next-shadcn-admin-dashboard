import { type AtlasMetrics, emptyMetrics, getAtlasMetrics } from "@/lib/langfuse";

import { MetricCards } from "./_components/metric-cards";
import { PerformanceOverview } from "./_components/performance-overview";
import { SubscriberOverview } from "./_components/subscriber-overview";

export const dynamic = "force-dynamic";

export default async function Page() {
  let metrics: AtlasMetrics;
  try {
    metrics = await getAtlasMetrics();
  } catch (err) {
    console.error("[dashboard] Langfuse fetch failed:", err);
    metrics = emptyMetrics();
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards metrics={metrics} />
      <PerformanceOverview />
      <SubscriberOverview />
    </div>
  );
}
