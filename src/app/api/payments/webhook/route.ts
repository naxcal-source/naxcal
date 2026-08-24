import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { processEmailOutbox } from "@/lib/email-outbox";
import { verifyNowPaymentsSignature } from "@/lib/webhook-signatures";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig") || "";
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

    if (!ipnSecret || ipnSecret === "your_ipn_secret") {
      console.error("Payment webhook refused: NOWPAYMENTS_IPN_SECRET is not configured");
      return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
    }

    const data = JSON.parse(rawBody);
    if (!signature || !verifyNowPaymentsSignature(data, signature, ipnSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const paymentStatus = typeof data.payment_status === "string" ? data.payment_status.toLowerCase() : "";
    const paymentId = data.payment_id == null ? "" : String(data.payment_id);
    const orderId = typeof data.order_id === "string" ? data.order_id : "";
    if (!paymentStatus || !paymentId || !orderId) {
      return NextResponse.json({ error: "Missing payment identifiers" }, { status: 400 });
    }

    const eventKey = crypto.createHash("sha256").update(rawBody).digest("hex");
    const { error: inboxError } = await supabaseAdmin.from("payment_webhook_inbox").upsert({
      event_key: eventKey,
      provider_payment_id: paymentId,
      provider_order_id: orderId,
      payment_status: paymentStatus,
      payload: data,
      status: "received",
      attempts: 1,
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "event_key", ignoreDuplicates: true });
    if (inboxError) {
      console.error("Could not persist verified payment webhook", inboxError);
      return NextResponse.json({ error: "Webhook persistence failed" }, { status: 503 });
    }

    const { data: settlement, error: settlementError } = await supabaseAdmin.rpc(
      "settle_nowpayments_deposit",
      {
        p_provider_payment_id: paymentId,
        p_provider_order_id: orderId,
        p_payment_status: paymentStatus,
        p_payload: data,
      },
    );

    if (settlementError) {
      console.error("Payment settlement failed:", settlementError);
      await supabaseAdmin
        .from("payment_webhook_inbox")
        .update({
          status: "failed",
          last_error: settlementError.message,
          updated_at: new Date().toISOString(),
        })
        .eq("event_key", eventKey);
      return NextResponse.json({ error: "Payment settlement failed" }, { status: 503 });
    }

    const result = (settlement || {}) as Record<string, unknown>;
    const { error: processedError } = await supabaseAdmin
      .from("payment_webhook_inbox")
      .update({ status: "processed", processed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("event_key", eventKey);
    if (processedError) console.error("Could not mark payment webhook processed", processedError);

    if (typeof result.dedupe_key === "string") {
      processEmailOutbox({ dedupeKey: result.dedupe_key, limit: 1 }).catch((error) => {
        console.error("Immediate deposit email delivery failed; scheduled retry will continue", error);
      });
    }

    return NextResponse.json({ status: result.status || "recorded" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
