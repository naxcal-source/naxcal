"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { ArrowDownCircle, ChevronRight, AlertTriangle, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Transaction = { id: string; type: string; amount: number; status: string; created_at: string; asset: string | null };

const cryptos = [
  { symbol: "BTC", name: "Bitcoin", network: "Bitcoin", color: "#f7931a" },
  { symbol: "ETH", name: "Ethereum", network: "ERC-20", color: "#627eea" },
  { symbol: "USDT", name: "Tether", network: "TRC-20", color: "#26a17b" },
  { symbol: "USDT-ERC", name: "Tether", network: "ERC-20", color: "#26a17b" },
  { symbol: "BNB", name: "BNB", network: "BEP-20", color: "#f3ba2f" },
  { symbol: "SOL", name: "Solana", network: "Solana", color: "#9945ff" },
  { symbol: "XRP", name: "XRP", network: "XRP", color: "#23292f" },
  { symbol: "LTC", name: "Litecoin", network: "Litecoin", color: "#bfbbbb" },
  { symbol: "DOGE", name: "Dogecoin", network: "Dogecoin", color: "#c2a633" },
  { symbol: "ADA", name: "Cardano", network: "Cardano", color: "#0033ad" },
];

export default function DepositPage() {
  const { profile } = useDashboard();
  const [step, setStep] = useState(1);
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [amount, setAmount] = useState("");
  const [generating, setGenerating] = useState(false);
  const [recentDeposits, setRecentDeposits] = useState<Transaction[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!profile) return;
    supabase.from("transactions").select("*").eq("user_id", profile.id).eq("type", "deposit").order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setRecentDeposits(data); });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = cryptos.find((c) => c.symbol === selectedCrypto);
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Deposit</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <ArrowDownCircle size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Deposit Capital</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              step >= s ? "bg-naxcal-teal text-white" : "bg-[#e2e8f0] text-[#9ca3af]"
            )}>{s}</div>
            {s < 3 && <div className={cn("w-12 h-0.5 rounded-full transition-all", step > s ? "bg-naxcal-teal" : "bg-[#e2e8f0]")} />}
          </div>
        ))}
      </div>

      <div className="card-light p-6">
        {/* Step 1: Select Crypto */}
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold text-[#0f172a] mb-4">Select Cryptocurrency</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {cryptos.map((crypto) => (
                <button key={crypto.symbol} onClick={() => { setSelectedCrypto(crypto.symbol); setStep(2); }}
                  className={cn("flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all hover:shadow-md",
                    selectedCrypto === crypto.symbol ? "shadow-md" : ""
                  )}
                  style={{
                    border: selectedCrypto === crypto.symbol ? "2px solid #1a8a6e" : "1px solid #e2e8f0",
                    boxShadow: selectedCrypto === crypto.symbol ? "0 0 12px rgba(26,138,110,0.2)" : undefined,
                  }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: crypto.color }}>
                    {crypto.symbol.slice(0, 2)}
                  </div>
                  <p className="text-xs font-semibold text-[#0f172a]">{crypto.name}</p>
                  <span className="text-[9px] text-[#9ca3af] px-1.5 py-0.5 rounded bg-[#f1f5f9]">{crypto.network}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Enter Amount */}
        {step === 2 && selected && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#0f172a]">Enter Deposit Amount</h2>
              <button onClick={() => setStep(1)} className="text-xs text-naxcal-teal hover:underline cursor-pointer">Change crypto</button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: selected.color }}>
                {selected.symbol.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">{selected.name}</p>
                <p className="text-[10px] text-[#9ca3af]">{selected.network} Network</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Amount (USD)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Minimum $50"
                className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:border-naxcal-teal"
                style={{ border: "1px solid #e2e8f0" }} />
              {amount && parseFloat(amount) < 50 && (
                <p className="text-xs text-red-500 mt-1">Minimum deposit is $50</p>
              )}
            </div>

            <button onClick={() => { if (parseFloat(amount) >= 50) setStep(3); }}
              disabled={!amount || parseFloat(amount) < 50}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm cursor-pointer btn-teal disabled:opacity-50 disabled:cursor-not-allowed">
              Continue
            </button>
          </>
        )}

        {/* Step 3: Generate Address */}
        {step === 3 && selected && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#0f172a]">Deposit Address</h2>
              <button onClick={() => setStep(1)} className="text-xs text-naxcal-teal hover:underline cursor-pointer">Start over</button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: selected.color }}>
                {selected.symbol.slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0f172a]">{selected.name} ({selected.network})</p>
                <p className="text-xs text-[#9ca3af]">Amount: {fmt(parseFloat(amount))}</p>
              </div>
            </div>

            {!generating ? (
              <button onClick={handleGenerate} className="w-full py-3 rounded-lg text-white font-semibold text-sm cursor-pointer btn-teal flex items-center justify-center gap-2">
                Generate Deposit Address
              </button>
            ) : (
              <div className="text-center py-8">
                <Loader2 size={28} className="text-naxcal-teal animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-[#374151]">Generating deposit address...</p>
                <p className="text-xs text-[#9ca3af] mt-1">Your deposit address will appear here once NOWPayments integration is live.</p>
              </div>
            )}

            {/* Important notices */}
            <div className="mt-6 space-y-2">
              {[
                `Only send ${selected.name} (${selected.network}) to this address`,
                "Minimum deposit: $50",
                "Funds credited within 1-3 network confirmations",
                "Balance updates within 30 minutes",
              ].map((notice, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#6b7280]">
                  <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                  <span>{notice}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Recent Deposits */}
      <div className="card-light p-5 mt-4">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Recent Deposits</h3>
        {recentDeposits.length === 0 ? (
          <p className="text-sm text-[#9ca3af] text-center py-4">No deposits yet</p>
        ) : (
          <div className="space-y-2">
            {recentDeposits.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <ArrowDownCircle size={14} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-[#374151] font-medium">{tx.asset || "Crypto"} Deposit</p>
                    <p className="text-[10px] text-[#9ca3af]">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">+{fmt(tx.amount)}</p>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    tx.status === "completed" ? "bg-emerald-50 text-emerald-700" : tx.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                  )}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
