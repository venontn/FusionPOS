import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { DEMO_SHOPS, getDemoShop } from "../data/demoShops";

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [storeName, setStoreName] = useState("");
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [refundPin, setRefundPin] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [apiUrl, setApiUrl] = useState("http://127.0.0.1:8000/api");
  const [online, setOnline] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    window.fusionpos.getSettings().then((s) => {
      setStoreName(s.store_name ?? "");
      const id = s.shop_id ?? "001";
      setShopId(DEMO_SHOPS.some((d) => d.id === id) ? id : "001");
      setShopName(s.shop_name ?? s.store_name ?? "");
      setTerminalId(s.terminal_id ?? "");
      setRefundPin(s.refund_pin ?? "");
      setTaxRate(s.tax_rate ?? "0");
      setApiUrl(s.api_url ?? "http://127.0.0.1:8000/api");
    });
    window.fusionpos.syncHealth().then(setOnline);
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    await window.fusionpos.setSetting("store_name", storeName);
    await window.fusionpos.setSetting("shop_name", shopName);
    await window.fusionpos.setSetting("shop_id", shopId);
    await window.fusionpos.setSetting("terminal_id", terminalId);
    if (isAdmin) await window.fusionpos.setSetting("refund_pin", refundPin);
    await window.fusionpos.setSetting("tax_rate", taxRate);
    await window.fusionpos.setSetting("api_url", apiUrl);
    setSyncMsg("Settings saved.");
    void window.fusionpos.syncHeartbeat();
  }

  async function syncNow() {
    setSyncMsg("Syncing…");
    const result = await window.fusionpos.syncPush();
    setSyncMsg(result.message);
    setOnline(await window.fusionpos.syncHealth());
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Store, security, and remote monitoring configuration.</p>
      </header>

      <div className={`status-pill ${online ? "online" : "offline"}`}>
        API: {online ? "Online" : "Offline"}
      </div>

      <form className="panel form-stack" onSubmit={save}>
        <h2>Store identity</h2>
        <label>
          Store display name
          <input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </label>
        <label>
          Shop (ID 001 onwards)
          <select
            value={shopId}
            onChange={(e) => {
              const id = e.target.value;
              setShopId(id);
              const shop = getDemoShop(id);
              if (shop) {
                setShopName(shop.name);
                setStoreName(shop.name);
                setTerminalId(shop.terminal);
              }
            }}
          >
            {DEMO_SHOPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name} ({s.city})
              </option>
            ))}
          </select>
        </label>
        <label>
          Shop name (cloud dashboard)
          <input value={shopName} onChange={(e) => setShopName(e.target.value)} />
        </label>
        <label>
          Terminal ID
          <input value={terminalId} onChange={(e) => setTerminalId(e.target.value)} />
        </label>

        {isAdmin && (
          <>
            <h2>Refund security</h2>
            <label>
              Refund PIN (cashiers use this to authorize refunds)
              <input
                type="password"
                value={refundPin}
                onChange={(e) => setRefundPin(e.target.value)}
                placeholder="Shared PIN for cashiers"
              />
            </label>
          </>
        )}

        <h2>Tax &amp; cloud</h2>
        <label>
          Tax rate (decimal, e.g. 0.15 for 15%)
          <input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </label>
        <label>
          Cloud API URL
          <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
        </label>
        <button type="submit" className="btn primary">
          Save settings
        </button>
      </form>

      {isAdmin && (
        <div className="panel">
          <h2>Remote shop monitor</h2>
          <p className="muted">
            Open the live dashboard in your browser to see sales, active cashiers, and low stock from
            anywhere. Requires the Django API running and heartbeat sync (automatic every 30s).
          </p>
          <button type="button" className="btn primary" onClick={() => window.fusionpos.openMonitor()}>
            Open live monitor
          </button>
        </div>
      )}

      <div className="panel">
        <h2>Cloud sync</h2>
        <p className="muted">
          Multiple cashiers and admins can use FusionPOS at the same time on this shop (shared local
          database). Push sales to the cloud when online.
        </p>
        <button type="button" className="btn" onClick={syncNow}>
          Sync now
        </button>
        {syncMsg && <p className="muted">{syncMsg}</p>}
      </div>
    </div>
  );
}
