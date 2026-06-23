"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Users, Wallet, ArrowDownCircle, ArrowUpCircle, ShieldCheck, TrendingUp, ArrowRight } from "lucide-react";

type Stats = { totalUsers: number; totalAUM: number; depositsToday: number; pendingWithdrawals: number; pendingKYC: number };
type User = { id: string; full_name: string | null; email: string; balance: number; tier: string; kyc_status: string; created_at: string };
type Tx = { id: string; type: string; amount: number; status: string; created_at: string; user_id: string };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalAUM: 0, depositsToday: 0, pendingWithdrawals: 0, pendingKYC: 0 });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentTx, setRecentTx] = useState<Tx[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, balance, tier, kyc_status, created_at");
      if (profiles) {
        const totalAUM = profiles.reduce((s, p) => s + Number(p.balance), 0);
        const pendingKYC = profiles.filter((p) => p.kyc_status === "pending" || p.kyc_status === "submitted").length;
        setStats((prev) => ({ ...prev, totalUsers: profiles.length, totalAUM, pendingKYC }));
        setRecentUsers(profiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5) as User[]);
      }

      const today = new Date().toISOString().split("T")[0];
      const { data: txs } = await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(10);
      if (txs) {
        const depositsToday = txs.filter((t) => t.type === "deposit" && t.status === "completed" && t.created_at.startsWith(today)).reduce((s, t) => s + Number(t.amount), 0);
        const pendingWithdrawals = txs.filter((t) => t.type === "withdrawal" && t.status === "pending").length;
        setStats((prev) => ({ ...prev, depositsToday, pendingWithdrawals }));
        setRecentTx(txs as Tx[]);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statCards = [
    { label: "Total Users", value: stats.totalUsers.toString(), icon: Users, color: "#3b82f6" },
    { label: "Total AUM", value: fmt(stats.totalAUM), icon: Wallet, color: "#1a8a6e" },
    { label: "Deposits Today", value: fmt(stats.depositsToday), icon: ArrowDownCircle, color: "#16a34a" },
    { label: "Pending Withdrawals", value: stats.pendingWithdrawals.toString(), icon: ArrowUpCircle, color: "#f0a500" },
    { label: "Pending KYC", value: stats.pendingKYC.toString(), icon: ShieldCheck, color: "#ef4444" },
  ];

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
