"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart2, ArrowUpRight, ArrowDownRight, ChevronRight, RefreshCw, Search, TrendingUp, Zap, ArrowLeftRight } from "lucide-react";
import StockLogo from "@/components/StockLogo";
import { cn } from "@/lib/utils";

const cryptoMap: Record<string, { ticker: string; name: string; color: string }> = {
  bitcoin: { ticker: "BTC", name: "Bitcoin", color: "#f7931a" },
  ethereum: { ticker: "ETH", name: "Ethereum", color: "#627eea" },
  tether: { ticker: "USDT", name: "Tether", color: "#26a17b" },
  binancecoin: { ticker: "BNB", name: "BNB", color: "#f3ba2f" },
  solana: { ticker: "SOL", name: "Solana", color: "#9945ff" },
  ripple: { ticker: "XRP", name: "XRP", color: "#23292f" },
  cardano: { ticker: "ADA", name: "Cardano", color: "#0033ad" },
  dogecoin: { ticker: "DOGE", name: "Dogecoin", color: "#c2a633" },
};

type Asset = { ticker: string; name: string; price: number; change: number; color: string; chart?: number[]; sector?: string; type?: string };

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
        ticker: info.ticker, name: info.name, color: info.color,
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

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Markets</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <BarChart2 size={22} className="text-naxcal-teal" />
          <h1 className="text-xl font-bold text-[#0f172a]">Markets</h1>
          {tab === "crypto" && lastUpdate && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#9ca3af]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" />
              {timeSince}
              <button onClick={fetchCrypto} className="p-0.5 rounded hover:bg-[#f1f5f9] cursor-pointer"><RefreshCw size={10} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1">
          <button onClick={() => { setTab("crypto"); setSearch(""); }} className={cn("px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all", tab === "crypto" ? "bg-naxcal-teal text-white" : "text-[#6b7280] border border-[#e2e8f0] hover:bg-[#f8fafc]")}>
            Crypto
          </button>
          <button onClick={() => { setTab("stocks"); setSearch(""); }} className={cn("px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all", tab === "stocks" ? "bg-naxcal-teal text-white" : "text-[#6b7280] border border-[#e2e8f0] hover:bg-[#f8fafc]")}>
            Stocks & ETFs
          </button>
        </div>
        {tab === "stocks" && (
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stocks..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-naxcal-teal/20" style={{ border: "1px solid #e2e8f0" }} />
          </div>
        )}
      </div>

      {/* List */}
      <div className="card-light overflow-hidden">
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[1fr_100px_100px_80px] gap-2 px-5 py-2.5 border-b border-[#e2e8f0]" style={{ background: "#f8fafc" }}>
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
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_100px_100px_80px] gap-2 items-center px-5 py-3 border-b border-[#f8fafc] hover:bg-[#fafafa] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {tab === "stocks" ? (
                      <StockLogo symbol={asset.ticker} size={36} />
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

                  <div className="hidden sm:block h-8">
                    {hasChart ? (
                      <svg viewBox="0 0 80 28" className="w-full h-full">
                        <polyline fill="none" stroke={asset.change >= 0 ? "#16a34a" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                          points={chartData.map((v: number, i: number) => `${(i / (chartData.length - 1)) * 80},${24 - ((v - chartMin) / chartRange) * 20}`).join(" ")} />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 80 28" className="w-full h-full">
                        <line x1="0" y1="14" x2="80" y2="14" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
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
