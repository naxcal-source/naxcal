"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
  id: string; email: string; full_name: string | null; phone: string | null;
  kyc_status: string; tier: string; balance: number; total_deposited: number;
  total_withdrawn: number; total_profit: number; referral_code: string | null;
  auto_compound: boolean; is_active: boolean; created_at: string;
};
type Tx = { id: string; type: string; amount: number; status: string; created_at: string; description: string | null };

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [adjType, setAdjType] = useState<"add" | "subtract">("add");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) {
      const { profile: p, transactions: txs } = await res.json();
      setProfile(p as Profile);
      setTransactions(txs as Tx[]);
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const post = async (body: object) => {
    setSaving(true); setMessage("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    return data;
  };

  const handleAdjust = async () => {
    if (!profile || !adjAmount) return;
    const data = await post({ action: "adjust", amount: adjAmount, type: adjType, note: adjNote });
    setMessage(`Balance updated to ${fmt(data.balance)}`);
    setAdjAmount(""); setAdjNote("");
    await load();
  };

  const handleKYC = async (status: string) => {
    if (!profile) return;
    await post({ action: "kyc", status });
    setMessage(`KYC ${status}`);
    await load();
  };

  const handleFreeze = async () => {
    if (!profile) return;
    const data = await post({ action: "freeze" });
    setMessage(data.is_active ? "Account unfrozen" : "Account frozen");
    await load();
  };

  if (!profile) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-naxcal-teal" size={24} /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-white/30 mb-4">
        <Link href="/admin/users" className="hover:text-naxcal-teal flex items-center gap-1"><ArrowLeft size={12} /> Users</Link>
        <ChevronRight size={12} />
        <span className="text-white/60">{profile.full_name || profile.email}</span>
      </div>

      <h1 className="text-xl font-bold text-white mb-6">{profile.full_name || "User Detail"}</h1>

      {message && (
        <div className="p-3 rounded-lg bg-naxcal-teal/15 border border-naxcal-teal/30 text-naxcal-teal text-sm mb-4">{message}</div>
      )}

      {/* Profile Info */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl p-5 space-y-3" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-white mb-3">Profile</h3>
          {[
            ["Email", profile.email],
            ["Phone", profile.phone || "—"],
            ["Tier", profile.tier],
            ["KYC", profile.kyc_status],
            ["Referral Code", profile.referral_code || "—"],
            ["Joined", new Date(profile.created_at).toLocaleDateString()],
            ["Status", profile.is_active ? "Active" : "Frozen"],
          ].map(([l, v]) => (
            <div key={l as string} className="flex items-center justify-between">
              <span className="text-xs text-white/30">{l}</span>
              <span className="text-xs text-white/70 font-medium capitalize">{v}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-5 space-y-3" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-white mb-3">Financials</h3>
          {[
            ["Balance", fmt(profile.balance)],
            ["Total Deposited", fmt(profile.total_deposited)],
            ["Total Withdrawn", fmt(profile.total_withdrawn)],
            ["Total Profit", fmt(profile.total_profit)],
          ].map(([l, v]) => (
            <div key={l as string} className="flex items-center justify-between">
              <span className="text-xs text-white/30">{l}</span>
              <span className="text-sm text-white font-bold">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Balance Adjustment */}
        <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-white mb-3">Adjust Balance</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setAdjType("add")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer", adjType === "add" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "text-white/40 border border-white/10")}>Add</button>
            <button onClick={() => setAdjType("subtract")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer", adjType === "subtract" ? "bg-red-500/15 text-red-400 border border-red-500/20" : "text-white/40 border border-white/10")}>Subtract</button>
          </div>
          <input type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="Amount ($)" className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-2" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <input type="text" value={adjNote} onChange={(e) => setAdjNote(e.target.value)} placeholder="Note (optional)" className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-3" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <button onClick={handleAdjust} disabled={!adjAmount || saving} className="w-full py-2 rounded-lg text-sm font-semibold text-white bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors cursor-pointer disabled:opacity-50">
            {saving ? "Saving..." : "Apply Adjustment"}
          </button>
        </div>

        {/* Account Actions */}
        <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-white mb-3">Account Actions</h3>
          <div className="space-y-2">
            <button onClick={() => handleKYC("approved")} disabled={profile.kyc_status === "approved" || saving}
              className="w-full py-2 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors cursor-pointer disabled:opacity-30">
              Approve KYC
            </button>
            <button onClick={() => handleKYC("rejected")} disabled={profile.kyc_status === "rejected" || saving}
              className="w-full py-2 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-30">
              Reject KYC
            </button>
            <button onClick={handleFreeze} disabled={saving}
              className={cn("w-full py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                profile.is_active ? "text-amber-400 border-amber-500/20 hover:bg-amber-500/10" : "text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
              )}>
              {profile.is_active ? "Freeze Account" : "Unfreeze Account"}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-4">No transactions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Type</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Amount</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Status</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Description</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/[0.03]">
                    <td className="px-3 py-2 text-white/70 capitalize">{tx.type}</td>
                    <td className={cn("px-3 py-2 font-semibold", ["deposit", "profit", "bonus"].includes(tx.type) ? "text-emerald-400" : "text-red-400")}>{fmt(tx.amount)}</td>
                    <td className="px-3 py-2 text-white/50 capitalize">{tx.status}</td>
                    <td className="px-3 py-2 text-white/40 text-xs">{tx.description || "—"}</td>
                    <td className="px-3 py-2 text-white/30 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
