import type { CSSProperties } from "react";

import { JetBrains_Mono } from "next/font/google";

import { GeistSans } from "geist/font/sans";

import type { AtlasMetrics, DailyTracePoint, RecentTraceRow } from "@/lib/logfire";
import type { Proposal, ProposalsSnapshot } from "@/lib/proposals";

import { AutoRefresh } from "./auto-refresh";
import { LiveClock } from "./live-clock";
import s from "./ocean-bento.module.css";
import { DemoCleanup, ProposalActions } from "./proposal-actions";
import { PuroLiveLines, PuroStatusCard } from "./puro-live";

const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-atlas-mono" });

const TZ = "Europe/Amsterdam";
const area = (col: string, row: string): CSSProperties => ({ gridColumn: col, gridRow: row });
const nl = (n: number) => n.toLocaleString("nl-NL");
const pctLabel = (p: number) =>
  `${p >= 0 ? "▲ +" : "▼ "}${p.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function fmtDur(ns: number): string {
  if (!ns) return "";
  const ms = ns / 1_000_000;
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: TZ });
const shortTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const stampOf = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TZ,
  });
const isToday = (iso?: string) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

const VOICE_RE = /puro|voice|transcribe|wake|tts|stt/i;
const DEMO_RE = /^\s*demo\b/i;
/** Agents die nog placeholder zijn: grijs "gepland". */
const PLANNED = new Set(["content", "scout", "web_builder"]);
/** Geschrapt (23 sept): niet tonen. */
const HIDDEN = new Set(["kids"]);

interface Props {
  metrics: AtlasMetrics;
  daily: DailyTracePoint[];
  traces: RecentTraceRow[];
  today: Record<string, number>;
  snapshot: ProposalsSnapshot;
}

interface TraceGroup {
  name: string;
  err: boolean;
  first: RecentTraceRow;
  last: RecentTraceRow;
  count: number;
}

interface TermLine {
  key: string;
  at: number;
  iso: string;
  tag: string;
  msg: string;
  tagColor: string;
  msgColor: string;
}

const shortStamp = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });

export function OceanBento({ metrics, daily, traces, today, snapshot }: Props) {
  const connected = snapshot.connected;

  // Sporen: laatste 30 dagen als staafjes
  const last30 = daily.slice(-30);
  const max = Math.max(0, ...last30.map((d) => d.count));
  const bars = last30.map((d, i) => ({
    key: d.date,
    h: max > 0 ? Math.max(3, Math.round((d.count / max) * 100)) : 3,
    last: i === last30.length - 1,
    title: `${d.date}: ${d.count}`,
  }));

  // Terminal: herhalingen samenvouwen, oudste boven, nieuwste onder
  const groups: TraceGroup[] = [];
  for (const t of [...traces].reverse()) {
    const err = t.status === "Error";
    const g = groups[groups.length - 1];
    if (g && g.name === t.name && g.err === err) {
      g.count += 1;
      g.last = t;
    } else {
      groups.push({ name: t.name, err, first: t, last: t, count: 1 });
    }
  }
  const traceLines: TermLine[] = groups.map((g, i) => {
    const voice = VOICE_RE.test(g.name);
    return {
      key: `t-${g.last.id}-${g.last.timestamp}-${i}`,
      at: new Date(g.last.timestamp).getTime(),
      iso: g.last.timestamp,
      tag: `[${g.name}]`,
      msg:
        g.count > 1
          ? `×${g.count} · ${shortTime(g.first.timestamp)} → ${shortTime(g.last.timestamp)}${g.err ? " · fouten" : " · niets bijzonders"}`
          : [fmtDur(g.last.latency), `trace ${g.last.id.slice(0, 12)}…`].filter(Boolean).join(" · "),
      tagColor: g.err ? "#E5534B" : voice ? "#5B9BD5" : "#6E8BAD",
      msgColor: g.err ? "#F2A09B" : voice ? "#DCEAF7" : "#A9BFD8",
    };
  });

  // Echte gebeurtenissen uit de voorstellen: nieuw voorstel + jouw JA/NEE
  const eventLines: TermLine[] = [];
  for (const p of [...snapshot.pending, ...snapshot.history]) {
    if (p.created_at) {
      eventLines.push({
        key: `c-${p.id}`,
        at: new Date(p.created_at).getTime(),
        iso: p.created_at,
        tag: `[${p.agent}]`,
        msg: `nieuw voorstel: ${p.title}`,
        tagColor: "#5B9BD5",
        msgColor: "#DCEAF7",
      });
    }
    if (p.resolved_at && (p.status === "approved" || p.status === "done" || p.status === "rejected")) {
      const yes = p.status !== "rejected";
      eventLines.push({
        key: `r-${p.id}`,
        at: new Date(p.resolved_at).getTime(),
        iso: p.resolved_at,
        tag: "[reviewgate]",
        msg: `${yes ? "JA" : "NEE"}: ${p.title}`,
        tagColor: "#DCEAF7",
        msgColor: yes ? "#9BE8B8" : "#9FB6D1",
      });
    }
  }
  const lines = [...traceLines, ...eventLines]
    .filter((l) => Number.isFinite(l.at))
    .sort((a, b) => a.at - b.at)
    .slice(-16)
    .map((l, i) => ({ ...l, n: i + 1, ts: isToday(l.iso) ? timeOf(l.iso) : shortStamp(l.iso) }));

  // Agents: eerlijke status
  const openPer = new Map<string, number>();
  for (const p of snapshot.pending) openPer.set(p.agent, (openPer.get(p.agent) ?? 0) + 1);
  const agents = snapshot.agents
    .filter((name) => !HIDDEN.has(name))
    .map((name) => ({ name, planned: PLANNED.has(name), open: openPer.get(name) ?? 0 }))
    .sort((a, b) => Number(a.planned) - Number(b.planned) || a.name.localeCompare(b.name));
  const liveCount = agents.filter((a) => !a.planned).length;

  // Voorstellen: echte eerst; demo's + oude transcripties apart op te ruimen
  const isDemo = (p: Proposal) => DEMO_RE.test(p.title);
  const isOldTranscript = (p: Proposal) => p.agent === "transcribe_agent";
  const isNoise = (p: Proposal) => isDemo(p) || isOldTranscript(p);
  const demoCount = snapshot.pending.filter(isDemo).length;
  const transcriptCount = snapshot.pending.filter((p) => !isDemo(p) && isOldTranscript(p)).length;
  const noiseIds = snapshot.pending.filter(isNoise).map((p) => p.id);
  const cleanupConfirm = `${demoCount} demo's en ${transcriptCount} oude transcripties afwijzen? Echte mails en afspraken blijven staan.`;
  const shownPending: Proposal[] = [
    ...snapshot.pending.filter((p) => !isNoise(p)),
    ...snapshot.pending.filter(isNoise),
  ];

  // Vandaag in gewone taal
  const scansToday = today["agent.scan"] ?? 0;
  const decisionsToday = today["gate.decision"] ?? 0;
  const newToday = [...snapshot.pending, ...snapshot.history].filter((p) => isToday(p.created_at)).length;

  const tableRows = traces.slice(0, 5);

  return (
    <div className={`${s.root} ${GeistSans.variable} ${mono.variable} notranslate`} translate="no" lang="nl">
      <AutoRefresh seconds={15} />

      <header className={s.header}>
        <div className={s.brand}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="#5B9BD5"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M9 1.5 16.5 16.5H1.5Z" />
            <path d="M5.2 11.5h7.6" />
          </svg>
          <span className={s.mono} style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.18em" }}>
            ATLAS
          </span>
          <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 12 }}>
            / hud / ocean
          </span>
        </div>
        <div className={s.headerRight}>
          <span className={s.status}>
            <span className={connected ? s.dot : s.ringOff} />
            <span
              className={`${s.mono} ${connected ? s.accent : s.dim}`}
              style={{ fontSize: 11, letterSpacing: "0.12em" }}
            >
              {connected ? "LIVE" : "OFFLINE"}
            </span>
          </span>
          <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 11 }}>
            api :8787 · hud :3001
          </span>
          <LiveClock className={s.mono} />
        </div>
      </header>

      <div className={s.grid}>
        {/* Sporen 7d */}
        <section className={s.cell} style={{ ...area("1 / 4", "1 / 3"), padding: "18px 18px 16px", gap: 10 }}>
          <div className={s.row}>
            <span className={s.lbl}>sporen · 7d</span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>logfire-eu</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span className={s.big} style={{ fontSize: 64 }}>
              {nl(metrics.traces.current)}
            </span>
            <span className={`${s.mono} ${s.accent}`} style={{ fontSize: 11 }}>
              {pctLabel(metrics.traces.pctChange)}
            </span>
          </div>
          <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 11 }}>
            vorige week {nl(metrics.traces.previous)}
          </span>
          <div className={s.bars}>
            {bars.map((b) => (
              <div
                key={b.key}
                title={b.title}
                className={`${s.bar} ${b.last ? s.barLast : ""}`}
                style={{ height: `${b.h}%` }}
              />
            ))}
          </div>
          <div className={s.row}>
            <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 10 }}>
              -30d
            </span>
            <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 10 }}>
              vandaag
            </span>
          </div>
        </section>

        {/* Agents */}
        <section className={`${s.cell} ${s.padList}`} style={area("1 / 4", "3 / 7")}>
          <div className={s.row} style={{ paddingBottom: 8 }}>
            <span className={s.lbl}>agents</span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>
              {connected ? `${liveCount} actief · ${agents.length - liveCount} gepland` : "api offline"}
            </span>
          </div>
          <div className={s.list}>
            {agents.length === 0 ? (
              <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 12, paddingTop: 10 }}>
                {connected ? "geen agents gemeld" : "start ATLAS met python atlas.py"}
              </span>
            ) : (
              agents.map((a) => (
                <div
                  key={a.name}
                  className={s.rowLine}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}
                >
                  <span className={!connected || a.planned ? s.ringOff : s.dot} />
                  <span className={`${s.mono} ${a.planned ? s.planned : ""}`} style={{ fontSize: 12, flexGrow: 1 }}>
                    {a.name}
                  </span>
                  <span className={`${s.mono} ${s.dim} ${s.xs}`}>
                    {a.planned ? "gepland" : a.open > 0 ? `${a.open} open` : "actief"}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className={s.row} style={{ paddingTop: 10 }}>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>ververst · 15s</span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>reviewgate</span>
          </div>
        </section>

        {/* Live AI Terminal */}
        <section className={`${s.cell} ${s.term}`} style={area("4 / 10", "1 / 5")}>
          <div className={s.termBar}>
            <div className={s.lights}>
              <span />
              <span />
              <span />
            </div>
            <span className={s.mono} style={{ fontSize: 12 }}>
              puro — live ai terminal
            </span>
            <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 11 }}>
              bron: logfire + puro live
            </span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`} style={{ marginLeft: "auto" }}>
              {traces.length} sporen
            </span>
          </div>
          <div className={`${s.mono} ${s.termBody}`}>
            {lines.length === 0 ? (
              <div className={s.termLine}>
                <span className={s.ln}>0</span>
                <span className={s.dim}>geen sporen in de laatste 7 dagen</span>
              </div>
            ) : (
              lines.map((l) => (
                <div key={l.key} className={s.termLine}>
                  <span className={s.ln}>{l.n}</span>
                  <span className={s.ts}>{l.ts}</span>
                  <span style={{ color: l.tagColor, flexShrink: 0 }}>{l.tag}</span>
                  <span className={s.msg} style={{ color: l.msgColor }}>
                    {l.msg}
                  </span>
                </div>
              ))
            )}
            <PuroLiveLines />
            <div className={s.termLine}>
              <span className={s.ln}>›</span>
              <span className={s.accent}>puro@atlas</span>
              <span className={s.dim}>~</span>
              <span className={s.cursor} />
            </div>
          </div>
        </section>

        {/* Puro-status (live) */}
        <PuroStatusCard />

        {/* Poortbeslissingen */}
        <section className={`${s.cell} ${s.pad}`} style={area("10 / 12", "2 / 3")}>
          <span className={s.lbl}>poortbeslissingen</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className={s.big} style={{ fontSize: 36 }}>
              {nl(metrics.gateDecisions.current)}
            </span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>7d</span>
          </div>
          <span className={`${s.mono} ${s.dim} ${s.xs}`}>vorige week {nl(metrics.gateDecisions.previous)}</span>
        </section>

        {/* Scans */}
        <section className={s.cell} style={{ ...area("12 / 13", "2 / 4"), padding: "14px 12px", gap: 10 }}>
          <span className={s.lbl}>scans</span>
          <span className={s.big} style={{ fontSize: 30 }}>
            {nl(metrics.agentScans.current)}
          </span>
          <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 10 }}>
            agent.scan · 7d
          </span>
          <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 10, marginTop: "auto" }}>
            vorige week {nl(metrics.agentScans.previous)}
          </span>
        </section>

        {/* Vandaag in gewone taal */}
        <section
          className={s.cell}
          style={{ ...area("10 / 12", "3 / 4"), padding: "10px 14px", gap: 2, justifyContent: "space-between" }}
        >
          <span className={s.lbl}>vandaag</span>
          <div className={s.todayLine}>
            <span className={`${s.todayNum}`}>{nl(scansToday)}</span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>keer gescand</span>
          </div>
          <div className={s.todayLine}>
            <span className={`${s.todayNum}`}>{nl(newToday)}</span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>nieuwe voorstellen</span>
          </div>
          <div className={s.todayLine}>
            <span className={`${s.todayNum}`}>{nl(decisionsToday)}</span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>besluiten genomen</span>
          </div>
        </section>

        {/* Voorstellen met JA/NEE */}
        <section
          className={`${s.cell} ${s.padList}`}
          style={{ ...area("10 / 13", "4 / 7"), padding: "18px 18px 12px" }}
        >
          <div className={s.row} style={{ paddingBottom: 8 }}>
            <span className={s.lbl}>voorstellen · {snapshot.pending.length} open</span>
            <DemoCleanup ids={noiseIds} confirmText={cleanupConfirm} />
          </div>
          <div className={s.list}>
            {!connected ? (
              <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 11.5, paddingTop: 10 }}>
                {snapshot.error ?? "ATLAS API niet bereikbaar"}
              </span>
            ) : shownPending.length === 0 ? (
              <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 11.5, paddingTop: 10 }}>
                niets te beslissen · alles is bij
              </span>
            ) : (
              shownPending.slice(0, 20).map((p) => (
                <div
                  key={p.id}
                  className={s.rowLine}
                  style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={isNoise(p) ? s.ring : s.dot} />
                    <span className={`${s.mono} ${s.ellipsis}`} style={{ fontSize: 11.5, flexGrow: 1 }} title={p.title}>
                      {p.title}
                    </span>
                  </div>
                  <div className={s.row} style={{ paddingLeft: 14 }}>
                    <span className={`${s.mono} ${s.dim} ${s.xs} ${s.ellipsis}`} title={p.action_summary}>
                      {p.agent}
                    </span>
                    <ProposalActions id={p.id} title={p.title} />
                  </div>
                </div>
              ))
            )}
          </div>
          <a
            href="/dashboard/proposals"
            className={`${s.mono} ${s.accent} ${s.xs}`}
            style={{ textDecoration: "none", paddingTop: 8 }}
          >
            alle voorstellen + details →
          </a>
        </section>

        {/* Recente sporen */}
        <section className={s.cell} style={{ ...area("4 / 10", "5 / 7"), padding: "14px 16px 10px" }}>
          <div className={s.row} style={{ paddingBottom: 8 }}>
            <span className={s.lbl}>recente sporen</span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>cache 60s</span>
          </div>
          <div className={`${s.mono} ${s.rowLine} ${s.traceGrid} ${s.traceHead}`}>
            <span>span</span>
            <span>tijd</span>
            <span>duur</span>
            <span>status</span>
            <span>trace-id</span>
          </div>
          {tableRows.length === 0 ? (
            <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 11.5, paddingTop: 10 }}>
              nog geen sporen in de laatste 7 dagen
            </span>
          ) : (
            tableRows.map((t, i) => (
              <div
                key={`${t.id}-${t.timestamp}-${i}`}
                className={`${s.mono} ${s.rowLine} ${s.traceGrid} ${s.traceRow}`}
              >
                <span className={s.ellipsis}>{t.name}</span>
                <span style={{ color: "#A9BFD8" }}>{stampOf(t.timestamp)}</span>
                <span style={{ color: "#A9BFD8" }}>{fmtDur(t.latency)}</span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: t.status === "Error" ? "#F2A09B" : "#9BE8B8",
                  }}
                >
                  <span className={t.status === "Error" ? s.ledErr : s.led} />
                  {t.status === "Error" ? "FOUT" : "OK"}
                </span>
                <span className={s.dim}>{t.id.slice(0, 12)}…</span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
