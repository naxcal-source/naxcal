"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight, Loader2, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type StockPrice = { symbol: string; price: number; change: number };
type Position = { symbol: string; qty: number; avg_entry: number; current_price: number; market_value: number; unrealized_pl: number; unrealized_plpc: number };

const stockInfo: Record<string, { name: string; color: string }> = {
  AAPL: { name: "Apple Inc.", color: "#a3a3a3" },
  MSFT: { name: "Microsoft Corp.", color: "#00a4ef" },
  GOOGL: { name: "Alphabet Inc.", color: "#4285f4" },
  AMZN: { name: "Amazon.com Inc.", color: "#ff9900" },
  TSLA: { name: "Tesla Inc.", color: "#cc0000" },
  NVDA: { name: "NVIDIA Corp.", color: "#76b900" },
  META: { name: "Meta Platforms", color: "#0081fb" },
  NFLX: { name: "Netflix Inc.", color: "#e50914" },
  JPM: { name: "JPMorgan Chase", color: "#1a3d6f" },
  BAC: { name: "Bank of America", color: "#dc143c" },
};

const fallbackPrices: StockPrice[] = [
  { symbol: "AAPL", price: 198.45, change: 1.23 },
  { symbol: "TSLA", price: 248.70, change: -1.78 },
  { symbol: "NVDA", price: 135.58, change: 3.42 },
  { symbol: "MSFT", price: 442.20, change: 0.89 },
  { symbol: "GOOGL", price: 178.90, change: -0.45 },
  { symbol: "AMZN", price: 192.35, change: 2.15 },
];

const sparkData = [40, 42, 38, 44, 46, 45, 48, 50, 47, 52];

export default function InvestPage() {
  const { profile, refreshProfile } = useDashboard();
  const [stocks, setStocks] = useState<StockPrice[]>(fallbackPrices);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyModal, setBuyModal] = useState<StockPrice | null>(null);
  const [amount, setAmount] = useState("");
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState<{ success: boolean; message: string } | null>(null);
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    const load = async () => {
      try {
        const [pricesRes, posRes] = await Promise.all([
          fetch("/api/stocks/prices"),
          fetch("/api/stocks/portfolio"),
        ]);
        if (pricesRes.ok) {
          const data = await pricesRes.json();
          if (Array.isArray(data) && data.length > 0) setStocks(data);
        }
        if (posRes.ok) {
          const data = await posRes.json();
          if (Array.isArray(data)) setPositions(data);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleBuy = async () => {
    if (!buyModal || !profile || !amount) return;
    const numAmount = parseFloat(amount);
    if (numAmount < 50) { setBuyResult({ success: false, message: "Minimum investment is $50" }); return; }
    if (numAmount > Number(profile.balance)) { setBuyResult({ success: false, message: "Insufficient balance" }); return; }

    setBuying(true);
    setBuyResult(null);
    try {
      const res = await fetch("/api/stocks/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: buyModal.symbol, amount_usd: numAmount, user_id: profile.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setBuyResult({ success: true, message: `Successfully invested ${fmt(numAmount)} in ${buyModal.symbol}` });
        refreshProfile();
      } else {
        setBuyResult({ success: false, message: data.error || "Order failed" });
      }
    } catch {
      setBuyResult({ success: false, message: "Network error" });
    }
    setBuying(false);
  };

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

      {/* My Positions */}
      {positions.length > 0 && (
        <div className="card-light p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-4">My Stock Portfolio</h3>
          <div className="space-y-2">
            {positions.map((pos) => (
              <div key={pos.symbol} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: stockInfo[pos.symbol]?.color || "#6b7280" }}>
                    {pos.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm text-[#0f172a] font-medium">{pos.symbol}</p>
                    <p className="text-[10px] text-[#9ca3af]">{pos.qty.toFixed(4)} shares @ {fmt(pos.avg_entry)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#0f172a]">{fmt(pos.market_value)}</p>
                  <span className={cn("text-[10px] font-medium", pos.unrealized_pl >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {pos.unrealized_pl >= 0 ? "+" : ""}{fmt(pos.unrealized_pl)} ({pos.unrealized_plpc.toFixed(2)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-light p-4"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full skeleton" /><div className="flex-1"><div className="h-4 w-24 skeleton mb-1" /><div className="h-3 w-12 skeleton" /></div></div><div className="h-10 skeleton mb-3" /><div className="h-8 skeleton" /></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.map((stock) => {
            const info = stockInfo[stock.symbol] || { name: stock.symbol, color: "#6b7280" };
            return (
              <div key={stock.symbol} className="card-light p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: info.color }}>
                    {stock.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0f172a]">{info.name}</p>
                    <p className="text-xs text-[#9ca3af]">{stock.symbol}</p>
                  </div>
                </div>
                <div className="h-10 mb-3">
                  <svg viewBox="0 0 100 30" className="w-full h-full">
                    <polyline fill="none" stroke={stock.change >= 0 ? "#16a34a" : "#ef4444"} strokeWidth="1.5"
                      points={sparkData.map((v, i) => `${i * 11},${30 - v * 0.5}`).join(" ")} />
                  </svg>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-lg font-bold text-[#0f172a]">{fmt(stock.price)}</p>
                  <span className={cn("flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full",
                    stock.change >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                  )}>
                    {stock.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(stock.change).toFixed(2)}%
                  </span>
                </div>
                <button onClick={() => { setBuyModal(stock); setAmount(""); setBuyResult(null); }}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-naxcal-teal cursor-pointer transition-all hover:bg-naxcal-teal hover:text-white" style={{ border: "1px solid rgba(26,138,110,0.2)" }}>
                  Invest — Min. $50
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* How it Works */}
      <div className="card-light p-6 mt-6">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-5">How It Works</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Choose a Stock", desc: "Browse featured stocks and select the company you want to invest in." },
            { step: "2", title: "Allocate Capital", desc: "Enter the amount from your Naxcal balance. Minimum $50 per investment." },
            { step: "3", title: "Earn Returns", desc: "Your investment grows with market performance. Track it from your dashboard." },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 text-sm font-bold text-white bg-naxcal-teal">{s.step}</div>
              <h4 className="text-sm font-semibold text-[#0f172a] mb-1">{s.title}</h4>
              <p className="text-xs text-[#6b7280]">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#9ca3af] text-center mt-4">Powered by Alpaca · Paper trading mode</p>
      </div>

      {/* Buy Modal */}
      {buyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-2xl" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0f172a]">Invest in {buyModal.symbol}</h3>
              <button onClick={() => setBuyModal(null)} className="p-1 rounded-lg hover:bg-[#f1f5f9] cursor-pointer"><X size={18} className="text-[#9ca3af]" /></button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: stockInfo[buyModal.symbol]?.color || "#6b7280" }}>
                {buyModal.symbol.slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0f172a]">{stockInfo[buyModal.symbol]?.name || buyModal.symbol}</p>
                <p className="text-xs text-[#6b7280]">{fmt(buyModal.price)} · {buyModal.change >= 0 ? "+" : ""}{buyModal.change.toFixed(2)}%</p>
              </div>
            </div>

            {buyResult?.success ? (
              <div className="text-center py-4">
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-[#0f172a]">{buyResult.message}</p>
                <button onClick={() => setBuyModal(null)} className="mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal cursor-pointer">Done</button>
              </div>
            ) : (
              <>
                {buyResult && !buyResult.success && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm mb-4">{buyResult.message}</div>
                )}
                <div className="mb-4">
                  <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Investment Amount (USD)</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Minimum $50"
                    className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-naxcal-teal/20" style={{ border: "1px solid #e2e8f0" }} />
                  {amount && parseFloat(amount) > 0 && buyModal.price > 0 && (
                    <p className="text-xs text-[#9ca3af] mt-1">~{(parseFloat(amount) / buyModal.price).toFixed(4)} shares</p>
                  )}
                </div>
                <p className="text-xs text-[#9ca3af] mb-4">Available: {fmt(Number(profile?.balance ?? 0))}</p>
                <button onClick={handleBuy} disabled={buying || !amount || parseFloat(amount) < 50}
                  className="w-full py-3 rounded-lg text-white font-semibold text-sm cursor-pointer btn-teal disabled:opacity-50 flex items-center justify-center gap-2">
                  {buying ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : "Confirm Investment"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
