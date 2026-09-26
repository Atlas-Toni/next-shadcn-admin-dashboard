import type { CSSProperties } from "react";

import { JetBrains_Mono } from "next/font/google";

import { GeistSans } from "geist/font/sans";

import type { AtlasMetrics, DailyTracePoint, RecentTraceRow } from "@/lib/logfire";
import type { Proposal, ProposalsSnapshot } from "@/lib/proposals";

import { AutoRefresh } from "./auto-refresh";
import { LiveClock } from "./live-clock";
import s from "./ocean-bento.module.css";

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
const stampOf = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TZ,
  });

const VOICE_RE = /puro|voice|transcribe|wake|tts|stt/i;

function verdict(p: Proposal): { text: string; color: string } {
  switch (p.status) {
    case "pending":
      return { text: "open", color: "#5B9BD5" };
    case "approved":
    case "done":
      return { text: "ja", color: "#DCEAF7" };
    case "rejected":
      return { text: "nee", color: "#7F9BBE" };
    default:
      return { text: "verlopen", color: "#7F9BBE" };
  }
}

interface Props {
  metrics: AtlasMetrics;
  daily: DailyTracePoint[];
  traces: RecentTraceRow[];
  snapshot: ProposalsSnapshot;
}

export function OceanBento({ metrics, daily, traces, snapshot }: Props) {
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

  // Terminal: oudste boven, nieuwste onder
  const lines = [...traces].reverse().map((t, i) => ({
    key: `${t.id}-${t.timestamp}-${i}`,
    n: i + 1,
    ts: timeOf(t.timestamp),
    tag: `[${t.name}]`,
    msg: [fmtDur(t.latency), `trace ${t.id.slice(0, 12)}…`].filter(Boolean).join(" · "),
    voice: VOICE_RE.test(t.name),
    err: t.status === "Error",
  }));

  // Agents: naam uit /health, open voorstellen per agent
  const openPer = new Map<string, number>();
  for (const p of snapshot.pending) openPer.set(p.agent, (openPer.get(p.agent) ?? 0) + 1);
  const agents = snapshot.agents.map((name) => ({ name, open: openPer.get(name) ?? 0 }));

  const proposals = [...snapshot.pending, ...snapshot.history].slice(0, 6);
  const tableRows = traces.slice(0, 5);

  // Puro-status: statuskanaal volgt in stap 2, tot die tijd IDLE
  const puro = "IDLE";
  const beamFast = false;

  return (
    <div className={`${s.root} ${GeistSans.variable} ${mono.variable}`}>
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
              {connected ? `${agents.length} geregistreerd` : "api offline"}
            </span>
          </div>
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
                <span className={connected ? s.dot : s.ringOff} />
                <span className={s.mono} style={{ fontSize: 12, flexGrow: 1 }}>
                  {a.name}
                </span>
                <span className={`${s.mono} ${s.dim} ${s.xs}`}>{a.open > 0 ? `${a.open} open` : "actief"}</span>
              </div>
            ))
          )}
          <div className={s.row} style={{ marginTop: "auto", paddingTop: 10 }}>
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
              bron: logfire · live-koppeling volgt
            </span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`} style={{ marginLeft: "auto" }}>
              {lines.length} regels
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
                  <span style={{ color: l.err ? "#E5534B" : l.voice ? "#5B9BD5" : "#6E8BAD", flexShrink: 0 }}>
                    {l.tag}
                  </span>
                  <span className={s.msg} style={{ color: l.err ? "#F2A09B" : l.voice ? "#DCEAF7" : "#A9BFD8" }}>
                    {l.msg}
                  </span>
                </div>
              ))
            )}
            <div className={s.termLine}>
              <span className={s.ln}>›</span>
              <span className={s.accent}>puro@atlas</span>
              <span className={s.dim}>~</span>
              <span className={s.cursor} />
            </div>
          </div>
        </section>

        {/* Puro-status met Border Beam */}
        <section
          className={`${s.cell} ${s.pad} ${s.beam} ${beamFast ? s.beamFast : ""}`}
          style={area("10 / 13", "1 / 2")}
        >
          <div className={s.row}>
            <span className={s.lbl}>puro · status</span>
            <span className={`${s.mono} ${s.dim} ${s.xs}`}>hey_puro · 0.20</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className={s.dot} />
            <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 22, fontWeight: 500, letterSpacing: "0.1em" }}>
              {puro}
            </span>
          </div>
          <span className={`${s.mono} ${s.dim} ${s.xs}`}>groq → llama3.2:3b</span>
        </section>

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

        {/* Spans */}
        <section className={`${s.cell} ${s.pad}`} style={area("10 / 12", "3 / 4")}>
          <span className={s.lbl}>spans · 7d</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span className={s.big} style={{ fontSize: 36 }}>
              {nl(metrics.spans.current)}
            </span>
            <span className={`${s.mono} ${s.accent} ${s.xs}`}>{pctLabel(metrics.spans.pctChange)}</span>
          </div>
          <span className={`${s.mono} ${s.dim} ${s.xs}`}>vorige week {nl(metrics.spans.previous)}</span>
        </section>

        {/* Voorstellen */}
        <section className={`${s.cell} ${s.padList}`} style={area("10 / 13", "4 / 7")}>
          <div className={s.row} style={{ paddingBottom: 8 }}>
            <span className={s.lbl}>voorstellen</span>
            <a
              href="/dashboard/proposals"
              className={`${s.mono} ${s.accent} ${s.xs}`}
              style={{ textDecoration: "none" }}
            >
              {snapshot.pending.length} open →
            </a>
          </div>
          {!connected ? (
            <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 11.5, paddingTop: 10 }}>
              {snapshot.error ?? "ATLAS API niet bereikbaar"}
            </span>
          ) : proposals.length === 0 ? (
            <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 11.5, paddingTop: 10 }}>
              nog geen voorstellen
            </span>
          ) : (
            proposals.map((p) => {
              const v = verdict(p);
              return (
                <div
                  key={p.id}
                  className={s.rowLine}
                  style={{ display: "flex", flexDirection: "column", gap: 4, padding: "9px 0" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={p.status === "pending" ? s.dot : s.ring} />
                    <span className={`${s.mono} ${s.ellipsis}`} style={{ fontSize: 11.5, flexGrow: 1 }}>
                      {p.title}
                    </span>
                  </div>
                  <div className={s.row} style={{ paddingLeft: 14 }}>
                    <span className={`${s.mono} ${s.dim} ${s.xs}`}>{p.agent}</span>
                    <span className={`${s.mono} ${s.xs}`} style={{ color: v.color }}>
                      {v.text}
                    </span>
                  </div>
                </div>
              );
            })
          )}
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
