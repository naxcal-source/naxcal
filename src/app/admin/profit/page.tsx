"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { TrendingUp, Loader2, CheckCircle2, AlertTriangle, CalendarClock } from "lucide-react";

type EligibleUser = { id: string; email: string; full_name: string | null; balance: number; tier: string; is_active: boolean };
type ProfitHistory = { id: string; profit_percentage: number; total_distributed: number; users_credited: number; notes: string | null; created_at: string };

export default function AdminProfitPage() {
  const [percentage, setPercentage] = useState("");
  const [feePercent, setFeePercent] = useState("20");
  const [eligible, setEligible] = useState<EligibleUser[]>([]);
  const [history, setHistory] = useState<ProfitHistory[]>([]);
  const [posting, setPosting] = useState(false);
  const [catchingUp, setCatchingUp] = useState(false);
  const [missedDays, setMissedDays] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [result, setResult] = useState<{ users: number; total: number; days?: number } | null>(null);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setEligible((data as EligibleUser[]).filter(u => u.balance > 0 && u.is_active));
    }).catch(() => {});

    supabase.from("daily_profits").select("*").order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setHistory(data as ProfitHistory[]); });

    // Check for missed days
    fetch("/api/admin/catch-up-profit").then(r => r.json()).then(data => {
      if (data.missedDays?.length > 0) setMissedDays(data.missedDays);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = parseFloat(percentage) || 0;
  const fee = parseFloat(feePercent) || 0;
  const totalGross = eligible.reduce((s, u) => s + u.balance * (pct / 100), 0);
  const totalFee = totalGross * (fee / 100);
  const totalNet = totalGross - totalFee;
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePost = async () => {
    setConfirmModal(false);
    setPosting(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/admin/post-profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentage: pct, fee_percentage: fee }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || "Failed to post profit"); setPosting(false); return; }

      setResult({ users: data.users, total: data.total });

      const [histRes, usersRes] = await Promise.all([
        supabase.from("daily_profits").select("*").order("created_at", { ascending: false }).limit(10),
        fetch("/api/admin/users").then(r => r.json()),
      ]);
      if (histRes.data) setHistory(histRes.data as ProfitHistory[]);
      if (Array.isArray(usersRes)) setEligible((usersRes as EligibleUser[]).filter(u => u.balance > 0 && u.is_active));

    } catch (err) {
      console.error("Post profit error:", err);
      setError("An error occurred while posting profit.");
    } finally {
      setPosting(false);
    }
  };

  const handleCatchUp = async () => {
    if (!confirm(`Post missed daily returns for ${missedDays.length} day(s)?\n\n${missedDays.join(", ")}\n\nThis will apply tier-based rates (Bronze 1.5%, Silver 1.8%, Gold 2.1%) for each missed day.`)) return;
    setCatchingUp(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/catch-up-profit", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Catch-up failed"); return; }
      setResult({ users: data.users, total: data.total, days: data.days });
      setMissedDays([]);
      const [histRes, usersRes] = await Promise.all([
        supabase.from("daily_profits").select("*").order("created_at", { ascending: false }).limit(10),
        fetch("/api/admin/users").then(r => r.json()),
      ]);
      if (histRes.data) setHistory(histRes.data as ProfitHistory[]);
      if (Array.isArray(usersRes)) setEligible((usersRes as EligibleUser[]).filter(u => u.balance > 0 && u.is_active));
    } catch {
      setError("Catch-up failed.");
    } finally {
      setCatchingUp(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">Post Daily Profit</h1>
      </div>

      {missedDays.length > 0 && (
        <div className="p-4 rounded-xl mb-4 flex items-start justify-between gap-3" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <div className="flex items-start gap-3">
            <CalendarClock size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-300 font-semibold mb-0.5">{missedDays.length} missed day{missedDays.length > 1 ? "s" : ""} detected</p>
              <p className="text-xs text-amber-400/70">{missedDays.join(" · ")}</p>
            </div>
          </div>
          <button onClick={handleCatchUp} disabled={catchingUp}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
            {catchingUp ? <><Loader2 size={12} className="animate-spin" /> Posting...</> : "Catch Up Now"}
          </button>
        </div>
      )}

      {result && (
        <div className="p-4 rounded-xl mb-6 flex items-center gap-3" style={{ background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)" }}>
          <CheckCircle2 size={20} className="text-emerald-400" />
          <p className="text-sm text-emerald-400">{result.days ? `${result.days} day(s) caught up — ` : ""}Profit posted to {result.users} users. Total distributed: {fmt(result.total)}</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl mb-6 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={20} className="text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="rounded-xl p-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Profit Percentage (%)</label>
            <input type="number" value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="e.g. 1.8" step="0.1"
              className="w-full px-4 py-3 rounded-lg text-xl font-bold text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Your Fee (%)</label>
            <input type="number" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} placeholder="e.g. 20" step="1"
              className="w-full px-4 py-3 rounded-lg text-xl font-bold text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
        </div>

        {/* Preview */}
        {pct > 0 && (
          <div className="rounded-xl p-4 mb-6 space-y-3" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="text-xs text-white/40 uppercase tracking-wider font-medium">Distribution Preview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-white/30">Eligible Users</p>
                <p className="text-lg font-bold text-white">{eligible.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30">Gross Amount</p>
                <p className="text-lg font-bold text-white">{fmt(totalGross)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30">Your Fee ({fee}%)</p>
                <p className="text-lg font-bold text-amber-400">{fmt(totalFee)}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/30">Net to Users</p>
                <p className="text-lg font-bold text-emerald-400">{fmt(totalNet)}</p>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => setConfirmModal(true)} disabled={!pct || pct <= 0 || posting || eligible.length === 0}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {posting ? <><Loader2 size={16} className="animate-spin" /> Posting Profit...</> : <><TrendingUp size={16} /> Post Profit</>}
        </button>
      </div>

      {/* History */}
      <div className="rounded-xl p-5 mt-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Profit History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No profit postings yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Date</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Rate</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Notes</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Distributed</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Users</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-white/[0.03]">
                    <td className="px-3 py-2 text-white/50 text-xs">{new Date(h.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-emerald-400 font-semibold">+{h.profit_percentage}%</td>
                    <td className="px-3 py-2 text-amber-400 text-xs">{h.notes || "—"}</td>
                    <td className="px-3 py-2 text-white/80 font-semibold">{fmt(h.total_distributed)}</td>
                    <td className="px-3 py-2 text-white/50">{h.users_credited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 className="text-sm font-semibold text-white mb-2">Confirm Profit Posting</h3>
            <p className="text-xs text-white/50 mb-4">
              This will distribute <span className="text-emerald-400 font-bold">{fmt(totalNet)}</span> to <span className="text-white font-bold">{eligible.length}</span> users at <span className="text-white font-bold">+{pct}%</span>.
            </p>
            <p className="text-xs text-amber-400 mb-4">Your fee: {fmt(totalFee)}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmModal(false)} className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/10 cursor-pointer hover:bg-white/[0.03]">Cancel</button>
              <button onClick={handlePost} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-naxcal-teal hover:bg-naxcal-teal-light cursor-pointer">Confirm & Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
