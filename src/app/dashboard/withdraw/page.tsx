"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { ArrowUpCircle, Loader2, AlertTriangle } from "lucide-react";

export default function WithdrawPage() {
  const { profile } = useDashboard();
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [asset, setAsset] = useState("USDT");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const balance = Number(profile?.balance ?? 0);
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setError("Enter a valid amount."); return; }
    if (numAmount > balance) { setError("Insufficient balance."); return; }
    if (!wallet) { setError("Enter a wallet address."); return; }
    if (profile?.kyc_status !== "approved") { setError("Complete KYC verification before withdrawing."); return; }

    setLoading(true);
    const { error: txError } = await supabase.from("transactions").insert({ user_id: profile!.id, type: "withdrawal", amount: numAmount, asset, status: "pending", wallet_address: wallet, description: `Withdrawal to ${asset} wallet`, balance_before: balance, balance_after: balance - numAmount });
    setLoading(false);
    if (txError) { setError(txError.message); return; }
    setSuccess(true);
  };

  const inputStyle = { background: "#ffffff", border: "1px solid #e2e8f0" };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ArrowUpCircle size={22} className="text-amber-600" />
        <h1 className="text-xl font-bold text-[#0f172a]">Withdraw Funds</h1>
      </div>
      {profile?.kyc_status !== "approved" && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-6" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-[#374151]">You must complete identity verification before making withdrawals.</p>
        </div>
      )}
      <div className="card-light p-6">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(26,138,110,0.1)" }}>
              <ArrowUpCircle size={28} className="text-naxcal-teal" />
            </div>
            <h2 className="text-lg font-bold text-[#0f172a] mb-2">Withdrawal Requested</h2>
            <p className="text-sm text-[#6b7280]">Your withdrawal of {fmt(parseFloat(amount))} is being processed.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
              <span className="text-xs text-[#6b7280]">Available Balance</span>
              <span className="text-sm font-bold text-[#0f172a]">{fmt(balance)}</span>
            </div>
            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Asset</label>
              <select value={asset} onChange={(e) => setAsset(e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-naxcal-teal cursor-pointer" style={inputStyle}>
                <option value="USDT">USDT (TRC-20)</option><option value="BTC">BTC</option><option value="ETH">ETH</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Amount ($)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:border-naxcal-teal" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Wallet Address</label>
              <input type="text" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Enter your wallet address" className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:border-naxcal-teal font-mono" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-lg text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 btn-teal disabled:opacity-50">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : "Request Withdrawal"}
            </button>
            <p className="text-[10px] text-[#9ca3af] text-center">Withdrawals are typically processed within 24 hours.</p>
          </form>
        )}
      </div>
    </motion.div>
  );
}
