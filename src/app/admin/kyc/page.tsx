"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Check, X, Loader2 } from "lucide-react";

type User = { id: string; full_name: string | null; email: string; kyc_status: string; created_at: string; tier: string; balance: number };

export default function AdminKYCPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    const data = await fetch("/api/admin/data?type=kyc").then(r => r.json()).catch(() => []);
    if (Array.isArray(data)) setUsers(data as User[]);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (user: User) => {
    setProcessing(user.id);
    await fetch("/api/admin/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_profile", user_id: user.id, updates: { kyc_status: "approved" } }) });
    try {
      await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "kyc_approved", email: user.email, name: user.full_name || "Investor" }),
      });
    } catch {}
    setMessage(`KYC approved for ${user.full_name || user.email}`);
    setProcessing(null);
    load();
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason) return;
    const user = users.find((u) => u.id === rejectModal);
    if (!user) return;
    setProcessing(user.id);
    await fetch("/api/admin/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_profile", user_id: user.id, updates: { kyc_status: "rejected" } }) });
    try {
      await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "kyc_rejected", email: user.email, name: user.full_name || "Investor", reason: rejectReason }),
      });
    } catch {}
    setMessage(`KYC rejected for ${user.full_name || user.email}`);
    setRejectModal(null); setRejectReason(""); setProcessing(null);
    load();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">KYC Review</h1>
        <span className="text-xs text-white/30 bg-white/[0.05] px-2 py-1 rounded-full">{users.length} pending</span>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-naxcal-teal/15 border border-naxcal-teal/30 text-naxcal-teal text-sm mb-4">{message}</div>
      )}

      {users.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ShieldCheck size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No pending KYC submissions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/admin/users/${user.id}`} className="text-sm text-white/80 font-medium hover:text-naxcal-teal">{user.full_name || "No name"}</Link>
                  <p className="text-xs text-white/30">{user.email}</p>
                  <p className="text-[10px] text-white/20 mt-1">Submitted: {new Date(user.created_at).toLocaleDateString()} | Tier: {user.tier} | Balance: ${user.balance.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleApprove(user)} disabled={processing === user.id}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors cursor-pointer disabled:opacity-50">
                    {processing === user.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />} Approve
                  </button>
                  <button onClick={() => setRejectModal(user.id)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors cursor-pointer">
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 className="text-sm font-semibold text-white mb-3">Reject KYC — Enter Reason</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Document unclear, photo does not match..." rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-4 resize-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/10 cursor-pointer hover:bg-white/[0.03]">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
