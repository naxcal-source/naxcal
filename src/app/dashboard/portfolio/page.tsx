"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { PieChart, Briefcase, ChevronRight, ArrowUpRight, ArrowDownRight, TrendingUp, ArrowLeftRight, Wallet } from "lucide-react";
import StockLogo from "@/components/StockLogo";
import { cn } from "@/lib/utils";

type StockPos = { symbol: string; name: string; qty: number; avg_entry: number; current_price: number; market_value: number; unrealized_pl: number; unrealized_plpc: number };
type CryptoPos = { symbol: string; qty: number; avg_price: number; current_price: number; market_value: number; unrealized_pl: number };

type OnchainWalletRow = {
  source: "native" | "trusted_stablecoin";
  chain: string;
  chainId: number;
  asset: string;
  balance: number;
  priceUsd: number | null;
  valueUsd: number;
  verification: string;
};

type OnchainWalletPortfolio = {
  wallet: {
    id: string;
    address: string;
    ownershipStatus: string;
  } | null;
  rows: OnchainWalletRow[];
  totalUsd: number;
  pricedAt: string;
  note: string;
};

export default function PortfolioPage() {
  const { profile, fmt } = useDashboard();
  const [stocks, setStocks] = useState<StockPos[]>([]);
  const [cryptos, setCryptos] = useState<CryptoPos[]>([]);
  const [onchainWallet, setOnchainWallet] = useState<OnchainWalletPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellingSymbol, setSellingSymbol] = useState<string | null>(null);
  const [sellAmount, setSellAmount] = useState("");
  const [sellError, setSellError] = useState("");
  const [sellSuccess, setSellSuccess] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/stocks/portfolio").then((r) => r.json()).catch(() => []),
      fetch("/api/crypto/portfolio").then((r) => r.json()).catch(() => []),
      fetch("/api/me/wallet-portfolio").then((r) => r.json()).catch(() => null),
    ]).then(([s, c, walletPortfolio]) => {
      if (Array.isArray(s)) setStocks(s);
      if (Array.isArray(c)) setCryptos(c);
      if (walletPortfolio && Array.isArray(walletPortfolio.rows)) {
        setOnchainWallet(walletPortfolio);
      }
      setLoading(false);
    });
  }, []);

  const cashBalance = Number(profile?.balance ?? 0);
  const stocksValue = stocks.reduce((s, p) => s + p.market_value, 0);
  const cryptoValue = cryptos.reduce((s, p) => s + p.market_value, 0);
  const totalValue = stocksValue + cryptoValue;
  const stocksPL = stocks.reduce((s, p) => s + p.unrealized_pl, 0);
  const cryptoPL = cryptos.reduce((s, p) => s + p.unrealized_pl, 0);
  const totalPL = stocksPL + cryptoPL;

  const allocation = [
    { label: "Cash Ledger", value: 0, color: "#1a8a6e", pct: 0 },
    { label: "Stocks", value: stocksValue, color: "#3b82f6", pct: totalValue > 0 ? (stocksValue / totalValue * 100) : 0 },
    { label: "Crypto", value: cryptoValue, color: "#8b5cf6", pct: totalValue > 0 ? (cryptoValue / totalValue * 100) : 0 },
  ].filter((a) => a.value > 0);

  const sellCrypto = async () => {
    if (!sellingSymbol) return;

    setSellError("");
    setSellSuccess("");

    const amount = Number(sellAmount);

    if (!amount || amount <= 0) {
      setSellError("Enter a valid amount to sell.");
      return;
    }

    try {
      const response = await fetch("/api/crypto/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sellingSymbol, amount }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSellError(result.error || "Sell failed.");
        return;
      }

      setSellSuccess(
        `Sold ${result.sold_amount} ${result.symbol} for ${fmt(result.net_usd)} USD balance.`,
      );
      setSellingSymbol(null);
      setSellAmount("");

      const [cryptoRes, meRes] = await Promise.all([
        fetch("/api/crypto/portfolio"),
        fetch("/api/me"),
      ]);

      const cryptoData = await cryptoRes.json();
      const meData = await meRes.json();

      if (Array.isArray(cryptoData)) setCryptos(cryptoData);
      if (meData?.profile) {
        window.location.reload();
      }
    } catch {
      setSellError("Sell failed. Please try again.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Portfolio</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Briefcase size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Portfolio</h1>
      </div>

      {/* Total Value */}
      <div className="card-light p-6 mb-4">
        <p className="text-xs text-[#9ca3af] uppercase tracking-wider mb-1">Total Portfolio Value</p>
        <p className="text-3xl font-bold text-[#0f172a] mb-1">{fmt(totalValue)}</p>
        {totalPL !== 0 && (
          <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", totalPL >= 0 ? "text-emerald-600" : "text-red-500")}>
            {totalPL >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {totalPL >= 0 ? "+" : ""}{fmt(totalPL)} unrealized
          </span>
        )}
      </div>

      {/* Allocation */}
      <div className="card-light p-5 mb-4">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Allocation</h3>
        <div className="h-3 rounded-full overflow-hidden flex mb-4" style={{ background: "#e2e8f0" }}>
          {allocation.map((a) => (
            <div key={a.label} style={{ width: `${a.pct}%`, background: a.color }} className="h-full transition-all" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {allocation.map((a) => (
            <div key={a.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: a.color }} />
              <div>
                <p className="text-xs text-[#374151] font-medium">{a.label}</p>
                <p className="text-sm font-bold text-[#0f172a]">{fmt(a.value)}</p>
                <p className="text-[10px] text-[#9ca3af]">{a.pct.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cash */}
      <div className="card-light p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,138,110,0.1)" }}>
              <Wallet size={20} className="text-naxcal-teal" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Cash Balance</h3>
              <p className="text-xs text-[#9ca3af]">Available to invest or withdraw</p>
            </div>
          </div>
          <p className="text-lg font-bold text-[#0f172a]">{fmt(cashBalance)}</p>
        </div>
      </div>

      {/* Migrated On-Chain Wallet Breakdown */}
      {onchainWallet?.rows?.length ? (
        <div className="card-light p-5 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Migrated On-Chain Wallet Breakdown</h3>
              <p className="text-xs text-[#9ca3af] mt-1">
                Verified wallet assets supporting the approved internal balance. Spam and reward tokens are excluded.
              </p>
              {onchainWallet.wallet?.address && (
                <p className="text-[10px] text-[#9ca3af] mt-2 break-all">
                  Wallet: {onchainWallet.wallet.address}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-[#9ca3af]">Verified value</p>
              <p className="text-lg font-bold text-[#0f172a]">{fmt(onchainWallet.totalUsd)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#9ca3af] border-b border-[#e5e7eb]">
                  <th className="py-2">Asset</th>
                  <th className="py-2">Chain</th>
                  <th className="py-2 text-right">Balance</th>
                  <th className="py-2 text-right">USD Price</th>
                  <th className="py-2 text-right">USD Value</th>
                </tr>
              </thead>
              <tbody>
                {onchainWallet.rows.map((row, index) => (
                  <tr key={`${row.chainId}-${row.asset}-${index}`} className="border-b border-[#f1f5f9] last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-naxcal-teal/10 flex items-center justify-center text-[9px] font-bold text-naxcal-teal">
                          {row.asset.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0f172a]">{row.asset}</p>
                          <p className="text-[10px] text-[#9ca3af]">
                            {row.source === "native" ? "Native coin" : "Trusted stablecoin"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-[#374151]">{row.chain}</td>
                    <td className="py-3 text-sm text-[#0f172a] text-right">{row.balance.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                    <td className="py-3 text-sm text-[#374151] text-right">{row.priceUsd ? fmt(row.priceUsd) : "—"}</td>
                    <td className="py-3 text-sm font-semibold text-[#0f172a] text-right">{fmt(row.valueUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-[#9ca3af] mt-3">
            {onchainWallet.note}
          </p>
        </div>
      ) : null}

      {/* Stock Holdings */}
      {stocks.length > 0 && (
        <div className="card-light p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">Stock Holdings</h3>
            <Link href="/dashboard/invest" className="text-xs text-naxcal-teal hover:underline font-medium flex items-center gap-1"><TrendingUp size={12} /> Trade</Link>
          </div>
          <div className="space-y-2">
            {stocks.map((pos) => (
              <div key={pos.symbol} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-center gap-3">
                  <StockLogo symbol={pos.symbol} size={32} />
                  <div>
                    <p className="text-sm font-medium text-[#0f172a]">{pos.symbol}</p>
                    <p className="text-[10px] text-[#9ca3af]">{pos.qty.toFixed(4)} shares</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#0f172a]">{fmt(pos.market_value)}</p>
                  <span className={cn("text-[10px] font-semibold", pos.unrealized_pl >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {pos.unrealized_pl >= 0 ? "+" : ""}{fmt(pos.unrealized_pl)} ({pos.unrealized_plpc.toFixed(2)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sellError && (
        <div className="card-light p-4 mb-4 border border-red-100 bg-red-50 text-sm text-red-600">
          {sellError}
        </div>
      )}

      {sellSuccess && (
        <div className="card-light p-4 mb-4 border border-emerald-100 bg-emerald-50 text-sm text-emerald-700">
          {sellSuccess}
        </div>
      )}

      {/* Crypto Holdings */}
      {cryptos.length > 0 && (
        <div className="card-light p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#0f172a]">Crypto Holdings</h3>
            <Link href="/dashboard/swap" className="text-xs text-naxcal-teal hover:underline font-medium flex items-center gap-1"><ArrowLeftRight size={12} /> Swap</Link>
          </div>
          <div className="space-y-2">
            {cryptos.map((pos) => (
              <div key={pos.symbol} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[9px] font-bold text-purple-600">{pos.symbol.slice(0, 2)}</div>
                  <div>
                    <p className="text-sm font-medium text-[#0f172a]">{pos.symbol}</p>
                    <p className="text-[10px] text-[#9ca3af]">{pos.qty.toFixed(6)} tokens</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#0f172a]">{fmt(pos.market_value)}</p>
                  <span className={cn("text-[10px] font-semibold", pos.unrealized_pl >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {pos.unrealized_pl >= 0 ? "+" : ""}{fmt(pos.unrealized_pl)}
                  </span>
                  <button
                    onClick={() => {
                      setSellingSymbol(pos.symbol);
                      setSellAmount("");
                      setSellError("");
                      setSellSuccess("");
                    }}
                    className="block ml-auto mt-1 text-[10px] font-semibold text-naxcal-teal hover:underline"
                  >
                    Sell to USD
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sellingSymbol && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-bold text-[#0f172a] mb-1">
              Sell {sellingSymbol} to USD Balance
            </h3>
            <p className="text-xs text-[#6b7280] mb-4">
              This will deduct your crypto position and credit your platform USD balance.
            </p>

            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              placeholder={`Amount of ${sellingSymbol}`}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-[#0f172a] border border-[#e2e8f0] focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setSellingSymbol(null);
                  setSellAmount("");
                  setSellError("");
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[#e2e8f0] text-[#64748b]"
              >
                Cancel
              </button>
              <button
                onClick={sellCrypto}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white btn-teal"
              >
                Sell
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {loading ? (
        <div className="card-light p-8"><div className="space-y-3"><div className="h-4 skeleton w-1/3" /><div className="h-8 skeleton w-1/2" /><div className="h-3 skeleton w-full" /></div></div>
      ) : stocks.length === 0 && cryptos.length === 0 && (
        <div className="card-light p-8 text-center">
          <Briefcase size={32} className="text-[#d1d5db] mx-auto mb-3" />
          <p className="text-sm text-[#6b7280] mb-4">No investments yet. Start building your portfolio.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/invest" className="px-4 py-2 rounded-lg text-xs font-semibold text-white btn-teal">Invest in Stocks</Link>
            <Link href="/dashboard/swap" className="px-4 py-2 rounded-lg text-xs font-semibold text-naxcal-teal border border-naxcal-teal/20 hover:bg-naxcal-teal hover:text-white transition-all">Swap Crypto</Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}
