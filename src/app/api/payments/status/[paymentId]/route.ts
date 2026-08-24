import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { paymentId } = await params;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(paymentId)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    const { data: intent } = await supabaseAdmin
      .from("payment_intents")
      .select("provider_payment_id")
      .eq("provider_payment_id", paymentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!intent) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });

    const res = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch status" }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json({
      payment_id: data.payment_id,
      payment_status: data.payment_status,
      pay_amount: data.pay_amount,
      actually_paid: data.actually_paid,
      pay_currency: data.pay_currency,
      price_amount: data.price_amount,
    });
  } catch (err) {
    console.error("Payment status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
