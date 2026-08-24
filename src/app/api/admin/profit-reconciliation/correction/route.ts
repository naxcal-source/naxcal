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
  const transactionId = typeof input.profit_transaction_id === "string"
    ? input.profit_transaction_id
    : "";
  const correctedAmount = typeof input.corrected_amount === "string"
    ? input.corrected_amount
    : "";
  const adjustCash = input.adjust_cash;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const requestKey = typeof input.request_key === "string" ? input.request_key : "";
  const confirmation = typeof input.confirmation === "string" ? input.confirmation : "";

  if (!UUID.test(transactionId) || !MONEY.test(correctedAmount) || Number(correctedAmount) > 1_000_000_000_000) {
    return NextResponse.json({ error: "Invalid transaction or corrected amount" }, { status: 400 });
  }
  if (typeof adjustCash !== "boolean") {
    return NextResponse.json({ error: "Cash impact must be explicit" }, { status: 400 });
  }
  if (reason.length < 10 || reason.length > 500 || /[\u0000-\u001f\u007f]/.test(reason)) {
    return NextResponse.json({ error: "A specific correction reason is required" }, { status: 400 });
  }
  if (!REQUEST_KEY.test(requestKey)) {
    return NextResponse.json({ error: "Invalid correction request key" }, { status: 400 });
  }
  const expectedConfirmation = `CORRECT PROFIT ${transactionId}${adjustCash ? " CASH" : " TOTAL ONLY"}`;
  if (confirmation !== expectedConfirmation) {
    return NextResponse.json({
      error: `Confirmation must exactly match: ${expectedConfirmation}`,
    }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("correct_profit_overcredit", {
    p_profit_transaction_id: transactionId,
    p_corrected_amount: correctedAmount,
    p_adjust_cash: adjustCash,
    p_admin_id: admin.userId,
    p_reason: reason,
    p_request_key: requestKey,
    p_confirmation: confirmation,
  });

  if (error) {
    console.error("Profit correction failed", error);
    return NextResponse.json({ error: error.message || "Profit correction failed" }, { status: 409 });
  }
  return NextResponse.json(data || { status: "applied" });
}
