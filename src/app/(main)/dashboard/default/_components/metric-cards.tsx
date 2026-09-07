import { Activity, Boxes, ShieldCheck, TrendingDown, TrendingUp, Waypoints } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AtlasMetrics, MetricPair } from "@/lib/langfuse";

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  metric: MetricPair;
  caption: string;
}

const fmt = (n: number) => n.toLocaleString("nl-NL");
const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function MetricCard({ label, value, icon, metric, caption }: MetricCardProps) {
  const up = metric.pctChange >= 0;
  const Trend = up ? TrendingUp : TrendingDown;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            {icon}
          </div>
        </CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">{value}</div>
          <Badge variant={up ? "default" : "destructive"}>
            <Trend className="size-3" />
            {fmtPct(metric.pctChange)}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">{caption}</p>
      </CardContent>
    </Card>
  );
}

interface Props {
  metrics: AtlasMetrics;
}

export function MetricCards({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <MetricCard
        label="Traces (7d)"
        value={fmt(metrics.traces.current)}
        icon={<Activity className="size-4" />}
        metric={metrics.traces}
        caption={`Vorige week: ${fmt(metrics.traces.previous)}`}
      />
      <MetricCard
        label="Spans (7d)"
        value={fmt(metrics.spans.current)}
        icon={<Boxes className="size-4" />}
        metric={metrics.spans}
        caption={`Vorige week: ${fmt(metrics.spans.previous)}`}
      />
      <MetricCard
        label="Gate decisions (7d)"
        value={fmt(metrics.gateDecisions.current)}
        icon={<ShieldCheck className="size-4" />}
        metric={metrics.gateDecisions}
        caption={`Vorige week: ${fmt(metrics.gateDecisions.previous)}`}
      />
      <MetricCard
        label="Agent scans (7d)"
        value={fmt(metrics.agentScans.current)}
        icon={<Waypoints className="size-4" />}
        metric={metrics.agentScans}
        caption={`Vorige week: ${fmt(metrics.agentScans.previous)}`}
      />
    </div>
  );
}
