import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  const { data } = await supabaseAdmin
    .from("transactions")
    .select("id, user_id, amount, asset, wallet_address, status, tx_hash, admin_note, metadata, created_at, updated_at, profiles(full_name, email)")
    .eq("type", "withdrawal")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { action, id, reason } = body;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(id || ""))
      || !["approve", "reject", "complete", "fail_processing"].includes(String(action || ""))) {
    return NextResponse.json({ error: "Invalid action or transaction" }, { status: 400 });
  }

  if (action === "complete") {
    const payoutReference = typeof body.payoutReference === "string"
      ? body.payoutReference.trim()
      : "";
    const referenceType = body.referenceType === "provider" ? "provider" : body.referenceType === "blockchain" ? "blockchain" : "";
    const provider = referenceType === "provider" && typeof body.provider === "string"
      ? body.provider.trim().toLowerCase()
      : "";
    const outputIndex = referenceType === "blockchain" ? String(body.outputIndex ?? "").trim() : null;
    const settlementAmount = String(body.settlementAmount ?? "").trim();
    const fee = body.fee == null || body.fee === "" ? "0" : String(body.fee).trim();
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (payoutReference.length < 4
        || payoutReference.length > 200
        || /[\u0000-\u001f\u007f]/.test(payoutReference)) {
      return NextResponse.json(
        { error: "Enter a valid provider or blockchain payout reference" },
        { status: 400 },
      );
    }
    if (!/^\d{1,8}(?:\.\d{1,8})?$/.test(fee)) {
      return NextResponse.json(
        { error: "Fee must be a non-negative amount with at most eight decimal places" },
        { status: 400 },
      );
    }
    if (!referenceType) {
      return NextResponse.json({ error: "Select a payout reference type" }, { status: 400 });
    }
    if (referenceType === "provider" && !/^[a-z0-9][a-z0-9._-]{1,39}$/.test(provider)) {
      return NextResponse.json({ error: "Enter a valid payout provider identifier" }, { status: 400 });
    }
    if (referenceType === "blockchain" && (
      !/^\d{1,10}$/.test(outputIndex || "")
      || Number(outputIndex) > 2_147_483_647
    )) {
      return NextResponse.json(
        { error: "Enter the blockchain transfer, log, or output index" },
        { status: 400 },
      );
    }
    if (!/^\d{1,18}(?:\.\d{1,18})?$/.test(settlementAmount)
        || Number(settlementAmount) <= 0) {
      return NextResponse.json(
        { error: "Enter the exact positive asset quantity sent" },
        { status: 400 },
      );
    }
    if (note.length > 500 || /[\u0000-\u001f\u007f]/.test(note)) {
      return NextResponse.json({ error: "Completion note is invalid or too long" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("finalize_withdrawal", {
      p_transaction_id: id,
      p_payout_reference: payoutReference,
      p_reference_type: referenceType,
      p_provider: referenceType === "provider" ? provider : null,
      p_output_index: outputIndex,
      p_settlement_amount: settlementAmount,
      p_fee: fee,
      p_admin_id: admin.userId,
      p_note: note || null,
    });

    if (error) {
      console.error("Withdrawal completion failed:", error);
      return NextResponse.json(
        { error: error.message || "Withdrawal completion failed" },
        { status: 409 },
      );
    }

    return NextResponse.json(data || { status: "completed" });
  }

  if (action === "fail_processing") {
    const failureReason = typeof reason === "string" ? reason.trim() : "";
    if (failureReason.length < 3
        || failureReason.length > 500
        || /[\u0000-\u001f\u007f]/.test(failureReason)) {
      return NextResponse.json(
        { error: "A specific payout failure reason is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("fail_processing_withdrawal", {
      p_transaction_id: id,
      p_reason: failureReason,
      p_admin_id: admin.userId,
    });

    if (error) {
      console.error("Processing withdrawal refund failed:", error);
      return NextResponse.json(
        { error: error.message || "Processing withdrawal refund failed" },
        { status: 409 },
      );
    }

    return NextResponse.json(data || { status: "failed" });
  }

  if (reason != null && (typeof reason !== "string" || reason.length > 500)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("review_withdrawal", {
    p_transaction_id: id,
    p_action: action,
    p_reason: reason || null,
    p_admin_id: admin.userId,
  });

  if (error) {
    console.error("Withdrawal review failed:", error);
    return NextResponse.json({ error: error.message || "Withdrawal review failed" }, { status: 409 });
  }

  return NextResponse.json(data || { status: "ok" });
}
