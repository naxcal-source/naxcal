import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { mfaAuthErrorResponse, requireMfaAuth } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { durableRateLimit } from "@/lib/durable-rate-limit";

const SUPPORTED_CURRENCIES = new Set([
  "btc", "eth", "usdttrc20", "usdterc20", "bnbbsc", "sol",
  "xrp", "ltc", "doge", "ada", "matic", "avax",
]);

function intentResponse(intent: Record<string, unknown>) {
  return {
    payment_id: intent.provider_payment_id,
    pay_address: intent.pay_address,
    pay_amount: intent.pay_amount,
    pay_currency: intent.pay_currency,
    order_id: intent.provider_order_id,
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMfaAuth();
    if (!auth.ok) return mfaAuthErrorResponse(auth);
    const { user } = auth;
    const limit = await durableRateLimit(`create-deposit:${user.id}`, 5, 10 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: "Too many deposit requests" }, { status: 429 });

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!apiKey || !siteUrl) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
    }

    const body = await req.json().catch(() => null);
    const amount = Number(body?.amount);
    const currency = typeof body?.currency === "string" ? body.currency.toLowerCase() : "";
    const requestKey = req.headers.get("idempotency-key") || "";
    if (!Number.isFinite(amount) || amount < 50 || amount > 10_000_000 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
      return NextResponse.json({ error: "Deposit amount must be between $50 and $10,000,000" }, { status: 400 });
    }
    if (!SUPPORTED_CURRENCIES.has(currency)) {
      return NextResponse.json({ error: "Unsupported payment currency" }, { status: 400 });
    }
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(requestKey)) {
      return NextResponse.json({ error: "Missing or invalid request key" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_active, kyc_status")
      .eq("id", user.id)
      .single();
    if (!profile?.is_active) return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    if (profile.kyc_status !== "approved") {
      return NextResponse.json({ error: "Complete KYC verification before depositing" }, { status: 403 });
    }

    const { data: existingIntent } = await supabaseAdmin
      .from("payment_intents")
      .select("provider_payment_id, provider_order_id, requested_amount, pay_currency, pay_address, pay_amount, status")
      .eq("user_id", user.id)
      .eq("request_key", requestKey)
      .maybeSingle();

    if (existingIntent) {
      if (Number(existingIntent.requested_amount) !== amount || existingIntent.pay_currency !== currency) {
        return NextResponse.json({ error: "Request key was reused with different deposit details" }, { status: 409 });
      }
      if (existingIntent.provider_payment_id && existingIntent.pay_address) {
        return NextResponse.json(intentResponse(existingIntent as Record<string, unknown>));
      }
      return NextResponse.json({ error: "This payment request is still being created" }, { status: 409 });
    }

    const orderId = `${user.id}_${crypto.randomUUID()}`;
    const { data: newIntent, error: createIntentError } = await supabaseAdmin
      .from("payment_intents")
      .insert({
        user_id: user.id,
        provider: "nowpayments",
        request_key: requestKey,
        provider_order_id: orderId,
        requested_amount: amount,
        price_currency: "USD",
        pay_currency: currency,
        status: "creating",
      })
      .select("id")
      .single();

    if (createIntentError || !newIntent) {
      const { data: racedIntent } = await supabaseAdmin
        .from("payment_intents")
        .select("provider_payment_id, provider_order_id, requested_amount, pay_currency, pay_address, pay_amount, status")
        .eq("user_id", user.id)
        .eq("request_key", requestKey)
        .maybeSingle();
      if (racedIntent?.provider_payment_id && racedIntent.pay_address) {
        return NextResponse.json(intentResponse(racedIntent as Record<string, unknown>));
      }
      return NextResponse.json({ error: "Failed to secure payment request" }, { status: 409 });
    }

    const res = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "usd",
        pay_currency: currency,
        ipn_callback_url: `${siteUrl.replace(/\/$/, "")}/api/payments/webhook`,
        order_id: orderId,
        order_description: "Naxcal deposit",
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      await supabaseAdmin
        .from("payment_intents")
        .update({ status: "failed", provider_response: errorData, updated_at: new Date().toISOString() })
        .eq("id", newIntent.id);
      return NextResponse.json({ error: errorData.message || "Payment creation failed" }, { status: res.status });
    }

    const data = await res.json();
    if (!data.payment_id || !data.pay_address) {
      await supabaseAdmin
        .from("payment_intents")
        .update({ status: "failed", provider_response: data, updated_at: new Date().toISOString() })
        .eq("id", newIntent.id);
      return NextResponse.json({ error: "Payment provider returned an invalid response" }, { status: 502 });
    }

    const { error: intentError } = await supabaseAdmin.from("payment_intents").update({
      provider_payment_id: String(data.payment_id),
      pay_address: String(data.pay_address),
      pay_amount: Number(data.pay_amount || 0),
      provider_response: data,
      status: String(data.payment_status || "waiting").toLowerCase(),
      updated_at: new Date().toISOString(),
    }).eq("id", newIntent.id);

    if (intentError) {
      console.error("Payment intent persistence failed:", intentError);
      return NextResponse.json({ error: "Failed to secure payment intent" }, { status: 502 });
    }

    return NextResponse.json({
      payment_id: data.payment_id,
      pay_address: data.pay_address,
      pay_amount: data.pay_amount,
      pay_currency: data.pay_currency,
      order_id: orderId,
    });
  } catch (err) {
    console.error("Create deposit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
