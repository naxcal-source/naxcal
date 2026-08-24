"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

type PolicyRate = {
  tier: string;
  rate_percent: number | string;
};

type ProfitPolicy = {
  id: string;
  name: string;
  effective_from: string;
  effective_to: string | null;
  accrual_calendar: string;
  compounding_mode: string;
  enabled: boolean;
  profit_policy_rates: PolicyRate[];
};

type ProfitAccrual = {
  id: string;
  profit_date: string;
  tier: string;
  effective_rate_percent: number | string;
  eligible_basis: number | string;
  profit_amount: number | string;
  source: string;
  profiles: { full_name: string | null; email: string } | null;
};

type ProfitJob = {
  id: string;
  status: string;
  attempts: number;
  last_error: string | null;
};

type ProfitOperations = {
  policies: ProfitPolicy[];
  recent_accruals: ProfitAccrual[];
  open_jobs: ProfitJob[];
};

function money(value: number | string) {
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AdminProfitPage() {
  const [data, setData] = useState<ProfitOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/profit-reconciliation", {
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || "Could not load profit operations");
      }
      setData(body as ProfitOperations);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load profit operations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const activePolicies = data?.policies.filter((policy) => policy.enabled) || [];
  const failedJobs = data?.open_jobs.filter((job) => job.status === "failed") || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <TrendingUp size={22} className="text-naxcal-teal" />
            <h1 className="text-xl font-bold text-white">Profit Operations</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-white/40">
            Scheduled accruals use one reviewed, versioned policy. Global manual
            posting and inferred catch-up runs are disabled.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh profit operations"
          className="rounded-lg border border-white/10 p-2 text-white/60 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-16 text-sm text-white/40">
          <Loader2 size={16} className="animate-spin" /> Loading profit operations…
        </div>
      ) : (
        <>
          {activePolicies.length === 0 ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-5">
              <div className="flex items-start gap-3">
                <CalendarClock size={20} className="mt-0.5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-300">Profit posting is paused safely</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-200/65">
                    No policy is active. Confirm the rate period, eligible days,
                    compounding rule, basis, timezone, and effective date before
                    enabling one in a reviewed database change.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activePolicies.map((policy) => (
                <div key={policy.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 size={18} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Active policy</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-white">{policy.name}</h2>
                  <p className="mt-1 text-xs text-white/45">
                    {policy.effective_from} to {policy.effective_to || "open ended"} · {policy.accrual_calendar} · {policy.compounding_mode.replaceAll("_", " ")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {policy.profit_policy_rates.map((rate) => (
                      <span key={rate.tier} className="rounded-full border border-emerald-500/20 bg-black/20 px-3 py-1 text-xs text-emerald-200">
                        {rate.tier}: {Number(rate.rate_percent)}%
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-white/30">Recent accruals</p>
              <p className="mt-2 text-2xl font-bold text-white">{data?.recent_accruals.length || 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-white/30">Open jobs</p>
              <p className="mt-2 text-2xl font-bold text-white">{data?.open_jobs.length || 0}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-wider text-white/30">Failed jobs</p>
              <p className={failedJobs.length ? "mt-2 text-2xl font-bold text-red-400" : "mt-2 text-2xl font-bold text-emerald-400"}>
                {failedJobs.length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-semibold text-white">Recent immutable accruals</h2>
            {data?.recent_accruals.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-white/30">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2">Tier / rate</th>
                      <th className="px-3 py-2">Basis</th>
                      <th className="px-3 py-2">Credited</th>
                      <th className="px-3 py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {data.recent_accruals.map((accrual) => (
                      <tr key={accrual.id}>
                        <td className="px-3 py-3 text-white/60">{accrual.profit_date}</td>
                        <td className="px-3 py-3">
                          <p className="text-white/80">{accrual.profiles?.full_name || "Unnamed account"}</p>
                          <p className="text-xs text-white/30">{accrual.profiles?.email}</p>
                        </td>
                        <td className="px-3 py-3 capitalize text-white/60">{accrual.tier} · {Number(accrual.effective_rate_percent)}%</td>
                        <td className="px-3 py-3 text-white/60">{money(accrual.eligible_basis)}</td>
                        <td className="px-3 py-3 font-semibold text-emerald-400">{money(accrual.profit_amount)}</td>
                        <td className="px-3 py-3 text-xs text-white/35">{accrual.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-white/30">No accruals recorded by the new ledger yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
