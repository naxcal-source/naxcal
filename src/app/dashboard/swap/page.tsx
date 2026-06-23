"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeftRight, ChevronRight } from "lucide-react";

export default function SwapPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Swap</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <ArrowLeftRight size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Swap Crypto</h1>
      </div>
      <p className="text-sm text-[#6b7280] mb-6">Swap any token at the best rates across all DEXs</p>

      <div className="card-light overflow-hidden" style={{ borderRadius: 16 }}>
        <iframe
          src="https://app.1inch.io/#/1/unified/swap/ETH/USDT"
          width="100%"
          height="600"
          style={{ border: "none", display: "block" }}
          title="1inch Swap"
          allow="clipboard-write"
        />
      </div>

      <p className="text-center text-[10px] text-[#9ca3af] mt-4">
        Powered by 1inch · Best rates across 300+ DEXs
      </p>
    </motion.div>
  );
}
