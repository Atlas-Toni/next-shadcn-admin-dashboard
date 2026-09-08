/**
 * ATLAS Proposals — leest en muteert voorstellen via de FastAPI-brug
 * die lokaal op 127.0.0.1:8787 draait (src/api/proposals_api.py in atlas-os).
 *
 * Zelfde patroon als src/lib/logfire.ts: één plek waar alle HUD-code
 * met de backend praat, zodat de UI-componenten dom en simpel blijven.
 */

const API_URL = process.env.ATLAS_API_URL ?? "http://127.0.0.1:8787";

export interface Proposal {
  id: string;
  agent: string;
  title: string;
  description: string;
  action_summary: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "done";
  created_at: string;
  resolved_at?: string;
  result?: Record<string, unknown>;
}

export interface ProposalsSnapshot {
  pending: Proposal[];
  history: Proposal[];
  agents: string[];
  connected: boolean;
  error?: string;
}

async function safeFetch<T>(path: string, fallback: T): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getProposalsSnapshot(): Promise<ProposalsSnapshot> {
  const [health, pending, history] = await Promise.all([
    safeFetch<{ ok: boolean; agents: string[] }>("/health", { ok: false, agents: [] }),
    safeFetch<Proposal[]>("/proposals/pending", []),
    safeFetch<Proposal[]>("/proposals/history?limit=20", []),
  ]);

  if (!health) {
    return {
      pending: [],
      history: [],
      agents: [],
      connected: false,
      error: `ATLAS API niet bereikbaar op ${API_URL}. Draait uvicorn nog?`,
    };
  }

  return {
    pending: pending ?? [],
    history: history ?? [],
    agents: health.agents,
    connected: true,
  };
}
