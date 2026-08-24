import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { PROFIT_DAYS_LABEL } from "@/lib/profit-policy";

const DISABLED_MESSAGE =
  "Global profit catch-up is disabled. Reconcile a specific user and explicit dates before posting any adjustment.";

// The former implementation inferred dates from the global daily_profits table
// and then credited every active user. That is unsafe for account-specific gaps
// and can apply historical returns using today's portfolio value.
export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  return NextResponse.json({
    disabled: true,
    missedDays: [],
    count: 0,
    profitDays: PROFIT_DAYS_LABEL,
    weekendsExcluded: true,
    warning: DISABLED_MESSAGE,
  });
}

export async function POST() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  return NextResponse.json(
    { error: DISABLED_MESSAGE },
    { status: 409 },
  );
}
