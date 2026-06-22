"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeftRight, ChevronDown, ArrowDown, Info, Clock, ChevronRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tokens = [
  { symbol: "BTC", name: "Bitcoin", price: 104250.80, color: "#f7931a" },
  { symbol: "ETH", name: "Ethereum", price: 3842.15, color: "#627eea" },
  { symbol: "USDT", name: "Tether", price: 1.00, color: "#26a17b" },
  { symbol: "BNB", name: "BNB", price: 612.40, color: "#f3ba2f" },
  { symbol: "SOL", name: "Solana", price: 178.25, color: "#9945ff" },
  { symbol: "XRP", name: "XRP", price: 0.6234, color: "#23292f" },
  { symbol: "ADA", name: "Cardano", price: 0.4512, color: "#0033ad" },
  { symbol: "DOGE", name: "Dogecoin", price: 0.1245, color: "#c2a633" },
];

export default function SwapPage() {
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("USDT");
  const [fromAmount, setFromAmount] = useState("");
  const [showFromList, setShowFromList] = useState(false);
  const [showToList, setShowToList] = useState(false);

  const fromTokenData = tokens.find((t) => t.symbol === fromToken)!;
  const toTokenData = tokens.find((t) => t.symbol === toToken)!;
  const rate = fromTokenData.price / toTokenData.price;
  const toAmount = fromAmount ? (parseFloat(fromAmount) * rate).toFixed(toTokenData.price < 1 ? 2 : 6) : "";

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  };

  const TokenSelector = ({ selected, onSelect, show, setShow, exclude }: {
    selected: string; onSelect: (s: string) => void; show: boolean; setShow: (b: boolean) => void; exclude: string;
  }) => {
    const token = tokens.find((t) => t.symbol === selected)!;
    return (
      <div className="relative">
        <button onClick={() => setShow(!show)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#f1f5f9] transition-colors cursor-pointer" style={{ border: "1px solid #e2e8f0" }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: token.color }}>{token.symbol.slice(0, 2)}</div>
          <span className="text-sm font-semibold text-[#0f172a]">{token.symbol}</span>
          <ChevronDown size={14} className="text-[#9ca3af]" />
        </button>
        {show && (
          <div className="absolute top-full mt-1 left-0 w-48 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            {tokens.filter((t) => t.symbol !== exclude).map((t) => (
              <button key={t.symbol} onClick={() => { onSelect(t.symbol); setShow(false); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-[#f8fafc] transition-colors cursor-pointer text-left">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: t.color }}>{t.symbol.slice(0, 2)}</div>
                <div>
                  <p className="text-sm font-medium text-[#0f172a]">{t.symbol}</p>
                  <p className="text-[10px] text-[#9ca3af]">{t.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Swap</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <ArrowLeftRight size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Swap Crypto</h1>
      </div>

      {/* Connect wallet notice */}
      <div className="flex items-center gap-3 p-3 rounded-xl mb-6" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <Wallet size={16} className="text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700">Connect your wallet to swap tokens. Swap integration coming in Phase 5.</p>
      </div>

      <div className="card-light p-6">
        {/* From */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9ca3af] uppercase tracking-wider font-medium">From</span>
            <span className="text-[10px] text-[#9ca3af]">Balance: 0.00</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <TokenSelector selected={fromToken} onSelect={setFromToken} show={showFromList} setShow={setShowFromList} exclude={toToken} />
            <input type="number" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} placeholder="0.00"
              className="flex-1 text-right text-lg font-bold text-[#0f172a] placeholder:text-[#cbd5e1] bg-transparent outline-none" />
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center -my-1 relative z-10">
          <button onClick={handleSwapTokens} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md hover:shadow-lg transition-all cursor-pointer" style={{ border: "2px solid #e2e8f0" }}>
            <ArrowDown size={18} className="text-naxcal-teal" />
          </button>
        </div>

        {/* To */}
        <div className="mt-2 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9ca3af] uppercase tracking-wider font-medium">To</span>
            <span className="text-[10px] text-[#9ca3af]">Balance: 0.00</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <TokenSelector selected={toToken} onSelect={setToToken} show={showToList} setShow={setShowToList} exclude={fromToken} />
            <input type="text" value={toAmount} readOnly placeholder="0.00"
              className="flex-1 text-right text-lg font-bold text-[#0f172a] placeholder:text-[#cbd5e1] bg-transparent outline-none" />
          </div>
        </div>

        {/* Rate */}
        {fromAmount && (
          <div className="flex items-center justify-between py-3 px-1 mb-4" style={{ borderTop: "1px solid #f1f5f9" }}>
            <span className="text-xs text-[#9ca3af]">Exchange Rate</span>
            <span className="text-xs font-medium text-[#374151]">1 {fromToken} = {rate.toLocaleString("en-US", { maximumFractionDigits: 4 })} {toToken}</span>
          </div>
        )}

        <button disabled className="w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2 opacity-60 btn-teal">
          <ArrowLeftRight size={16} /> Connect Wallet to Swap
        </button>

        <div className="flex items-center justify-center gap-1 mt-3">
          <Info size={10} className="text-[#9ca3af]" />
          <span className="text-[10px] text-[#9ca3af]">Powered by 1inch</span>
        </div>
      </div>

      {/* Recent Swaps */}
      <div className="card-light p-5 mt-4">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Recent Swaps</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock size={24} className="text-[#cbd5e1] mb-2" />
          <p className="text-sm text-[#9ca3af]">No swaps yet</p>
          <p className="text-xs text-[#cbd5e1] mt-1">Your swap history will appear here</p>
        </div>
      </div>
    </motion.div>
  );
}
