"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import {
  Wallet, TrendingUp, CircleDollarSign, ArrowDownCircle, ArrowUpCircle,
  Users, FileText, AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight,
  Megaphone, Info, AlertCircle, CheckCircle2,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type Transaction = { id: string; type: string; amount: number; status: string; created_at: string; description: string | null; };
type Announcement = { id: string; title: string; content: string; type: string; created_at: string; };

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };
const placeholderChart = Array.from({ length: 14 }, (_, i) => ({ d: i, v: 1000 + Math.random() * 500 + i * 80 }));

export default function DashboardPage() {
  const { profile } = useDashboard();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!profile) return;
    supabase.from("transactions").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => { if (data) setTransactions(data); });
    supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(2).then(({ data }) => { if (data) setAnnouncements(data); });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const balance = Number(profile?.balance ?? 0);
  const totalProfit = Number(profile?.total_profit ?? 0);
  const totalDeposited = Number(profile?.total_deposited ?? 0);
  const tierRate = profile?.tier === "gold" ? 2.1 : profile?.tier === "silver" ? 1.8 : 1.5;
  const todayReturn = balance * (tierRate / 100);
  const tierThresholds = { bronze: { next: "Silver", target: 5000 }, silver: { next: "Gold", target: 25000 }, gold: { next: null, target: 0 } };
  const currentTierInfo = tierThresholds[(profile?.tier as keyof typeof tierThresholds) || "bronze"];
  const progress = currentTierInfo.target > 0 ? Math.min(100, (balance / currentTierInfo.target) * 100) : 100;
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const announcementStyles: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
    info: { bg: "#eff6ff", border: "#bfdbfe", icon: <Info size={16} className="text-blue-600" /> },
    warning: { bg: "#fffbeb", border: "#fde68a", icon: <AlertCircle size={16} className="text-amber-600" /> },
    success: { bg: "#f0fdf4", border: "#bbf7d0", icon: <CheckCircle2 size={16} className="text-emerald-600" /> },
    urgent: { bg: "#fef2f2", border: "#fecaca", icon: <AlertTriangle size={16} className="text-red-600" /> },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">
      {/* KYC Banner */}
      {profile?.kyc_status !== "approved" && (
        <motion.div variants={item} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-600" />
            <div>
              <p className="text-sm text-[#0f172a] font-medium">Complete your identity verification</p>
              <p className="text-xs text-[#6b7280]">Unlock deposits, withdrawals, and full platform access.</p>
            </div>
          </div>
          <Link href="/dashboard/settings" className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors">
            Verify Now <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Stats Cards — white */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Portfolio Value", value: fmt(balance), icon: Wallet, color: "text-naxcal-teal", bg: "rgba(26,138,110,0.1)" },
          { label: "Today's Return", value: fmt(todayReturn), sub: `+${tierRate}%`, icon: TrendingUp, color: "text-emerald-600", bg: "rgba(22,163,74,0.1)" },
          { label: "Total Earned", value: fmt(totalProfit), icon: CircleDollarSign, color: "text-amber-600", bg: "rgba(240,165,0,0.1)" },
          { label: "Total Deposited", value: fmt(totalDeposited), icon: ArrowDownCircle, color: "text-blue-600", bg: "rgba(59,130,246,0.1)" },
        ].map((stat, i) => (
          <div key={i} className="card-light p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[#6b7280] uppercase tracking-wider">{stat.label}</span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: stat.bg }}>
                <stat.icon size={18} className={stat.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0f172a]">{stat.value}</p>
            {stat.sub && <p className="text-xs text-[#16a34a] mt-0.5 font-medium">{stat.sub}</p>}
          </div>
        ))}
      </motion.div>

      {/* Chart + Recent Activity */}
      <motion.div variants={item} className="grid lg:grid-cols-[1fr_380px] gap-4">
        <div className="card-light p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">Portfolio Performance</h3>
            <div className="flex gap-1">
              {["1W", "1M", "3M", "ALL"].map((r) => (
                <button key={r} className={cn("px-2.5 py-1 rounded text-[10px] font-medium cursor-pointer transition-all",
                  r === "1M" ? "bg-naxcal-teal text-white" : "text-[#9ca3af] hover:text-[#475569] hover:bg-[#f1f5f9]"
                )}>{r}</button>
              ))}
            </div>
          </div>
          {transactions.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-[#9ca3af] text-sm">No data yet — make your first deposit to get started</div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={placeholderChart}>
                  <defs><linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a8a6e" stopOpacity={0.2} /><stop offset="100%" stopColor="#1a8a6e" stopOpacity={0} /></linearGradient></defs>
                  <Area type="monotone" dataKey="v" stroke="#1a8a6e" strokeWidth={2} fill="url(#balGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card-light p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">Recent Activity</h3>
            <Link href="/dashboard/transactions" className="text-xs text-naxcal-teal hover:underline font-medium">View All</Link>
          </div>
          {transactions.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[#9ca3af] text-sm">No transactions yet</div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => {
                const isCredit = ["deposit", "profit", "bonus", "referral"].includes(tx.type);
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 hover:bg-[#f8fafc] rounded-lg px-2 transition-colors">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isCredit ? "bg-emerald-50" : "bg-red-50")}>
                      {isCredit ? <ArrowUpRight size={14} className="text-emerald-600" /> : <ArrowDownRight size={14} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#374151] capitalize font-medium">{tx.description || tx.type}</p>
                      <p className="text-[10px] text-[#9ca3af]">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={cn("text-sm font-semibold", isCredit ? "text-[#16a34a]" : "text-red-500")}>
                      {isCredit ? "+" : "-"}{fmt(Number(tx.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Tier + Quick Actions */}
      <motion.div variants={item} className="grid lg:grid-cols-2 gap-4">
        <div className="card-light p-5">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Investment Tier</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className={cn("text-lg font-bold capitalize",
              profile?.tier === "gold" ? "text-amber-600" : profile?.tier === "silver" ? "text-slate-500" : "text-orange-700"
            )}>{profile?.tier || "Bronze"} Tier</span>
            <span className="text-xs text-[#9ca3af]">{tierRate}% daily</span>
          </div>
          {currentTierInfo.next && (
            <>
              <div className="flex items-center justify-between text-xs text-[#6b7280] mb-1.5">
                <span>Progress to {currentTierInfo.next}</span>
                <span>{fmt(balance)} / {fmt(currentTierInfo.target)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-[#e2e8f0]">
                <div className="h-full rounded-full bg-naxcal-teal transition-all" style={{ width: `${progress}%` }} />
              </div>
              <Link href="/dashboard/deposit" className="inline-flex items-center gap-1 mt-4 text-xs text-naxcal-teal font-medium hover:underline">
                Deposit to upgrade <ArrowRight size={12} />
              </Link>
            </>
          )}
        </div>

        <div className="card-light p-5">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/dashboard/deposit", label: "Deposit", icon: ArrowDownCircle, color: "text-naxcal-teal", bg: "rgba(26,138,110,0.08)" },
              { href: "/dashboard/withdraw", label: "Withdraw", icon: ArrowUpCircle, color: "text-amber-600", bg: "rgba(240,165,0,0.08)" },
              { href: "/dashboard/referrals", label: "Invite Friends", icon: Users, color: "text-blue-600", bg: "rgba(59,130,246,0.08)" },
              { href: "#", label: "Statement", icon: FileText, color: "text-purple-600", bg: "rgba(147,51,234,0.08)" },
            ].map((action, i) => (
              <Link key={i} href={action.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#f8fafc] transition-colors" style={{ border: "1px solid #e2e8f0" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: action.bg }}>
                  <action.icon size={16} className={action.color} />
                </div>
                <span className="text-sm text-[#374151] font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div variants={item} className="space-y-3">
          <h3 className="text-sm font-semibold text-[#0f172a] flex items-center gap-2"><Megaphone size={16} className="text-naxcal-teal" /> Announcements</h3>
          {announcements.map((a) => {
            const style = announcementStyles[a.type] || announcementStyles.info;
            return (
              <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                {style.icon}
                <div>
                  <p className="text-sm text-[#0f172a] font-medium">{a.title}</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">{a.content}</p>
                  <p className="text-[10px] text-[#9ca3af] mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
