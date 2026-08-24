import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY = /^\d+(?:\.\d{1,8})?$/;
const REQUEST_KEY = /^[A-Za-z0-9._:-]{8,128}$/;

export async function POST(req: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const userId = typeof input.user_id === "string" ? input.user_id : "";
  const excluded = typeof input.excluded_noncompounding_profit === "string"
    ? input.excluded_noncompounding_profit
    : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const requestKey = typeof input.request_key === "string" ? input.request_key : "";
  const confirmation = typeof input.confirmation === "string" ? input.confirmation : "";

  if (!UUID.test(userId) || !MONEY.test(excluded) || Number(excluded) > 1_000_000_000_000) {
    return NextResponse.json({ error: "Invalid user or excluded-profit baseline" }, { status: 400 });
  }
  if (reason.length < 10 || reason.length > 500 || /[\u0000-\u001f\u007f]/.test(reason)) {
    return NextResponse.json({ error: "A specific baseline reason is required" }, { status: 400 });
  }
  if (!REQUEST_KEY.test(requestKey)) {
    return NextResponse.json({ error: "Invalid baseline request key" }, { status: 400 });
  }
  if (confirmation !== `INITIALIZE PROFIT STATE ${userId}`) {
    return NextResponse.json({
      error: `Confirmation must exactly match: INITIALIZE PROFIT STATE ${userId}`,
    }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("initialize_profit_account_state", {
    p_user_id: userId,
    p_excluded_noncompounding_profit: excluded,
    p_admin_id: admin.userId,
    p_reason: reason,
    p_request_key: requestKey,
    p_confirmation: confirmation,
  });

  if (error) {
    console.error("Profit account state initialization failed", error);
    return NextResponse.json({ error: error.message || "Initialization failed" }, { status: 409 });
  }
  return NextResponse.json(data || { status: "initialized" });
}
