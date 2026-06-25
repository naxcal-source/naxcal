"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";

type Tx = { id: string; type: string; amount: number; asset: string | null; status: string; description: string | null; balance_after: number | null; created_at: string };

export default function StatementPage() {
  const { profile, fmt } = useDashboard();
  const [txs, setTxs] = useState<Tx[]>([]);
  useEffect(() => {
    if (!profile) return;
    fetch("/api/me/transactions").then(r => r.json()).then(data => { if (Array.isArray(data)) setTxs(data as Tx[]); }).catch(() => {});
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!profile) return null;

  const name = profile.full_name || "Investor";
  const email = profile.email;
  const balance = Number(profile.balance);
  const totalDeposited = Number(profile.total_deposited);
  const totalProfit = Number(profile.total_profit);
  const tier = (profile.tier || "bronze").charAt(0).toUpperCase() + (profile.tier || "bronze").slice(1);
  const now = new Date();
  const monthYear = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const generated = now.toLocaleDateString("en-US", { dateStyle: "long" });

  const totalIn = txs.filter(t => ["deposit", "profit", "bonus", "referral"].includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = txs.filter(t => ["withdrawal", "stock_buy", "swap"].includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);

  const isCredit = (type: string) => ["deposit", "profit", "bonus", "referral"].includes(type);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 40, background: "#fff", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" }}>
      {/* Print button */}
      <div style={{ marginBottom: 24, textAlign: "right" }} className="print:hidden">
        <button onClick={() => window.print()} style={{ padding: "10px 24px", background: "#1a8a6e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Download as PDF
        </button>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, borderBottom: "2px solid #0a0a0a", paddingBottom: 24 }}>
        <div>
          <img src="/Naxcal_Primary_Logo.png" alt="Naxcal" style={{ height: 48, width: "auto", marginBottom: 8 }} />
          <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Naxcal Capital Ltd · FCA Authorised</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0a0a0a" }}>Account Statement</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{monthYear}</p>
        </div>
      </div>

      {/* Account Info */}
      <div style={{ display: "flex", gap: 40, marginBottom: 32 }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Account Holder</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0a0a0a" }}>{name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>{email}</p>
        </div>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Tier</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0a0a0a" }}>{tier}</p>
        </div>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Generated</p>
          <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>{generated}</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1, background: "#f9fafb", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>Current Balance</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0a0a0a" }}>{fmt(balance)}</p>
        </div>
        <div style={{ flex: 1, background: "#f0fdf4", borderRadius: 12, padding: 20, border: "1px solid #bbf7d0" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>Total Money In</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#16a34a" }}>+{fmt(totalIn)}</p>
        </div>
        <div style={{ flex: 1, background: "#fef2f2", borderRadius: 12, padding: 20, border: "1px solid #fecaca" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>Total Money Out</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#dc2626" }}>-{fmt(totalOut)}</p>
        </div>
        <div style={{ flex: 1, background: "#f9fafb", borderRadius: 12, padding: 20, border: "1px solid #e5e7eb" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>Total Profit</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a8a6e" }}>+{fmt(totalProfit)}</p>
        </div>
      </div>

      {/* Table */}
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Transaction History</h2>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9ca3af" }}>{txs.length} transactions</p>

      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb" }}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>Date</th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>Type</th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>Description</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>Amount</th>
            <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, borderBottom: "1px solid #e5e7eb" }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((tx) => (
            <tr key={tx.id}>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13, color: "#6b7280" }}>{new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13, color: "#374151", textTransform: "capitalize" }}>{tx.type.replace(/_/g, " ")}</td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13, color: "#374151" }}>{tx.description || "—"}</td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 600, textAlign: "right", color: isCredit(tx.type) ? "#16a34a" : "#dc2626" }}>{isCredit(tx.type) ? "+" : "-"}{fmt(Math.abs(tx.amount))}</td>
              <td style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13, textAlign: "right", color: "#374151" }}>{tx.balance_after != null ? fmt(Number(tx.balance_after)) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #e5e7eb" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9ca3af" }}>Naxcal Capital Ltd is authorised and regulated by the Financial Conduct Authority.</p>
        <p style={{ margin: 0, fontSize: 11, color: "#c0c0c0" }}>This statement is generated automatically. Your capital is at risk. Past performance is not indicative of future results.</p>
      </div>
    </div>
  );
}
