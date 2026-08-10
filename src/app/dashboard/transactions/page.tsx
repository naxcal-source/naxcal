"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/contexts/DashboardContext";
import { cn } from "@/lib/utils";
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Download,
  ChevronRight,
  ChevronLeft,
  Star,
  ArrowDownCircle,
  ArrowUpCircle,
  Link2,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  asset: string | null;
  status: string;
  description: string | null;
  created_at: string;
  balance_before: number | null;
  balance_after: number | null;
  tx_hash?: string | null;
  wallet_address?: string | null;
  source?: "internal" | "onchain";
  chain?: string | null;
  chain_id?: number | null;
  from_address?: string | null;
  to_address?: string | null;
};

const PAGE_SIZE = 10;

function shortAddress(value?: string | null) {
  if (!value) return "—";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function formatCryptoAmount(amount: number, asset?: string | null) {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: asset === "USDC" ? 2 : 8,
  })} ${asset || ""}`.trim();
}

export default function TransactionsPage() {
  const { profile } = useDashboard();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const params = new URLSearchParams({ limit: "200" });
    if (filter !== "all") params.set("type", filter);

    fetch(`/api/me/transactions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const filtered =
            statusFilter !== "all"
              ? data.filter((t: Transaction) => t.status === statusFilter)
              : data;
          setTxs(filtered as Transaction[]);
        }
      })
      .catch(() => {});
  }, [profile, filter, statusFilter]);

  const filtered = txs.filter((tx) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      tx.type.toLowerCase().includes(s) ||
      tx.description?.toLowerCase().includes(s) ||
      tx.asset?.toLowerCase().includes(s) ||
      tx.tx_hash?.toLowerCase().includes(s) ||
      tx.chain?.toLowerCase().includes(s) ||
      tx.from_address?.toLowerCase().includes(s) ||
      tx.to_address?.toLowerCase().includes(s)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const fmt = (n: number) =>
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const isOnchain = (tx: Transaction) => tx.source === "onchain" || tx.type.startsWith("onchain_");

  const isCredit = (tx: Transaction) =>
    isOnchain(tx)
      ? tx.type !== "onchain_send"
      : ["deposit", "profit", "bonus", "referral", "adjustment_credit", "crypto_sell"].includes(tx.type);

  const isNeutral = (tx: Transaction) => ["swap"].includes(tx.type);

  const typeIcon = (tx: Transaction) => {
    if (isOnchain(tx)) return <Link2 size={15} className="text-blue-600" />;
    if (tx.type === "profit") return <Star size={15} className="text-amber-500" />;
    if (tx.type === "deposit") return <ArrowDownCircle size={15} className="text-emerald-600" />;
    if (tx.type === "swap") return <ArrowDownCircle size={15} className="text-blue-600" />;
    if (tx.type === "crypto_sell") return <ArrowDownCircle size={15} className="text-emerald-600" />;
    if (tx.type === "withdrawal") return <ArrowUpCircle size={15} className="text-red-500" />;
    return isCredit(tx) ? (
      <ArrowUpRight size={15} className="text-emerald-600" />
    ) : (
      <ArrowDownRight size={15} className="text-red-500" />
    );
  };

  const exportCSV = () => {
    const headers = "Date,Source,Type,Description,Amount,Asset,Status,Chain,Tx Hash,From,To\n";
    const rows = filtered
      .map((tx) =>
        [
          new Date(tx.created_at).toLocaleString(),
          tx.source || "internal",
          tx.type,
          (tx.description || "").replace(/,/g, ""),
          tx.amount,
          tx.asset || "",
          tx.status,
          tx.chain || "",
          tx.tx_hash || "",
          tx.from_address || "",
          tx.to_address || "",
        ].join(","),
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "naxcal-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const migrationTx = txs.find(
    (tx) =>
      tx.source === "internal" &&
      (tx.tx_hash?.startsWith("onchain_verified_portfolio:") ||
        tx.description?.toLowerCase().includes("verified on-chain migration")),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">
          Dashboard
        </Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Transactions</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History size={22} className="text-naxcal-teal" />
          <h1 className="text-xl font-bold text-[#0f172a]">Transaction History</h1>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#6b7280] border border-[#e2e8f0] hover:bg-[#f8fafc] cursor-pointer transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {migrationTx && (
        <div className="card-light p-5 mb-5 border border-emerald-100 bg-emerald-50/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Wallet size={18} className="text-emerald-700" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[#0f172a]">
                    Verified On-Chain Migration Credit
                  </h2>
                  <p className="text-xs text-[#64748b] mt-1">
                    This is the verified accounting record for the migrated wallet portfolio.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
                  Completed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                <div className="bg-white rounded-lg p-3 border border-emerald-100">
                  <span className="text-[#94a3b8]">Verified Value</span>
                  <p className="text-[#0f172a] font-bold mt-1">{fmt(Number(migrationTx.amount || 0))}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-emerald-100">
                  <span className="text-[#94a3b8]">Source Wallet</span>
                  <p className="text-[#0f172a] font-medium mt-1">
                    {shortAddress(migrationTx.wallet_address)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-emerald-100">
                  <span className="text-[#94a3b8]">Migration Date</span>
                  <p className="text-[#0f172a] font-medium mt-1">
                    {new Date(migrationTx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-[#64748b] mt-3">
                Individual imported on-chain transfers are listed below with chain, asset, wallet and tx hash details.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search transactions, assets, chains or tx hash..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal"
            style={{ border: "1px solid #e2e8f0" }}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2.5 rounded-lg text-sm text-[#6b7280] cursor-pointer outline-none"
          style={{ border: "1px solid #e2e8f0" }}
        >
          <option value="all">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="profit">Profits</option>
          <option value="bonus">Bonuses</option>
          <option value="onchain">On-chain Activity</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2.5 rounded-lg text-sm text-[#6b7280] cursor-pointer outline-none"
          style={{ border: "1px solid #e2e8f0" }}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="card-light overflow-hidden">
        {paged.length === 0 ? (
          <div className="py-16 text-center text-[#9ca3af] text-sm">No transactions found</div>
        ) : (
          <div>
            <div className="hidden sm:grid grid-cols-[40px_1fr_120px_100px_130px] gap-2 px-5 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
              <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium"></span>
              <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium">
                Description
              </span>
              <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium text-right">
                Amount
              </span>
              <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium text-center">
                Status
              </span>
              <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-medium text-right">
                Date
              </span>
            </div>

            {paged.map((tx) => {
              const credit = isCredit(tx);
              const neutral = isNeutral(tx);
              const onchain = isOnchain(tx);
              return (
                <div key={tx.id}>
                  <div
                    onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
                    className="grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_120px_100px_130px] gap-2 items-center px-5 py-3.5 hover:bg-[#f8fafc] transition-colors cursor-pointer border-b border-[#f1f5f9]"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        onchain || neutral ? "bg-blue-50" : credit ? "bg-emerald-50" : "bg-red-50",
                      )}
                    >
                      {typeIcon(tx)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#0f172a] font-medium truncate">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-[10px] text-[#9ca3af] mt-0.5">
                        {onchain
                          ? `${tx.chain || "On-chain"} • ${shortAddress(tx.tx_hash)}`
                          : tx.asset || "Internal ledger"}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold text-right",
                        neutral ? "text-blue-600" : credit ? "text-[#16a34a]" : "text-red-500",
                      )}
                    >
                      {neutral ? "" : credit ? "+" : "-"}
                      {onchain ? formatCryptoAmount(Number(tx.amount || 0), tx.asset) : fmt(Number(tx.amount || 0))}
                    </p>
                    <div className="hidden sm:flex justify-center">
                      <span
                        className={cn(
                          "text-[10px] capitalize px-2 py-0.5 rounded-full font-medium",
                          tx.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : tx.status === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-600 border border-red-200",
                        )}
                      >
                        {tx.status}
                      </span>
                    </div>
                    <p className="hidden sm:block text-xs text-[#9ca3af] text-right">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>

                  {expanded === tx.id && (
                    <div className="px-5 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[#9ca3af]">Source</span>
                          <p className="text-[#374151] capitalize font-medium">
                            {tx.source || "internal"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#9ca3af]">Type</span>
                          <p className="text-[#374151] capitalize font-medium">
                            {tx.type.replaceAll("_", " ")}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#9ca3af]">Asset</span>
                          <p className="text-[#374151] font-medium">{tx.asset || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[#9ca3af]">Chain</span>
                          <p className="text-[#374151] font-medium">{tx.chain || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[#9ca3af]">From</span>
                          <p className="text-[#374151] font-medium">{shortAddress(tx.from_address)}</p>
                        </div>
                        <div>
                          <span className="text-[#9ca3af]">To</span>
                          <p className="text-[#374151] font-medium">{shortAddress(tx.to_address)}</p>
                        </div>
                        <div>
                          <span className="text-[#9ca3af]">Tx Hash</span>
                          <p className="text-[#374151] font-medium">{shortAddress(tx.tx_hash)}</p>
                        </div>
                        <div>
                          <span className="text-[#9ca3af]">Balance After</span>
                          <p className="text-[#374151] font-medium">
                            {tx.balance_after != null ? fmt(tx.balance_after) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#e2e8f0]">
            <span className="text-xs text-[#9ca3af]">{filtered.length} transactions</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-[#f1f5f9] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} className="text-[#6b7280]" />
              </button>
              <span className="text-xs text-[#6b7280] px-2">
                {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-[#f1f5f9] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} className="text-[#6b7280]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
