"use client";

import { useSyncExternalStore } from "react";

import s from "./ocean-bento.module.css";

type PuroEvent = { ts: number; kind: string; text: string };
type PuroSnap = { state: string; detail: string; events: PuroEvent[] };

const OFFLINE: PuroSnap = { state: "OFFLINE", detail: "", events: [] };
let snap: PuroSnap = OFFLINE;
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const lastTs = (p: PuroSnap) => (p.events.length ? p.events[p.events.length - 1].ts : 0);
const emit = () => {
  for (const f of subs) f();
};

async function poll() {
  try {
    const res = await fetch("/api/puro", { cache: "no-store" });
    const data = await res.json();
    const next: PuroSnap = {
      state: data?.status?.state ?? "OFFLINE",
      detail: data?.status?.detail ?? "",
      events: Array.isArray(data?.events) ? data.events : [],
    };
    if (next.state !== snap.state || next.detail !== snap.detail || lastTs(next) !== lastTs(snap)) {
      snap = next;
      emit();
    }
  } catch {
    if (snap.state !== "OFFLINE") {
      snap = OFFLINE;
      emit();
    }
  }
}

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    void poll();
    timer = setInterval(poll, 1000);
  }
  return () => {
    subs.delete(cb);
    if (subs.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const usePuro = () =>
  useSyncExternalStore(
    subscribe,
    () => snap,
    () => OFFLINE,
  );

const COLORS: Record<string, string> = {
  IDLE: "#9FB6D1",
  LISTENING: "#10b981",
  THINKING: "#f59e0b",
  SPEAKING: "#5B9BD5",
  OFFLINE: "#6E8BAD",
};

export function PuroStatusCard() {
  const p = usePuro();
  const active = p.state === "LISTENING" || p.state === "THINKING" || p.state === "SPEAKING";
  const color = COLORS[p.state] ?? COLORS.OFFLINE;
  return (
    <section
      className={`${s.cell} ${s.pad} ${s.beam} ${active ? s.beamFast : ""}`}
      style={{ gridColumn: "10 / 13", gridRow: "1 / 2" }}
    >
      <div className={s.row}>
        <span className={s.lbl}>puro · status</span>
        <span className={`${s.mono} ${s.dim} ${s.xs}`}>hey_puro · 0.20</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className={p.state === "OFFLINE" ? s.ringOff : s.dot} />
        <span
          className={s.mono}
          style={{ fontSize: 22, fontWeight: 500, letterSpacing: "0.1em", color, transition: "color 200ms" }}
        >
          {p.state}
        </span>
      </div>
      <span
        className={`${s.mono} ${s.dim} ${s.xs}`}
        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        title={p.detail}
      >
        {p.detail || "groq → llama3.2:3b"}
      </span>
    </section>
  );
}

const fmtTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour12: false });

export function PuroLiveLines({ max = 8 }: { max?: number }) {
  const { events } = usePuro();
  const rows = events.slice(-max);
  return (
    <>
      {rows.map((e) => (
        <div key={`p-${e.ts}`} className={s.termLine}>
          <span className={s.ln}>·</span>
          <span className={s.ts}>{fmtTime(e.ts)}</span>
          <span style={{ color: "#5B9BD5", flexShrink: 0 }}>[puro]</span>
          <span className={s.msg} style={{ color: e.kind === "voice" ? "#DCEAF7" : "#A9BFD8" }}>
            {e.text}
          </span>
        </div>
      ))}
    </>
  );
}
