"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Mail, RefreshCw, Users } from "lucide-react";

type Metadata = Record<string, string | number | boolean | null>;
type SystemEvent = {
  event_type: string;
  severity: "info" | "warning" | "error";
  message: string;
  metadata: Metadata;
  created_at: string;
};
type Health = {
  healthy: boolean;
  status: "healthy" | "warning" | "critical";
  expected_date: string;
  last_run: SystemEvent | null;
  recent_runs: SystemEvent[];
  recent_failures: SystemEvent[];
};

const numberValue = (metadata: Metadata | undefined, key: string) => Number(metadata?.[key] || 0);
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function AdminHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/health", { cache: "no-store" });
      if (!response.ok) throw new Error("Health data could not be loaded");
      setHealth(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Health data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/health", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Health data could not be loaded");
        const data = await response.json();
        if (active) setHealth(data);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Health data could not be loaded");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const metadata = health?.last_run?.metadata;
  const statusColour = health?.status === "healthy" ? "#22c55e" : health?.status === "warning" ? "#f59e0b" : "#ef4444";
  const cards = [
    { label: "Users credited", value: numberValue(metadata, "users"), icon: Users },
    { label: "Total distributed", value: money(numberValue(metadata, "total")), icon: Activity },
    { label: "Emails sent", value: numberValue(metadata, "email_sent"), icon: Mail },
    { label: "Email failures", value: numberValue(metadata, "email_failed"), icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Eligible-Weekday Credit Health</h1>
          <p className="mt-1 text-xs text-white/40">Cron runs, credits, duplicate protection, and email delivery.</p>
        </div>
        <button onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/[0.04] disabled:opacity-50 cursor-pointer">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div> : null}

      <div className="rounded-2xl p-5" style={{ background: "#1a1a1a", border: `1px solid ${statusColour}55` }}>
        <div className="flex items-center gap-3">
          {health?.healthy ? <CheckCircle2 size={24} style={{ color: statusColour }} /> : <AlertTriangle size={24} style={{ color: statusColour }} />}
          <div>
            <p className="text-sm font-semibold capitalize" style={{ color: statusColour }}>{loading ? "Checking" : health?.status || "Unknown"}</p>
            <p className="text-xs text-white/40">Expected latest run: {health?.expected_date || "—"} · Last completed: {health?.last_run ? new Date(health.last_run.created_at).toLocaleString() : "No run recorded"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-white/35">{card.label}</span><card.icon size={15} className="text-naxcal-teal" /></div>
            <p className="mt-2 text-xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 className="mb-4 text-sm font-semibold text-white">Recent completed runs</h2>
          <div className="space-y-3">
            {health?.recent_runs.length ? health.recent_runs.map((run) => (
              <div key={run.created_at} className="rounded-lg border border-white/[0.05] bg-black/10 p-3">
                <div className="flex justify-between gap-3 text-xs"><span className="font-medium text-white/70">{String(run.metadata.date || new Date(run.created_at).toISOString().slice(0, 10))}</span><span className="text-white/30">{numberValue(run.metadata, "users")} users · {money(numberValue(run.metadata, "total"))}</span></div>
                <p className="mt-1 text-[11px] text-white/30">Emails: {numberValue(run.metadata, "email_sent")} sent, {numberValue(run.metadata, "email_failed")} failed · Duplicates skipped: {numberValue(run.metadata, "duplicate_skipped")}</p>
              </div>
            )) : <p className="py-6 text-center text-sm text-white/30">No completed runs recorded.</p>}
          </div>
        </section>

        <section className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 className="mb-4 text-sm font-semibold text-white">Recent warnings and failures</h2>
          <div className="space-y-3">
            {health?.recent_failures.length ? health.recent_failures.map((event) => (
              <div key={`${event.event_type}-${event.created_at}`} className="rounded-lg border border-red-500/10 bg-red-500/[0.04] p-3">
                <div className="flex justify-between gap-3"><p className="text-xs font-medium text-red-300">{event.message}</p><span className="text-[10px] text-white/25">{new Date(event.created_at).toLocaleString()}</span></div>
                <p className="mt-1 break-words text-[11px] text-white/30">{event.event_type}</p>
              </div>
            )) : <div className="flex items-center justify-center gap-2 py-6 text-sm text-emerald-400"><CheckCircle2 size={16} /> No recent failures</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
