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
  status: "pending" | "approved" | "rejected" | "done" | "expired";
  created_at: string;
  resolved_at?: string;
  unrejected_at?: string;
  result?: Record<string, unknown>;
}

export interface ProposalsSnapshot {
  pending: Proposal[];
  history: Proposal[];
  agents: string[];
  connected: boolean;
  error?: string;
}

export interface BulkRejectResult {
  rejected: number;
  agent: string;
  ids: string[];
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

/**
 * Groepeer pending proposals per agent, alfabetisch op agent-naam.
 * Puur presentation-logic; gescheiden zodat de UI-component zelf dom blijft.
 */
export function groupByAgent(proposals: Proposal[]): Array<{ agent: string; items: Proposal[] }> {
  const map = new Map<string, Proposal[]>();
  for (const p of proposals) {
    const existing = map.get(p.agent);
    if (existing) {
      existing.push(p);
    } else {
      map.set(p.agent, [p]);
    }
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([agent, items]) => ({ agent, items }));
}

/**
 * Client-side helpers voor de review-actions. Lopen via de Next.js
 * API-proxies (/api/proposals/...) zodat de browser nooit rechtstreeks
 * met 127.0.0.1:8787 praat — zelfde patroon als ProposalCard.
 */

export async function unrejectProposal(id: string): Promise<Proposal> {
  const res = await fetch(`/api/proposals/${id}/unreject`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.detail ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as Proposal;
}

export async function bulkRejectAgent(agent: string): Promise<BulkRejectResult> {
  const res = await fetch(`/api/proposals/bulk-reject?agent=${encodeURIComponent(agent)}`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? body.detail ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as BulkRejectResult;
}
