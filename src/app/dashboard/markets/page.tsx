"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart2, ArrowUpRight, ArrowDownRight, ArrowLeftRight, TrendingUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

const cryptos = [
  { ticker: "BTC", name: "Bitcoin", price: 104250.80, change: 2.34, color: "#f7931a" },
  { ticker: "ETH", name: "Ethereum", price: 3842.15, change: -1.12, color: "#627eea" },
  { ticker: "USDT", name: "Tether", price: 1.00, change: 0.01, color: "#26a17b" },
  { ticker: "BNB", name: "BNB", price: 612.40, change: 0.78, color: "#f3ba2f" },
  { ticker: "SOL", name: "Solana", price: 178.25, change: 4.56, color: "#9945ff" },
  { ticker: "XRP", name: "XRP", price: 0.6234, change: -0.89, color: "#23292f" },
  { ticker: "ADA", name: "Cardano", price: 0.4512, change: 1.23, color: "#0033ad" },
  { ticker: "DOGE", name: "Dogecoin", price: 0.1245, change: 5.67, color: "#c2a633" },
];

const sparkData = [40, 42, 38, 44, 46, 45, 48, 50, 47, 52];

export default function MarketsPage() {
  const [tab, setTab] = useState<"stocks" | "crypto">("crypto");
  const data = tab === "stocks" ? stocks : cryptos;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Markets</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <BarChart2 size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Markets</h1>
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

      {/* Grid */}
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
                <p className="text-lg font-bold text-[#0f172a]">${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                <span className={cn("flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full",
                  asset.change >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                )}>
                  {asset.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(asset.change)}%
                </span>
              </div>

              <Link href={tab === "crypto" ? "/dashboard/swap" : "/dashboard/invest"} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-naxcal-teal border border-naxcal-teal/20 hover:bg-naxcal-teal hover:text-white transition-all cursor-pointer">
                {tab === "crypto" ? <><ArrowLeftRight size={14} /> Swap</> : <><TrendingUp size={14} /> Invest</>}
              </Link>
            </div>
          ))}
        </div>

        {tab === "stocks" && (
          <div className="mt-4 text-center">
            <span className="text-[10px] text-[#9ca3af]">Powered by Alpaca</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
