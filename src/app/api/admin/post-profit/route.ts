import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { PROFIT_DAYS_LABEL } from "@/lib/profit-policy";

export async function POST() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  return NextResponse.json(
    { error: `Manual profit posting is disabled until the atomic ${PROFIT_DAYS_LABEL} accrual policy is deployed. Weekends are excluded.` },
    { status: 409 },
  );
}
