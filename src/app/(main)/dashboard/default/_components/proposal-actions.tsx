"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import s from "./ocean-bento.module.css";

async function post(path: string) {
  const res = await fetch(path, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.detail ?? `HTTP ${res.status}`);
  }
}

export function ProposalActions({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "ja" | "nee">(null);
  const [err, setErr] = useState("");

  const act = async (kind: "approve" | "reject") => {
    setBusy(kind === "approve" ? "ja" : "nee");
    setErr("");
    try {
      await post(`/api/proposals/${id}/${kind}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "onbekende fout");
      setBusy(null);
    }
  };

  return (
    <div className={s.actions}>
      {err ? (
        <span className={s.err} title={err}>
          fout
        </span>
      ) : null}
      <button
        type="button"
        className={s.btnNo}
        disabled={busy !== null}
        onClick={() => act("reject")}
        aria-label={`Nee: ${title}`}
      >
        {busy === "nee" ? "…" : "NEE"}
      </button>
      <button
        type="button"
        className={s.btnYes}
        disabled={busy !== null}
        onClick={() => act("approve")}
        aria-label={`Ja: ${title}`}
      >
        {busy === "ja" ? "…" : "JA"}
      </button>
    </div>
  );
}

export function DemoCleanup({ ids, confirmText }: { ids: string[]; confirmText: string }) {
  const router = useRouter();
  const [done, setDone] = useState<number | null>(null);

  if (ids.length === 0) return null;

  const run = async () => {
    if (!window.confirm(confirmText)) return;
    let n = 0;
    setDone(0);
    for (const id of ids) {
      try {
        await post(`/api/proposals/${id}/reject`);
      } catch {
        /* sla over, rest gaat door */
      }
      n += 1;
      setDone(n);
    }
    router.refresh();
    setDone(null);
  };

  return (
    <button type="button" className={s.btnLink} onClick={run} disabled={done !== null}>
      {done === null ? `ruim ${ids.length} oude op` : `bezig ${done}/${ids.length}…`}
    </button>
  );
}
