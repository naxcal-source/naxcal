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
  { month: "Jan", naxcal: 10000, bank: 10000 },
  { month: "Feb", naxcal: 11800, bank: 10033 },
  { month: "Mar", naxcal: 14200, bank: 10067 },
  { month: "Apr", naxcal: 16800, bank: 10100 },
  { month: "May", naxcal: 20100, bank: 10133 },
  { month: "Jun", naxcal: 23500, bank: 10167 },
  { month: "Jul", naxcal: 27800, bank: 10200 },
  { month: "Aug", naxcal: 32400, bank: 10233 },
  { month: "Sep", naxcal: 38100, bank: 10267 },
  { month: "Oct", naxcal: 44500, bank: 10300 },
  { month: "Nov", naxcal: 52000, bank: 10333 },
  { month: "Dec", naxcal: 61200, bank: 10367 },
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

const tagColors: Record<string, string> = {
  teal: "bg-naxcal-teal/20 text-naxcal-teal border-naxcal-teal/30",
  gold: "bg-amber-500/20 text-amber-400 border-amber-500/25",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/25",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/25",
};

const footerLinks = {
  Platform: ["How It Works", "Asset Classes", "Investment Tiers", "Calculator", "Performance"],
  Legal: ["Terms of Service", "Privacy Policy", "Risk Disclosure", "AML Policy", "Cookie Policy"],
  Support: ["Help Centre", "Contact Us", "FAQs", "Live Chat", "Status Page"],
  Company: ["About Us", "Careers", "Blog", "Press", "Partners"],
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5 mb-5">
      <div className="h-px w-8 bg-gradient-to-r from-transparent to-naxcal-teal/60" />
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-naxcal-teal">{children}</span>
      <div className="h-px w-8 bg-gradient-to-l from-transparent to-naxcal-teal/60" />
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

function TestimonialCard({ t }: { t: typeof testimonials[number] }) {
  return (
    <div className="glass rounded-2xl p-6 w-[380px] shrink-0 flex flex-col border-l-2 border-l-naxcal-teal/40 relative overflow-hidden">
      <div className="absolute top-3 right-4 text-[80px] leading-none font-serif text-white/[0.04] pointer-events-none select-none">&ldquo;</div>
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white", t.color)}>{t.initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-white/90">{t.name}</p>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20">
              <CheckCircle2 size={10} className="text-emerald-400" />
              <span className="text-[9px] text-emerald-400 font-medium">Verified</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={10} className="fill-naxcal-gold text-naxcal-gold" />)}</div>
            <span className="text-[10px] text-white/30">&bull; {t.tier} &bull; Since {t.since}</span>
          </div>
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
          t.tier === "Gold" ? "bg-naxcal-gold/20 text-naxcal-gold" :
          t.tier === "Silver" ? "bg-slate-400/20 text-slate-300" : "bg-amber-700/20 text-amber-500"
        )}>{t.tier}</span>
      </div>
      <p className="text-sm text-white/55 leading-relaxed flex-1 relative z-10">&ldquo;{t.quote}&rdquo;</p>
      <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between relative z-10">
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Total Earned</span>
        <span className="text-base font-bold text-emerald-400">{t.profit}</span>
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */

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
    <div className="relative min-h-screen overflow-x-hidden grain">
      {/* ═══ GLOBAL BACKGROUND ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 dot-grid" />
        <div className="aurora-teal absolute top-[5%] right-[10%]" />
        <div className="aurora-gold absolute bottom-[10%] right-[15%]" />
        <div className="aurora-teal-2 absolute top-[40%] left-[0%]" />
      </div>

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="h-px bg-gradient-to-r from-transparent via-naxcal-teal/70 to-transparent" />
        <div className="bg-[rgba(2,4,8,0.85)] backdrop-blur-xl border-b border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-3">
              <Image src="/Naxcal_Primary_Logo.png" alt="Naxcal" width={160} height={44} className="h-10 w-auto" style={{ filter: "drop-shadow(0 0 16px rgba(26,138,110,0.5))" }} priority />
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
              <button className="px-5 py-2 text-sm rounded-lg border border-white/15 text-white/80 hover:bg-white/5 transition-all cursor-pointer">Login</button>
              <button className="btn-teal px-5 py-2 text-sm rounded-lg text-white cursor-pointer flex items-center gap-1.5 font-medium">Start Investing <ArrowRight size={14} /></button>
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
                  <button className="flex-1 py-2.5 text-sm rounded-lg border border-white/15 text-white/80 cursor-pointer">Login</button>
                  <button className="flex-1 py-2.5 text-sm rounded-lg btn-teal text-white cursor-pointer">Start Investing</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══ HERO ═══ */}
      <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
        {/* Strong radial glows behind phone area */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 65% 45%, rgba(26,138,110,0.25) 0%, rgba(26,138,110,0.08) 40%, transparent 70%), radial-gradient(ellipse 60% 80% at 60% 50%, rgba(240,165,0,0.06) 0%, transparent 60%)"
        }} />
        <div className="absolute top-[40%] left-0 right-0 light-beam z-[1]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-28 pb-20 flex flex-col lg:flex-row items-center gap-16 lg:gap-8 w-full">
          {/* Left 60% */}
          <div className="flex-[3] text-center lg:text-left">
            <FadeUp>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] mb-8">
                <Zap size={13} className="text-naxcal-gold" />
                <span className="text-[11px] text-white/60 tracking-wide">Institutional-Grade Capital Management</span>
              </div>
            </FadeUp>
            <FadeUp delay={0.08}>
              <h1 style={{ fontSize: "clamp(48px, 6vw, 80px)" }} className="font-bold tracking-tight leading-[1.08]">
                Your Capital.
                <br />
                <span className="bg-gradient-to-r from-naxcal-teal via-naxcal-teal-light to-naxcal-teal bg-clip-text text-transparent text-glow-heading">
                  Working Around
                  <br />
                  the Clock.
                </span>
              </h1>
            </FadeUp>
            <FadeUp delay={0.16}>
              <p className="mt-6 text-[15px] sm:text-base text-white/50 max-w-xl mx-auto lg:mx-0 leading-[1.7]">
                Naxcal deploys your capital across six institutional asset classes &mdash; forex, global equities,
                commodities, crypto, algorithmic strategies, and fixed income. Professional management. Daily returns. Full transparency.
              </p>
            </FadeUp>
            <FadeUp delay={0.24}>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button className="group btn-teal px-8 py-4 rounded-xl text-white font-semibold cursor-pointer flex items-center justify-center gap-2 text-base">
                  Start Investing <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#returns" className="px-8 py-4 rounded-xl border border-white/15 text-white/70 font-semibold hover:border-white/25 hover:bg-white/[0.03] transition-all text-center text-base">
                  View Performance
                </a>
              </div>
            </FadeUp>
            <FadeUp delay={0.35}>
              <div className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-x-0">
                {[
                  { icon: Lock, text: "256-bit SSL" },
                  { icon: Shield, text: "FCA Authorised" },
                  { icon: Wallet, text: "Cold Storage" },
                  { icon: Eye, text: "24/7 Active" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1">
                    <item.icon size={12} className="text-naxcal-teal" />
                    <span className="text-[10px] text-white/35 uppercase tracking-wider">{item.text}</span>
                    {i < 3 && <span className="text-white/15 ml-3">|</span>}
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>

          {/* Right — PHONE MOCKUP — The star */}
          <div className="flex-[2] relative hidden lg:flex justify-center items-center">
            <FadeUp delay={0.15}>
              <div className="relative" style={{ perspective: "1200px" }}>
                {/* Ambient glow behind phone */}
                <div className="absolute -inset-24 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(26,138,110,0.25) 0%, rgba(26,138,110,0.08) 50%, transparent 70%)" }} />

                {/* Floating notification */}
                <motion.div
                  className="absolute -top-8 -right-6 z-20 rounded-xl px-4 py-3 w-[230px]"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(20px)" }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-[12px] text-white/90 font-medium">+$142.50 profit distributed</span>
                  </div>
                </motion.div>

                {/* Phone frame */}
                <div
                  className="w-[300px] h-[600px] rounded-[40px] overflow-hidden relative"
                  style={{
                    transform: "rotateY(-12deg) rotateX(4deg)",
                    border: "1px solid rgba(255,255,255,0.20)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 40px 80px rgba(0,0,0,0.8), 0 0 80px rgba(26,138,110,0.3), 0 0 160px rgba(26,138,110,0.15)",
                    background: "#0f1a16",
                  }}
                >
                  <div className="p-6 pt-14 h-full flex flex-col">
                    <p className="text-[12px] text-white/60">Good morning, James</p>
                    <p className="text-[10px] text-naxcal-teal/80 mt-4 uppercase tracking-[0.15em] font-semibold">Portfolio Value</p>
                    <p className="text-[30px] font-extrabold text-white mt-0.5 leading-tight">$24,847.50</p>
                    <div className="mt-1.5 inline-flex self-start items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/25">
                      <ArrowUpRight size={12} className="text-emerald-400" />
                      <span className="text-[12px] font-semibold text-[#22c55e]">+$523.80 today (+2.1%)</span>
                    </div>

                    {/* Sparkline */}
                    <div className="h-[75px] mt-4 rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparklineData}>
                          <defs>
                            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1a8a6e" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#1a8a6e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke="#1a8a6e" strokeWidth={2} fill="url(#sparkGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Asset rows */}
                    <div className="mt-4 space-y-2">
                      {[
                        { label: "Forex", val: "$8,240", pct: "+1.8%" },
                        { label: "Equities", val: "$9,100", pct: "+2.3%" },
                        { label: "Crypto", val: "$7,507", pct: "+1.9%" },
                      ].map((s, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <span className="text-[12px] text-white/60">{s.label}</span>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[12px] text-white/90 font-medium">{s.val}</span>
                            <span className="text-[11px] font-semibold text-[#22c55e]">{s.pct}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Buttons */}
                    <div className="mt-auto flex gap-2.5 pb-6">
                      <div className="flex-1 py-2.5 rounded-lg text-center text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)" }}>Withdraw</div>
                      <div className="flex-1 py-2.5 rounded-lg border text-center text-[12px] font-medium text-white/70" style={{ borderColor: "rgba(255,255,255,0.2)" }}>Deposit</div>
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

      {/* ═══ STATS BAR — #0a1628 lighter section ═══ */}
      <section className="relative z-10" style={{ background: "#0a1628" }}>
        <div className="h-[2px] bg-gradient-to-r from-transparent via-naxcal-teal to-transparent" />
        <FadeUp>
          <div className="mx-auto max-w-6xl px-6 py-1">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.06]">
              {[
                { value: 127, prefix: "$", suffix: "M+", label: "Assets Under Management", decimals: 0 },
                { value: 4200, suffix: "+", label: "Active Investors", decimals: 0 },
                { value: 8.4, prefix: "$", suffix: "M+", label: "Returns Distributed", decimals: 1 },
                { value: 99.7, suffix: "%", label: "Platform Uptime", decimals: 1 },
              ].map((stat, i) => (
                <div key={i} className="text-center py-8 px-4">
                  <div className="text-2xl sm:text-3xl font-bold text-white" style={{ textShadow: "0 0 30px rgba(26,138,110,0.6), 0 0 60px rgba(26,138,110,0.2)" }}>
                    <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-white/40 uppercase tracking-[0.15em]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══ HOW IT WORKS — dark #020408 ═══ */}
      <section id="how-it-works" className="py-28 px-6 relative" style={{ background: "#020408" }}>
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <SectionLabel>Process</SectionLabel>
            <h2 className="text-center text-4xl sm:text-5xl font-bold">
              Begin in <span className="text-naxcal-teal text-glow-heading">Five Simple Steps</span>
            </h2>
            <p className="text-center text-white/40 mt-4 max-w-2xl mx-auto text-sm">
              From account creation to daily returns &mdash; your capital is deployed within minutes.
            </p>
          </FadeUp>
          <div className="mt-20 relative">
            <div className="hidden lg:block absolute top-[28px] left-[10%] right-[10%] h-px border-t border-dashed border-naxcal-teal/30" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-4">
              {[
                { icon: UserPlus, title: "Create Account", desc: "Register in 30 seconds with email verification.", step: "01", time: "30 SEC" },
                { icon: ScanFace, title: "Verify Identity", desc: "Streamlined KYC — complete in minutes, not days.", step: "02", time: "~3 MIN" },
                { icon: Wallet, title: "Deposit Capital", desc: "USDT, BTC, ETH, USDC with instant confirmation.", step: "03", time: "INSTANT" },
                { icon: BarChart3, title: "Capital Deployed", desc: "Allocated across 6+ asset classes by our algorithms.", step: "04", time: "<1 HR" },
                { icon: CircleDollarSign, title: "Collect Returns", desc: "Profits distributed to your account every 24 hours.", step: "05", time: "DAILY" },
              ].map((item, i) => (
                <FadeUp key={i} delay={i * 0.08}>
                  <div className="glass glass-hover rounded-2xl p-5 relative group h-full border-l-2 border-l-naxcal-teal/40">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-sm font-bold text-naxcal-teal" style={{ background: "rgba(26,138,110,0.12)", border: "1px solid rgba(26,138,110,0.3)", boxShadow: "0 0 16px rgba(26,138,110,0.25)" }}>
                      {item.step}
                    </div>
                    <h3 className="text-[15px] font-semibold mb-1.5 text-white/90">{item.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed mb-3">{item.desc}</p>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-naxcal-teal/70">{item.time}</span>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT WE TRADE — #060d18 lighter ═══ */}
      <section id="markets" className="py-28 px-6" style={{ background: "#060d18" }}>
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <SectionLabel>Markets</SectionLabel>
            <h2 className="text-center text-4xl sm:text-5xl font-bold">
              Diversified Across <span className="text-naxcal-teal text-glow-heading">6 Asset Classes</span>
            </h2>
            <p className="text-center text-white/40 mt-4 max-w-2xl mx-auto text-sm">
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
                <div className="glass glass-hover rounded-2xl p-6 h-full relative group overflow-hidden">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-all" style={{ background: "rgba(26,138,110,0.12)", border: "1px solid rgba(26,138,110,0.25)" }}>
                      <item.icon size={22} className="text-naxcal-teal" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/20">
                      <LiveDot /><span className="text-[9px] font-medium text-emerald-400">LIVE</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white/90">{item.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                  <svg className="absolute bottom-0 left-0 w-full h-10 opacity-[0.08]" viewBox="0 0 300 40" preserveAspectRatio="none">
                    <path d="M0,35 C50,25 100,30 150,15 C200,0 250,20 300,10" fill="none" stroke="#1a8a6e" strokeWidth="1.5" />
                  </svg>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DASHBOARD PREVIEW — dark, bright screen ═══ */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ background: "#020408" }}>
        <div className="mx-auto max-w-6xl relative z-10">
          <FadeUp>
            <SectionLabel>Dashboard</SectionLabel>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3">
              Everything You Need. <span className="text-naxcal-teal text-glow-heading">In One Place.</span>
            </h2>
            <p className="text-center text-white/40 max-w-2xl mx-auto text-sm mb-16">
              Your Naxcal dashboard gives you complete visibility over every position, every return, every transaction &mdash; in real time.
            </p>
          </FadeUp>
          <FadeUp delay={0.12}>
            <div className="mx-auto max-w-[920px] relative" style={{ perspective: "1600px" }}>
              {/* Glow behind laptop */}
              <div className="absolute -inset-16 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(26,138,110,0.2) 0%, transparent 60%)" }} />

              <div className="rounded-2xl overflow-hidden relative" style={{
                transform: "rotateX(4deg)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 50px 100px rgba(0,0,0,0.5), 0 0 200px rgba(26,138,110,0.15)",
                background: "#0f1a16",
              }}>
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]" style={{ background: "#111f19" }}>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 mx-8">
                    <div className="max-w-xs mx-auto px-3 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <span className="text-[10px] text-white/40 flex items-center gap-1.5">
                        <Lock size={9} className="text-emerald-400" />
                        app.naxcal.com/dashboard
                      </span>
                    </div>
                  </div>
                </div>
                {/* Dashboard body */}
                <div className="flex min-h-[420px]">
                  {/* Sidebar */}
                  <div className="w-[180px] shrink-0 border-r border-white/[0.06] p-4 hidden sm:block" style={{ background: "#111f19" }}>
                    <div className="flex items-center gap-2 mb-8">
                      <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(26,138,110,0.25)" }}>
                        <BarChart3 size={12} className="text-naxcal-teal" />
                      </div>
                      <span className="text-[11px] font-semibold text-white/80">Naxcal</span>
                    </div>
                    {[
                      { icon: LayoutDashboard, label: "Dashboard", active: true },
                      { icon: PieChart, label: "Portfolio", active: false },
                      { icon: LineChart, label: "Markets", active: false },
                      { icon: CreditCard, label: "Withdraw", active: false },
                      { icon: Settings, label: "Settings", active: false },
                    ].map((nav, i) => (
                      <div key={i} className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1 text-[11px]",
                        nav.active ? "text-naxcal-teal font-medium" : "text-white/30"
                      )} style={nav.active ? { background: "rgba(26,138,110,0.15)", border: "1px solid rgba(26,138,110,0.2)" } : {}}>
                        <nav.icon size={14} /><span>{nav.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* Main content */}
                  <div className="flex-1 p-5" style={{ background: "#131f1a" }}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-semibold text-white/90">Portfolio Overview</h3>
                        <p className="text-[26px] font-bold text-white mt-0.5">$127,482.50</p>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25">
                        <ArrowUpRight size={13} className="text-emerald-400" />
                        <span className="text-[12px] font-semibold text-[#22c55e]">+2.1% today</span>
                      </div>
                    </div>
                    {/* Stat cards */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { label: "Forex", value: "$42,840" },
                        { label: "Equities", value: "$38,200" },
                        { label: "Crypto", value: "$28,150" },
                        { label: "Other", value: "$18,292" },
                      ].map((s, i) => (
                        <div key={i} className="rounded-lg p-2.5" style={{ background: "rgba(26,138,110,0.1)", border: "1px solid rgba(26,138,110,0.2)" }}>
                          <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
                          <p className="text-[14px] font-semibold text-white/90 mt-0.5">{s.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Chart */}
                    <div className="h-[200px] rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardChartData}>
                          <defs>
                            <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1a8a6e" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#1a8a6e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="d" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Area type="monotone" dataKey="v" stroke="#1a8a6e" strokeWidth={2} fill="url(#dashGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Right panel */}
                  <div className="w-[200px] shrink-0 border-l border-white/[0.06] p-4 hidden md:block" style={{ background: "#111f19" }}>
                    <h4 className="text-[10px] text-white/40 uppercase tracking-wider mb-3 font-semibold">Recent Activity</h4>
                    {[
                      { text: "+$142.50 EUR/USD", time: "2m" },
                      { text: "+$380.00 Gold", time: "5m" },
                      { text: "+$67.20 S&P 500", time: "8m" },
                      { text: "+$520.00 BTC/USD", time: "11m" },
                      { text: "+$195.80 GBP/USD", time: "14m" },
                    ].map((a, i) => (
                      <div key={i} className="flex items-start justify-between py-2.5 border-b border-white/[0.05]">
                        <span className="text-[11px] text-emerald-400/80 font-medium">{a.text}</span>
                        <span className="text-[9px] text-white/25 shrink-0 ml-2">{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══ PERFORMANCE — #020408 ═══ */}
      <section id="returns" className="py-28 px-6" style={{ background: "#020408" }}>
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <SectionLabel>Performance</SectionLabel>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3">
              Performance That <span className="text-naxcal-teal text-glow-heading">Speaks for Itself</span>
            </h2>
            <p className="text-center text-white/40 max-w-2xl mx-auto text-sm">
              Risk-adjusted returns consistently outperforming traditional markets.
            </p>
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
                  <div key={i} className="glass rounded-xl p-5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: "rgba(26,138,110,0.15)", boxShadow: "0 0 16px rgba(26,138,110,0.2)" }}>
                      <stat.icon size={18} className="text-naxcal-teal" />
                    </div>
                    <div className="text-2xl font-bold text-white text-glow-teal">
                      <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} />
                    </div>
                    <p className="text-[11px] text-white/35 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </FadeUp>
            <FadeUp delay={0.12}>
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-white/90">Portfolio Growth</h3>
                  <div className="flex items-center gap-4 text-[11px]">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded bg-naxcal-teal" /><span className="text-white/50">Naxcal</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded bg-white/20" /><span className="text-white/30">Bank Savings</span></div>
                  </div>
                </div>
                <p className="text-[11px] text-white/25 mb-1">$10,000 initial capital &mdash; 12-month comparison</p>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-naxcal-gold/15 border border-naxcal-gold/25 mb-4">
                  <span className="text-[11px] font-bold text-naxcal-gold">127x better than savings account</span>
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1a8a6e" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#1a8a6e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: "#0a1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "11px" }} formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                      <Area type="monotone" dataKey="bank" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
                      <Area type="monotone" dataKey="naxcal" stroke="#1a8a6e" strokeWidth={2} fill="url(#perfGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-white/20 mt-2 text-center">Based on 18-month average performance. Individual results may vary.</p>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ═══ INVESTMENT TIERS — #060d18 ═══ */}
      <section id="tiers" className="py-28 px-6" style={{ background: "#060d18" }}>
        <div className="mx-auto max-w-6xl">
          <FadeUp>
            <SectionLabel>Tiers</SectionLabel>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3">
              Select Your <span className="text-naxcal-teal text-glow-heading">Investment Tier</span>
            </h2>
            <p className="text-center text-white/40 max-w-2xl mx-auto text-sm">
              Higher tiers unlock superior returns and premium capital management services.
            </p>
          </FadeUp>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              { name: "Bronze", rate: "1.5", min: "$500", monthly: "~45%", annual: "~547%", tierClass: "tier-bronze", glowClass: "glow-bronze", badge: null, nameColor: "text-amber-500",
                features: ["1.5% daily risk-adjusted returns", "Standard withdrawal processing", "Priority email support", "Real-time portfolio dashboard", "Monthly performance reports"] },
              { name: "Silver", rate: "1.8", min: "$5,000", monthly: "~54%", annual: "~657%", tierClass: "tier-silver", glowClass: "glow-silver", badge: null, nameColor: "text-slate-300",
                features: ["1.8% daily risk-adjusted returns", "Expedited withdrawals (< 4 hours)", "Dedicated account strategist", "Advanced analytics & insights", "Weekly strategy briefings"] },
              { name: "Gold", rate: "2.1", min: "$25,000", monthly: "~63%", annual: "~766%", tierClass: "tier-gold", glowClass: "glow-gold", badge: "MOST POPULAR", nameColor: "text-naxcal-gold",
                features: ["2.1% daily risk-adjusted returns", "Instant withdrawals (< 30 min)", "VIP portfolio strategist", "Institutional-grade reporting", "Direct line to trading desk"] },
            ].map((tier, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className={cn("shimmer-wrap rounded-2xl p-7 relative group transition-all h-full flex flex-col", tier.tierClass)}>
                  {tier.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-naxcal-gold text-black text-[11px] font-bold uppercase tracking-wider z-10 shadow-[0_0_20px_rgba(240,165,0,0.4)]">
                      {tier.badge}
                    </div>
                  )}
                  <span className={cn("text-xs font-semibold uppercase tracking-wider mb-5", tier.nameColor)}>{tier.name}</span>
                  <div className="mb-1">
                    <span className="text-7xl font-black leading-none">{tier.rate}%</span>
                    <span className="text-sm text-white/40 ml-2">daily</span>
                  </div>
                  <div className="text-xs text-white/30 mb-1">{tier.monthly} monthly &bull; {tier.annual} annually</div>
                  <div className="h-px bg-white/[0.08] my-5" />
                  <ul className="space-y-3 flex-1">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[13px] text-white/55">
                        <CheckCircle2 size={15} className="text-naxcal-teal shrink-0 mt-0.5" /><span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button className={cn("mt-7 w-full py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer",
                    tier.name === "Gold" ? "bg-naxcal-gold text-black hover:bg-naxcal-gold-light shadow-[0_0_30px_rgba(240,165,0,0.3)]" : "btn-teal text-white"
                  )}>Start Investing</button>
                  <p className="text-[10px] text-white/20 text-center mt-3">Minimum deposit {tier.min}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROI CALCULATOR — #020408 ═══ */}
      <section className="py-28 px-6" style={{ background: "#020408" }}>
        <div className="mx-auto max-w-[700px]">
          <FadeUp>
            <SectionLabel>Calculator</SectionLabel>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3">
              Calculate Your <span className="text-naxcal-teal text-glow-heading">Potential Returns</span>
            </h2>
            <p className="text-center text-white/40 mb-12 text-sm">Model your capital deployment across Naxcal&apos;s strategies.</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="rounded-2xl p-8 relative" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid transparent",
              borderImage: "linear-gradient(135deg, rgba(26,138,110,0.5), rgba(240,165,0,0.25), rgba(26,138,110,0.5)) 1",
              backdropFilter: "blur(20px)",
            }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-white/50">Deposit Amount</label>
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full",
                  currentTier.name === "Gold" ? "bg-naxcal-gold/20 text-naxcal-gold" :
                  currentTier.name === "Silver" ? "bg-slate-400/15 text-slate-300" : "bg-amber-600/15 text-amber-500"
                )}>{currentTier.name} Tier &bull; {(currentTier.rate * 100).toFixed(1)}% daily</span>
              </div>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xl font-bold">$</span>
                <input type="number" value={deposit} onChange={(e) => { const v = Math.max(0, Math.min(500000, parseInt(e.target.value) || 0)); setDeposit(v); setSliderValue(v); }}
                  className="w-full pl-10 pr-4 py-4 rounded-xl text-white text-2xl font-bold focus:border-naxcal-teal focus:outline-none transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} min="0" max="500000" />
              </div>
              <input type="range" min={500} max={500000} step={500} value={sliderValue} onChange={(e) => handleSlider(parseInt(e.target.value))} className="w-full mb-1 cursor-pointer" />
              <div className="flex justify-between text-[10px] text-white/20 mb-8"><span>$500</span><span>$500,000</span></div>
              <div className="space-y-0">
                {[
                  { label: "Daily Return", value: daily, highlight: false },
                  { label: "Weekly Return", value: weekly, highlight: false },
                  { label: "Monthly Return", value: monthly, highlight: false },
                  { label: "Annual Return", value: annual, highlight: true },
                ].map((row, i) => (
                  <div key={i} className={cn("flex items-center justify-between py-4", !row.highlight && "border-b border-white/[0.06]")}>
                    <span className="text-sm text-white/50">{row.label}</span>
                    <span className={cn("font-bold", row.highlight ? "text-naxcal-gold text-2xl" : "text-naxcal-teal text-lg text-glow-teal")}>
                      ${row.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/[0.06]">
                <p className="text-[10px] text-white/25 mb-3">12-month cumulative return projection</p>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionData}>
                      <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: "#0a1628", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "11px" }} formatter={(value) => [`$${Number(value).toLocaleString()}`, "Cumulative"]} />
                      <Bar dataKey="returns" fill="#1a8a6e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="mt-4 text-[9px] text-white/15 text-center leading-relaxed">Projections based on historical performance. Past performance does not guarantee future results. Capital is at risk.</p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══ TESTIMONIALS — #020408 ═══ */}
      <section className="py-28 overflow-hidden" style={{ background: "#020408" }}>
        <div className="px-6">
          <FadeUp>
            <SectionLabel>Investors</SectionLabel>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3">
              Trusted by <span className="text-naxcal-teal text-glow-heading">Thousands</span>
            </h2>
            <div className="flex items-center justify-center gap-2 mt-3 mb-14">
              <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} className="fill-naxcal-gold text-naxcal-gold" />)}</div>
              <span className="text-sm text-white/50">4.9/5 from 2,400+ verified investors</span>
            </div>
          </FadeUp>
        </div>
        <div className="relative mb-5">
          <div className="marquee-left flex gap-5" style={{ width: "max-content" }}>
            {[...testimonials.slice(0, 4), ...testimonials.slice(0, 4)].map((t, i) => <TestimonialCard key={`a-${i}`} t={t} />)}
          </div>
        </div>
        <div className="relative">
          <div className="marquee-right flex gap-5" style={{ width: "max-content" }}>
            {[...testimonials.slice(4), ...testimonials.slice(4)].map((t, i) => <TestimonialCard key={`b-${i}`} t={t} />)}
          </div>
        </div>
      </section>

      {/* ═══ LIVE ACTIVITY FEED — #060d18 ═══ */}
      <section className="py-28 px-6" style={{ background: "#060d18" }}>
        <div className="mx-auto max-w-3xl">
          <FadeUp>
            <SectionLabel>Activity</SectionLabel>
            <h2 className="text-center text-4xl sm:text-5xl font-bold mb-3">
              Live Investor <span className="text-naxcal-teal text-glow-heading">Activity</span>
            </h2>
            <div className="flex items-center justify-center gap-2 mb-12">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/12 border border-emerald-500/25">
                <LiveDot /><span className="text-[11px] font-semibold text-emerald-400">LIVE</span>
              </div>
              <span className="text-sm text-white/40">Real-time profit distributions</span>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <div className="glass rounded-2xl overflow-hidden h-[420px] relative">
              <div className="absolute top-0 left-0 right-0 h-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to bottom, #060d18, transparent)" }} />
              <div className="absolute bottom-0 left-0 right-0 h-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to top, #060d18, transparent)" }} />
              <div className="feed-scroll py-6">
                {[...activityFeed, ...activityFeed].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 border-l-2 border-naxcal-teal/30 mx-4 mb-2 rounded-r-lg hover:bg-white/[0.03] transition-colors" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-naxcal-teal shrink-0" style={{ background: "rgba(26,138,110,0.15)" }}>{item.initials}</div>
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="text-sm text-white/70 font-medium">{item.name}</span>
                      <span className="text-sm text-white/30">earned</span>
                      <span className="text-sm font-semibold text-emerald-400">{item.amount}</span>
                      <span className="text-sm text-white/30">on</span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", tagColors[item.tag])}>{item.asset}</span>
                    </div>
                    <span className="text-[11px] text-white/20 shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ═══ FINAL CTA — teal gradient background ═══ */}
      <section className="py-36 px-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d2420, #0a1a14, #081510)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, rgba(26,138,110,0.2) 0%, transparent 60%)" }} />
        {/* Rising diamonds */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div key={i} className="absolute border border-naxcal-teal/[0.12]" style={{ width: 20 + i * 8, height: 20 + i * 8, left: `${10 + i * 15}%`, bottom: "-40px", rotate: "45deg" }}
            animate={{ y: [0, -400], opacity: [0.08, 0] }} transition={{ duration: 8 + i * 2, repeat: Infinity, delay: i * 1.5, ease: "linear" }} />
        ))}
        <div className="relative z-10 text-center mx-auto max-w-3xl">
          <FadeUp>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Deploy Your Capital
              <br /><span className="text-naxcal-teal text-glow-heading">Today.</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="mt-6 text-base text-white/50 max-w-xl mx-auto">
              Join 4,200+ investors accessing institutional-grade strategies. Start in minutes. Collect daily returns.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button className="group btn-teal px-10 py-4 rounded-xl text-white font-semibold text-lg cursor-pointer inline-flex items-center justify-center gap-2">
                Start Investing <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-10 py-4 rounded-xl border border-white/20 text-white/70 font-semibold text-lg hover:border-white/30 hover:bg-white/[0.04] transition-all cursor-pointer inline-flex items-center justify-center gap-2">
                <Phone size={18} /> Schedule a Call
              </button>
            </div>
          </FadeUp>
          <FadeUp delay={0.3}>
            <p className="mt-8 text-[11px] text-white/30">No lock-in periods &bull; Withdraw anytime &bull; FCA regulated</p>
          </FadeUp>
        </div>
      </section>

      {/* ═══ FOOTER — #010306 ═══ */}
      <footer className="border-t border-white/[0.06] py-16 px-6" style={{ background: "#010306" }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            <div className="col-span-2">
              <Image src="/Naxcal_Primary_Logo.png" alt="Naxcal" width={140} height={40} className="h-9 w-auto mb-4" style={{ filter: "drop-shadow(0 0 12px rgba(26,138,110,0.4))" }} />
              <p className="text-sm text-white/30 mb-5 max-w-[280px] leading-relaxed">
                Institutional-grade capital management. Regulated, transparent, and built for performance.
              </p>
              <div className="flex items-center gap-2.5">
                {[
                  { icon: Globe, label: "X" }, { icon: Link2, label: "LinkedIn" },
                  { icon: Send, label: "Telegram" }, { icon: MessageCircle, label: "Community" },
                ].map((s) => (
                  <a key={s.label} href="#" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-naxcal-teal/15 hover:border-naxcal-teal/30 transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} aria-label={s.label}>
                    <s.icon size={15} className="text-white/40" />
                  </a>
                ))}
              </div>
            </div>
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-[10px] font-semibold text-white/50 mb-4 uppercase tracking-[0.15em]">{title}</h4>
                <ul className="space-y-2.5">
                  {links.map((link) => <li key={link}><a href="#" className="text-[13px] text-white/30 hover:text-white/60 transition-colors">{link}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14 pt-8 border-t border-white/[0.06]">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-6">
              {["256-bit SSL Encrypted", "FCA Authorised", "Cold Storage Custody", "End-to-End Encrypted"].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5">
                  <Shield size={10} className="text-naxcal-teal/50" />
                  <span className="text-[9px] text-white/20 uppercase tracking-[0.15em]">{badge}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 text-center leading-relaxed max-w-3xl mx-auto">
              Naxcal Ltd is authorised and regulated by the Financial Conduct Authority (FCA). Capital at risk.
              Past performance is not indicative of future results. Investment involves risk; you may lose some or all of your capital.
            </p>
            <p className="text-[9px] text-white/10 text-center mt-3">&copy; 2025 Naxcal Ltd. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
