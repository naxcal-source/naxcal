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
import { AreaChart, Area, PieChart, Pie, Cell } from "recharts";
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
  { symbol: "BTC", name: "Bitcoin", price: 64048, change: -1.73, color: "#f7931a" },
  { symbol: "ETH", name: "Ethereum", price: 1873.1, change: -2.55, color: "#627eea" },
  { symbol: "USDC", name: "USD Coin", price: 1.0, change: 0.01, color: "#2775ca" },
  { symbol: "BNB", name: "BNB", price: 572.44, change: 1.12, color: "#f3ba2f" },
  { symbol: "SOL", name: "Solana", price: 144.26, change: 2.34, color: "#14f195" },
  { symbol: "XRP", name: "XRP", price: 0.61, change: 0.82, color: "#23292f" },
];

const sparklines: Record<string, number[]> = {
  BTC: [40, 42, 38, 44, 46, 45, 48, 50, 47, 52],
  ETH: [30, 32, 35, 33, 31, 34, 36, 33, 35, 34],
  USDT: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  "EUR/USD": [20, 21, 19, 22, 21, 23, 22, 24, 23, 24],
  GOLD: [50, 52, 51, 53, 55, 54, 56, 57, 56, 58],
  "S&P500": [45, 46, 44, 47, 48, 47, 49, 50, 49, 51],
};

const getAllocationData = (cash: number, crypto: number, stocks: number) => {
  const total = cash + crypto + stocks;

  if (total <= 0) return [];

  return [
    { name: "Cash Balance", value: Math.round((cash / total) * 100), color: "#1a8a6e" },
    { name: "Stocks", value: Math.round((stocks / total) * 100), color: "#3b82f6" },
    { name: "Crypto", value: Math.round((crypto / total) * 100), color: "#8b5cf6" },
  ].filter((item) => item.value > 0);
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile, refreshProfile, fmt } = useDashboard();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cryptoPortfolioValue, setCryptoPortfolioValue] = useState(0);
  const [stockPortfolioValue, setStockPortfolioValue] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change: number }>>({});
  // Redirect new users to onboarding (only if column exists and is explicitly false)
  useEffect(() => {
    if (profile && (profile as Record<string, unknown>).onboarding_complete === false) {
      router.push("/dashboard/onboarding");
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile) return;
    fetch("/api/me/transactions?limit=5").then(r => r.json()).then(data => { if (Array.isArray(data)) setTransactions(data); }).catch(() => {});
    // Announcements are public — anon key works fine
    const supabase = createClient();
    supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(2).then(({ data }) => { if (data) setAnnouncements(data); });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Removed realtime subscription — was causing balance flickering

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
  const displayPortfolioValue = balance + cryptoPortfolioValue + stockPortfolioValue;
  const allocationData = getAllocationData(balance, cryptoPortfolioValue, stockPortfolioValue);

  const [chartRange, setChartRange] = useState("1M");

  const accountEvents = transactions
    .filter((tx) => (tx as any).source !== "onchain")
    .filter((tx) => (tx as any).balance_before !== null || (tx as any).balance_after !== null)
    .slice()
    .reverse();

  const rangeLimit =
    chartRange === "1W" ? 7 :
    chartRange === "1M" ? 12 :
    chartRange === "3M" ? 18 :
    40;

  const visibleEvents = chartRange === "ALL" ? accountEvents : accountEvents.slice(-rangeLimit);

  const startingBalance =
    visibleEvents.length > 0
      ? Number((visibleEvents[0] as any).balance_before ?? 0)
      : 0;

  let runningValue = Number.isFinite(startingBalance) ? startingBalance : 0;

  const performanceChart = displayPortfolioValue > 0
    ? [
        { name: "Start", v: Math.max(runningValue, 0) },
        ...visibleEvents.map((tx, index) => {
          const type = String((tx as any).type || "").toLowerCase();
          const amount = Number((tx as any).amount || 0);
          const balanceAfter = Number((tx as any).balance_after);

          if (type === "stock_buy" || type === "swap") {
            // These move value between cash/holdings, so total account value should not drop.
            runningValue = runningValue;
          } else if (Number.isFinite(balanceAfter) && balanceAfter >= 0) {
            runningValue = balanceAfter;
          } else if (Number.isFinite(amount)) {
            runningValue += amount;
          }

          return {
            name: `${index + 1}`,
            v: Math.max(runningValue, 0),
          };
        }),
        { name: "Now", v: Math.max(displayPortfolioValue, 0) },
      ]
    : [];

  const performanceStart = performanceChart[0]?.v || 0;
  const performanceCurrent = displayPortfolioValue;
  const performanceChange = performanceCurrent - performanceStart;
  const performanceEvents = visibleEvents.length;
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

  useEffect(() => {
    fetch("/api/stocks/portfolio")
      .then((res) => res.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];

        const total = rows.reduce((sum, item) => {
          const value = Number(item.market_value || 0);
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0);

        setStockPortfolioValue(total);
      })
      .catch(() => setStockPortfolioValue(0));
  }, []);

  const seed = (i: number) => Math.sin(i * 127.1 + 311.7) * 0.5 + 0.5;
  const chartPoints = chartRange === "1W" ? 7 : chartRange === "1M" ? 30 : chartRange === "3M" ? 90 : 365;
  const sampleChart = Array.from({ length: Math.min(chartPoints, 60) }, (_, i) => {
    const step = chartPoints / Math.min(chartPoints, 60);
    const idx = Math.floor(i * step);
    return {
      d: `${idx + 1}`,
      v:
        displayPortfolioValue > 0
          ? displayPortfolioValue * 0.7 +
            seed(idx) * displayPortfolioValue * 0.15 +
            (idx / chartPoints) * displayPortfolioValue * 0.3
          : 0,
    };
  });

  const [dailyReturns, setDailyReturns] = useState<{ date: string; rate: string; earnings: string; status: string }[]>([]);
  useEffect(() => {
    if (!profile) return;
    fetch("/api/me/transactions?type=profit&limit=7").then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setDailyReturns(data.map((tx: { amount: number; created_at: string }) => ({
          date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          rate: (Number(tx.amount) / Math.max(balance, 1) * 100).toFixed(2),
          earnings: Number(tx.amount).toFixed(2),
          status: "Paid",
        })));
      }
    }).catch(() => {});
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
        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, #fffbeb, #ffffff)",
            border: "1px solid #fde68a",
            boxShadow: "0 14px 35px rgba(146,64,14,0.08)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
            </div>
            <div>
              <p className="text-sm text-[#0f172a] font-semibold">Complete your identity verification</p>
              <p className="text-xs text-[#64748b]">Unlock deposits, withdrawals and full platform access.</p>
            </div>
          </div>

          <Link
            href="/dashboard/kyc"
            className="flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors shrink-0"
          >
            Verify Now <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Premium Portfolio Hero */}
      <motion.div variants={item} className="grid lg:grid-cols-[1.55fr_0.9fr] gap-5">
        <div
          className="relative overflow-hidden rounded-[28px] p-6 sm:p-7 text-white"
          style={{
            background:
              "radial-gradient(circle at 15% 10%, rgba(31,214,163,0.36), transparent 32%), radial-gradient(circle at 85% 0%, rgba(240,165,0,0.16), transparent 28%), linear-gradient(135deg, #071b1c 0%, #0b2b2d 48%, #071012 100%)",
            boxShadow: "0 28px 70px rgba(2,44,34,0.28)",
          }}
        >
          <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute right-8 bottom-8 w-32 h-32 rounded-full bg-emerald-400/10 blur-xl" />

          <div className="relative z-10 min-h-[330px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-semibold text-emerald-50">Live Portfolio</span>
                </div>

                <p className="mt-5 text-xs uppercase tracking-[0.24em] text-white/45">Total Portfolio Value</p>

                <h1 className="mt-2 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.04em]">
                  <AnimatedNumber value={displayPortfolioValue} formatter={fmt} />
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/12 text-emerald-100 border border-emerald-300/20 text-xs font-semibold">
                    <ArrowUpRight size={14} />
                    {displayPortfolioValue > 0 ? `+${tierRate}% daily rate` : "Ready to fund"}
                  </span>

                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/8 text-white/70 border border-white/10 text-xs font-semibold capitalize">
                    {profile?.tier || "Bronze"} tier
                  </span>

                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/8 text-white/70 border border-white/10 text-xs font-semibold">
                    {profile?.kyc_status === "approved" ? "Verified account" : "Verification pending"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 border border-white/10 p-4 min-w-[180px] backdrop-blur">
                <p className="text-[11px] uppercase tracking-wider text-white/45">Today's Return</p>
                <p className="mt-2 text-2xl font-bold text-emerald-200">
                  <AnimatedNumber value={todayReturn} formatter={fmt} />
                </p>
                <p className="mt-1 text-xs text-white/50">Next profit cycle: daily</p>
              </div>
            </div>

            <div className="mt-auto pt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white/[0.07] border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Available Balance</p>
                <p className="mt-2 text-lg font-bold"><AnimatedNumber value={balance} formatter={fmt} /></p>
              </div>

              <div className="rounded-2xl bg-white/[0.07] border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Crypto Value</p>
                <p className="mt-2 text-lg font-bold"><AnimatedNumber value={cryptoPortfolioValue} formatter={fmt} /></p>
              </div>

              <div className="rounded-2xl bg-white/[0.07] border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Stock Value</p>
                <p className="mt-2 text-lg font-bold"><AnimatedNumber value={stockPortfolioValue} formatter={fmt} /></p>
              </div>

              <div className="rounded-2xl bg-white/[0.07] border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Total Earned</p>
                <p className="mt-2 text-lg font-bold text-amber-200"><AnimatedNumber value={totalProfit} formatter={fmt} /></p>
              </div>

              <div className="rounded-2xl bg-white/[0.07] border border-white/10 p-4">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Total Deposited</p>
                <p className="mt-2 text-lg font-bold"><AnimatedNumber value={totalDeposited} formatter={fmt} /></p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 grid sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-white/35 uppercase tracking-wider text-[10px]">Last updated</p>
                <p className="mt-1 font-semibold text-white/80">Just now</p>
              </div>

              <div>
                <p className="text-white/35 uppercase tracking-wider text-[10px]">Next profit cycle</p>
                <p className="mt-1 font-semibold text-white/80">Daily payout</p>
              </div>

              <div>
                <p className="text-white/35 uppercase tracking-wider text-[10px]">Funding status</p>
                <p className="mt-1 font-semibold text-white/80">
                  {displayPortfolioValue > 0 ? "Funded account" : "Not funded yet"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Account Overview */}
        <div className="card-light p-5 rounded-[28px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0f172a]">Account Overview</h2>
              <p className="text-xs text-[#94a3b8] mt-1">Tier, status and account progress</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Wallet size={20} className="text-naxcal-teal" />
            </div>
          </div>

          <div className="mt-5 rounded-2xl p-4" style={{ background: currentTierColors.bg, border: `1px solid ${currentTierColors.border}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#64748b]">Investment Tier</p>
                <p className={cn("mt-1 text-2xl font-bold capitalize", currentTierColors.text)}>{profile?.tier || "Bronze"}</p>
              </div>
              <div className={cn("text-sm font-bold", currentTierColors.text)}>+{tierRate}%</div>
            </div>

            <div className="mt-4 h-2 rounded-full bg-white/70 overflow-hidden">
              <div className="h-full rounded-full bg-naxcal-teal" style={{ width: `${progress}%` }} />
            </div>

            <p className="mt-3 text-xs text-[#64748b]">
              {currentTierInfo.next
                ? `${fmt(Math.max(currentTierInfo.target - balance, 0))} until ${currentTierInfo.next}`
                : "Highest tier unlocked"}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {currentPerks.map((perk) => (
              <div key={perk} className="flex items-center gap-3 text-sm text-[#334155]">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>{perk}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href="/dashboard/deposit" className="rounded-2xl bg-naxcal-teal text-white p-4 hover:bg-naxcal-teal-light transition-colors">
              <ArrowDownCircle size={18} />
              <p className="mt-3 text-sm font-semibold">Deposit</p>
            </Link>

            <Link href="/dashboard/withdraw" className="rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-4 hover:bg-white transition-colors">
              <ArrowUpRight size={18} className="text-[#0f172a]" />
              <p className="mt-3 text-sm font-semibold text-[#0f172a]">Withdraw</p>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Premium Performance + Activity */}
      <motion.div variants={item} className="grid lg:grid-cols-[1.45fr_0.9fr] gap-5">
        <div className="card-light p-5 rounded-[24px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Portfolio Performance</h3>
              <p className="text-xs text-[#94a3b8] mt-1">
                {balance > 0 ? "Balance movement across your selected range." : "Your growth chart will activate when the account is funded."}
              </p>
            </div>

            <div className="flex gap-1 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-1">
              {["1W", "1M", "3M", "ALL"].map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all",
                    chartRange === r ? "bg-[#0f172a] text-white shadow-sm" : "text-[#94a3b8] hover:text-[#475569]",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="relative h-[280px] rounded-2xl overflow-hidden border border-[#eef2f7]" style={{ background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)" }}>
            <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(#eef2f7 1px, transparent 1px), linear-gradient(90deg, #eef2f7 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

            {performanceChart.length > 1 ? (
              <div className="absolute inset-0">
                <AreaChart width={900} height={280} data={performanceChart} margin={{ top: 30, right: 20, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="premiumBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a8a6e" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#1a8a6e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#1a8a6e" strokeWidth={3} fill="url(#premiumBalanceGradient)" dot={false} activeDot={{ r: 5, fill: "#1a8a6e" }} />
                </AreaChart>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <TrendingUp size={24} className="text-naxcal-teal" />
                </div>

                <p className="text-sm font-semibold text-[#0f172a]">No portfolio history yet</p>
                <p className="text-xs text-[#64748b] mt-2 max-w-sm">
                  Once your account is funded, your balance trend, profit history and account growth will appear here.
                </p>

                <Link href="/dashboard/deposit" className="mt-5 px-4 py-2 rounded-xl bg-naxcal-teal text-white text-xs font-semibold hover:bg-naxcal-teal-light transition-colors">
                  Fund Account
                </Link>
              </div>
            )}
          </div>

          {performanceChart.length > 1 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <div className="rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Start Value</p>
                <p className="text-sm font-bold text-[#0f172a] mt-1">{fmt(performanceStart)}</p>
              </div>

              <div className="rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Current Value</p>
                <p className="text-sm font-bold text-[#0f172a] mt-1">{fmt(performanceCurrent)}</p>
              </div>

              <div className="rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Change</p>
                <p className={cn("text-sm font-bold mt-1", performanceChange >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {performanceChange >= 0 ? "+" : "-"}{fmt(Math.abs(performanceChange))}
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Activity</p>
                <p className="text-sm font-bold text-[#0f172a] mt-1">{performanceEvents} events</p>
              </div>
            </div>
          )}
        </div>

        <div className="card-light p-5 rounded-[24px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Recent Activity</h3>
              <p className="text-xs text-[#94a3b8] mt-1">Latest account movements</p>
            </div>
            <Link href="/dashboard/transactions" className="text-xs font-semibold text-naxcal-teal hover:underline">
              View all
            </Link>
          </div>

          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => {
                const isPositive = Number(tx.amount) >= 0;
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#f8fafc] border border-[#eef2f7]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isPositive ? "bg-emerald-50" : "bg-red-50")}>
                        {isPositive ? <ArrowDownCircle size={18} className="text-emerald-600" /> : <ArrowUpRight size={18} className="text-red-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0f172a] truncate capitalize">{tx.type?.replaceAll("_", " ") || "Transaction"}</p>
                        <p className="text-xs text-[#94a3b8] truncate">{new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className={cn("text-sm font-bold whitespace-nowrap", isPositive ? "text-emerald-600" : "text-red-500")}>
                      {isPositive ? "+" : "-"}{fmt(Math.abs(Number(tx.amount || 0)))}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto mb-3">
                <CircleDollarSign size={22} className="text-naxcal-teal" />
              </div>
              <p className="text-sm font-semibold text-[#0f172a]">No activity yet</p>
              <p className="text-xs text-[#64748b] mt-2">Deposits, profits, swaps and withdrawals will appear here.</p>
            </div>
          )}
        </div>
      </motion.div>

      {displayPortfolioValue === 0 && (
        <motion.div variants={item} className="card-light rounded-[24px] p-5 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Getting Started
              </div>

              <h3 className="text-lg font-bold text-[#0f172a]">
                Set up your account in a few steps
              </h3>

              <p className="text-sm text-[#64748b] mt-1 max-w-xl">
                Your dashboard is ready. Add funds to activate portfolio tracking, daily returns and account activity.
              </p>
            </div>

            <Link
              href="/dashboard/deposit"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-naxcal-teal text-white text-sm font-semibold hover:bg-naxcal-teal-light transition-colors shrink-0"
            >
              Start Funding <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            {[
              {
                title: "Account verified",
                desc: profile?.kyc_status === "approved" ? "Your identity check is complete." : "Complete KYC to unlock full access.",
                done: profile?.kyc_status === "approved",
                href: "/dashboard/verification",
              },
              {
                title: "Add first deposit",
                desc: "Fund your account to activate portfolio growth.",
                done: totalDeposited > 0,
                href: "/dashboard/deposit",
              },
              {
                title: "Choose your tier",
                desc: "Your tier controls daily return percentage.",
                done: displayPortfolioValue > 0,
                href: "/dashboard/deposit",
              },
              {
                title: "Track daily returns",
                desc: "Profit history appears after your first payout.",
                done: transactions.some((tx) => tx.type === "profit"),
                href: "/dashboard/transactions",
              },
            ].map((step, index) => (
              <Link
                key={step.title}
                href={step.href}
                className="group rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4 hover:bg-[#0f172a] hover:border-[#0f172a] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                      step.done
                        ? "bg-emerald-500 text-white"
                        : "bg-white border border-[#e2e8f0] text-[#64748b] group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white",
                    )}
                  >
                    {step.done ? <CheckCircle2 size={17} /> : index + 1}
                  </div>

                  {!step.done && (
                    <ArrowRight size={15} className="text-[#94a3b8] group-hover:text-white/60" />
                  )}
                </div>

                <p className="mt-4 text-sm font-bold text-[#0f172a] group-hover:text-white">
                  {step.title}
                </p>
                <p className="text-xs text-[#64748b] group-hover:text-white/55 mt-1 leading-relaxed">
                  {step.desc}
                </p>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Premium Lower Dashboard */}
      <motion.div variants={item} className="grid lg:grid-cols-3 gap-5">
        <div className="card-light p-5 rounded-[24px] lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0f172a]">Market Overview</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" /> Live
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-1">Track major crypto assets and market movement.</p>
            </div>

            <Link href="/dashboard/markets" className="text-xs font-semibold text-naxcal-teal hover:underline">
              View all
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {marketData.slice(0, 6).map((asset) => {
              const live = livePrices[asset.symbol];
              const price = live?.price ?? asset.price;
              const change = live?.change ?? asset.change;

              return (
                <Link
                  key={asset.symbol}
                  href="/dashboard/markets"
                  className="group p-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#0f172a] hover:border-[#0f172a] hover:shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                        style={{ background: asset.color }}
                      >
                        {asset.symbol.slice(0, 2)}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0f172a] group-hover:text-white truncate">{asset.symbol}</p>
                        <p className="text-xs text-[#94a3b8] group-hover:text-white/50 truncate">{asset.name}</p>
                      </div>
                    </div>

                    <span className={cn(
                      "text-xs font-bold shrink-0",
                      change >= 0 ? "text-emerald-600 group-hover:text-emerald-300" : "text-red-500 group-hover:text-red-300",
                    )}>
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  </div>

                  <div className="h-10 my-3">
                    <svg viewBox="0 0 100 30" className="w-full h-full">
                      <polyline
                        fill="none"
                        stroke={change >= 0 ? "#16a34a" : "#ef4444"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={sparklines[asset.symbol]?.map((v, i) => `${i * 11},${30 - v * 0.5}`).join(" ") || "0,15 100,15"}
                      />
                    </svg>
                  </div>

                  <p className="text-base font-bold text-[#0f172a] group-hover:text-white">
                    ${price < 1 ? price.toFixed(4) : price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card-light p-5 rounded-[24px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Portfolio Allocation</h3>
              <p className="text-xs text-[#94a3b8] mt-1">Balance split by asset class.</p>
            </div>
          </div>

          {displayPortfolioValue === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto mb-3">
                <Wallet size={22} className="text-naxcal-teal" />
              </div>
              <p className="text-sm font-semibold text-[#0f172a]">No allocation yet</p>
              <p className="text-xs text-[#64748b] mt-2">Your assets will appear here once your account is funded.</p>
              <Link href="/dashboard/deposit" className="inline-flex mt-4 px-4 py-2 rounded-xl bg-naxcal-teal text-white text-xs font-semibold hover:bg-naxcal-teal-light transition-colors">
                Add Funds
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <PieChart width={210} height={210}>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={62} outerRadius={88} dataKey="value" stroke="none">
                  {allocationData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>

              <div className="w-full space-y-2 mt-3">
                {allocationData.map((a) => (
                  <div key={a.name} className="flex items-center justify-between p-2 rounded-xl bg-[#f8fafc] border border-[#eef2f7]">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: a.color }} />
                      <span className="text-xs font-medium text-[#374151]">{a.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#0f172a]">{a.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="grid lg:grid-cols-2 gap-5">
        <div className="card-light p-5 rounded-[24px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Recent Returns</h3>
              <p className="text-xs text-[#94a3b8] mt-1">Daily profit history and payout status.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
              {profile?.tier || "Bronze"} rate
            </span>
          </div>

          {dailyReturns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto mb-3">
                <TrendingUp size={22} className="text-naxcal-teal" />
              </div>
              <p className="text-sm font-semibold text-[#0f172a]">No returns posted yet</p>
              <p className="text-xs text-[#64748b] mt-2">Your daily return history will appear once your first profit is credited.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyReturns.slice(0, 5).map((day, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#f8fafc] border border-[#eef2f7]">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{day.date}</p>
                    <p className="text-xs text-[#94a3b8]">Daily return +{day.rate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{fmt(Number(day.earnings))}</p>
                    <span className="text-[10px] font-semibold text-emerald-700">{day.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-light p-5 rounded-[24px]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-[#0f172a]">Platform Updates</h3>
              <p className="text-xs text-[#94a3b8] mt-1">Important account and platform messages.</p>
            </div>
            <Megaphone size={18} className="text-naxcal-teal" />
          </div>

          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.slice(0, 4).map((a) => {
                const style = announcementStyles[a.type] || announcementStyles.info;
                return (
                  <div key={a.id} className="p-4 rounded-2xl" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                    <div className="flex items-start gap-3">
                      {style.icon}
                      <div>
                        <p className="text-sm text-[#0f172a] font-semibold">{a.title}</p>
                        <p className="text-xs text-[#64748b] mt-1">{a.content}</p>
                        <p className="text-[10px] text-[#94a3b8] mt-2">{new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e2e8f0] flex items-center justify-center mx-auto mb-3">
                <Megaphone size={22} className="text-naxcal-teal" />
              </div>
              <p className="text-sm font-semibold text-[#0f172a]">No platform updates</p>
              <p className="text-xs text-[#64748b] mt-2">Important announcements will appear here when available.</p>
            </div>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
}
