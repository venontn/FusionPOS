import type { FusionDatabase } from "./database";

function apiBase(settings: Record<string, string>): string {
  return (settings.api_url || "http://127.0.0.1:8000/api").replace(/\/$/, "");
}

export async function pushToCloud(db: FusionDatabase): Promise<{ ok: boolean; message: string }> {
  const settings = db.getSettings();
  const payload = db.getUnsyncedPayload();

  if (!payload.sales.length && !payload.products.length) {
    return { ok: true, message: "Nothing new to sync." };
  }

  try {
    const res = await fetch(`${apiBase(settings)}/sync/push/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Sync failed (${res.status}): ${text}` };
    }

    const data = (await res.json()) as { synced?: { sales?: number } };
    const saleIds = payload.sales.map((s) => s.local_id);
    db.markSalesSynced(saleIds);

    const count = data.synced?.sales ?? saleIds.length;
    return { ok: true, message: `Synced successfully (${count} sales).` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, message: `Offline or API unreachable: ${msg}` };
  }
}

export async function sendHeartbeat(db: FusionDatabase): Promise<boolean> {
  const settings = db.getSettings();
  const payload = db.buildMonitorPayload();
  try {
    const res = await fetch(`${apiBase(settings)}/shops/heartbeat/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkApiHealth(apiUrl: string): Promise<boolean> {
  try {
    const base = apiUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/health/`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function getMonitorUrl(settings: Record<string, string>): string {
  const base = apiBase(settings).replace(/\/api\/?$/, "");
  return `${base}/monitor/`;
}
