import type { Usage } from "@/lib/usage";

function barColor(pct: number): string {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#10b981";
}

const nf = new Intl.NumberFormat("nl-NL");

export function UsageMeter({ usage }: { usage: Usage }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-sm uppercase tracking-wide">Gratis limieten</h2>
        <span className="text-muted-foreground text-xs">
          {usage.online ? `Actieve stem: ${usage.activeVoice ?? "geen (kostenrem actief)"}` : "ATLAS API offline"}
        </span>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {usage.bars.map((b) => (
          <li key={b.key}>
            <div className="flex justify-between text-xs">
              <span>{b.label}</span>
              <span className="tabular-nums">{b.pct}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(b.pct, b.used > 0 ? 1 : 0))}%`, background: barColor(b.pct) }}
              />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {nf.format(b.used)} / {nf.format(b.limit)} {b.unit} · reset {b.resets}
              {b.note ? ` · ${b.note}` : ""}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
