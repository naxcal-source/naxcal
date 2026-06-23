"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ArrowUpCircle, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Withdrawal = {
  id: string; user_id: string; amount: number; asset: string | null;
  wallet_address: string | null; status: string; created_at: string;
  profiles: { full_name: string | null; email: string } | null;
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("id, user_id, amount, asset, wallet_address, status, created_at, profiles(full_name, email)")
      .eq("type", "withdrawal")
      .order("created_at", { ascending: false });
    if (data) setWithdrawals(data as unknown as Withdrawal[]);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleApprove = async (w: Withdrawal) => {
    setProcessing(w.id);
    await supabase.from("transactions").update({ status: "completed" }).eq("id", w.id);
    try {
      await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "withdrawal_approved",
          email: w.profiles?.email,
          name: w.profiles?.full_name || "Investor",
          amount: w.amount,
        }),
      });
    } catch {}
    setMessage(`Withdrawal of ${fmt(w.amount)} approved`);
    setProcessing(null);
    load();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal);
    const w = withdrawals.find((x) => x.id === rejectModal);
    await supabase.from("transactions").update({ status: "failed" }).eq("id", rejectModal);

    if (w) {
      const { data: profile } = await supabase.from("profiles").select("balance").eq("id", w.user_id).single();
      if (profile) {
        await supabase.from("profiles").update({ balance: Number(profile.balance) + w.amount }).eq("id", w.user_id);
      }
    }

    setMessage("Withdrawal rejected — balance refunded");
    setRejectModal(null); setRejectReason(""); setProcessing(null);
    load();
  };

  const filtered = withdrawals.filter((w) => tab === "pending" ? w.status === "pending" : w.status !== "pending");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ArrowUpCircle size={22} className="text-amber-500" />
        <h1 className="text-xl font-bold text-white">Withdrawals</h1>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-naxcal-teal/15 border border-naxcal-teal/30 text-naxcal-teal text-sm mb-4">{message}</div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("pending")} className={cn("px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer", tab === "pending" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "text-white/40 border border-white/10")}>
          Pending ({withdrawals.filter((w) => w.status === "pending").length})
        </button>
        <button onClick={() => setTab("completed")} className={cn("px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer", tab === "completed" ? "bg-white/10 text-white/70 border border-white/20" : "text-white/40 border border-white/10")}>
          History
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ArrowUpCircle size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">{tab === "pending" ? "No pending withdrawals" : "No withdrawal history"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <div key={w.id} className="rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm text-white/80 font-medium">{w.profiles?.full_name || "Unknown"}</p>
                  <p className="text-xs text-white/30">{w.profiles?.email}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-white/20">
                    <span>{w.asset || "USDT"}</span>
                    <span className="font-mono truncate max-w-[200px]">{w.wallet_address}</span>
                    <span>{new Date(w.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">{fmt(w.amount)}</span>
                  {w.status === "pending" && (
                    <div className="flex gap-1.5">
                      <button onClick={() => handleApprove(w)} disabled={processing === w.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer disabled:opacity-50">
                        {processing === w.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                      </button>
                      <button onClick={() => setRejectModal(w.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 cursor-pointer">
                        <X size={12} /> Reject
                      </button>
                    </div>
                  )}
                  {w.status !== "pending" && (
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      w.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-red-500/15 text-red-400 border-red-500/20"
                    )}>{w.status}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 className="text-sm font-semibold text-white mb-3">Reject Withdrawal</h3>
            <p className="text-xs text-white/40 mb-3">The withdrawn amount will be refunded to the user&apos;s balance.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-4 resize-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/10 cursor-pointer">Cancel</button>
              <button onClick={handleReject} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer">Reject & Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
