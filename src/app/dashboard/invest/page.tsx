"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight, Mail, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const featuredStocks = [
  { ticker: "AAPL", name: "Apple Inc.", price: 198.45, change: 1.23, color: "#a3a3a3" },
  { ticker: "TSLA", name: "Tesla Inc.", price: 248.70, change: -1.78, color: "#cc0000" },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 135.58, change: 3.42, color: "#76b900" },
  { ticker: "MSFT", name: "Microsoft Corp.", price: 442.20, change: 0.89, color: "#00a4ef" },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 178.90, change: -0.45, color: "#4285f4" },
  { ticker: "AMZN", name: "Amazon.com Inc.", price: 192.35, change: 2.15, color: "#ff9900" },
];

const sparkData = [40, 42, 38, 44, 46, 45, 48, 50, 47, 52];

const steps = [
  { step: "1", title: "Choose a Stock", desc: "Browse featured stocks and select the company you want to invest in." },
  { step: "2", title: "Allocate Capital", desc: "Enter the amount from your Naxcal balance. Minimum $50 per investment." },
  { step: "3", title: "Earn Returns", desc: "Your investment grows with market performance. Track it from your dashboard." },
];

export default function InvestPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-6xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Invest</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <TrendingUp size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Invest in Stocks</h1>
      </div>
      <p className="text-sm text-[#6b7280] mb-6">Allocate a portion of your Naxcal balance to individual stocks</p>

      {/* Coming soon overlay wrapper */}
      <div className="relative">
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(26,138,110,0.1)" }}>
              <TrendingUp size={28} className="text-naxcal-teal" />
            </div>
            <h3 className="text-lg font-bold text-[#0f172a] mb-2">Stock Investing Coming Soon</h3>
            <p className="text-sm text-[#6b7280] mb-4">Be the first to know when stock investing launches on Naxcal.</p>
            <div className="flex items-center gap-2 max-w-xs mx-auto">
              <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-2.5 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:border-naxcal-teal" style={{ border: "1px solid #e2e8f0" }} />
              <button className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal cursor-pointer flex items-center gap-1.5">
                <Mail size={14} /> Notify Me
              </button>
            </div>
          </div>
        </div>

        {/* Stock Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {featuredStocks.map((stock) => (
            <div key={stock.ticker} className="card-light p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: stock.color }}>
                  {stock.ticker.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0f172a]">{stock.name}</p>
                  <p className="text-xs text-[#9ca3af]">{stock.ticker}</p>
                </div>
              </div>

              <div className="h-10 mb-3">
                <svg viewBox="0 0 100 30" className="w-full h-full">
                  <polyline fill="none" stroke={stock.change >= 0 ? "#16a34a" : "#ef4444"} strokeWidth="1.5"
                    points={sparkData.map((v, i) => `${i * 11},${30 - v * 0.5}`).join(" ")} />
                </svg>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-lg font-bold text-[#0f172a]">${stock.price.toFixed(2)}</p>
                <span className={cn("flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full",
                  stock.change >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                )}>
                  {stock.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(stock.change)}%
                </span>
              </div>

              <button className="w-full py-2 rounded-lg text-xs font-semibold text-naxcal-teal cursor-pointer transition-all hover:bg-naxcal-teal hover:text-white" style={{ border: "1px solid rgba(26,138,110,0.2)" }}>
                Invest — Min. $50
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="card-light p-6 mt-8">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-5">How It Works</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.step} className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-sm font-bold text-white bg-naxcal-teal">{s.step}</div>
              <h4 className="text-sm font-semibold text-[#0f172a] mb-1">{s.title}</h4>
              <p className="text-xs text-[#6b7280]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
