import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { expectedLatestWeekdayRun } from "@/lib/business-days";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const expectedDate = expectedLatestWeekdayRun(new Date());
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: runs }, { data: failures }] = await Promise.all([
    supabaseAdmin.from("system_events").select("event_type, severity, message, metadata, created_at").eq("event_type", "daily_profit_completed").order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("system_events").select("event_type, severity, message, metadata, created_at").in("severity", ["warning", "error"]).gte("created_at", since).order("created_at", { ascending: false }).limit(25),
  ]);

  const lastRun = runs?.[0] || null;
  const metadata = (lastRun?.metadata || {}) as Record<string, unknown>;
  const lastRunDate = typeof metadata.date === "string" ? metadata.date : lastRun?.created_at?.slice(0, 10);
  const stale = !lastRunDate || lastRunDate < expectedDate;
  const lastRunAt = lastRun?.created_at ? new Date(lastRun.created_at).getTime() : 0;
  const unresolvedCronFailure = (failures || []).some((event) => event.event_type === "daily_profit_failed" && new Date(event.created_at).getTime() > lastRunAt);
  const emailFailures = Number(metadata.email_failed || 0);
  const processingFailures = Number(metadata.balance_update_failed || 0) + Number(metadata.transaction_failed || 0);
  const healthy = !stale && !unresolvedCronFailure && emailFailures === 0 && processingFailures === 0;
  const status = healthy ? "healthy" : stale || unresolvedCronFailure || processingFailures > 0 ? "critical" : "warning";

  return NextResponse.json({
    healthy,
    status,
    expected_date: expectedDate,
    last_run: lastRun,
    recent_runs: runs || [],
    recent_failures: failures || [],
  });
}
