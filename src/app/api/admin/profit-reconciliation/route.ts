import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isProfitDate } from "@/lib/profit-policy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  const [policiesResult, accrualsResult, jobsResult] = await Promise.all([
    supabaseAdmin
      .from("profit_policies")
      .select(
        "id, name, effective_from, effective_to, rate_period, accrual_calendar, compounding_mode, basis_method, enabled, created_at, profit_policy_rates(tier, rate_percent)",
      )
      .order("effective_from", { ascending: false }),
    supabaseAdmin
      .from("profit_accruals")
      .select(
        "id, user_id, profit_date, tier, effective_rate_percent, eligible_basis, profit_amount, source, created_at, profiles(full_name, email)",
      )
      .order("profit_date", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("profit_accrual_jobs")
      .select("id, user_id, profit_date, status, attempts, last_error, updated_at")
      .in("status", ["pending", "processing", "failed"])
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  const firstError =
    policiesResult.error || accrualsResult.error || jobsResult.error;
  if (firstError) {
    console.error("Could not load profit operations", firstError);
    return NextResponse.json(
      { error: "Could not load profit operations" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    policies: policiesResult.data || [],
    recent_accruals: accrualsResult.data || [],
    open_jobs: jobsResult.data || [],
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const userId = typeof input.user_id === "string" ? input.user_id : "";
  const policyId = typeof input.policy_id === "string" ? input.policy_id : "";
  const dates = Array.isArray(input.dates) ? input.dates : [];
  const execute = input.execute === true;
  const sendSummary = input.send_summary !== false;
  const confirmation = typeof input.confirmation === "string" ? input.confirmation : null;

  if (!UUID.test(userId) || !UUID.test(policyId)) {
    return NextResponse.json({ error: "Invalid user or policy" }, { status: 400 });
  }
  if (dates.length < 1 || dates.length > 31 || dates.some((date) => typeof date !== "string" || !ISO_DATE.test(date))) {
    return NextResponse.json({ error: "Supply between 1 and 31 ISO dates" }, { status: 400 });
  }
  if (dates.some((date) => typeof date === "string" && !isProfitDate(date))) {
    return NextResponse.json({
      error: "Reconciliation dates must be Monday through Friday; weekends are excluded",
    }, { status: 400 });
  }

  const basisInput = input.basis_overrides;
  if (basisInput != null && (typeof basisInput !== "object" || Array.isArray(basisInput))) {
    return NextResponse.json({ error: "Invalid basis overrides" }, { status: 400 });
  }
  const basisOverrides = (basisInput || {}) as Record<string, unknown>;
  if (dates.some((date) => typeof date === "string" && !(date in basisOverrides))) {
    return NextResponse.json({ error: "Every reconciliation date requires an explicit historical basis" }, { status: 400 });
  }
  for (const [date, amount] of Object.entries(basisOverrides)) {
    if (!ISO_DATE.test(date) || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
      return NextResponse.json({ error: `Invalid basis override for ${date}` }, { status: 400 });
    }
  }
  if (execute && confirmation !== `POST ${dates.length} PROFIT ACCRUALS`) {
    return NextResponse.json({
      error: `Confirmation must exactly match: POST ${dates.length} PROFIT ACCRUALS`,
    }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("reconcile_profit_accruals", {
    p_user_id: userId,
    p_policy_id: policyId,
    p_dates: dates,
    p_basis_overrides: basisOverrides,
    p_execute: execute,
    p_send_summary: sendSummary,
    p_admin_id: admin.userId,
    p_confirmation: confirmation,
  });

  if (error) {
    console.error("Profit reconciliation failed", error);
    return NextResponse.json({ error: error.message || "Reconciliation failed" }, { status: 409 });
  }
  return NextResponse.json(data || { mode: execute ? "executed" : "preview" });
}
