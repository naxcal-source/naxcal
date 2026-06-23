import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;

    const res = await fetch(`https://api.nowpayments.io/v1/payment/${paymentId}`, {
      headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY! },
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
