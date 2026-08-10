"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart2, ArrowUpRight, ArrowDownRight, ChevronRight, RefreshCw, Search, TrendingUp, Zap, ArrowLeftRight } from "lucide-react";
import StockLogo from "@/components/StockLogo";
import { cn } from "@/lib/utils";

const cryptoMap: Record<string, { ticker: string; name: string; color: string; icon: string }> = {
  bitcoin: { ticker: "BTC", name: "Bitcoin", color: "#f7931a", icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png" },
  ethereum: { ticker: "ETH", name: "Ethereum", color: "#627eea", icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  tether: { ticker: "USDT", name: "Tether", color: "#26a17b", icon: "https://assets.coingecko.com/coins/images/325/small/Tether.png" },
  binancecoin: { ticker: "BNB", name: "BNB", color: "#f3ba2f", icon: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png" },
  solana: { ticker: "SOL", name: "Solana", color: "#9945ff", icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png" },
  ripple: { ticker: "XRP", name: "XRP", color: "#23292f", icon: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png" },
  cardano: { ticker: "ADA", name: "Cardano", color: "#0033ad", icon: "https://assets.coingecko.com/coins/images/975/small/cardano.png" },
  dogecoin: { ticker: "DOGE", name: "Dogecoin", color: "#c2a633", icon: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png" },
};

type Asset = { ticker: string; name: string; price: number; change: number; color: string; chart?: number[]; sector?: string; type?: string; icon?: string };

export default function MarketsPage() {
  const [tab, setTab] = useState<"crypto" | "stocks">("crypto");
  const [cryptos, setCryptos] = useState<Asset[]>([]);
  const [stocks, setStocks] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchCrypto = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const mapped: Asset[] = Object.entries(cryptoMap).map(([id, info]) => ({
        ticker: info.ticker, name: info.name, color: info.color, icon: info.icon,
        price: data[id]?.usd ?? 0, change: data[id]?.usd_24h_change ?? 0,
      })).filter((c) => c.price > 0);
      setCryptos(mapped);
      setLastUpdate(new Date());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCrypto(); const id = setInterval(fetchCrypto, 60000); return () => clearInterval(id); }, [fetchCrypto]);

  useEffect(() => {
    fetch("/api/stocks/popular").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        setStocks(data.map((s: { symbol: string; name: string; price: number; change: number; chart?: number[]; sector?: string }) => ({
          ticker: s.symbol, name: s.name, price: s.price, change: s.change,
          color: "#6b7280", chart: s.chart, sector: s.sector,
        })));
      }
      setStocksLoading(false);
    }).catch(() => setStocksLoading(false));
  }, []);

  useEffect(() => {
    if (search.length < 1 || tab !== "stocks") { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.map((s: { symbol: string; name: string; price: number; change: number }) => ({
            ticker: s.symbol, name: s.name, price: s.price, change: s.change, color: "#6b7280",
          })));
        }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [search, tab]);

  const displayCrypto = cryptos;
  const displayStocks = search.length > 0 ? searchResults : stocks;
  const data = tab === "crypto" ? displayCrypto : displayStocks;
  const isLoading = tab === "crypto" ? loading : stocksLoading;
  const timeSince = lastUpdate ? `${Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago` : "";

  const fmtPrice = (p: number) => {
    if (p === 0) return "—";
    if (p < 0.01) return "$" + p.toFixed(6);
    if (p < 1) return "$" + p.toFixed(4);
    return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const topMover = data.length
    ? [...data].sort((a, b) => b.change - a.change)[0]
    : null;

  const biggestDrop = data.length
    ? [...data].sort((a, b) => a.change - b.change)[0]
    : null;

  const positiveCount = data.filter((asset) => asset.change >= 0).length;
  const negativeCount = data.filter((asset) => asset.change < 0).length;
  const marketMood = positiveCount >= negativeCount ? "Bullish" : "Bearish";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Markets</span>
      </div>

      {/* Premium header */}
      <div className="rounded-[28px] overflow-hidden mb-5 border border-white/10 shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
        style={{
          background:
            "radial-gradient(circle at 12% 0%, rgba(26,138,110,0.30), transparent 34%), linear-gradient(135deg, #071311 0%, #0b1714 55%, #050807 100%)",
        }}
      >
        <div className="p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] border border-white/[0.08] px-3 py-1.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-live" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/55 font-semibold">
                  Live market board
                </span>
              </div>

              <div className="flex items-center gap-3">
                <BarChart2 size={24} className="text-emerald-300" />
                <div>
                  <h1 className="text-2xl font-bold text-white">Markets</h1>
                  <p className="text-sm text-white/45 mt-1">
                    Track live prices, movement and market opportunities.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-white/45">
              {tab === "crypto" && lastUpdate && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Updated {timeSince}
                  <button onClick={fetchCrypto} className="p-1 rounded-lg hover:bg-white/[0.08] cursor-pointer">
                    <RefreshCw size={12} />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-6">
            <div className="rounded-2xl bg-white/[0.07] border border-white/[0.08] p-4">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Market sentiment</p>
              <p className="text-xl font-bold text-white mt-2">{marketMood}</p>
              <p className="text-xs text-white/40 mt-1">{positiveCount} up · {negativeCount} down</p>
            </div>

            <div className="rounded-2xl bg-white/[0.07] border border-white/[0.08] p-4">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Top mover</p>
              <p className="text-xl font-bold text-white mt-2">{topMover?.ticker || "—"}</p>
              <p className="text-xs text-emerald-300 mt-1">
                {topMover ? `${topMover.change >= 0 ? "+" : ""}${topMover.change.toFixed(2)}%` : "No data"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.07] border border-white/[0.08] p-4">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Biggest drop</p>
              <p className="text-xl font-bold text-white mt-2">{biggestDrop?.ticker || "—"}</p>
              <p className="text-xs text-red-300 mt-1">
                {biggestDrop ? `${biggestDrop.change.toFixed(2)}%` : "No data"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Premium tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="inline-flex gap-1 rounded-2xl bg-white border border-[#e2e8f0] p-1 shadow-sm">
          <button onClick={() => { setTab("crypto"); setSearch(""); }} className={cn("px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all", tab === "crypto" ? "bg-[#071311] text-white shadow-lg" : "text-[#64748b] hover:bg-[#f8fafc]")}>
            Crypto
          </button>
          <button onClick={() => { setTab("stocks"); setSearch(""); }} className={cn("px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all", tab === "stocks" ? "bg-[#071311] text-white shadow-lg" : "text-[#64748b] hover:bg-[#f8fafc]")}>
            Stocks & ETFs
          </button>
        </div>

        {tab === "stocks" && (
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stocks..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-naxcal-teal/20 bg-white shadow-sm" style={{ border: "1px solid #e2e8f0" }} />
          </div>
        )}
      </div>

      {/* List */}
      <div className="card-light overflow-hidden rounded-[24px] shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[1fr_110px_110px_120px] gap-3 px-5 py-3 border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
          <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">Asset</span>
          <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium text-right">Price</span>
          <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium text-right">24h</span>
          <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium text-right">Chart</span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-1">
                <div className="w-9 h-9 rounded-full skeleton" />
                <div className="flex-1"><div className="h-3.5 w-24 skeleton mb-1" /><div className="h-3 w-16 skeleton" /></div>
                <div className="h-4 w-16 skeleton" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#9ca3af]">{search ? "No results" : "No data"}</div>
        ) : (
          <div>
            {data.map((asset, idx) => {
              const chartData = asset.chart || [];
              const hasChart = chartData.length >= 2;
              const chartMin = hasChart ? Math.min(...chartData) : 0;
              const chartMax = hasChart ? Math.max(...chartData) : 1;
              const chartRange = chartMax - chartMin || 1;

              return (
                <Link key={`${asset.ticker}-${idx}`}
                  href={tab === "crypto" ? "/dashboard/swap" : `/dashboard/invest`}
                  className="group grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_110px_110px_120px] gap-3 items-center px-5 py-4 border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    {tab === "stocks" ? (
                      <StockLogo symbol={asset.ticker} size={36} />
                    ) : asset.icon ? (
                      <img src={asset.icon} alt={asset.ticker} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" style={{ background: "#f1f5f9" }} />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: asset.color || "#6b7280" }}>
                        {asset.ticker.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0f172a] truncate">{asset.ticker}</p>
                      <p className="text-[11px] text-[#9ca3af] truncate">{asset.name}</p>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-[#0f172a] text-right">{fmtPrice(asset.price)}</p>

                  <div className="hidden sm:flex justify-end">
                    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                      asset.change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    )}>
                      {asset.change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {Math.abs(asset.change).toFixed(2)}%
                    </span>
                  </div>

                  <div className="hidden sm:block h-12 rounded-2xl bg-white border border-[#e2e8f0] overflow-hidden relative group-hover:border-naxcal-teal/20 group-hover:shadow-sm transition-all">
                    {hasChart ? (
                      <svg viewBox="0 0 120 48" className="w-full h-full">
                        <defs>
                          <linearGradient id={`marketPageFill-${asset.ticker}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={asset.change >= 0 ? "#16a34a" : "#ef4444"} stopOpacity="0.24" />
                            <stop offset="100%" stopColor={asset.change >= 0 ? "#16a34a" : "#ef4444"} stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        <polygon
                          fill={`url(#marketPageFill-${asset.ticker}-${idx})`}
                          points={`0,46 ${chartData.map((v: number, i: number) => `${(i / (chartData.length - 1)) * 120},${40 - ((v - chartMin) / chartRange) * 28}`).join(" ")} 120,46`}
                        />
                        <polyline
                          fill="none"
                          stroke={asset.change >= 0 ? "#16a34a" : "#ef4444"}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={chartData.map((v: number, i: number) => `${(i / (chartData.length - 1)) * 120},${40 - ((v - chartMin) / chartRange) * 28}`).join(" ")}
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 120 48" className="w-full h-full">
                        <line x1="8" y1="24" x2="112" y2="24" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
                      </svg>
                    )}
                  </div>

                  {/* Mobile change */}
                  <span className={cn("sm:hidden text-xs font-semibold text-right", asset.change >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {asset.change >= 0 ? "+" : ""}{asset.change.toFixed(2)}%
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3 mt-4">
        <Link href="/dashboard/swap" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-naxcal-teal border border-naxcal-teal/20 hover:bg-naxcal-teal hover:text-white transition-all cursor-pointer">
          <ArrowLeftRight size={16} /> Swap Crypto
        </Link>
        <Link href="/dashboard/invest" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-naxcal-teal border border-naxcal-teal/20 hover:bg-naxcal-teal hover:text-white transition-all cursor-pointer">
          <TrendingUp size={16} /> Invest in Stocks
        </Link>
      </div>

      <p className="text-center text-[10px] text-[#9ca3af] mt-3">
        {tab === "crypto" ? "Prices from CoinGecko · Auto-updates every 60s" : "Prices from Yahoo Finance · Real-time"}
      </p>
    </motion.div>
  );
}
