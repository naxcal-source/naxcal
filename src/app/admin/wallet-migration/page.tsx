"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";

type SupportedChain = {
  chain: string;
  chainId: number;
  moralisChain: string;
  nativeSymbol: string;
};

type ChainState = {
  chain: string;
  chain_id: number;
  has_activity: boolean | null;
  native_balance: string | number | null;
  token_count: number;
  transaction_count: number;
  sync_status: string;
  error: string | null;
  last_synced_at: string | null;
};

type MigrationRun = {
  id: string;
  status: string;
  transactions_discovered: number;
  transactions_imported: number;
  balances_discovered: number;
  tokens_discovered: number;
  migration_started_at: string | null;
  migration_completed_at: string | null;
  error: string | null;
};

type TokenBalance = {
  chain: string;
  chain_id: number;
  token_symbol: string | null;
  token_name: string | null;
  normalized_balance: string | number | null;
};

type NativeBalance = {
  chain: string;
  chain_id: number;
  asset_symbol: string;
  normalized_balance: string | number | null;
};

type VerifiedValuationRow = {
  source: "native" | "trusted_stablecoin";
  chain: string;
  chainId: number;
  asset: string;
  balance: number;
  priceUsd: number | null;
  valueUsd: number;
  contractAddress: string | null;
  verification: string;
};

type MigrationData = {
  user: {
    id: string;
    full_name: string | null;
    email: string | null;
    balance: number | string | null;
  } | null;
  wallet: {
    id: string;
    address: string;
    ownership_status: string;
  } | null;
  supportedChains: SupportedChain[];
  chainStates: ChainState[];
  nativeBalances: NativeBalance[];
  tokenBalances: TokenBalance[];
  migrationRuns: MigrationRun[];
  verifiedPortfolioValuation: {
    rows: VerifiedValuationRow[];
    totalUsd: number;
    missingPrices: string[];
    pricedAt: string;
    note: string;
  } | null;
  warning: string;
};

const statusClasses: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-300 border-red-500/20",
  PARTIAL: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  PAUSED: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  IMPORTING: "bg-blue-500/10 text-blue-300 border-blue-500/20",
};

function formatNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);

  return numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export default function AdminWalletMigrationPage() {
  const [data, setData] = useState<MigrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningChain, setRunningChain] = useState<string | null>(null);
  const [approvingLedger, setApprovingLedger] = useState(false);
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    const response = await fetch("/api/admin/wallet-migration", {
      cache: "no-store",
    });

    if (!response.ok) {
      setMessage("Failed to load wallet migration data.");
      setLoading(false);
      return;
    }

    const json = (await response.json()) as MigrationData;
    setData(json);
    setLoading(false);
  }

  async function approveVerifiedPortfolioToLedger() {
    const total = data?.verifiedPortfolioValuation?.totalUsd || 0;

    const confirmed = window.confirm(
      `Approve the verified on-chain portfolio value of $${formatNumber(
        total,
      )} into Emmett/Jay's internal investment balance? This creates one completed internal deposit transaction and updates the platform balance.`,
    );

    if (!confirmed) return;

    setApprovingLedger(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/wallet-migration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve_verified_portfolio_to_internal_ledger",
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage(json.message || json.error || "Ledger approval failed.");
      } else {
        setMessage(json.message || "Ledger approval completed.");
      }

      await loadData();
    } catch {
      setMessage("Ledger approval request failed.");
    } finally {
      setApprovingLedger(false);
    }
  }

  async function runChain(chain: string) {
    setRunningChain(chain);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/wallet-migration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chain,
          includeTransactions,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setMessage(json.message || json.error || "Migration failed.");
      } else {
        setMessage(json.message || "Migration completed.");
      }

      await loadData();
    } catch {
      setMessage("Migration request failed.");
    } finally {
      setRunningChain(null);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stateByChain = useMemo(() => {
    const map = new Map<string, ChainState>();

    for (const state of data?.chainStates || []) {
      map.set(String(state.chain_id), state);
    }

    return map;
  }, [data]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#1a8a6e]">
              Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Wallet Migration</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Import Jay Jones&apos;s EVM wallet data chain by chain. On-chain
              data remains separate from the internal investment ledger.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Accounting safety warning</p>
              <p className="mt-1 text-yellow-100/80">
                {data?.warning ||
                  "On-chain wallet data is separate from the internal investment ledger."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h2 className="text-xl font-semibold text-emerald-100">
                  Approve verified on-chain portfolio value
                </h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-emerald-100/75">
                This uses trusted official USDC contracts plus native ETH, BNB,
                MATIC and AVAX balances priced in USD. Spam/reward/claim tokens
                are excluded. Approval creates one audited internal deposit.
              </p>
              <p className="mt-3 text-3xl font-bold text-white">
                ${formatNumber(data?.verifiedPortfolioValuation?.totalUsd)}
              </p>
              <p className="mt-1 text-xs text-emerald-100/60">
                Priced at: {formatDate(data?.verifiedPortfolioValuation?.pricedAt)}
              </p>
            </div>

            <button
              onClick={approveVerifiedPortfolioToLedger}
              disabled={
                approvingLedger ||
                !data?.verifiedPortfolioValuation?.totalUsd ||
                data.verifiedPortfolioValuation.missingPrices.length > 0
              }
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {approvingLedger ? "Approving..." : "Approve Verified Value"}
            </button>
          </div>

          {Boolean(data?.verifiedPortfolioValuation?.missingPrices?.length) && (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              Missing prices:{" "}
              {data?.verifiedPortfolioValuation?.missingPrices.join(", ")}
            </p>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.15em] text-emerald-100/60">
                <tr>
                  <th className="py-3">Asset</th>
                  <th className="py-3">Chain</th>
                  <th className="py-3">Balance</th>
                  <th className="py-3">USD price</th>
                  <th className="py-3">USD value</th>
                  <th className="py-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-500/10">
                {(data?.verifiedPortfolioValuation?.rows || []).map((row, index) => (
                  <tr key={`${row.chainId}-${row.asset}-${index}`}>
                    <td className="py-3 font-semibold">{row.asset}</td>
                    <td className="py-3">{row.chain}</td>
                    <td className="py-3">{formatNumber(row.balance)}</td>
                    <td className="py-3">${formatNumber(row.priceUsd)}</td>
                    <td className="py-3 font-semibold">
                      ${formatNumber(row.valueUsd)}
                    </td>
                    <td className="py-3 text-xs text-emerald-100/60">
                      {row.verification}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!data?.verifiedPortfolioValuation?.rows?.length && (
              <p className="py-4 text-sm text-emerald-100/70">
                No verified valuation rows yet.
              </p>
            )}
          </div>
        </div>

        {message && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 text-zinc-400">
              <ShieldCheck className="h-5 w-5 text-[#1a8a6e]" />
              User
            </div>
            <p className="mt-4 text-xl font-semibold">
              {data?.user?.full_name || "Jay Jones"}
            </p>
            <p className="mt-1 break-all text-sm text-zinc-400">
              {data?.user?.email || "—"}
            </p>
            <p className="mt-3 text-xs text-zinc-500">{data?.user?.id}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 text-zinc-400">
              <Wallet className="h-5 w-5 text-[#1a8a6e]" />
              EVM Wallet
            </div>
            <p className="mt-4 break-all text-sm font-semibold">
              {data?.wallet?.address || "Not registered"}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
              {data?.wallet?.ownership_status || "unregistered"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 text-zinc-400">
              <Database className="h-5 w-5 text-[#1a8a6e]" />
              Internal Ledger
            </div>
            <p className="mt-4 text-xl font-semibold">
              ${formatNumber(data?.user?.balance)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              This page does not change this balance.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Chain imports</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Balances and token holdings are imported by default. Historical
                transactions are optional and slower.
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={includeTransactions}
                onChange={(event) =>
                  setIncludeTransactions(event.target.checked)
                }
                className="h-4 w-4 accent-[#1a8a6e]"
              />
              Include historical transactions
            </label>
          </div>

          <div className="mt-5 grid gap-3">
            {(data?.supportedChains || []).map((chain) => {
              const state = stateByChain.get(String(chain.chainId));
              const isRunning = runningChain === chain.moralisChain;
              const status = state?.sync_status || "NOT_RUN";

              return (
                <div
                  key={chain.chainId}
                  className="grid gap-4 rounded-xl border border-white/10 bg-black/30 p-4 md:grid-cols-[1.2fr_1fr_1fr_auto]"
                >
                  <div>
                    <p className="font-semibold">{chain.chain}</p>
                    <p className="text-xs text-zinc-500">
                      Chain ID {chain.chainId} · {chain.nativeSymbol}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Native balance</p>
                    <p className="text-sm text-zinc-200">
                      {formatNumber(state?.native_balance)} {chain.nativeSymbol}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">Tokens / Tx</p>
                    <p className="text-sm text-zinc-200">
                      {state?.token_count ?? 0} tokens ·{" "}
                      {state?.transaction_count ?? 0} tx
                    </p>
                  </div>

                  <div className="flex items-center gap-3 md:justify-end">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusClasses[status] ||
                        "border-white/10 bg-white/5 text-zinc-300"
                      }`}
                    >
                      {status === "COMPLETED" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : status === "FAILED" ? (
                        <XCircle className="h-3.5 w-3.5" />
                      ) : null}
                      {status}
                    </span>

                    <button
                      onClick={() => runChain(chain.moralisChain)}
                      disabled={Boolean(runningChain)}
                      className="rounded-xl bg-[#1a8a6e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#15765e] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRunning ? "Running..." : "Run"}
                    </button>
                  </div>

                  {state?.error && (
                    <p className="md:col-span-4 text-xs text-red-300">
                      {state.error}
                    </p>
                  )}

                  <p className="text-xs text-zinc-500 md:col-span-4">
                    Last synced: {formatDate(state?.last_synced_at)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-xl font-semibold">Native balances</h2>
            <div className="mt-4 space-y-3">
              {(data?.nativeBalances || []).map((balance) => (
                <div
                  key={`${balance.chain_id}-${balance.asset_symbol}`}
                  className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 text-sm"
                >
                  <span className="text-zinc-300">
                    {balance.chain} · {balance.asset_symbol}
                  </span>
                  <span className="font-semibold">
                    {formatNumber(balance.normalized_balance)}
                  </span>
                </div>
              ))}

              {!data?.nativeBalances?.length && (
                <p className="text-sm text-zinc-500">No native balances yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-xl font-semibold">Top token balances</h2>
            <div className="mt-4 space-y-3">
              {(data?.tokenBalances || []).map((token, index) => (
                <div
                  key={`${token.chain_id}-${token.token_symbol}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 text-sm"
                >
                  <span className="text-zinc-300">
                    {token.chain} · {token.token_symbol || token.token_name || "Token"}
                  </span>
                  <span className="font-semibold">
                    {formatNumber(token.normalized_balance)}
                  </span>
                </div>
              ))}

              {!data?.tokenBalances?.length && (
                <p className="text-sm text-zinc-500">No token balances yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xl font-semibold">Recent migration runs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                <tr>
                  <th className="py-3">Status</th>
                  <th className="py-3">Balances</th>
                  <th className="py-3">Tokens</th>
                  <th className="py-3">Tx discovered</th>
                  <th className="py-3">Started</th>
                  <th className="py-3">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(data?.migrationRuns || []).map((run) => (
                  <tr key={run.id}>
                    <td className="py-3">{run.status}</td>
                    <td className="py-3">{run.balances_discovered}</td>
                    <td className="py-3">{run.tokens_discovered}</td>
                    <td className="py-3">{run.transactions_discovered}</td>
                    <td className="py-3">{formatDate(run.migration_started_at)}</td>
                    <td className="py-3">
                      {formatDate(run.migration_completed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!data?.migrationRuns?.length && (
              <p className="py-4 text-sm text-zinc-500">No migration runs yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
