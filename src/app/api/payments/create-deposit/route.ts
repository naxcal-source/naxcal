import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, currency } = await req.json();
    if (!amount || !currency) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    if (amount < 50) return NextResponse.json({ error: "Minimum deposit is $50" }, { status: 400 });

    const orderId = `${user.id}_${Date.now()}`;

    const res = await fetch("https://api.nowpayments.io/v1/payment", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: "usd",
        pay_currency: currency,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/webhook`,
        order_id: orderId,
        order_description: "Naxcal deposit",
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.message || "Payment creation failed" }, { status: res.status });
    }

    const data = await res.json();
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
