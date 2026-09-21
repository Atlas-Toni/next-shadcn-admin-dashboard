import { NextResponse } from "next/server";

const API_URL = process.env.ATLAS_API_URL ?? "http://127.0.0.1:8787";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const agent = url.searchParams.get("agent");
  if (!agent || !agent.trim()) {
    return NextResponse.json({ error: "Query-param 'agent' is verplicht." }, { status: 400 });
  }
  try {
    const target = new URL(`${API_URL}/proposals/bulk-reject`);
    target.searchParams.set("agent", agent);
    const res = await fetch(target.toString(), { method: "POST" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: `Kon ATLAS API niet bereiken: ${(err as Error).message}` }, { status: 502 });
  }
}
