"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import {
  Wallet, TrendingUp, CircleDollarSign, ArrowDownCircle, ArrowUpCircle,
  Users, FileText, AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight,
  Megaphone, Info, AlertCircle, CheckCircle2, Star, BarChart2, MessageCircle,
  Inbox,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

type Transaction = { id: string; type: string; amount: number; status: string; created_at: string; description: string | null };
type Announcement = { id: string; title: string; content: string; type: string; created_at: string };

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } } };

function AnimatedNumber({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span ref={ref}>{formatter(display)}</span>;
}

const marketData = [
  { symbol: "BTC", name: "Bitcoin", price: 104250.80, change: 2.34, color: "#f7931a" },
  { symbol: "ETH", name: "Ethereum", price: 3842.15, change: -1.12, color: "#627eea" },
  { symbol: "USDT", name: "Tether", price: 1.00, change: 0.01, color: "#26a17b" },
  { symbol: "EUR/USD", name: "Euro/Dollar", price: 1.0892, change: 0.15, color: "#3b82f6" },
  { symbol: "GOLD", name: "Gold", price: 2438.50, change: 0.87, color: "#f0a500" },
  { symbol: "S&P500", name: "S&P 500", price: 5560.22, change: 0.42, color: "#ef4444" },
];

const sparklines: Record<string, number[]> = {
  BTC: [40, 42, 38, 44, 46, 45, 48, 50, 47, 52],
  ETH: [30, 32, 35, 33, 31, 34, 36, 33, 35, 34],
  USDT: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  "EUR/USD": [20, 21, 19, 22, 21, 23, 22, 24, 23, 24],
  GOLD: [50, 52, 51, 53, 55, 54, 56, 57, 56, 58],
  "S&P500": [45, 46, 44, 47, 48, 47, 49, 50, 49, 51],
};

const allocationData = [
  { name: "Forex Trading", value: 35, color: "#1a8a6e" },
  { name: "Global Equities", value: 25, color: "#3b82f6" },
  { name: "Crypto Assets", value: 20, color: "#8b5cf6" },
  { name: "Commodities", value: 12, color: "#f0a500" },
  { name: "Algorithmic", value: 8, color: "#16a34a" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { profile, refreshProfile, fmt } = useDashboard();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change: number }>>({});
  const supabase = createClient();

  // Redirect new users to onboarding (only if column exists and is explicitly false)
  useEffect(() => {
    if (profile && (profile as Record<string, unknown>).onboarding_complete === false) {
      router.push("/dashboard/onboarding");
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile) return;
    supabase.from("transactions").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => { if (data) setTransactions(data); });
    supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(2).then(({ data }) => { if (data) setAnnouncements(data); });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime balance subscription
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel("profile-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${profile.id}` }, () => {
        refreshProfile();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live crypto prices for market overview
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/prices");
        if (res.ok) {
          const data = await res.json();
          const mapped: Record<string, { price: number; change: number }> = {};
          const idMap: Record<string, string> = { bitcoin: "BTC", ethereum: "ETH", tether: "USDT", solana: "SOL", binancecoin: "BNB", ripple: "XRP" };
          Object.entries(idMap).forEach(([id, sym]) => {
            if (data[id]) mapped[sym] = { price: data[id].usd, change: data[id].usd_24h_change || 0 };
          });
          setLivePrices(mapped);
        }
      } catch {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const balance = Number(profile?.balance ?? 0);
  const totalProfit = Number(profile?.total_profit ?? 0);
  const totalDeposited = Number(profile?.total_deposited ?? 0);
  const tierRate = profile?.tier === "gold" ? 2.1 : profile?.tier === "silver" ? 1.8 : 1.5;
  const todayReturn = balance * (tierRate / 100);
  const tierThresholds = { bronze: { next: "Silver", target: 5000 }, silver: { next: "Gold", target: 25000 }, gold: { next: null, target: 0 } };
  const currentTierInfo = tierThresholds[(profile?.tier as keyof typeof tierThresholds) || "bronze"];
  const progress = currentTierInfo.target > 0 ? Math.min(100, (balance / currentTierInfo.target) * 100) : 100;

  const tierColors: Record<string, { text: string; bg: string; border: string }> = {
    bronze: { text: "text-orange-700", bg: "linear-gradient(135deg, rgba(180,83,9,0.08), rgba(180,83,9,0.03))", border: "rgba(180,83,9,0.2)" },
    silver: { text: "text-slate-500", bg: "linear-gradient(135deg, rgba(100,116,139,0.08), rgba(100,116,139,0.03))", border: "rgba(100,116,139,0.2)" },
    gold: { text: "text-amber-600", bg: "linear-gradient(135deg, rgba(240,165,0,0.08), rgba(240,165,0,0.03))", border: "rgba(240,165,0,0.2)" },
  };
  const currentTierColors = tierColors[(profile?.tier as string) || "bronze"] || tierColors.bronze;

  const tierPerks: Record<string, string[]> = {
    bronze: ["1.5% daily returns", "Standard support", "Basic analytics"],
    silver: ["1.8% daily returns", "Priority support", "Advanced analytics"],
    gold: ["2.1% daily returns", "Dedicated manager", "Premium analytics"],
  };
  const currentPerks = tierPerks[(profile?.tier as string) || "bronze"] || tierPerks.bronze;

  const [chartRange, setChartRange] = useState("1M");
  const seed = (i: number) => Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5;
  const chartPoints = chartRange === "1W" ? 7 : chartRange === "1M" ? 30 : chartRange === "3M" ? 90 : 365;
  const sampleChart = Array.from({ length: Math.min(chartPoints, 60) }, (_, i) => {
    const step = chartPoints / Math.min(chartPoints, 60);
    const idx = Math.floor(i * step);
    return { d: `${idx + 1}`, v: balance > 0 ? balance * 0.7 + seed(idx) * balance * 0.15 + (idx / chartPoints) * balance * 0.3 : 0 };
  });

  const [dailyReturns, setDailyReturns] = useState<{ date: string; rate: string; earnings: string; status: string }[]>([]);
  useEffect(() => {
    if (!profile) return;
    supabase.from("transactions").select("amount, created_at").eq("user_id", profile.id).eq("type", "profit").order("created_at", { ascending: false }).limit(7)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDailyReturns(data.map((tx) => ({
            date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            rate: (Number(tx.amount) / Math.max(balance, 1) * 100).toFixed(2),
            earnings: Number(tx.amount).toFixed(2),
            status: "Paid",
          })));
        }
      });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm text-[#0f172a] font-medium">Complete your identity verification</p>
              <p className="text-xs text-[#6b7280]">Unlock deposits, withdrawals, and full platform access.</p>
            </div>
          </div>
          <Link href="/dashboard/kyc" className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors shrink-0">
            Verify Now <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <div className="card-light p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300" style={{ background: "linear-gradient(135deg, rgba(26,138,110,0.08), rgba(26,138,110,0.02))" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-[#6b7280] uppercase tracking-wider">Portfolio Value</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(26,138,110,0.12)" }}>
              <Wallet size={20} className="text-naxcal-teal" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#0f172a]"><AnimatedNumber value={balance} formatter={fmt} /></p>
        </div>

        {/* Today's Return */}
        <div className="card-light p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300" style={{ background: todayReturn > 0 ? "linear-gradient(135deg, rgba(22,163,74,0.08), rgba(22,163,74,0.02))" : undefined }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-[#6b7280] uppercase tracking-wider">Today&apos;s Return</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(22,163,74,0.12)" }}>
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-emerald-600"><AnimatedNumber value={todayReturn} formatter={fmt} /></p>
            {todayReturn > 0 && <ArrowUpRight size={18} className="text-emerald-500" />}
          </div>
          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            +{tierRate}%
          </div>
        </div>

        {/* Total Earned */}
        <div className="card-light p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-[#6b7280] uppercase tracking-wider">Total Earned</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(240,165,0,0.12)" }}>
              <CircleDollarSign size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600"><AnimatedNumber value={totalProfit} formatter={fmt} /></p>
        </div>

        {/* Total Deposited */}
        <div className="card-light p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-[#6b7280] uppercase tracking-wider">Total Deposited</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
              <ArrowDownCircle size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600"><AnimatedNumber value={totalDeposited} formatter={fmt} /></p>
        </div>
      </motion.div>

      {/* Chart + Recent Activity */}
      <motion.div variants={item} className="grid lg:grid-cols-[1fr_380px] gap-4">
        <div className="card-light p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Portfolio Performance</h3>
              <p className="text-[10px] text-[#9ca3af] mt-0.5">Last updated: just now</p>
            </div>
            <div className="flex gap-1">
              {["1W", "1M", "3M", "ALL"].map((r) => (
                <button key={r} onClick={() => setChartRange(r)} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all",
                  chartRange === r ? "bg-naxcal-teal text-white shadow-sm" : "text-[#9ca3af] hover:text-[#475569] hover:bg-[#f1f5f9]"
                )}>{r}</button>
              ))}
            </div>
          </div>
          {balance === 0 ? (
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Array.from({ length: 14 }, (_, i) => ({ d: i, v: 0 }))}>
                  <defs><linearGradient id="emptyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.3} /><stop offset="100%" stopColor="#e2e8f0" stopOpacity={0} /></linearGradient></defs>
                  <Area type="monotone" dataKey="v" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="6 4" fill="url(#emptyGrad)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-[#9ca3af] bg-white/80 px-4 py-2 rounded-lg">Your growth will appear here after first deposit</p>
              </div>
            </div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sampleChart}>
                  <defs><linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a8a6e" stopOpacity={0.25} /><stop offset="100%" stopColor="#1a8a6e" stopOpacity={0} /></linearGradient></defs>
                  <Area type="monotone" dataKey="v" stroke="#1a8a6e" strokeWidth={2} fill="url(#balGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card-light p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">Recent Activity</h3>
            <Link href="/dashboard/transactions" className="text-xs text-naxcal-teal hover:underline font-medium">View All</Link>
          </div>
          {transactions.length === 0 ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(26,138,110,0.08)" }}>
                <Inbox size={24} className="text-[#9ca3af]" />
              </div>
              <p className="text-sm font-medium text-[#374151] mb-1">No transactions yet</p>
              <p className="text-xs text-[#9ca3af] mb-3">Make your first deposit to get started</p>
              <Link href="/dashboard/deposit" className="px-4 py-2 rounded-lg text-xs font-semibold text-white btn-teal">
                Deposit Now
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => {
                const isProfit = tx.type === "profit";
                const isCredit = ["deposit", "profit", "bonus", "referral"].includes(tx.type);
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 hover:bg-[#f8fafc] rounded-lg px-2 transition-colors">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                      isProfit ? "bg-amber-50" : isCredit ? "bg-emerald-50" : "bg-red-50"
                    )}>
                      {isProfit ? <Star size={14} className="text-amber-500" /> : isCredit ? <ArrowDownRight size={14} className="text-emerald-600" /> : <ArrowUpRight size={14} className="text-red-500" />}
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
        {/* Investment Tier */}
        <div className="card-light p-5 overflow-hidden" style={{ background: currentTierColors.bg, borderColor: currentTierColors.border }}>
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Investment Tier</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
              background: profile?.tier === "gold" ? "linear-gradient(135deg, #f0a500, #f5bc30)" : profile?.tier === "silver" ? "linear-gradient(135deg, #94a3b8, #cbd5e1)" : "linear-gradient(135deg, #b45309, #d97706)",
            }}>
              <Star size={22} className="text-white" />
            </div>
            <div>
              <span className={cn("text-xl font-bold capitalize", currentTierColors.text)}>{profile?.tier || "Bronze"} Tier</span>
              <p className="text-xs text-[#6b7280]">{tierRate}% daily returns</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {currentPerks.map((perk, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-naxcal-teal shrink-0" />
                <span className="text-xs text-[#374151]">{perk}</span>
              </div>
            ))}
          </div>

          {currentTierInfo.next && (
            <>
              <div className="flex items-center justify-between text-xs text-[#6b7280] mb-1.5">
                <span>Progress to {currentTierInfo.next}</span>
                <span>{fmt(balance)} / {fmt(currentTierInfo.target)}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden bg-[#e2e8f0]">
                <div className="h-full rounded-full bg-naxcal-teal transition-all" style={{ width: `${progress}%` }} />
              </div>
              <Link href="/dashboard/deposit" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-white btn-teal">
                Deposit to Upgrade <ArrowRight size={12} />
              </Link>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card-light p-5">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { href: "/dashboard/deposit", label: "Deposit", icon: ArrowDownCircle, color: "text-naxcal-teal", bg: "rgba(26,138,110,0.08)" },
              { href: "/dashboard/withdraw", label: "Withdraw", icon: ArrowUpCircle, color: "text-amber-600", bg: "rgba(240,165,0,0.08)" },
              { href: "/dashboard/referrals", label: "Invite Friends", icon: Users, color: "text-blue-600", bg: "rgba(59,130,246,0.08)" },
              { href: "/dashboard/markets", label: "Markets", icon: BarChart2, color: "text-purple-600", bg: "rgba(147,51,234,0.08)" },
              { href: "/dashboard/support", label: "Support", icon: MessageCircle, color: "text-pink-600", bg: "rgba(236,72,153,0.08)" },
            ].map((action, i) => (
              <Link key={i} href={action.href} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-[#f8fafc] hover:border-naxcal-teal/20 transition-all group" style={{ border: "1px solid #e2e8f0" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: action.bg }}>
                  <action.icon size={20} className={action.color} />
                </div>
                <span className="text-xs text-[#374151] font-medium">{action.label}</span>
              </Link>
            ))}
            <button onClick={() => { window.open("/dashboard/statement", "_blank"); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-[#f8fafc] hover:border-naxcal-teal/20 transition-all group cursor-pointer" style={{ border: "1px solid #e2e8f0" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: "rgba(100,116,139,0.08)" }}>
                <FileText size={20} className="text-slate-600" />
              </div>
              <span className="text-xs text-[#374151] font-medium">Statement</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Market Overview */}
      <motion.div variants={item} className="card-light p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[#0f172a]">Market Overview</h3>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" /> Live
            </span>
          </div>
          <Link href="/dashboard/markets" className="text-xs text-naxcal-teal hover:underline font-medium">View All</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {marketData.map((asset) => {
            const live = livePrices[asset.symbol];
            const price = live?.price ?? asset.price;
            const change = live?.change ?? asset.change;
            return (
              <div key={asset.symbol} className="p-3 rounded-xl hover:shadow-md transition-all cursor-pointer" style={{ border: "1px solid #e2e8f0" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: asset.color }}>
                    {asset.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#0f172a] truncate">{asset.symbol}</p>
                    <p className="text-[9px] text-[#9ca3af] truncate">{asset.name}</p>
                  </div>
                </div>
                <div className="h-8 mb-1.5">
                  <svg viewBox="0 0 100 30" className="w-full h-full">
                    <polyline fill="none" stroke={change >= 0 ? "#16a34a" : "#ef4444"} strokeWidth="1.5"
                      points={sparklines[asset.symbol]?.map((v, i) => `${i * 11},${30 - v * 0.5}`).join(" ") || "0,15 100,15"} />
                  </svg>
                </div>
                <p className="text-xs font-bold text-[#0f172a]">${price < 1 ? price.toFixed(4) : price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                <span className={cn("text-[10px] font-semibold", change >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Portfolio Allocation */}
      <motion.div variants={item} className="card-light p-5">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Portfolio Allocation</h3>
        {balance === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#9ca3af]">Your portfolio allocation will appear after your first deposit</p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none">
                    {allocationData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {allocationData.map((a) => (
                <div key={a.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: a.color }} />
                    <span className="text-xs text-[#374151]">{a.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-[#0f172a]">{a.value}%</span>
                    <span className="text-[10px] text-[#9ca3af] ml-2">{fmt(balance * a.value / 100)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Daily Returns History */}
      <motion.div variants={item} className="card-light p-5">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Recent Returns</h3>
        {dailyReturns.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#9ca3af]">Daily returns will appear here after your first profit posting</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  <th className="text-left text-[10px] text-[#9ca3af] uppercase tracking-wider py-2 font-medium">Date</th>
                  <th className="text-left text-[10px] text-[#9ca3af] uppercase tracking-wider py-2 font-medium">Return %</th>
                  <th className="text-left text-[10px] text-[#9ca3af] uppercase tracking-wider py-2 font-medium">Your Earnings</th>
                  <th className="text-left text-[10px] text-[#9ca3af] uppercase tracking-wider py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dailyReturns.map((day, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                    <td className="py-2.5 text-xs text-[#374151]">{day.date}</td>
                    <td className="py-2.5 text-xs font-semibold text-emerald-600">+{day.rate}%</td>
                    <td className="py-2.5 text-xs font-semibold text-[#0f172a]">{fmt(Number(day.earnings))}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{day.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
