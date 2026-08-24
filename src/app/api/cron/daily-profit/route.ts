import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { processProfitJobs } from "@/lib/profit-worker";
import { getUtcProfitDate, isProfitDate } from "@/lib/profit-policy";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Daily profit cron refused: CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profitDate = getUtcProfitDate();
  if (!isProfitDate(profitDate)) {
    return NextResponse.json({
      profit_date: profitDate,
      status: "weekend_skipped",
      message: "Returns are credited Monday through Friday only",
    });
  }
  const { data: policies, error: policyError } = await supabaseAdmin
    .from("profit_policies")
    .select("id")
    .eq("enabled", true)
    .lte("effective_from", profitDate)
    .or(`effective_to.is.null,effective_to.gte.${profitDate}`)
    .order("effective_from", { ascending: false })
    .limit(2);

  if (policyError) {
    console.error("Could not load profit policy", policyError);
    return NextResponse.json({ error: "Could not load profit policy" }, { status: 500 });
  }
  if (!policies || policies.length === 0) {
    return NextResponse.json(
      { error: "No active profit policy is configured; no balances were changed" },
      { status: 503 },
    );
  }
  if (policies.length > 1) {
    return NextResponse.json(
      { error: "Overlapping profit policies detected; no balances were changed" },
      { status: 500 },
    );
  }

  const { data: queued, error: queueError } = await supabaseAdmin.rpc("enqueue_daily_profit_jobs", {
    p_profit_date: profitDate,
    p_policy_id: policies[0].id,
  });
  if (queueError) {
    console.error("Could not enqueue daily profit", queueError);
    return NextResponse.json({ error: "Could not enqueue daily profit" }, { status: 500 });
  }

  try {
    const processed = await processProfitJobs(20);
    return NextResponse.json({ profit_date: profitDate, queue: queued, processed });
  } catch (error) {
    console.error("Initial daily profit worker failed", error);
    return NextResponse.json({ profit_date: profitDate, queue: queued, processed: null }, { status: 202 });
  }
}
