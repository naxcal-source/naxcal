import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: lastRun }, { data: failures }] = await Promise.all([
    supabaseAdmin.from("system_events").select("event_type, severity, message, metadata, created_at").eq("event_type", "daily_profit_completed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabaseAdmin.from("system_events").select("event_type, severity, message, metadata, created_at").in("severity", ["warning", "error"]).gte("created_at", since).order("created_at", { ascending: false }).limit(25),
  ]);

  const lastRunAt = lastRun?.created_at ? new Date(lastRun.created_at).getTime() : 0;
  const healthy = lastRunAt > Date.now() - 72 * 60 * 60 * 1000 && (failures || []).length === 0;

  return NextResponse.json({ healthy, last_run: lastRun || null, recent_failures: failures || [] });
}
