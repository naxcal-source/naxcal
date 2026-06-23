"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { ArrowLeftRight, ChevronRight, ChevronDown, ArrowDown, Clock, Info, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tokens = [
  { symbol: "USDT", name: "Tether", color: "#26a17b", geckoId: "tether" },
  { symbol: "BTC", name: "Bitcoin", color: "#f7931a", geckoId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", color: "#627eea", geckoId: "ethereum" },
  { symbol: "BNB", name: "BNB", color: "#f3ba2f", geckoId: "binancecoin" },
  { symbol: "SOL", name: "Solana", color: "#9945ff", geckoId: "solana" },
  { symbol: "XRP", name: "XRP", color: "#23292f", geckoId: "ripple" },
  { symbol: "ADA", name: "Cardano", color: "#0033ad", geckoId: "cardano" },
  { symbol: "DOGE", name: "Dogecoin", color: "#c2a633", geckoId: "dogecoin" },
];

type CryptoPos = { symbol: string; qty: number; avg_price: number; current_price: number; market_value: number };
type SwapResult = { from_token: string; to_token: string; from_amount: number; to_amount: number; fee: number; rate: number };

export default function SwapPage() {
  const { profile, refreshProfile } = useDashboard();
  const [fromToken, setFromToken] = useState("USDT");
  const [toToken, setToToken] = useState("BTC");
  const [fromAmount, setFromAmount] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [cryptoBalances, setCryptoBalances] = useState<CryptoPos[]>([]);
  const [recentSwaps, setRecentSwaps] = useState<{ description: string; created_at: string; amount: number }[]>([]);
  const [showFromList, setShowFromList] = useState(false);
  const [showToList, setShowToList] = useState(false);
  const [swapRotation, setSwapRotation] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [result, setResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState("");
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const supabaseBalance = Number(profile?.balance ?? 0);

  useEffect(() => {
    fetch("/api/prices").then((r) => r.json()).then((data) => {
      const mapped: Record<string, number> = {};
      tokens.forEach((t) => { if (data[t.geckoId]?.usd) mapped[t.symbol] = data[t.geckoId].usd; });
      setPrices(mapped);
    }).catch(() => {});

    fetch("/api/crypto/portfolio").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setCryptoBalances(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile) return;
    const { createClient } = require("@/lib/supabase");
    const supabase = createClient();
    supabase.from("transactions").select("description, created_at, amount").eq("user_id", profile.id).eq("type", "swap").order("created_at", { ascending: false }).limit(5)
      .then(({ data }: { data: { description: string; created_at: string; amount: number }[] | null }) => { if (data) setRecentSwaps(data); });
  }, [profile]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) setShowFromList(false);
      if (toRef.current && !toRef.current.contains(e.target as Node)) setShowToList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fromPrice = prices[fromToken] || 0;
  const toPrice = prices[toToken] || 0;
  const rate = toPrice > 0 ? fromPrice / toPrice : 0;
  const feeUsd = fromAmount ? parseFloat(fromAmount) * fromPrice * 0.005 : 0;
  const toAmount = fromAmount && rate > 0 ? ((parseFloat(fromAmount) * fromPrice - feeUsd) / toPrice) : 0;

  const getBalance = (sym: string) => {
    if (sym === "USDT") return supabaseBalance;
    const pos = cryptoBalances.find((p) => p.symbol === sym);
    return pos ? pos.qty : 0;
  };

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
    setSwapRotation((r) => r + 180);
    setResult(null);
    setError("");
  };

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;
    setSwapping(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_token: fromToken, to_token: toToken, from_amount: parseFloat(fromAmount) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Swap failed"); setSwapping(false); return; }
      setResult(data);
      refreshProfile();
      // Refresh crypto balances
      fetch("/api/crypto/portfolio").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setCryptoBalances(d); }).catch(() => {});
    } catch {
      setError("Network error");
    }
    setSwapping(false);
  };

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const TokenDropdown = ({ selected, onSelect, show, setShow, exclude, containerRef }: {
    selected: string; onSelect: (s: string) => void; show: boolean; setShow: (b: boolean) => void; exclude: string; containerRef: React.RefObject<HTMLDivElement | null>;
  }) => {
    const token = tokens.find((t) => t.symbol === selected)!;
    return (
      <div className="relative" ref={containerRef}>
        <button onClick={() => setShow(!show)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#f1f5f9] transition-colors cursor-pointer" style={{ border: "1px solid #e2e8f0" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: token.color }}>{token.symbol.slice(0, 2)}</div>
          <span className="text-sm font-semibold text-[#0f172a]">{token.symbol}</span>
          <ChevronDown size={14} className={cn("text-[#9ca3af] transition-transform", show && "rotate-180")} />
        </button>
        {show && (
          <div className="absolute top-full mt-1 left-0 w-56 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            {tokens.filter((t) => t.symbol !== exclude).map((t) => {
              const bal = getBalance(t.symbol);
              return (
                <button key={t.symbol} onClick={() => { onSelect(t.symbol); setShow(false); setResult(null); setError(""); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-[#f8fafc] transition-colors cursor-pointer text-left">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: t.color }}>{t.symbol.slice(0, 2)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0f172a]">{t.symbol}</p>
                    <p className="text-[10px] text-[#9ca3af]">{t.name}</p>
                  </div>
                  <span className="text-[10px] text-[#6b7280]">{bal > 0 ? (t.symbol === "USDT" ? fmt(bal) : bal.toFixed(6)) : "0"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const fromBal = getBalance(fromToken);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Swap</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <ArrowLeftRight size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Swap Crypto</h1>
      </div>
      <p className="text-sm text-[#6b7280] mb-6">Exchange tokens at live market rates</p>

      <div className="card-light p-6">
        {result ? (
          <div className="text-center py-4">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#0f172a] mb-2">Swap Complete</h3>
            <p className="text-sm text-[#6b7280] mb-1">
              Swapped {result.from_amount.toFixed(6)} {result.from_token} for {result.to_amount.toFixed(6)} {result.to_token}
            </p>
            <p className="text-xs text-[#9ca3af] mb-4">Fee: {fmt(result.fee)}</p>
            <button onClick={() => { setResult(null); setFromAmount(""); }} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white btn-teal cursor-pointer">Swap Again</button>
          </div>
        ) : (
          <>
            {/* From */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#9ca3af] uppercase tracking-wider font-medium">From</span>
                <button onClick={() => setFromAmount(fromBal.toString())} className="text-[10px] text-naxcal-teal cursor-pointer hover:underline">
                  Balance: {fromToken === "USDT" ? fmt(fromBal) : fromBal.toFixed(6)}
                </button>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <TokenDropdown selected={fromToken} onSelect={setFromToken} show={showFromList} setShow={setShowFromList} exclude={toToken} containerRef={fromRef} />
                <input type="number" value={fromAmount} onChange={(e) => { setFromAmount(e.target.value); setError(""); }} placeholder="0.00"
                  className="flex-1 text-right text-xl font-bold text-[#0f172a] placeholder:text-[#d1d5db] bg-transparent outline-none min-w-0" />
              </div>
              {fromAmount && fromPrice > 0 && (
                <p className="text-[10px] text-[#9ca3af] text-right mt-1">≈ {fmt(parseFloat(fromAmount) * fromPrice)}</p>
              )}
            </div>

            {/* Swap button */}
            <div className="flex justify-center -my-1 relative z-10">
              <button onClick={handleSwapTokens}
                className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-md hover:shadow-lg transition-all cursor-pointer"
                style={{ border: "2px solid #e2e8f0" }}>
                <ArrowDown size={18} className="text-naxcal-teal transition-transform duration-300" style={{ transform: `rotate(${swapRotation}deg)` }} />
              </button>
            </div>

            {/* To */}
            <div className="mt-2 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#9ca3af] uppercase tracking-wider font-medium">To</span>
                <span className="text-[10px] text-[#9ca3af]">
                  Balance: {toToken === "USDT" ? fmt(getBalance(toToken)) : getBalance(toToken).toFixed(6)}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <TokenDropdown selected={toToken} onSelect={setToToken} show={showToList} setShow={setShowToList} exclude={fromToken} containerRef={toRef} />
                <div className="flex-1 text-right text-xl font-bold text-[#0f172a] min-w-0">
                  {toAmount > 0 ? toAmount.toFixed(toPrice >= 100 ? 6 : toPrice >= 1 ? 4 : 2) : "0.00"}
                </div>
              </div>
            </div>

            {/* Rate + Fee */}
            {fromAmount && parseFloat(fromAmount) > 0 && rate > 0 && (
              <div className="space-y-2 py-3 mb-4" style={{ borderTop: "1px solid #f1f5f9" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9ca3af]">Exchange Rate</span>
                  <span className="text-xs font-medium text-[#374151]">
                    1 {fromToken} = {rate < 0.001 ? rate.toFixed(8) : rate < 1 ? rate.toFixed(6) : rate.toLocaleString("en-US", { maximumFractionDigits: 2 })} {toToken}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9ca3af]">Fee (0.5%)</span>
                  <span className="text-xs font-medium text-[#374151]">{fmt(feeUsd)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9ca3af]">You receive</span>
                  <span className="text-xs font-semibold text-[#0f172a]">{toAmount.toFixed(toPrice >= 100 ? 6 : 4)} {toToken}</span>
                </div>
              </div>
            )}

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm mb-3">{error}</div>}

            <button onClick={handleSwap} disabled={swapping || !fromAmount || parseFloat(fromAmount) <= 0 || parseFloat(fromAmount) > fromBal}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 btn-teal disabled:opacity-50 disabled:cursor-not-allowed">
              {swapping ? <><Loader2 size={16} className="animate-spin" /> Swapping...</> :
                parseFloat(fromAmount || "0") > fromBal ? `Insufficient ${fromToken}` :
                <><ArrowLeftRight size={16} /> Swap Now</>}
            </button>

            <div className="flex items-center justify-center gap-1 mt-3">
              <Info size={10} className="text-[#9ca3af]" />
              <span className="text-[10px] text-[#9ca3af]">Live prices from CoinGecko · 0.5% swap fee</span>
            </div>
          </>
        )}
      </div>

      {/* Crypto Holdings */}
      {cryptoBalances.length > 0 && (
        <div className="card-light p-5 mt-4">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Your Crypto Holdings</h3>
          <div className="space-y-2">
            {cryptoBalances.map((pos) => {
              const tokenInfo = tokens.find((t) => t.symbol === pos.symbol);
              return (
                <div key={pos.symbol} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#f8fafc] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: tokenInfo?.color || "#6b7280" }}>
                      {pos.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">{pos.symbol}</p>
                      <p className="text-[10px] text-[#9ca3af]">{pos.qty.toFixed(6)} tokens</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#0f172a]">{fmt(pos.market_value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Swaps */}
      <div className="card-light p-5 mt-4">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Recent Swaps</h3>
        {recentSwaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Clock size={20} className="text-[#d1d5db] mb-2" />
            <p className="text-xs text-[#9ca3af]">No swaps yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSwaps.map((swap, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[#f8fafc] transition-colors">
                <div>
                  <p className="text-xs text-[#374151] font-medium">{swap.description}</p>
                  <p className="text-[10px] text-[#9ca3af]">{new Date(swap.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-semibold text-[#0f172a]">{fmt(swap.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
