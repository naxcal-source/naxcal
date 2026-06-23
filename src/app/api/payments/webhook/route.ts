import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendDepositConfirmedEmail } from "@/lib/emails";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function verifySignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET!);
  hmac.update(payload);
  const expectedSig = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig") || "";

    if (process.env.NOWPAYMENTS_IPN_SECRET && process.env.NOWPAYMENTS_IPN_SECRET !== "your_ipn_secret") {
      if (!signature || !verifySignature(rawBody, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const data = JSON.parse(rawBody);
    const { payment_status, order_id, payment_id, pay_currency, actually_paid, price_amount } = data;

    if (payment_status !== "confirmed" && payment_status !== "finished") {
      return NextResponse.json({ status: "ignored", payment_status });
    }

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const userId = order_id.split("_")[0];
    const usdAmount = Number(price_amount) || 0;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, balance, total_deposited, email, full_name")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Webhook: user not found", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldBalance = Number(profile.balance);
    const newBalance = oldBalance + usdAmount;

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        balance: newBalance,
        total_deposited: Number(profile.total_deposited) + usdAmount,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Webhook: balance update failed", updateError);
      return NextResponse.json({ error: "Balance update failed" }, { status: 500 });
    }

    await supabaseAdmin.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount: usdAmount,
      asset: pay_currency?.toUpperCase(),
      status: "completed",
      tx_hash: String(payment_id),
      description: `Crypto deposit - ${(pay_currency || "").toUpperCase()}`,
      balance_before: oldBalance,
      balance_after: newBalance,
    });

    if (profile.email) {
      await sendDepositConfirmedEmail(
        profile.email,
        profile.full_name || "Investor",
        usdAmount,
        (pay_currency || "").toUpperCase()
      ).catch(console.error);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
