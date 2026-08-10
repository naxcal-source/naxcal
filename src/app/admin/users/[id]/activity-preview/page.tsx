"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, Wallet, Repeat2, TrendingUp } from "lucide-react";

type PreviewData = {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    balance: number;
    total_profit: number | null;
    total_deposited: number | null;
    tier: string;
    kyc_status: string;
  };
  cryptoPositions: Array<{
    id: string;
    symbol: string;
    qty: number;
    avg_price: number;
  }>;
  cryptoValue: number;
  internalTransactions: Array<any>;
  onchainTransactions: Array<any>;
  swaps: Array<any>;
  profits: Array<any>;
  counts: {
    internalTransactions: number;
    onchainTransactions: number;
    cryptoPositions: number;
  };
};

function money(value: number) {
  return "$" + Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortHash(value?: string | null) {
  if (!value) return "—";
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function AdminUserActivityPreviewPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;

    fetch(`/api/admin/users/${params.id}/activity-preview`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => setError("Failed to load activity preview"));
  }, [params?.id]);

  if (error) {
    return <div className="text-red-400 text-sm">{error}</div>;
  }

  if (!data) {
    return <div className="text-white/50 text-sm">Loading activity preview...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Link
        href={`/admin/users/${params.id}`}
        className="inline-flex items-center gap-2 text-xs text-naxcal-teal hover:underline"
      >
        <ArrowLeft size={14} /> Back to user
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">User Activity Preview</h1>
        <p className="text-white/40 text-sm mt-1">
          {data.profile.full_name || "User"} · {data.profile.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-[#1a1a1a] border border-white/[0.06]">
          <p className="text-white/40 text-xs">Internal Ledger Balance</p>
          <p className="text-white text-xl font-bold mt-1">{money(Number(data.profile.balance || 0))}</p>
        </div>

        <div className="rounded-xl p-4 bg-[#1a1a1a] border border-white/[0.06]">
          <p className="text-white/40 text-xs">Crypto Portfolio Value</p>
          <p className="text-white text-xl font-bold mt-1">{money(data.cryptoValue)}</p>
        </div>

        <div className="rounded-xl p-4 bg-[#1a1a1a] border border-white/[0.06]">
          <p className="text-white/40 text-xs">Tier</p>
          <p className="text-white text-xl font-bold mt-1 capitalize">{data.profile.tier}</p>
        </div>

        <div className="rounded-xl p-4 bg-[#1a1a1a] border border-white/[0.06]">
          <p className="text-white/40 text-xs">KYC</p>
          <p className="text-white text-xl font-bold mt-1 capitalize">{data.profile.kyc_status}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 bg-[#1a1a1a] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={16} className="text-naxcal-teal" />
            <h2 className="text-white font-semibold">Crypto Positions</h2>
          </div>
          <div className="space-y-2">
            {data.cryptoPositions.map((p) => {
              const value = Number(p.qty || 0) * Number(p.avg_price || 0);
              return (
                <div key={p.id} className="flex justify-between text-sm border-b border-white/[0.04] pb-2">
                  <span className="text-white/70">{p.symbol}</span>
                  <span className="text-white text-right">
                    {Number(p.qty).toLocaleString()}<br />
                    <span className="text-white/40 text-xs">{money(value)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl p-4 bg-[#1a1a1a] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-naxcal-teal" />
            <h2 className="text-white font-semibold">Counts</h2>
          </div>
          <div className="space-y-3 text-sm">
            <p className="flex justify-between">
              <span className="text-white/50">Internal transactions</span>
              <span className="text-white">{data.counts.internalTransactions}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-white/50">On-chain transactions</span>
              <span className="text-white">{data.counts.onchainTransactions}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-white/50">Crypto positions</span>
              <span className="text-white">{data.counts.cryptoPositions}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-[#1a1a1a] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-naxcal-teal" />
            <h2 className="text-white font-semibold">Latest Profits</h2>
          </div>
          <div className="space-y-2">
            {data.profits.slice(0, 5).map((tx) => (
              <div key={tx.id} className="text-sm border-b border-white/[0.04] pb-2">
                <p className="text-white">{money(Number(tx.amount || 0))} {tx.asset || ""}</p>
                <p className="text-white/40 text-xs">{tx.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-[#1a1a1a] border border-white/[0.06] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Repeat2 size={16} className="text-naxcal-teal" />
          <h2 className="text-white font-semibold">Latest Internal Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-white/30 px-4 py-3 text-xs">Type</th>
                <th className="text-left text-white/30 px-4 py-3 text-xs">Amount</th>
                <th className="text-left text-white/30 px-4 py-3 text-xs">Asset</th>
                <th className="text-left text-white/30 px-4 py-3 text-xs">Description</th>
                <th className="text-left text-white/30 px-4 py-3 text-xs">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.internalTransactions.slice(0, 20).map((tx) => (
                <tr key={tx.id} className="border-b border-white/[0.03]">
                  <td className="px-4 py-3 text-white/70">{tx.type}</td>
                  <td className="px-4 py-3 text-white">{money(Number(tx.amount || 0))}</td>
                  <td className="px-4 py-3 text-white/50">{tx.asset || "—"}</td>
                  <td className="px-4 py-3 text-white/50">{tx.description || "—"}</td>
                  <td className="px-4 py-3 text-white/40">{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-[#1a1a1a] border border-white/[0.06] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Activity size={16} className="text-naxcal-teal" />
          <h2 className="text-white font-semibold">Latest On-Chain Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-white/30 px-4 py-3 text-xs">Chain</th>
                <th className="text-left text-white/30 px-4 py-3 text-xs">Native Value</th>
                <th className="text-left text-white/30 px-4 py-3 text-xs">Tx Hash</th>
                <th className="text-left text-white/30 px-4 py-3 text-xs">Status</th>
                <th className="text-left text-white/30 px-4 py-3 text-xs">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.onchainTransactions.slice(0, 30).map((tx) => (
                <tr key={tx.id} className="border-b border-white/[0.03]">
                  <td className="px-4 py-3 text-white/70">{tx.chain}</td>
                  <td className="px-4 py-3 text-white">{Number(tx.native_value || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-white/50">{shortHash(tx.tx_hash)}</td>
                  <td className="px-4 py-3 text-white/50">{tx.status || "completed"}</td>
                  <td className="px-4 py-3 text-white/40">{new Date(tx.timestamp || tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
