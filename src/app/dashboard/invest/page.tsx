"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight, Loader2,
  CheckCircle2, X, Search, Star, Zap, BarChart2, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Stock = { symbol: string; name: string; price: number; change: number; sector?: string; type?: string; chart?: number[] };
type StockDetail = {
  symbol: string; name: string; price: number; change: number; changeAbs: number;
  prevClose: number; chart: number[];
};
type Position = { symbol: string; name: string; qty: number; avg_entry: number; current_price: number; market_value: number; unrealized_pl: number; unrealized_plpc: number };

const TABS = [
  { id: "popular", label: "Most Popular", icon: Star },
  { id: "gainers", label: "Top Gainers", icon: ArrowUpRight },
  { id: "losers", label: "Top Losers", icon: ArrowDownRight },
];

const SECTORS = ["All", "Technology", "Finance", "Healthcare", "Energy", "Consumer", "Industrial", "ETFs"];

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#3b82f6", Finance: "#16a34a", Healthcare: "#ef4444", Energy: "#f59e0b",
  Consumer: "#8b5cf6", Industrial: "#6b7280", ETFs: "#1a8a6e", Other: "#9ca3af",
};

export default function InvestPage() {
  const { profile, refreshProfile } = useDashboard();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [gainers, setGainers] = useState<Stock[]>([]);
  const [losers, setLosers] = useState<Stock[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [selected, setSelected] = useState<Stock | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("popular");
  const [sector, setSector] = useState("All");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [amount, setAmount] = useState("");
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [selling, setSelling] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Load popular stocks + movers + portfolio
  useEffect(() => {
    const load = async () => {
      const [popRes, movRes, posRes] = await Promise.all([
        fetch("/api/stocks/popular").catch(() => null),
        fetch("/api/stocks/movers").catch(() => null),
        fetch("/api/stocks/portfolio").catch(() => null),
      ]);
      if (popRes?.ok) { const d = await popRes.json(); if (Array.isArray(d)) setStocks(d); }
      if (movRes?.ok) { const d = await movRes.json(); setGainers(d.gainers || []); setLosers(d.losers || []); }
      if (posRes?.ok) { const d = await posRes.json(); if (Array.isArray(d)) setPositions(d); }
      setLoadingList(false);
    };
    load();
  }, []);

  // Search
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 1) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        if (res.ok) { const data = await res.json(); setSearchResults(data); }
      } catch {}
    }, 300);
  }, []);

  // Select stock
  const selectStock = async (stock: Stock) => {
    setSelected(stock);
    setDetail(null);
    setAmount("");
    setBuyResult(null);
    setMobileDetail(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/stocks/detail/${encodeURIComponent(stock.symbol)}`);
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
        setSelected({ ...stock, price: data.price || stock.price, change: data.change || stock.change });
      }
    } catch {}
    setLoadingDetail(false);
  };

  // Buy
  const handleBuy = async () => {
    if (!selected || !profile || !amount) return;
    const numAmount = parseFloat(amount);
    if (numAmount < 50) { setBuyResult({ success: false, message: "Minimum investment is $50" }); return; }
    if (numAmount > Number(profile.balance)) { setBuyResult({ success: false, message: "Insufficient balance" }); return; }
    if (profile.kyc_status !== "approved") { setBuyResult({ success: false, message: "Complete KYC verification first" }); return; }

    setBuying(true);
    setBuyResult(null);
    try {
      const res = await fetch("/api/stocks/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selected.symbol, amount_usd: numAmount, user_id: profile.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setBuyResult({ success: true, message: `Invested ${fmt(numAmount)} in ${selected.symbol}` });
        refreshProfile();
        const posRes = await fetch("/api/stocks/portfolio").catch(() => null);
        if (posRes?.ok) { const d = await posRes.json(); if (Array.isArray(d)) setPositions(d); }
      } else {
        setBuyResult({ success: false, message: data.error || "Order failed" });
      }
    } catch {
      setBuyResult({ success: false, message: "Network error" });
    }
    setBuying(false);
  };

  const handleSell = async (pos: Position) => {
    setSelling(pos.symbol);
    try {
      const res = await fetch("/api/stocks/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: pos.symbol, qty: pos.qty }),
      });
      if (res.ok) {
        refreshProfile();
        const posRes = await fetch("/api/stocks/portfolio").catch(() => null);
        if (posRes?.ok) { const d = await posRes.json(); if (Array.isArray(d)) setPositions(d); }
      }
    } catch {}
    setSelling(null);
  };

  // Display list
  const displayList = search.length > 0
    ? searchResults
    : tab === "gainers" ? gainers
    : tab === "losers" ? losers
    : sector === "All" ? stocks
    : stocks.filter((s) => s.sector === sector);

  const totalPortfolioValue = positions.reduce((s, p) => s + p.market_value, 0);
  const totalPL = positions.reduce((s, p) => s + p.unrealized_pl, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Invest</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <TrendingUp size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Invest in Stocks & ETFs</h1>
      </div>

      <div className="flex gap-4" style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* LEFT PANEL: Search & Browse */}
        <div className={cn("w-full lg:w-[380px] shrink-0 flex flex-col", mobileDetail && "hidden lg:flex")}>
          {/* Search */}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search 8,000+ stocks & ETFs"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-naxcal-teal/20" style={{ border: "1px solid #e2e8f0" }} />
          </div>

          {/* Tabs */}
          {!search && (
            <>
              <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                {TABS.map((t) => (
                  <button key={t.id} onClick={() => { setTab(t.id); setSector("All"); }}
                    className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap transition-all",
                      tab === t.id ? "bg-naxcal-teal text-white" : "text-[#6b7280] hover:bg-[#f1f5f9] border border-[#e2e8f0]"
                    )}>
                    <t.icon size={12} />{t.label}
                  </button>
                ))}
              </div>

              {tab === "popular" && (
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                  {SECTORS.map((s) => (
                    <button key={s} onClick={() => setSector(s)}
                      className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium cursor-pointer whitespace-nowrap transition-all",
                        sector === s ? "bg-[#0f172a] text-white" : "text-[#6b7280] hover:bg-[#f1f5f9] border border-[#e2e8f0]"
                      )}>{s}</button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Stock List */}
          <div className="card-light flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
            {loadingList ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-full skeleton" />
                    <div className="flex-1"><div className="h-3.5 w-20 skeleton mb-1" /><div className="h-3 w-14 skeleton" /></div>
                    <div className="h-4 w-16 skeleton" />
                  </div>
                ))}
              </div>
            ) : displayList.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#9ca3af]">
                {search ? "No results found" : "No stocks available"}
              </div>
            ) : (
              <div>
                {displayList.map((stock) => (
                  <button key={stock.symbol} onClick={() => selectStock(stock)}
                    className={cn("w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer text-left border-b border-[#f8fafc]",
                      selected?.symbol === stock.symbol ? "bg-naxcal-teal/5" : "hover:bg-[#f8fafc]"
                    )}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: SECTOR_COLORS[stock.sector || "Other"] || "#6b7280" }}>
                      {stock.symbol.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0f172a] truncate">{stock.symbol}</p>
                      <p className="text-[10px] text-[#9ca3af] truncate">{stock.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {stock.price > 0 ? (
                        <>
                          <p className="text-sm font-bold text-[#0f172a]">{fmt(stock.price)}</p>
                          <span className={cn("text-[10px] font-semibold", stock.change >= 0 ? "text-emerald-600" : "text-red-500")}>
                            {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                          </span>
                        </>
                      ) : (
                        <p className="text-xs text-[#9ca3af]">—</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Detail + Invest */}
        <div className={cn("flex-1 min-w-0", !mobileDetail && !selected && "hidden lg:block")}>
          {!selected ? (
            <div className="card-light h-full flex items-center justify-center">
              <div className="text-center">
                <Briefcase size={40} className="text-[#d1d5db] mx-auto mb-3" />
                <p className="text-sm text-[#9ca3af]">Select a stock to view details</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back button on mobile */}
              <button onClick={() => { setMobileDetail(false); setSelected(null); setDetail(null); }}
                className="lg:hidden flex items-center gap-1 text-xs text-naxcal-teal mb-2 cursor-pointer">
                <ChevronRight size={12} className="rotate-180" /> Back to list
              </button>

              {/* Header */}
              <div className="card-light p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#0f172a]">{detail?.name || selected.name}</h2>
                    <p className="text-xs text-[#9ca3af]">{selected.symbol}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-3xl font-bold text-[#0f172a]">{fmt(detail?.price || selected.price)}</span>
                  <span className={cn("flex items-center gap-0.5 text-sm font-semibold px-2.5 py-1 rounded-full",
                    (detail?.change ?? selected.change) >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                  )}>
                    {(detail?.change ?? selected.change) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {detail?.changeAbs != null ? `$${Math.abs(detail.changeAbs).toFixed(2)} ` : ""}{Math.abs(detail?.change ?? selected.change).toFixed(2)}%
                  </span>
                </div>

                {/* 5-day chart */}
                {loadingDetail ? (
                  <div className="h-20 skeleton mb-4" />
                ) : (
                  <div className="h-20 mb-4">
                    {(() => {
                      const chartData = detail?.chart || selected.chart || [];
                      if (chartData.length < 2) return <div className="h-full flex items-center justify-center text-xs text-[#9ca3af]">No chart data</div>;
                      const min = Math.min(...chartData);
                      const max = Math.max(...chartData);
                      const range = max - min || 1;
                      const pts = chartData.map((v: number, i: number) => `${(i / (chartData.length - 1)) * 200},${60 - ((v - min) / range) * 50}`).join(" ");
                      const color = (detail?.change ?? selected.change) >= 0 ? "#16a34a" : "#ef4444";
                      return (
                        <svg viewBox="0 0 200 65" className="w-full h-full">
                          <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
                          {chartData.map((v: number, i: number) => (
                            <circle key={i} cx={(i / (chartData.length - 1)) * 200} cy={60 - ((v - min) / range) * 50} r="3" fill={color} opacity="0.5" />
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                )}

                {/* Price info */}
                {detail && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 rounded-lg" style={{ background: "#f8fafc" }}>
                      <p className="text-[9px] text-[#9ca3af] uppercase tracking-wider">Prev Close</p>
                      <p className="text-xs font-semibold text-[#0f172a]">{fmt(detail.prevClose)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg" style={{ background: "#f8fafc" }}>
                      <p className="text-[9px] text-[#9ca3af] uppercase tracking-wider">Day Change</p>
                      <p className={cn("text-xs font-semibold", detail.change >= 0 ? "text-emerald-600" : "text-red-500")}>{detail.change >= 0 ? "+" : ""}{detail.changeAbs.toFixed(2)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg" style={{ background: "#f8fafc" }}>
                      <p className="text-[9px] text-[#9ca3af] uppercase tracking-wider">5-Day Range</p>
                      <p className="text-xs font-semibold text-[#0f172a]">{detail.chart.length > 0 ? `${fmt(Math.min(...detail.chart))} - ${fmt(Math.max(...detail.chart))}` : "—"}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Invest Form */}
              <div className="card-light p-5">
                <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Invest in {selected.symbol}</h3>

                {buyResult?.success ? (
                  <div className="text-center py-6">
                    <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#0f172a] mb-1">{buyResult.message}</p>
                    <button onClick={() => setBuyResult(null)} className="mt-3 text-xs text-naxcal-teal font-medium cursor-pointer hover:underline">Invest More</button>
                  </div>
                ) : (
                  <>
                    {buyResult && !buyResult.success && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm mb-3">{buyResult.message}</div>
                    )}
                    <div className="mb-3">
                      <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Amount (USD)</label>
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min. $50"
                        className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-naxcal-teal/20" style={{ border: "1px solid #e2e8f0" }} />
                      {amount && parseFloat(amount) > 0 && (detail?.price || selected.price) > 0 && (
                        <p className="text-xs text-[#9ca3af] mt-1">≈ {(parseFloat(amount) / (detail?.price || selected.price)).toFixed(4)} shares</p>
                      )}
                    </div>
                    <p className="text-xs text-[#9ca3af] mb-3">Available: {fmt(Number(profile?.balance ?? 0))}</p>
                    <button onClick={handleBuy} disabled={buying || !amount || parseFloat(amount) < 50}
                      className="w-full py-3 rounded-xl text-white font-semibold text-sm cursor-pointer btn-teal disabled:opacity-50 flex items-center justify-center gap-2">
                      {buying ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : "Invest Now"}
                    </button>
                    <p className="text-[10px] text-[#9ca3af] text-center mt-2">Powered by Alpaca · Paper trading</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Portfolio */}
      {positions.length > 0 && (
        <div className="card-light p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">My Stock Portfolio</h3>
            <div className="text-right">
              <p className="text-sm font-bold text-[#0f172a]">{fmt(totalPortfolioValue)}</p>
              <span className={cn("text-[10px] font-semibold", totalPL >= 0 ? "text-emerald-600" : "text-red-500")}>
                {totalPL >= 0 ? "+" : ""}{fmt(totalPL)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2e8f0]">
                  {["Stock", "Shares", "Avg Price", "Current", "Value", "P&L", ""].map((h) => (
                    <th key={h} className="text-left text-[10px] text-[#9ca3af] uppercase tracking-wider py-2 px-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.symbol} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <td className="py-2.5 px-2 font-semibold text-[#0f172a]">{pos.symbol}</td>
                    <td className="py-2.5 px-2 text-[#6b7280]">{pos.qty.toFixed(4)}</td>
                    <td className="py-2.5 px-2 text-[#6b7280]">{fmt(pos.avg_entry)}</td>
                    <td className="py-2.5 px-2 text-[#0f172a] font-medium">{fmt(pos.current_price)}</td>
                    <td className="py-2.5 px-2 text-[#0f172a] font-semibold">{fmt(pos.market_value)}</td>
                    <td className={cn("py-2.5 px-2 font-semibold", pos.unrealized_pl >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {pos.unrealized_pl >= 0 ? "+" : ""}{fmt(pos.unrealized_pl)} ({pos.unrealized_plpc.toFixed(2)}%)
                    </td>
                    <td className="py-2.5 px-2">
                      <button onClick={() => handleSell(pos)} disabled={selling === pos.symbol}
                        className="px-3 py-1 rounded-lg text-[10px] font-semibold text-red-500 border border-red-200 hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-50">
                        {selling === pos.symbol ? "..." : "Sell All"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
