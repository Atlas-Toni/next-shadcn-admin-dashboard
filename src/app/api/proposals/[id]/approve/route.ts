import { NextResponse } from "next/server";

const API_URL = process.env.ATLAS_API_URL ?? "http://127.0.0.1:8787";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const res = await fetch(`${API_URL}/proposals/${id}/approve`, { method: "POST" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: `Kon ATLAS API niet bereiken: ${(err as Error).message}` }, { status: 502 });
  }
}
