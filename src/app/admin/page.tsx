"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Wallet, ArrowDownCircle, ArrowUpCircle, ShieldCheck, TrendingUp, ArrowRight, Send, Loader2, CheckCircle2, UserPlus } from "lucide-react";

type Stats = { totalUsers: number; totalAUM: number; depositsToday: number; pendingWithdrawals: number; pendingKYC: number };
type User = { id: string; full_name: string | null; email: string; balance: number; tier: string; kyc_status: string; created_at: string };
type Tx = { id: string; type: string; amount: number; status: string; created_at: string; user_id: string };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalAUM: 0, depositsToday: 0, pendingWithdrawals: 0, pendingKYC: 0 });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentTx, setRecentTx] = useState<Tx[]>([]);
  useEffect(() => {
    const load = async () => {
      const profiles = await fetch("/api/admin/data?type=profiles").then(r => r.json()).catch(() => []);
      if (Array.isArray(profiles)) {
        const totalAUM = profiles.reduce((s: number, p: Record<string, unknown>) => s + Number(p.balance), 0);
        const pendingKYC = profiles.filter((p: Record<string, unknown>) => p.kyc_status === "pending" || p.kyc_status === "submitted").length;
        setStats((prev) => ({ ...prev, totalUsers: profiles.length, totalAUM, pendingKYC }));
        setRecentUsers(profiles.slice(0, 5) as User[]);
      }

      const today = new Date().toISOString().split("T")[0];
      const txs = await fetch("/api/admin/data?type=transactions").then(r => r.json()).catch(() => []);
      if (Array.isArray(txs)) {
        const depositsToday = txs.filter((t: Tx) => t.type === "deposit" && t.status === "completed" && t.created_at.startsWith(today)).reduce((s: number, t: Tx) => s + Number(t.amount), 0);
        const pendingWithdrawals = txs.filter((t: Tx) => t.type === "withdrawal" && t.status === "pending").length;
        setStats((prev) => ({ ...prev, depositsToday, pendingWithdrawals }));
        setRecentTx(txs.slice(0, 10) as Tx[]);
      }
    };
    load();
  }, []);

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statCards = [
    { label: "Total Users", value: stats.totalUsers.toString(), icon: Users, color: "#3b82f6" },
    { label: "Total AUM", value: fmt(stats.totalAUM), icon: Wallet, color: "#1a8a6e" },
    { label: "Deposits Today", value: fmt(stats.depositsToday), icon: ArrowDownCircle, color: "#16a34a" },
    { label: "Pending Withdrawals", value: stats.pendingWithdrawals.toString(), icon: ArrowUpCircle, color: "#f0a500" },
    { label: "Pending KYC", value: stats.pendingKYC.toString(), icon: ShieldCheck, color: "#ef4444" },
  ];

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState("");

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) return;
    setInviting(true);
    setInviteResult("");
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });
      if (res.ok) {
        setInviteResult(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        setInviteName("");
      } else {
        setInviteResult("Failed to send invitation");
      }
    } catch {
      setInviteResult("Network error");
    }
    setInviting(false);
    setTimeout(() => setInviteResult(""), 5000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{s.label}</span>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { href: "/admin/profit", label: "Post Profit", icon: TrendingUp, color: "#1a8a6e" },
          { href: "/admin/kyc", label: "Review KYC", icon: ShieldCheck, color: "#3b82f6" },
          { href: "/admin/withdrawals", label: "Approve Withdrawals", icon: ArrowUpCircle, color: "#f0a500" },
        ].map((a, i) => (
          <Link key={i} href={a.href} className="flex items-center justify-between p-4 rounded-xl transition-all hover:bg-white/[0.04]" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <a.icon size={18} style={{ color: a.color }} />
              <span className="text-sm text-white/80 font-medium">{a.label}</span>
            </div>
            <ArrowRight size={14} className="text-white/30" />
          </Link>
        ))}
      </div>

      {/* Invite Investor */}
      <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={18} className="text-naxcal-teal" />
          <h3 className="text-sm font-semibold text-white">Invite Investor</h3>
        </div>
        {inviteResult && (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-3" style={{ background: inviteResult.includes("sent") ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.1)", border: inviteResult.includes("sent") ? "1px solid rgba(22,163,74,0.2)" : "1px solid rgba(239,68,68,0.2)" }}>
            {inviteResult.includes("sent") ? <CheckCircle2 size={14} className="text-emerald-400" /> : null}
            <span className={`text-xs ${inviteResult.includes("sent") ? "text-emerald-400" : "text-red-400"}`}>{inviteResult}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Full name"
            className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email address"
            className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <button onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteName}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors cursor-pointer disabled:opacity-50 shrink-0">
            {inviting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-2">Sends a professional invitation email with a link to register. Their portfolio data can be seeded after they sign up.</p>
      </div>

      {/* Recent Users + Transactions */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Signups</h3>
            <Link href="/admin/users" className="text-xs text-naxcal-teal hover:underline">View All</Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-4">No users yet</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div>
                    <p className="text-sm text-white/80 font-medium">{u.full_name || "No name"}</p>
                    <p className="text-[10px] text-white/30">{u.email}</p>
                  </div>
                  <span className="text-xs text-white/40">{new Date(u.created_at).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Recent Transactions</h3>
          {recentTx.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {recentTx.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div>
                    <p className="text-sm text-white/80 font-medium capitalize">{tx.type}</p>
                    <p className="text-[10px] text-white/30">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-semibold ${["deposit", "profit"].includes(tx.type) ? "text-emerald-400" : "text-red-400"}`}>
                    {["deposit", "profit"].includes(tx.type) ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
