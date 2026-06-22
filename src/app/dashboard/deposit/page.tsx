"use client";

import { motion } from "framer-motion";
import { ArrowDownCircle, Clock, Wallet, Shield } from "lucide-react";

export default function DepositPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ArrowDownCircle size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Deposit Capital</h1>
      </div>
      <div className="card-light p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(26,138,110,0.1)" }}>
          <Wallet size={28} className="text-naxcal-teal" />
        </div>
        <h2 className="text-lg font-bold text-[#0f172a] mb-2">Crypto Deposits Coming Soon</h2>
        <p className="text-sm text-[#6b7280] max-w-md mx-auto mb-6">
          Our crypto deposit integration with NOWPayments is being finalized. You&apos;ll be able to deposit BTC, ETH, USDT, and USDC directly from your wallet.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          {[{ icon: Clock, text: "Instant Processing" }, { icon: Shield, text: "Secure & Encrypted" }, { icon: Wallet, text: "Multi-Asset Support" }].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#f8fafc] border border-[#e2e8f0]">
              <item.icon size={18} className="text-naxcal-teal" />
              <span className="text-[11px] text-[#6b7280]">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#9ca3af] mt-6">Contact support for manual deposit instructions in the meantime.</p>
      </div>
    </motion.div>
  );
}
