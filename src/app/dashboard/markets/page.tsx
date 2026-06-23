"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, TrendingUp, ChevronRight, RefreshCw } from "lucide-react";
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

const stocks = [
  { ticker: "AAPL", name: "Apple Inc.", price: 198.45, change: 1.23, color: "#a3a3a3" },
  { ticker: "MSFT", name: "Microsoft Corp.", price: 442.20, change: 0.89, color: "#00a4ef" },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 178.90, change: -0.45, color: "#4285f4" },
  { ticker: "AMZN", name: "Amazon.com Inc.", price: 192.35, change: 2.15, color: "#ff9900" },
  { ticker: "TSLA", name: "Tesla Inc.", price: 248.70, change: -1.78, color: "#cc0000" },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 135.58, change: 3.42, color: "#76b900" },
  { ticker: "META", name: "Meta Platforms", price: 510.25, change: 0.67, color: "#0081fb" },
  { ticker: "NFLX", name: "Netflix Inc.", price: 685.90, change: 1.05, color: "#e50914" },
];

type CryptoAsset = { ticker: string; name: string; price: number; change: number; color: string };

export default function MarketsPage() {
  const [tab, setTab] = useState<"crypto" | "stocks">("crypto");
  const [cryptos, setCryptos] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const mapped: CryptoAsset[] = Object.entries(cryptoMap).map(([id, info]) => ({
        ticker: info.ticker,
        name: info.name,
        color: info.color,
        price: data[id]?.usd ?? 0,
        change: data[id]?.usd_24h_change ?? 0,
      })).filter((c) => c.price > 0);
      setCryptos(mapped);
      setLastUpdate(new Date());
    } catch {
      if (cryptos.length === 0) {
        setCryptos(Object.values(cryptoMap).map((info) => ({ ...info, price: 0, change: 0 })));
      }
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 60000);
    return () => clearInterval(id);
  }, [fetchPrices]);

  const data = tab === "stocks" ? stocks : cryptos;
  const sparkData = [40, 42, 38, 44, 46, 45, 48, 50, 47, 52];

  const timeSince = lastUpdate
    ? `${Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago`
    : "—";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Markets</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 size={22} className="text-naxcal-teal" />
          <h1 className="text-xl font-bold text-[#0f172a]">Markets</h1>
        </div>
        {tab === "crypto" && lastUpdate && (
          <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" />
            <span>Updated {timeSince}</span>
            <button onClick={fetchPrices} className="p-1 rounded hover:bg-[#f1f5f9] cursor-pointer"><RefreshCw size={12} /></button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("crypto")} className={cn("px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all", tab === "crypto" ? "bg-naxcal-teal text-white shadow-sm" : "bg-white text-[#6b7280] border border-[#e2e8f0] hover:border-naxcal-teal/30")}>
          Crypto
        </button>
        <button onClick={() => setTab("stocks")} className={cn("px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all", tab === "stocks" ? "bg-naxcal-teal text-white shadow-sm" : "bg-white text-[#6b7280] border border-[#e2e8f0] hover:border-naxcal-teal/30")}>
          Stocks
        </button>
      </div>

      <div className="relative">
        {tab === "stocks" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(26,138,110,0.1)" }}>
                <TrendingUp size={28} className="text-naxcal-teal" />
              </div>
              <h3 className="text-lg font-bold text-[#0f172a] mb-2">Stock Investing Launching Soon</h3>
              <p className="text-sm text-[#6b7280] max-w-sm mx-auto">You&apos;ll be notified when stock investing is available on Naxcal.</p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && tab === "crypto" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-light p-4">
                <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full skeleton" /><div className="flex-1"><div className="h-4 w-24 skeleton mb-1" /><div className="h-3 w-12 skeleton" /></div></div>
                <div className="h-10 skeleton mb-3" />
                <div className="h-5 w-20 skeleton mb-2" />
                <div className="h-8 skeleton" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.map((asset) => (
              <div key={asset.ticker} className="card-light p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: asset.color }}>
                    {asset.ticker.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0f172a]">{asset.name}</p>
                    <p className="text-xs text-[#9ca3af]">{asset.ticker}</p>
                  </div>
                </div>

                <div className="h-10 mb-3">
                  <svg viewBox="0 0 100 30" className="w-full h-full">
                    <polyline fill="none" stroke={asset.change >= 0 ? "#16a34a" : "#ef4444"} strokeWidth="1.5"
                      points={sparkData.map((v, i) => `${i * 11},${30 - v * 0.5}`).join(" ")} />
                  </svg>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg font-bold text-[#0f172a]">
                    ${asset.price < 1 ? asset.price.toFixed(4) : asset.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className={cn("flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full",
                    asset.change >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                  )}>
                    {asset.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(asset.change).toFixed(2)}%
                  </span>
                </div>

                <Link href={tab === "crypto" ? "/dashboard/swap" : "/dashboard/invest"} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-naxcal-teal border border-naxcal-teal/20 hover:bg-naxcal-teal hover:text-white transition-all cursor-pointer">
                  {tab === "crypto" ? <><ArrowLeftRight size={14} /> Swap</> : <><TrendingUp size={14} /> Invest</>}
                </Link>
              </div>
            ))}
          </div>
        )}

        {tab === "stocks" && (
          <div className="mt-4 text-center">
            <span className="text-[10px] text-[#9ca3af]">Powered by Alpaca</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
