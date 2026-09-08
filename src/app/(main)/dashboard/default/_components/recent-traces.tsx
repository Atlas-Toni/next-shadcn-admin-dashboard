import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentTraceRow } from "@/lib/logfire";

interface RecentTracesProps {
  data: RecentTraceRow[];
}

function formatLatency(ns: number): string {
  if (!ns) return "—";
  // Logfire duration is in nanoseconds (OTel standaard); toon in ms voor leesbaarheid
  const ms = ns / 1_000_000;
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("nl-NL", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function RecentTraces({ data }: RecentTracesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">Recente traces</CardTitle>
        <CardDescription>Laatste {data.length} spans uit Logfire — laatste 7 dagen, nieuwste bovenaan.</CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">Nog geen traces in de laatste 7 dagen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4 text-left font-medium">Span</th>
                  <th className="py-2 pr-4 text-left font-medium">Tijd</th>
                  <th className="py-2 pr-4 text-right font-medium">Duur</th>
                  <th className="py-2 pr-4 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Trace ID</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id + row.timestamp} className="hover:bg-muted/40 border-b last:border-b-0">
                    <td className="py-2 pr-4 font-mono text-xs">{row.name}</td>
                    <td className="py-2 pr-4 text-xs whitespace-nowrap">{formatTimestamp(row.timestamp)}</td>
                    <td className="py-2 pr-4 text-right font-mono text-xs">{formatLatency(row.latency)}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          row.status === "Error"
                            ? "inline-block rounded bg-red-500/15 px-2 py-0.5 text-xs text-red-500"
                            : "inline-block rounded bg-green-500/15 px-2 py-0.5 text-xs text-green-500"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground py-2 font-mono text-xs">{row.id.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
