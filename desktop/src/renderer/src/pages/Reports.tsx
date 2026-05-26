import { useEffect, useState } from "react";

import ActiveSessionsBar from "../components/ActiveSessionsBar";
import RefundAuthModal from "../components/RefundAuthModal";
import ReportCharts from "../components/ReportCharts";
import { useAuth } from "../context/AuthContext";
import { downloadCsv } from "../lib/download";
import { money, dateTime } from "../lib/format";
import type { Sale } from "../types";

type Analytics = Parameters<typeof ReportCharts>[0]["data"];

export default function Reports() {
  const { user, sessionId } = useAuth();
  const isAdmin = user?.role === "admin";
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [message, setMessage] = useState("");
  const [refundTarget, setRefundTarget] = useState<number | null>(null);

  async function refresh() {
    setAnalytics(await window.fusionpos.getAnalytics());
    setSales((await window.fusionpos.listSales(30)) as Sale[]);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  async function downloadReport(period: "daily" | "weekly" | "monthly") {
    const csv = await window.fusionpos.exportReport(period);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`fusionpos-${period}-report-${stamp}.csv`, csv);
    setMessage(`${period.charAt(0).toUpperCase() + period.slice(1)} report downloaded.`);
  }

  async function processRefund(authCode: string) {
    if (!refundTarget || !user) return;
    try {
      await window.fusionpos.refundSale(refundTarget, user.id, authCode, user.role);
      setMessage("Sale refunded with authorization.");
      setRefundTarget(null);
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Refund failed");
    }
  }

  const stats = analytics;

  return (
    <div className="page">
      <header className="page-header row-header">
        <div>
          <h1>Reports &amp; analytics</h1>
          <p>Sales charts, stock movement, downloadable reports, and authorized refunds.</p>
        </div>
        <div className="export-actions">
          <button type="button" className="btn" onClick={() => downloadReport("daily")}>
            Download daily
          </button>
          <button type="button" className="btn" onClick={() => downloadReport("weekly")}>
            Download weekly
          </button>
          <button type="button" className="btn" onClick={() => downloadReport("monthly")}>
            Download monthly
          </button>
        </div>
      </header>

      <ActiveSessionsBar sessionId={sessionId} />

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span>Today&apos;s revenue</span>
            <strong>{money(stats.today_revenue)}</strong>
          </div>
          <div className="stat-card">
            <span>Transactions today</span>
            <strong>{stats.today_transactions}</strong>
          </div>
          <div className="stat-card warn">
            <span>Low stock items</span>
            <strong>{stats.low_stock_count}</strong>
          </div>
        </div>
      )}

      {analytics && <ReportCharts data={analytics} />}

      {message && <p className="success">{message}</p>}

      <div className="panel table-wrap">
        <h2>Recent sales</h2>
        <p className="muted">
          Refunds require admin password or refund PIN (set in Settings). Admins authorize with their
          own password.
        </p>
        <table>
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Cashier</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{s.receipt_no}</td>
                <td>{s.cashier_name}</td>
                <td>{money(s.total)}</td>
                <td>{s.payment_method.replace("_", " ")}</td>
                <td>
                  <span className={`badge ${s.status}`}>{s.status}</span>
                </td>
                <td>{dateTime(s.created_at)}</td>
                <td>
                  {s.status === "completed" && (
                    <button type="button" className="btn ghost" onClick={() => setRefundTarget(s.id)}>
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {refundTarget !== null && (
        <RefundAuthModal
          isAdmin={isAdmin}
          onCancel={() => setRefundTarget(null)}
          onConfirm={processRefund}
        />
      )}
    </div>
  );
}
