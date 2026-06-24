"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { ArrowUpCircle, Loader2, AlertTriangle, ChevronRight, Lock, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Transaction = { id: string; type: string; amount: number; status: string; created_at: string; asset: string | null; wallet_address: string | null };

const cryptoOptions = [
  { symbol: "USDT", name: "Tether (TRC-20)", color: "#26a17b" },
  { symbol: "BTC", name: "Bitcoin", color: "#f7931a" },
  { symbol: "ETH", name: "Ethereum", color: "#627eea" },
  { symbol: "BNB", name: "BNB (BEP-20)", color: "#f3ba2f" },
  { symbol: "SOL", name: "Solana", color: "#9945ff" },
];

export default function WithdrawPage() {
  const { profile, refreshProfile } = useDashboard();
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [asset, setAsset] = useState("USDT");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [recentWithdrawals, setRecentWithdrawals] = useState<Transaction[]>([]);
  const supabase = createClient();

  const balance = Number(profile?.balance ?? 0);
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    if (!profile) return;
    supabase.from("transactions").select("*").eq("user_id", profile.id).eq("type", "withdrawal").order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setRecentWithdrawals(data); });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { setError("Enter a valid amount."); return; }
    if (numAmount < 100) { setError("Minimum withdrawal is $100."); return; }
    if (numAmount > balance) { setError("Insufficient balance."); return; }
    if (!wallet) { setError("Enter a wallet address."); return; }
    if (pin.length !== 6) { setError("Enter your 6-digit withdrawal PIN."); return; }
    if (profile?.kyc_status !== "approved") { setError("Complete KYC verification before withdrawing."); return; }

    // Verify PIN
    const storedPin = (profile as Record<string, unknown>)?.withdrawal_pin as string | null;
    if (!storedPin) { setError("You haven't set a withdrawal PIN yet. Go to Settings → Security to set one."); return; }
    if (storedPin !== pin) { setError("Incorrect withdrawal PIN."); return; }

    setLoading(true);
    const newBalance = balance - numAmount;
    const { error: balErr } = await supabase.from("profiles").update({ balance: newBalance }).eq("id", profile!.id);
    if (balErr) { setError("Failed to process withdrawal."); setLoading(false); return; }
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: profile!.id, type: "withdrawal", amount: numAmount, asset, status: "pending",
      wallet_address: wallet, description: `Withdrawal to ${asset} wallet`,
      balance_before: balance, balance_after: newBalance,
    });
    setLoading(false);
    if (txError) { setError(txError.message); return; }
    await refreshProfile();
    // Send withdrawal confirmation email
    fetch("/api/admin/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "withdrawal_approved", email: profile!.email, name: profile!.full_name || "Investor", amount: numAmount }),
    }).catch(() => {});
    setSuccess(true);
  };

  const kycBlocked = profile?.kyc_status !== "approved";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Withdraw</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <ArrowUpCircle size={22} className="text-amber-600" />
        <h1 className="text-xl font-bold text-[#0f172a]">Withdraw Funds</h1>
      </div>

      {/* KYC Block */}
      {kycBlocked && (
        <div className="card-light p-6 text-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(240,165,0,0.1)" }}>
            <Lock size={28} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-[#0f172a] mb-2">KYC Required</h2>
          <p className="text-sm text-[#6b7280] mb-4">Complete identity verification before withdrawing funds.</p>
          <Link href="/dashboard/kyc" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal">
            Complete KYC
          </Link>
        </div>
      )}

      <div className={cn("card-light p-6", kycBlocked && "opacity-50 pointer-events-none")}>
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(26,138,110,0.1)" }}>
              <ArrowUpCircle size={28} className="text-naxcal-teal" />
            </div>
            <h2 className="text-lg font-bold text-[#0f172a] mb-2">Withdrawal Requested</h2>
            <p className="text-sm text-[#6b7280]">Your withdrawal of {fmt(parseFloat(amount))} is being processed.</p>
            <p className="text-xs text-[#9ca3af] mt-2">Withdrawals are typically processed within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Available balance */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(26,138,110,0.06), rgba(26,138,110,0.02))", border: "1px solid rgba(26,138,110,0.15)" }}>
              <span className="text-xs text-[#6b7280] font-medium">Available Balance</span>
              <span className="text-lg font-bold text-[#0f172a]">{fmt(balance)}</span>
            </div>

            {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

            {/* Crypto selector */}
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Receive As</label>
              <div className="grid grid-cols-5 gap-2">
                {cryptoOptions.map((c) => (
                  <button key={c.symbol} type="button" onClick={() => setAsset(c.symbol)}
                    className={cn("flex flex-col items-center gap-1.5 p-2.5 rounded-xl cursor-pointer transition-all text-center")}
                    style={{
                      border: asset === c.symbol ? "2px solid #1a8a6e" : "1px solid #e2e8f0",
                      boxShadow: asset === c.symbol ? "0 0 8px rgba(26,138,110,0.15)" : undefined,
                    }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: c.color }}>
                      {c.symbol.slice(0, 2)}
                    </div>
                    <span className="text-[10px] font-semibold text-[#374151]">{c.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Amount ($)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Minimum $100"
                className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:border-naxcal-teal"
                style={{ border: "1px solid #e2e8f0" }} />
              {amount && parseFloat(amount) < 100 && (
                <p className="text-xs text-red-500 mt-1">Minimum withdrawal is $100</p>
              )}
            </div>

            {/* Wallet */}
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Wallet Address</label>
              <input type="text" value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Enter your wallet address"
                className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:border-naxcal-teal font-mono"
                style={{ border: "1px solid #e2e8f0" }} />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Withdrawal PIN</label>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit PIN" maxLength={6}
                className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:border-naxcal-teal tracking-[0.5em] text-center"
                style={{ border: "1px solid #e2e8f0" }} />
              <p className="text-[10px] text-[#9ca3af] mt-1">
                Don&apos;t have a PIN? <Link href="/dashboard/settings" className="text-naxcal-teal hover:underline">Set one in Settings → Security</Link>
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-lg text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 btn-teal disabled:opacity-50">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : "Request Withdrawal"}
            </button>

            <div className="flex items-center gap-2 justify-center text-[10px] text-[#9ca3af]">
              <Clock size={10} />
              <span>Withdrawals processed within 24 hours — Minimum: $100</span>
            </div>
          </form>
        )}
      </div>

      {/* Recent Withdrawals */}
      <div className="card-light p-5 mt-4">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Recent Withdrawals</h3>
        {recentWithdrawals.length === 0 ? (
          <p className="text-sm text-[#9ca3af] text-center py-4">No withdrawals yet</p>
        ) : (
          <div className="space-y-2">
            {recentWithdrawals.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <ArrowUpCircle size={14} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-[#374151] font-medium">{tx.asset || "Crypto"} Withdrawal</p>
                    <p className="text-[10px] text-[#9ca3af]">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-500">-{fmt(tx.amount)}</p>
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
