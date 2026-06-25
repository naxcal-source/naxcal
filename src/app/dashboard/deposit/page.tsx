"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { ArrowDownCircle, ChevronRight, AlertTriangle, Loader2, Copy, Check, CheckCircle2, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

type Transaction = { id: string; type: string; amount: number; status: string; created_at: string; asset: string | null };

const cryptos = [
  { symbol: "btc", label: "BTC", name: "Bitcoin", network: "Bitcoin", color: "#f7931a" },
  { symbol: "eth", label: "ETH", name: "Ethereum", network: "ERC-20", color: "#627eea" },
  { symbol: "usdttrc20", label: "USDT", name: "Tether", network: "TRC-20", color: "#26a17b" },
  { symbol: "usdterc20", label: "USDT", name: "Tether", network: "ERC-20", color: "#26a17b" },
  { symbol: "bnbbsc", label: "BNB", name: "BNB", network: "BEP-20", color: "#f3ba2f" },
  { symbol: "sol", label: "SOL", name: "Solana", network: "Solana", color: "#9945ff" },
  { symbol: "xrp", label: "XRP", name: "XRP", network: "XRP", color: "#23292f" },
  { symbol: "ltc", label: "LTC", name: "Litecoin", network: "Litecoin", color: "#bfbbbb" },
  { symbol: "doge", label: "DOGE", name: "Dogecoin", network: "Dogecoin", color: "#c2a633" },
  { symbol: "ada", label: "ADA", name: "Cardano", network: "Cardano", color: "#0033ad" },
  { symbol: "matic", label: "MATIC", name: "Polygon", network: "Polygon", color: "#8247e5" },
  { symbol: "avax", label: "AVAX", name: "Avalanche", network: "C-Chain", color: "#e84142" },
];

export default function DepositPage() {
  const { profile } = useDashboard();
  const [step, setStep] = useState(1);
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentData, setPaymentData] = useState<{
    payment_id: string; pay_address: string; pay_amount: number; pay_currency: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("waiting");
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(3600);
  const [recentDeposits, setRecentDeposits] = useState<Transaction[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!profile) return;
    fetch("/api/me/transactions?type=deposit&limit=5").then(r => r.json()).then(data => { if (Array.isArray(data)) setRecentDeposits(data); }).catch(() => {});
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const selected = cryptos.find((c) => c.symbol === selectedCrypto);
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleGenerate = async () => {
    if (!profile || !selected) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments/create-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id, amount: parseFloat(amount), currency: selected.symbol }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to generate address"); setLoading(false); return; }

      setPaymentData(data);
      setStep(3);
      setPaymentStatus("waiting");
      setCountdown(3600);

      timerRef.current = setInterval(() => {
        setCountdown((p) => { if (p <= 0) { if (timerRef.current) clearInterval(timerRef.current); return 0; } return p - 1; });
      }, 1000);

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/payments/status/${data.payment_id}`);
          const statusData = await statusRes.json();
          if (statusData.payment_status === "confirmed" || statusData.payment_status === "finished") {
            setPaymentStatus("confirmed");
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
          } else if (statusData.payment_status === "partially_paid") {
            setPaymentStatus("partial");
          }
        } catch {}
      }, 30000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = useCallback(() => {
    if (paymentData?.pay_address) {
      navigator.clipboard.writeText(paymentData.pay_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [paymentData]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

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
            )}>{step > s ? <Check size={14} /> : s}</div>
            {s < 3 && <div className={cn("w-12 h-0.5 rounded-full transition-all", step > s ? "bg-naxcal-teal" : "bg-[#e2e8f0]")} />}
          </div>
        ))}
      </div>

      <div className="card-light p-6">
        {/* Step 1: Select Crypto */}
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold text-[#0f172a] mb-4">Select Cryptocurrency</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {cryptos.map((crypto) => (
                <button key={crypto.symbol} onClick={() => { setSelectedCrypto(crypto.symbol); setStep(2); }}
                  className={cn("flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all hover:shadow-md")}
                  style={{
                    border: selectedCrypto === crypto.symbol ? "2px solid #1a8a6e" : "1px solid #e2e8f0",
                    boxShadow: selectedCrypto === crypto.symbol ? "0 0 12px rgba(26,138,110,0.2)" : undefined,
                  }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: crypto.color }}>
                    {crypto.label.slice(0, 2)}
                  </div>
                  <p className="text-[11px] font-semibold text-[#0f172a]">{crypto.label}</p>
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
              <button onClick={() => { setStep(1); setError(""); }} className="text-xs text-naxcal-teal hover:underline cursor-pointer">Change crypto</button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: selected.color }}>
                {selected.label.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">{selected.name}</p>
                <p className="text-[10px] text-[#9ca3af]">{selected.network} Network</p>
              </div>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm mb-4">{error}</div>}

            <div className="mb-4">
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Amount (USD)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Minimum $50"
                className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] outline-none focus:border-naxcal-teal"
                style={{ border: "1px solid #e2e8f0" }} />
              {amount && parseFloat(amount) < 50 && (
                <p className="text-xs text-red-500 mt-1">Minimum deposit is $50</p>
              )}
            </div>

            <button onClick={() => { if (parseFloat(amount) >= 50) { setError(""); handleGenerate(); } }}
              disabled={!amount || parseFloat(amount) < 50 || loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm cursor-pointer btn-teal disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Generating Address...</> : "Generate Deposit Address"}
            </button>
          </>
        )}

        {/* Step 3: Payment Screen */}
        {step === 3 && paymentData && selected && (
          <>
            {paymentStatus === "confirmed" ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(22,163,74,0.1)" }}>
                  <CheckCircle2 size={40} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-[#0f172a] mb-2">Deposit Confirmed!</h2>
                <p className="text-sm text-[#6b7280] mb-1">{fmt(parseFloat(amount))} has been added to your account.</p>
                <p className="text-xs text-[#9ca3af] mb-6">Your balance will update shortly.</p>
                <Link href="/dashboard" className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal">
                  Back to Dashboard
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#0f172a]">Send Payment</h2>
                  <button onClick={() => { setStep(1); setPaymentData(null); if (pollRef.current) clearInterval(pollRef.current); if (timerRef.current) clearInterval(timerRef.current); }}
                    className="text-xs text-naxcal-teal hover:underline cursor-pointer">Start Over</button>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-live" />
                    <span className="text-xs font-medium text-emerald-700">
                      {paymentStatus === "partial" ? "Partial payment detected..." : "Waiting for payment..."}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#6b7280]">{formatTime(countdown)}</span>
                </div>

                {/* QR + Address */}
                <div className="flex flex-col items-center mb-4">
                  <div className="p-4 rounded-2xl bg-white mb-4" style={{ border: "2px solid #e2e8f0" }}>
                    <QRCodeSVG value={paymentData.pay_address} size={180} bgColor="#ffffff" fgColor="#0f172a" level="M" />
                  </div>

                  <div className="w-full">
                    <label className="block text-[10px] text-[#9ca3af] uppercase tracking-wider mb-1">Send exactly</label>
                    <div className="p-3 rounded-xl text-center mb-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <span className="text-lg font-bold text-[#0f172a]">{paymentData.pay_amount} {paymentData.pay_currency.toUpperCase()}</span>
                      <p className="text-[10px] text-[#9ca3af]">≈ {fmt(parseFloat(amount))}</p>
                    </div>

                    <label className="block text-[10px] text-[#9ca3af] uppercase tracking-wider mb-1">To this address</label>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <span className="flex-1 text-xs font-mono text-[#374151] break-all">{paymentData.pay_address}</span>
                      <button onClick={copyAddress} className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#e2e8f0] transition-colors cursor-pointer">
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-[#9ca3af]" />}
                      </button>
                    </div>

                    <p className="text-[10px] text-[#9ca3af] mt-1">Payment ID: {paymentData.payment_id}</p>
                  </div>
                </div>

                {/* Warnings */}
                <div className="space-y-2 mt-4 p-3 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                  {[
                    `Only send ${selected.name} (${selected.network}) to this address`,
                    "Minimum deposit: $50",
                    "Funds credited within 1-3 network confirmations",
                    "Balance updates within 30 minutes",
                  ].map((notice, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                      <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{notice}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
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
