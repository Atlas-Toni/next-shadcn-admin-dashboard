import { NextResponse } from "next/server";

const API_URL = process.env.ATLAS_API_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

// Puro-statuskanaal: status + laatste terminalregels in één call (HUD pollt dit).
export async function GET() {
  try {
    const [s, e] = await Promise.all([
      fetch(`${API_URL}/puro/status`, { cache: "no-store" }),
      fetch(`${API_URL}/puro/events?limit=30`, { cache: "no-store" }),
    ]);
    const status = await s.json();
    const events = (await e.json()).events ?? [];
    return NextResponse.json({ status, events });
  } catch {
    return NextResponse.json({
      status: { state: "OFFLINE", detail: "ATLAS API onbereikbaar", ts: null },
      events: [],
    });
  }
}
