"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { History, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";
import { motion } from "framer-motion";

type Transaction = { id: string; type: string; amount: number; asset: string; status: string; description: string | null; created_at: string; };

export default function TransactionsPage() {
  const { profile } = useDashboard();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (!profile) return;
    let q = supabase.from("transactions").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("type", filter);
    q.then(({ data }) => { if (data) setTxs(data); });
  }, [profile, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = txs.filter((tx) => !search || tx.type.includes(search.toLowerCase()) || tx.description?.toLowerCase().includes(search.toLowerCase()));
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isCredit = (type: string) => ["deposit", "profit", "bonus", "referral"].includes(type);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <History size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Transaction History</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..." className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-all" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }} />
        </div>
        <div className="flex gap-1">
          {["all", "deposit", "withdrawal", "profit", "bonus"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("px-3 py-2 rounded-lg text-xs font-medium cursor-pointer capitalize transition-all",
              filter === f ? "bg-naxcal-teal text-white" : "text-[#6b7280] hover:bg-[#f1f5f9] border border-transparent hover:border-[#e2e8f0]"
            )}>{f}</button>
          ))}
        </div>
      </div>

      <div className="card-light overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#9ca3af] text-sm">No transactions found</div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {filtered.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#f8fafc] transition-colors">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", isCredit(tx.type) ? "bg-emerald-50" : "bg-red-50")}>
                  {isCredit(tx.type) ? <ArrowUpRight size={16} className="text-emerald-600" /> : <ArrowDownRight size={16} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#0f172a] capitalize font-medium">{tx.description || tx.type}</p>
                  <p className="text-[11px] text-[#9ca3af]">{tx.asset} &bull; {new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-semibold", isCredit(tx.type) ? "text-[#16a34a]" : "text-red-500")}>
                    {isCredit(tx.type) ? "+" : "-"}{fmt(Number(tx.amount))}
                  </p>
                  <span className={cn("text-[10px] capitalize px-1.5 py-0.5 rounded font-medium",
                    tx.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                    tx.status === "pending" ? "bg-amber-50 text-amber-700" :
                    tx.status === "failed" ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
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
