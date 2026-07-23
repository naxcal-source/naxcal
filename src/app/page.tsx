"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Shield, TrendingUp, ChevronDown, Star, ArrowRight, Menu, X,
  Lock, Eye, CheckCircle2, UserPlus, ScanFace, Wallet, BarChart3,
  CircleDollarSign, Globe, LineChart, Gem, Cpu, Landmark, Flame,
  Phone, MessageCircle, Link2, Send, Activity, Zap,
  LayoutDashboard, PieChart, Settings, CreditCard, ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

/* ═══ DATA ═══ */

const performanceData = [
  { month: "Jan", naxcal: 10000, bank: 10000 }, { month: "Feb", naxcal: 11800, bank: 10033 },
  { month: "Mar", naxcal: 14200, bank: 10067 }, { month: "Apr", naxcal: 16800, bank: 10100 },
  { month: "May", naxcal: 20100, bank: 10133 }, { month: "Jun", naxcal: 23500, bank: 10167 },
  { month: "Jul", naxcal: 27800, bank: 10200 }, { month: "Aug", naxcal: 32400, bank: 10233 },
  { month: "Sep", naxcal: 38100, bank: 10267 }, { month: "Oct", naxcal: 44500, bank: 10300 },
  { month: "Nov", naxcal: 52000, bank: 10333 }, { month: "Dec", naxcal: 61200, bank: 10367 },
];

const sparklineData = [
  { v: 20 }, { v: 35 }, { v: 28 }, { v: 45 }, { v: 42 },
  { v: 58 }, { v: 52 }, { v: 68 }, { v: 75 }, { v: 72 }, { v: 85 }, { v: 92 },
];

const dashboardChartData = [
  { d: "Mon", v: 22400 }, { d: "Tue", v: 23100 }, { d: "Wed", v: 22800 },
  { d: "Thu", v: 23800 }, { d: "Fri", v: 24200 }, { d: "Sat", v: 24500 }, { d: "Sun", v: 24847 },
];

const testimonials = [
  { name: "James Whitfield", initials: "JW", color: "bg-naxcal-teal", profit: "$4,820", quote: "The risk-adjusted returns have been extraordinary. Naxcal's algorithmic strategies outperform every traditional fund I've held.", tier: "Gold", since: "Jan 2024" },
  { name: "Sarah Mitchell", initials: "SM", color: "bg-naxcal-gold", profit: "$12,400", quote: "Full transparency on every trade, every position. The institutional-grade reporting gives me absolute confidence in my capital.", tier: "Gold", since: "Nov 2023" },
  { name: "David Chen", initials: "DC", color: "bg-emerald-600", profit: "$2,180", quote: "Started at Bronze three months ago. The consistency convinced me to scale up. Exceptional platform.", tier: "Silver", since: "Mar 2024" },
  { name: "Emma Richardson", initials: "ER", color: "bg-naxcal-teal", profit: "$28,600", quote: "As a Gold investor, the VIP service is unmatched. My dedicated strategist keeps me informed on every adjustment.", tier: "Gold", since: "Sep 2023" },
  { name: "Oliver Thompson", initials: "OT", color: "bg-naxcal-gold", profit: "$6,750", quote: "Withdrew profits within 24 hours. The speed and reliability is exactly what institutional investors demand.", tier: "Silver", since: "Feb 2024" },
  { name: "Priya Patel", initials: "PP", color: "bg-emerald-600", profit: "$8,920", quote: "FCA oversight gave me the confidence to commit serious capital. Returns have exceeded every expectation.", tier: "Silver", since: "Dec 2023" },
  { name: "Marcus Williams", initials: "MW", color: "bg-naxcal-teal", profit: "$1,450", quote: "Diversification across six asset classes means I'm not exposed to a single market. The approach I needed.", tier: "Bronze", since: "Apr 2024" },
  { name: "Charlotte Evans", initials: "CE", color: "bg-naxcal-gold", profit: "$15,200", quote: "200+ algorithmic trades daily, all transparent. Returns arrive like clockwork every 24 hours.", tier: "Gold", since: "Oct 2023" },
];

const activityFeed = [
  { name: "James W.", asset: "EUR/USD", amount: "+$142.50", time: "2 min ago", initials: "JW", tag: "teal" },
  { name: "Sarah M.", asset: "Gold", amount: "+$380.00", time: "3 min ago", initials: "SM", tag: "gold" },
  { name: "David C.", asset: "S&P 500", amount: "+$67.20", time: "5 min ago", initials: "DC", tag: "blue" },
  { name: "Emma R.", asset: "BTC/USD", amount: "+$520.00", time: "6 min ago", initials: "ER", tag: "purple" },
  { name: "Oliver T.", asset: "GBP/USD", amount: "+$195.80", time: "8 min ago", initials: "OT", tag: "teal" },
  { name: "Priya P.", asset: "NASDAQ", amount: "+$310.40", time: "10 min ago", initials: "PP", tag: "blue" },
  { name: "Marcus W.", asset: "ETH/USD", amount: "+$88.60", time: "12 min ago", initials: "MW", tag: "purple" },
  { name: "Charlotte E.", asset: "Crude Oil", amount: "+$245.00", time: "14 min ago", initials: "CE", tag: "gold" },
  { name: "Alex K.", asset: "USD/JPY", amount: "+$178.30", time: "16 min ago", initials: "AK", tag: "teal" },
  { name: "Rebecca L.", asset: "Silver", amount: "+$92.10", time: "18 min ago", initials: "RL", tag: "gold" },
];

const tagColorsLight: Record<string, string> = {
  teal: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  gold: "bg-amber-50 text-amber-700 border border-amber-200",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
};

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Platform: [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Asset Classes", href: "#markets" },
    { label: "Investment Tiers", href: "#tiers" },
    { label: "Calculator", href: "#returns" },
    { label: "Performance", href: "#returns" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/legal/terms" },
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Risk Disclosure", href: "/legal/risk" },
    { label: "AML Policy", href: "/legal/aml" },
  ],
  Support: [
    { label: "Help Centre", href: "/dashboard/support" },
    { label: "Contact Us", href: "https://t.me/naxcal" },
    { label: "FAQs", href: "/dashboard/support" },
  ],
  Company: [
    { label: "About Us", href: "#home" },
    { label: "X (Twitter)", href: "https://x.com/_naxcal" },
    { label: "Telegram", href: "https://t.me/naxcal" },
  ],
};

/* ═══ COMPONENTS ═══ */

function AnimatedCounter({ target, prefix = "", suffix = "", duration = 2000, decimals = 0 }: {
  target: number; prefix?: string; suffix?: string; duration?: number; decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(decimals > 0 ? parseFloat(start.toFixed(decimals)) : Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration, decimals]);
  return <span ref={ref}>{prefix}{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}{suffix}</span>;
}

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function SectionLabelDark({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5 mb-5">
      <div className="h-px w-8 bg-gradient-to-r from-transparent to-naxcal-teal/60" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-naxcal-teal">{children}</span>
      <div className="h-px w-8 bg-gradient-to-l from-transparent to-naxcal-teal/60" />
    </div>
  );
}

function SectionLabelLight({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5 mb-5">
      <div className="h-px w-8 bg-gradient-to-r from-transparent to-naxcal-teal/40" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-naxcal-teal">{children}</span>
      <div className="h-px w-8 bg-gradient-to-l from-transparent to-naxcal-teal/40" />
    </div>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  );
}

function TestimonialCardLight({ t }: { t: typeof testimonials[number] }) {
  return (
    <div className="card-light-lift p-6 w-[380px] shrink-0 flex flex-col relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white", t.color)}>{t.initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-[#0f172a]">{t.name}</p>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={10} className="text-emerald-600" />
              <span className="text-[9px] text-emerald-700 font-medium">Verified</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={10} className="fill-[#f59e0b] text-[#f59e0b]" />)}</div>
            <span className="text-[10px] text-[#9ca3af]">&bull; {t.tier} &bull; Since {t.since}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-[#374151] leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
      <div className="mt-4 pt-3 border-t border-[#e5e7eb] flex items-center justify-between">
        <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider">Total Earned</span>
        <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#16a34a]">{t.profit}</span>
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */

function PriceTicker() {
  const [prices, setPrices] = useState<Record<string, { usd: number; usd_24h_change: number }>>({});
  useEffect(() => {
    fetch("/api/prices").then((r) => r.json()).then(setPrices).catch(() => {});
  }, []);
  const tickers = [
    { id: "bitcoin", sym: "BTC" }, { id: "ethereum", sym: "ETH" }, { id: "solana", sym: "SOL" },
    { id: "binancecoin", sym: "BNB" }, { id: "ripple", sym: "XRP" }, { id: "cardano", sym: "ADA" },
    { id: "dogecoin", sym: "DOGE" }, { id: "tether", sym: "USDT" },
  ];
  const items = tickers.map((t) => {
    const p = prices[t.id];
    return { sym: t.sym, price: p?.usd || 0, change: p?.usd_24h_change || 0 };
  }).filter((t) => t.price > 0);
  if (items.length === 0) return null;
  const row = items.map((t) => (
    <span key={t.sym} className="inline-flex items-center gap-1.5 mx-4 whitespace-nowrap">
      <span className="text-white/50 font-medium">{t.sym}</span>
      <span className="text-white/70">${t.price < 1 ? t.price.toFixed(4) : t.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
      <span className={cn("text-[10px] font-semibold", t.change >= 0 ? "text-emerald-400" : "text-red-400")}>
        {t.change >= 0 ? "▲" : "▼"}{Math.abs(t.change).toFixed(2)}%
      </span>
      <span className="text-white/10 mx-2">·</span>
    </span>
  ));
  return (
    <div className="overflow-hidden" style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center h-7 text-[11px] marquee-left" style={{ width: "max-content" }}>
        {row}{row}
      </div>
    </div>
  );
}

export default function Home() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [deposit, setDeposit] = useState(10000);
  const [sliderValue, setSliderValue] = useState(10000);

  const tierForAmount = (amount: number) => {
    if (amount >= 25000) return { name: "Gold", rate: 0.021 };
    if (amount >= 5000) return { name: "Silver", rate: 0.018 };
    return { name: "Bronze", rate: 0.015 };
  };
  const currentTier = tierForAmount(deposit);
  const daily = deposit * currentTier.rate;
  const weekly = daily * 7;
  const monthly = daily * 30;
  const annual = daily * 365;
  const projectionData = useMemo(() => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months.map((m, i) => ({ month: m, returns: Math.round(daily * 30 * (i + 1)) }));
  }, [daily]);
  const handleSlider = (val: number) => { setSliderValue(val); setDeposit(val); };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ═══ FCA BANNER ═══ */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-[#0a0a0a] border-b border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-center h-8">
          <p className="text-[10px] text-white/35 tracking-wide"><Lock size={10} className="inline mr-1.5 text-naxcal-teal" />FCA Authorised &amp; Regulated · Naxcal Capital Ltd · Your capital is at risk</p>
        </div>
      </div>

      {/* ═══ PRICE TICKER ═══ */}
      <div className="fixed top-8 left-0 right-0 z-[55]">
        <PriceTicker />
      </div>

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-[60px] left-0 right-0 z-50">
        <div className="bg-[rgba(2,4,8,0.9)] backdrop-blur-xl border-b border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-3">
              <Image src="/Naxcal_Primary_Logo.png" alt="Naxcal" width={180} height={50} className="w-auto" style={{ height: 48, filter: "brightness(1.4) drop-shadow(0 0 20px rgba(26,138,110,0.6))" }} priority />
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/25">
                <LiveDot />
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">FCA Regulated</span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-8">
              {["Home", "How It Works", "Markets", "Returns", "Tiers"].map((link) => (
                <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, "-")}`} className="nav-link text-[13px] text-white/60 hover:text-white transition-colors">{link}</a>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <a href="/login" className="px-5 py-2 text-sm rounded-lg border border-white/15 text-white/80 hover:bg-white/5 transition-all">Login</a>
              <a href="/register" className="px-6 py-2.5 text-sm rounded-lg text-white font-semibold transition-all" style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)", boxShadow: "0 0 20px rgba(26,138,110,0.35)" }}>Start Investing <ArrowRight size={14} className="inline ml-1" /></a>
            </div>
            <button className="lg:hidden text-white cursor-pointer" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="lg:hidden bg-[rgba(2,4,8,0.95)] backdrop-blur-2xl border-b border-white/[0.08] overflow-hidden">
              <div className="px-6 pb-6 pt-2">
                {["Home", "How It Works", "Markets", "Returns", "Tiers"].map((link) => (
                  <a key={link} href={`#${link.toLowerCase().replace(/\s+/g, "-")}`} className="block py-3 text-white/60 hover:text-white" onClick={() => setMobileMenu(false)}>{link}</a>
                ))}
                <div className="flex gap-3 mt-4">
                  <a href="/login" className="flex-1 py-2.5 text-sm text-center rounded-lg border border-white/15 text-white/80">Login</a>
                  <a href="/register" className="flex-1 py-2.5 text-sm text-center rounded-lg btn-teal text-white font-semibold">Start Investing</a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══ HERO — DARK ═══ */}
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden grain" style={{ background: "#020408" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 dot-grid" />
          <div className="aurora-teal absolute top-[5%] right-[10%]" />
          <div className="aurora-gold absolute bottom-[10%] right-[15%]" />
          <div className="aurora-teal-2 absolute top-[40%] left-[0%]" />
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 65% 45%, rgba(26,138,110,0.25) 0%, rgba(26,138,110,0.08) 40%, transparent 70%)" }} />
        <div className="absolute top-[40%] left-0 right-0 light-beam z-[1]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-16 flex flex-col lg:flex-row items-center gap-12 lg:gap-8 w-full">
          <div className="flex-[3] text-center lg:text-left">
            <FadeUp>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] mb-7">
                <Zap size={13} className="text-naxcal-gold" />
                <span className="text-[11px] text-white/60 tracking-wide">Institutional-Grade Capital Management</span>
              </div>
            </FadeUp>
            <FadeUp delay={0.08}>
              <h1 style={{ fontSize: "clamp(52px, 5.5vw, 84px)" }} className="font-bold tracking-tight leading-[1.08]">
                Your Capital.
                <br />
                <span className="bg-gradient-to-r from-naxcal-teal via-naxcal-teal-light to-naxcal-teal bg-clip-text text-transparent text-glow-heading">
                  Working Around the Clock.
                </span>
              </h1>
            </FadeUp>
            <FadeUp delay={0.16}>
              <p className="mt-6 text-[15px] sm:text-base text-white/50 leading-[1.7]" style={{ maxWidth: 480 }}>
                Naxcal deploys your capital across six institutional asset classes &mdash; forex, global equities,
                commodities, crypto, algorithmic strategies, and fixed income. Professional management. Daily returns. Full transparency.
              </p>
            </FadeUp>
            <FadeUp delay={0.24}>
              <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="/register" className="group px-8 py-4 rounded-xl text-white font-semibold cursor-pointer flex items-center justify-center gap-2 text-base btn-teal">
                  Start Investing <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="#returns" className="px-8 py-4 rounded-xl text-white/70 font-semibold hover:border-naxcal-teal transition-all text-center text-base" style={{ border: "1px solid rgba(255,255,255,0.25)" }}>
                  View Performance
                </a>
              </div>
            </FadeUp>
            <FadeUp delay={0.35}>
              <div className="mt-10 flex items-center justify-center lg:justify-start">
                {[{ icon: Lock, text: "256-bit SSL" }, { icon: Shield, text: "FCA Authorised" }, { icon: Wallet, text: "Cold Storage" }, { icon: Eye, text: "24/7 Active" }].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <item.icon size={12} className="text-naxcal-teal" />
                    <span className="text-[11px] text-white/35 uppercase tracking-wider">{item.text}</span>
                    {i < 3 && <span className="text-white/15 mx-3">|</span>}
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>

          {/* Phone Mockup */}
          <div className="flex-[2] relative hidden lg:flex justify-center items-center">
            <FadeUp delay={0.15}>
              <div className="relative" style={{ perspective: "1200px" }}>
                <div className="absolute pointer-events-none" style={{ width: 500, height: 700, top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "radial-gradient(ellipse, rgba(26,138,110,0.35) 0%, transparent 70%)", filter: "blur(60px)", zIndex: -1 }} />
                <motion.div className="absolute -top-8 -right-8 z-20 rounded-xl px-4 py-3 w-[230px]" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(20px)" }} animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 10px rgba(34,197,94,0.7)" }} />
                    <span className="text-[12px] text-white font-medium">+$142.50 profit distributed</span>
                  </div>
                </motion.div>
                <div className="w-[320px] h-[640px] overflow-hidden relative" style={{ borderRadius: 44, transform: "rotateY(-12deg) rotateX(4deg)", border: "2px solid rgba(255,255,255,0.15)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(0,0,0,0.8), 0 0 80px rgba(26,138,110,0.3), 0 0 160px rgba(26,138,110,0.15)", background: "#0d1f18" }}>
                  <div className="p-6 pt-14 h-full flex flex-col">
                    <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>Good morning, James</p>
                    <p className="text-[10px] mt-4 uppercase tracking-[0.15em] font-semibold" style={{ color: "rgba(26,138,110,0.8)" }}>Portfolio Value</p>
                    <p className="mt-0.5 leading-tight text-white" style={{ fontSize: 32, fontWeight: 800 }}>$24,847.50</p>
                    <div className="mt-1.5 inline-flex self-start items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/25">
                      <ArrowUpRight size={12} className="text-emerald-400" />
                      <span className="text-[12px]" style={{ color: "#22c55e", fontWeight: 700 }}>+$523.80 today (+2.1%)</span>
                    </div>
                    <div className="h-[80px] mt-4 rounded-lg p-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparklineData}>
                          <defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a8a6e" stopOpacity={0.5} /><stop offset="100%" stopColor="#1a8a6e" stopOpacity={0.05} /></linearGradient></defs>
                          <Area type="monotone" dataKey="v" stroke="#1a8a6e" strokeWidth={2} fill="url(#sparkGrad)" fillOpacity={1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-1">
                      {[{ label: "Forex", val: "$8,240", pct: "+1.8%" }, { label: "Equities", val: "$9,100", pct: "+2.3%" }, { label: "Crypto", val: "$7,507", pct: "+1.9%" }].map((s, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg" style={{ background: "rgba(255,255,255,0.08)", padding: 10 }}>
                          <span className="text-[12px] text-white/60">{s.label}</span>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[12px] text-white font-medium">{s.val}</span>
                            <span className="text-[11px] font-bold" style={{ color: "#22c55e" }}>{s.pct}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto space-y-2 pb-6">
                      <div className="w-full py-3 rounded-lg text-center text-[13px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)" }}>Withdraw</div>
                      <div className="w-full py-3 rounded-lg text-center text-[13px] font-medium text-white/70" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>Deposit</div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
        <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1" animate={{ y: [0, 8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <span className="text-[9px] text-white/20 uppercase tracking-[0.3em]">Scroll</span>
          <ChevronDown size={16} className="text-white/20" />
        </motion.div>
      </section>

      {/* ═══ STATS BAR — WHITE ═══ */}
      <section className="relative z-10 border-t border-b border-[#e5e7eb]" style={{ background: "#ffffff" }}>
        <FadeUp>
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[#e5e7eb]">
              {[
                { value: 127, prefix: "$", suffix: "M+", label: "Assets Under Management", decimals: 0 },
                { value: 4200, suffix: "+", label: "Active Investors", decimals: 0 },
                { value: 8.4, prefix: "$", suffix: "M+", label: "Returns Distributed", decimals: 1 },
                { value: 99.7, suffix: "%", label: "Platform Uptime", decimals: 1 },
              ].map((stat, i) => (
                <div key={i} className="text-center py-10 px-4">
                  <div className="text-3xl sm:text-4xl font-bold text-naxcal-teal">
                    <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} />
                  </div>
                  <p className="mt-2 text-[11px] text-[#6b7280] uppercase tracking-[0.15em]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══ HOW IT WORKS — LIGHT ═══ */}
      <section id="how-it-works" className="py-[100px] px-6" style={{ background: "#f8fafc" }}>
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <SectionLabelLight>Process</SectionLabelLight>
            <h2 className="text-center text-4xl sm:text-5xl font-bold text-[#0f172a]">
              Begin in <span className="text-naxcal-teal">Five Simple Steps</span>
            </h2>
            <p className="text-center text-[#475569] mt-4 max-w-2xl mx-auto text-sm">
              From account creation to daily returns &mdash; your capital is deployed within minutes.
            </p>
          </FadeUp>
          <div className="mt-16 relative">
            <div className="hidden lg:block absolute top-[24px] left-[10%] right-[10%] h-px bg-[#e2e8f0]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-4">
              {[
                { icon: UserPlus, title: "Create Account", desc: "Register in 30 seconds with email verification.", step: "01", time: "30 SEC" },
                { icon: ScanFace, title: "Verify Identity", desc: "Streamlined KYC — complete in minutes, not days.", step: "02", time: "~3 MIN" },
                { icon: Wallet, title: "Deposit Capital", desc: "USDT, BTC, ETH, USDC with instant confirmation.", step: "03", time: "INSTANT" },
                { icon: BarChart3, title: "Capital Deployed", desc: "Allocated across 6+ asset classes by our algorithms.", step: "04", time: "<1 HR" },
                { icon: CircleDollarSign, title: "Collect Returns", desc: "Profits distributed to your account every 24 hours.", step: "05", time: "DAILY" },
              ].map((item, i) => (
                <FadeUp key={i} delay={i * 0.08}>
                  <div className="card-light-lift p-5 h-full">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-sm font-bold text-white bg-naxcal-teal">
                      {item.step}
                    </div>
                    <h3 className="text-[15px] font-semibold mb-1.5 text-[#0f172a]">{item.title}</h3>
                    <p className="text-[#6b7280] text-sm leading-relaxed mb-3">{item.desc}</p>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-naxcal-teal font-semibold">{item.time}</span>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT WE TRADE — WHITE ═══ */}
      <section id="markets" className="py-[100px] px-6" style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <SectionLabelLight>Markets</SectionLabelLight>
            <h2 className="text-center text-4xl sm:text-5xl font-bold text-[#0f172a]">
              Diversified Across <span className="text-naxcal-teal">6 Asset Classes</span>
            </h2>
            <p className="text-center text-[#475569] mt-4 max-w-2xl mx-auto text-sm">
              Your capital doesn&apos;t sit in one market. We spread risk intelligently across the most liquid global markets.
            </p>
          </FadeUp>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Globe, title: "Forex Markets", desc: "EUR/USD, GBP/USD, USD/JPY and 40+ major pairs. 24/5 liquidity across the world's largest financial market." },
              { icon: LineChart, title: "Global Equities", desc: "S&P 500, NASDAQ, FTSE 100. Long/short positions on world indices with institutional execution." },
              { icon: Gem, title: "Commodities", desc: "Gold, Silver, Oil, Natural Gas. Inflation-hedged real asset exposure for portfolio stability." },
              { icon: Activity, title: "Crypto Assets", desc: "BTC, ETH, SOL and top-cap digital assets. Managed volatility strategies with strict risk parameters." },
              { icon: Cpu, title: "Algorithmic Trading", desc: "Proprietary ML models executing 200+ trades daily. Quantitative edge, systematic execution." },
              { icon: Landmark, title: "Fixed Income", desc: "Global bond markets and treasury instruments. Capital preservation layer for downside protection." },
            ].map((item, i) => (
              <FadeUp key={i} delay={i * 0.07}>
                <div className="card-light-lift p-6 h-full group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,138,110,0.1)" }}>
                      <item.icon size={22} className="text-naxcal-teal" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-naxcal-teal text-white text-[9px] font-semibold">LIVE</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-[#0f172a]">{item.title}</h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed">{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DASHBOARD PREVIEW — DARK ═══ */}
      <section className="py-[100px] px-6 relative overflow-hidden grain" style={{ background: "#020408" }}>
        <div className="mx-auto max-w-6xl relative z-10">
          <FadeUp>
            <SectionLabelDark>Dashboard</SectionLabelDark>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3 text-white">
              Everything You Need. <span className="text-naxcal-teal text-glow-heading">In One Place.</span>
            </h2>
            <p className="text-center text-white/40 max-w-2xl mx-auto text-sm mb-16">
              Complete visibility over every position, every return, every transaction &mdash; in real time.
            </p>
          </FadeUp>
          <FadeUp delay={0.12}>
            <div className="mx-auto max-w-[920px] relative" style={{ perspective: "1600px" }}>
              <div className="absolute -inset-16 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(26,138,110,0.2) 0%, transparent 60%)" }} />
              <div className="rounded-2xl overflow-hidden relative" style={{ transform: "rotateX(4deg)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 50px 100px rgba(0,0,0,0.5), 0 0 200px rgba(26,138,110,0.15)", background: "#0f1a16" }}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]" style={{ background: "#111f19" }}>
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/60" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" /><div className="w-2.5 h-2.5 rounded-full bg-green-500/60" /></div>
                  <div className="flex-1 mx-8"><div className="max-w-xs mx-auto px-3 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}><span className="text-[10px] text-white/40 flex items-center gap-1.5"><Lock size={9} className="text-emerald-400" />app.naxcal.us/dashboard</span></div></div>
                </div>
                <div className="flex min-h-[420px]">
                  <div className="w-[180px] shrink-0 border-r border-white/[0.06] p-4 hidden sm:block" style={{ background: "#111f19" }}>
                    <div className="flex items-center gap-2 mb-8"><div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(26,138,110,0.25)" }}><BarChart3 size={12} className="text-naxcal-teal" /></div><span className="text-[11px] font-semibold text-white/80">Naxcal</span></div>
                    {[{ icon: LayoutDashboard, label: "Dashboard", active: true }, { icon: PieChart, label: "Portfolio", active: false }, { icon: LineChart, label: "Markets", active: false }, { icon: CreditCard, label: "Withdraw", active: false }, { icon: Settings, label: "Settings", active: false }].map((nav, i) => (
                      <div key={i} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1 text-[11px]", nav.active ? "text-naxcal-teal font-medium" : "text-white/30")} style={nav.active ? { background: "rgba(26,138,110,0.15)", border: "1px solid rgba(26,138,110,0.2)" } : {}}>
                        <nav.icon size={14} /><span>{nav.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 p-5" style={{ background: "#131f1a" }}>
                    <div className="flex items-center justify-between mb-4">
                      <div><h3 className="text-sm font-semibold text-white/90">Portfolio Overview</h3><p className="text-[26px] font-bold text-white mt-0.5">$127,482.50</p></div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25"><ArrowUpRight size={13} className="text-emerald-400" /><span className="text-[12px] font-semibold text-[#22c55e]">+2.1% today</span></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[{ label: "Forex", value: "$42,840" }, { label: "Equities", value: "$38,200" }, { label: "Crypto", value: "$28,150" }, { label: "Other", value: "$18,292" }].map((s, i) => (
                        <div key={i} className="rounded-lg p-2.5" style={{ background: "rgba(26,138,110,0.1)", border: "1px solid rgba(26,138,110,0.2)" }}><p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p><p className="text-[14px] font-semibold text-white/90 mt-0.5">{s.value}</p></div>
                      ))}
                    </div>
                    <div className="h-[200px] rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardChartData}>
                          <defs><linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a8a6e" stopOpacity={0.35} /><stop offset="100%" stopColor="#1a8a6e" stopOpacity={0} /></linearGradient></defs>
                          <XAxis dataKey="d" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Area type="monotone" dataKey="v" stroke="#1a8a6e" strokeWidth={2} fill="url(#dashGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="w-[200px] shrink-0 border-l border-white/[0.06] p-4 hidden md:block" style={{ background: "#111f19" }}>
                    <h4 className="text-[10px] text-white/40 uppercase tracking-wider mb-3 font-semibold">Recent Activity</h4>
                    {[{ text: "+$142.50 EUR/USD", time: "2m" }, { text: "+$380.00 Gold", time: "5m" }, { text: "+$67.20 S&P 500", time: "8m" }, { text: "+$520.00 BTC/USD", time: "11m" }, { text: "+$195.80 GBP/USD", time: "14m" }].map((a, i) => (
                      <div key={i} className="flex items-start justify-between py-2.5 border-b border-white/[0.05]"><span className="text-[11px] text-emerald-400/80 font-medium">{a.text}</span><span className="text-[9px] text-white/25 shrink-0 ml-2">{a.time}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══ PERFORMANCE — DARK ═══ */}
      <section id="returns" className="py-[100px] px-6 grain" style={{ background: "#020408" }}>
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <SectionLabelDark>Performance</SectionLabelDark>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3 text-white">Performance That <span className="text-naxcal-teal text-glow-heading">Speaks for Itself</span></h2>
            <p className="text-center text-white/40 max-w-2xl mx-auto text-sm">Risk-adjusted returns consistently outperforming traditional markets.</p>
          </FadeUp>
          <div className="mt-16 grid lg:grid-cols-2 gap-10 items-center">
            <FadeUp>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: TrendingUp, value: 1.8, suffix: "%", label: "Avg Daily Return", decimals: 1 },
                  { icon: CircleDollarSign, value: 8.4, prefix: "$", suffix: "M+", label: "Returns Paid Out", decimals: 1 },
                  { icon: BarChart3, value: 4200, suffix: "+", label: "Active Investors", decimals: 0 },
                  { icon: Flame, value: 18, suffix: "+", label: "Months Operating", decimals: 0 },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(26,138,110,0.15)", boxShadow: "0 0 16px rgba(26,138,110,0.2)" }}>
                      <stat.icon size={18} className="text-naxcal-teal" />
                    </div>
                    <div className="text-2xl font-bold text-white text-glow-teal"><AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} /></div>
                    <p className="text-[11px] text-white/35 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </FadeUp>
            <FadeUp delay={0.12}>
              <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-white/90">Portfolio Growth</h3>
                  <div className="flex items-center gap-4 text-[11px]">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded bg-naxcal-teal" /><span className="text-white/50">Naxcal</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded bg-white/20" /><span className="text-white/30">Bank Savings</span></div>
                  </div>
                </div>
                <p className="text-[11px] text-white/25 mb-1">$10,000 initial capital &mdash; 12-month comparison</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-naxcal-gold/15 border border-naxcal-gold/25 mb-4"><span className="text-[11px] font-bold text-naxcal-gold">127x better than savings account</span></div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs><linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a8a6e" stopOpacity={0.3} /><stop offset="100%" stopColor="#1a8a6e" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: "#0a1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "11px" }} formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                      <Area type="monotone" dataKey="bank" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="naxcal" stroke="#1a8a6e" strokeWidth={2} fill="url(#perfGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══ INVESTMENT TIERS — LIGHT ═══ */}
      <section id="tiers" className="py-[100px] px-6" style={{ background: "#f8fafc" }}>
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <SectionLabelLight>Tiers</SectionLabelLight>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3 text-[#0f172a]">Select Your <span className="text-naxcal-teal">Investment Tier</span></h2>
            <p className="text-center text-[#475569] max-w-2xl mx-auto text-sm">Higher tiers unlock superior returns and premium capital management services.</p>
          </FadeUp>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              { name: "Bronze", rate: "1.5", min: "$500", monthly: "~45%", annual: "~547%", borderColor: "#b45309", badge: null, nameColor: "text-amber-700", btnStyle: "border border-naxcal-teal text-naxcal-teal hover:bg-naxcal-teal hover:text-white",
                features: ["1.5% daily risk-adjusted returns", "Standard withdrawal processing", "Priority email support", "Real-time portfolio dashboard", "Monthly performance reports"] },
              { name: "Silver", rate: "1.8", min: "$5,000", monthly: "~54%", annual: "~657%", borderColor: "#64748b", badge: null, nameColor: "text-slate-600", btnStyle: "border border-naxcal-teal text-naxcal-teal hover:bg-naxcal-teal hover:text-white",
                features: ["1.8% daily risk-adjusted returns", "Expedited withdrawals (< 4 hours)", "Dedicated account strategist", "Advanced analytics & insights", "Weekly strategy briefings"] },
              { name: "Gold", rate: "2.1", min: "$25,000", monthly: "~63%", annual: "~766%", borderColor: "#f0a500", badge: "MOST POPULAR", nameColor: "text-naxcal-gold", btnStyle: "btn-teal",
                features: ["2.1% daily risk-adjusted returns", "Instant withdrawals (< 30 min)", "VIP portfolio strategist", "Institutional-grade reporting", "Direct line to trading desk"] },
            ].map((tier, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="card-light-lift p-7 relative h-full flex flex-col" style={{ borderLeft: `4px solid ${tier.borderColor}` }}>
                  {tier.badge && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-naxcal-gold text-black text-[10px] font-bold uppercase tracking-wider z-10 shadow-md">{tier.badge}</div>}
                  <span className={cn("text-xs font-semibold uppercase tracking-wider mb-5", tier.nameColor)}>{tier.name}</span>
                  <div className="mb-1"><span className="text-6xl font-black text-[#0f172a] leading-none">{tier.rate}%</span><span className="text-sm text-[#6b7280] ml-2">daily</span></div>
                  <div className="text-xs text-[#9ca3af] mb-1">{tier.monthly} monthly &bull; {tier.annual} annually</div>
                  <div className="h-px bg-[#e5e7eb] my-5" />
                  <ul className="space-y-3 flex-1">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[13px] text-[#475569]"><CheckCircle2 size={15} className="text-naxcal-teal shrink-0 mt-0.5" /><span>{f}</span></li>
                    ))}
                  </ul>
                  <a href="/register" className={cn("mt-7 w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer block text-center", tier.btnStyle)}>Start Investing</a>
                  <p className="text-[10px] text-[#9ca3af] text-center mt-3">Minimum deposit {tier.min}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROI CALCULATOR — WHITE ═══ */}
      <section className="py-[100px] px-6" style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-[700px]">
          <FadeUp>
            <SectionLabelLight>Calculator</SectionLabelLight>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3 text-[#0f172a]">Calculate Your <span className="text-naxcal-teal">Potential Returns</span></h2>
            <p className="text-center text-[#475569] mb-12 text-sm">Model your capital deployment across Naxcal&apos;s strategies.</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="card-light-lift p-8" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-[#6b7280]">Deposit Amount</label>
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full",
                  currentTier.name === "Gold" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  currentTier.name === "Silver" ? "bg-slate-50 text-slate-600 border border-slate-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                )}>{currentTier.name} Tier &bull; {(currentTier.rate * 100).toFixed(1)}% daily</span>
              </div>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b7280] text-xl font-bold">$</span>
                <input type="number" value={deposit} onChange={(e) => { const v = Math.max(0, Math.min(500000, parseInt(e.target.value) || 0)); setDeposit(v); setSliderValue(v); }}
                  className="w-full pl-10 pr-4 py-4 rounded-xl text-[#0f172a] text-2xl font-bold focus:border-naxcal-teal focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 transition-all" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }} min="0" max="500000" />
              </div>
              <input type="range" min={500} max={500000} step={500} value={sliderValue} onChange={(e) => handleSlider(parseInt(e.target.value))} className="w-full mb-1 cursor-pointer" />
              <div className="flex justify-between text-[10px] text-[#9ca3af] mb-8"><span>$500</span><span>$500,000</span></div>
              <div className="space-y-0">
                {[
                  { label: "Daily Return", value: daily, highlight: false },
                  { label: "Weekly Return", value: weekly, highlight: false },
                  { label: "Monthly Return", value: monthly, highlight: false },
                  { label: "Annual Return", value: annual, highlight: true },
                ].map((row, i) => (
                  <div key={i} className={cn("flex items-center justify-between py-4", !row.highlight && "border-b border-[#e5e7eb]")}>
                    <span className="text-sm text-[#6b7280]">{row.label}</span>
                    <span className={cn("font-bold", row.highlight ? "text-naxcal-gold text-2xl" : "text-naxcal-teal text-lg")}>
                      ${row.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-[#e5e7eb]">
                <p className="text-[10px] text-[#9ca3af] mb-3">12-month cumulative return projection</p>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionData}>
                      <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#0f172a", fontSize: "11px" }} formatter={(value) => [`$${Number(value).toLocaleString()}`, "Cumulative"]} />
                      <Bar dataKey="returns" fill="#1a8a6e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="mt-4 text-[9px] text-[#9ca3af] text-center leading-relaxed">Projections based on historical performance. Past performance does not guarantee future results. Capital is at risk.</p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══ TESTIMONIALS — LIGHT ═══ */}
      <section className="py-[100px] overflow-hidden" style={{ background: "#f8fafc" }}>
        <div className="px-6">
          <FadeUp>
            <SectionLabelLight>Investors</SectionLabelLight>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3 text-[#0f172a]">Trusted by <span className="text-naxcal-teal">Thousands</span></h2>
            <div className="flex items-center justify-center gap-2 mt-3 mb-14">
              <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-[#f59e0b] text-[#f59e0b]" />)}</div>
              <span className="text-sm text-[#6b7280]">4.9/5 from 2,400+ verified investors</span>
            </div>
          </FadeUp>
        </div>
        <div className="relative mb-5">
          <div className="marquee-left flex gap-5" style={{ width: "max-content" }}>
            {[...testimonials.slice(0, 4), ...testimonials.slice(0, 4)].map((t, i) => <TestimonialCardLight key={`a-${i}`} t={t} />)}
          </div>
        </div>
        <div className="relative">
          <div className="marquee-right flex gap-5" style={{ width: "max-content" }}>
            {[...testimonials.slice(4), ...testimonials.slice(4)].map((t, i) => <TestimonialCardLight key={`b-${i}`} t={t} />)}
          </div>
        </div>
      </section>

      {/* ═══ LIVE ACTIVITY — WHITE ═══ */}
      <section className="py-[100px] px-6" style={{ background: "#ffffff" }}>
        <div className="mx-auto max-w-3xl">
          <FadeUp>
            <SectionLabelLight>Activity</SectionLabelLight>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3 text-[#0f172a]">Live Investor <span className="text-naxcal-teal">Activity</span></h2>
            <div className="flex items-center justify-center gap-2 mb-12">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
                <span className="relative flex h-2 w-2"><span className="pulse-live absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>
                <span className="text-[11px] font-semibold text-red-600">LIVE</span>
              </div>
              <span className="text-sm text-[#6b7280]">Real-time profit distributions</span>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="card-light-lift overflow-hidden h-[420px] relative" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.06)" }}>
              <div className="absolute top-0 left-0 right-0 h-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to bottom, #ffffff, transparent)" }} />
              <div className="absolute bottom-0 left-0 right-0 h-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to top, #ffffff, transparent)" }} />
              <div className="feed-scroll py-6">
                {[...activityFeed, ...activityFeed].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 mx-4 mb-2 rounded-lg hover:bg-[#f8fafc] transition-colors border-l-2 border-naxcal-teal/20">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-naxcal-teal shrink-0" style={{ background: "rgba(26,138,110,0.1)" }}>{item.initials}</div>
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="text-sm text-[#374151] font-medium">{item.name}</span>
                      <span className="text-sm text-[#9ca3af]">earned</span>
                      <span className="text-sm font-semibold text-[#16a34a]">{item.amount}</span>
                      <span className="text-sm text-[#9ca3af]">on</span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", tagColorsLight[item.tag])}>{item.asset}</span>
                    </div>
                    <span className="text-[11px] text-[#9ca3af] shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══ FINAL CTA — DARK ═══ */}
      <section className="py-[120px] px-6 relative overflow-hidden grain" style={{ background: "#020408" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, rgba(26,138,110,0.2) 0%, transparent 60%)" }} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div key={i} className="absolute border border-naxcal-teal/[0.12]" style={{ width: 20 + i * 8, height: 20 + i * 8, left: `${10 + i * 15}%`, bottom: "-40px", rotate: "45deg" }}
            animate={{ y: [0, -400], opacity: [0.08, 0] }} transition={{ duration: 8 + i * 2, repeat: Infinity, delay: i * 1.5, ease: "linear" }} />
        ))}
        <div className="relative z-10 text-center mx-auto max-w-3xl">
          <FadeUp><h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">Deploy Your Capital<br /><span className="text-naxcal-teal text-glow-heading">Today.</span></h2></FadeUp>
          <FadeUp delay={0.1}><p className="mt-6 text-base text-white/50 max-w-xl mx-auto">Join 4,200+ investors accessing institutional-grade strategies. Start in minutes. Collect daily returns.</p></FadeUp>
          <FadeUp delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/register" className="group btn-teal px-10 py-4 rounded-xl text-white font-semibold text-lg cursor-pointer inline-flex items-center justify-center gap-2">Start Investing <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></a>
              <a href="https://t.me/naxcal" target="_blank" rel="noopener noreferrer" className="px-10 py-4 rounded-xl border border-white/20 text-white/70 font-semibold text-lg hover:border-white/30 transition-all cursor-pointer inline-flex items-center justify-center gap-2"><Send size={18} /> Contact Us on Telegram</a>
            </div>
          </FadeUp>
          <FadeUp delay={0.3}><p className="mt-8 text-[11px] text-white/30">No lock-in periods &bull; Withdraw anytime &bull; FCA regulated</p></FadeUp>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-16 px-6" style={{ background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            <div className="col-span-2">
              <Image src="/Naxcal_Primary_Logo.png" alt="Naxcal" width={160} height={44} className="h-10 w-auto mb-4" style={{ filter: "brightness(1.4) drop-shadow(0 0 16px rgba(26,138,110,0.5))" }} />
              <p className="text-sm text-white/30 mb-5 max-w-[280px] leading-relaxed">Institutional-grade capital management. Regulated, transparent, and built for performance.</p>
              <div className="flex items-center gap-2.5">
                {[{ icon: Globe, label: "X", href: "https://x.com/_naxcal" }, { icon: Send, label: "Telegram", href: "https://t.me/naxcal" }].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-naxcal-teal/15 transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} aria-label={s.label}><s.icon size={15} className="text-white/40" /></a>
                ))}
              </div>
            </div>
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-[10px] font-semibold text-white/50 mb-4 uppercase tracking-[0.15em]">{title}</h4>
                <ul className="space-y-2.5">{links.map((link) => <li key={link.label}><a href={link.href} className="text-[13px] text-white/30 hover:text-white/60 transition-colors">{link.label}</a></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="mt-14 pt-8 border-t border-white/[0.06]">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-6">
              {["256-bit SSL Encrypted", "FCA Authorised", "Cold Storage Custody", "End-to-End Encrypted"].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5"><Shield size={10} className="text-naxcal-teal/50" /><span className="text-[9px] text-white/20 uppercase tracking-[0.15em]">{badge}</span></div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 text-center leading-relaxed max-w-3xl mx-auto">Naxcal Ltd is authorised and regulated by the Financial Conduct Authority (FCA). Capital at risk. Past performance is not indicative of future results.</p>
            <p className="text-[9px] text-white/10 text-center mt-3">&copy; {new Date().getFullYear()} Naxcal Capital Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
