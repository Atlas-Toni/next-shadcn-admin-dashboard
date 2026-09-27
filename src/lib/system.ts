// Systeemstrook: haalt bereikbaarheid van diensten op via de ATLAS-API.
const API_URL = process.env.ATLAS_API_URL ?? "http://127.0.0.1:8787";

export type ServiceStatus = { name: string; ok: boolean; detail: string };
export type SystemStatus = { online: boolean; services: ServiceStatus[] };

export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await fetch(`${API_URL}/system/status`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return { online: true, services: (data.services ?? []) as ServiceStatus[] };
    }
  } catch {
    // API onbereikbaar: valt door naar offline
  }
  return { online: false, services: [] };
}
