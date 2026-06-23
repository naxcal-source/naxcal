import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const BASE = process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets";

export async function POST(req: NextRequest) {
  try {
    const { symbol, amount_usd, user_id } = await req.json();
    if (!symbol || !amount_usd || !user_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (amount_usd < 50) {
      return NextResponse.json({ error: "Minimum investment is $50" }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", user_id).single();
    if (!profile || Number(profile.balance) < amount_usd) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const orderRes = await fetch(`${BASE}/v2/orders`, {
      method: "POST",
      headers: {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
        "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol,
        notional: amount_usd.toString(),
        side: "buy",
        type: "market",
        time_in_force: "day",
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || "Order failed" }, { status: 502 });
    }

    const order = await orderRes.json();
    const oldBalance = Number(profile.balance);
    const newBalance = oldBalance - amount_usd;

    await supabaseAdmin.from("profiles").update({ balance: newBalance }).eq("id", user_id);
    await supabaseAdmin.from("transactions").insert({
      user_id,
      type: "stock_buy",
      amount: amount_usd,
      asset: symbol,
      status: "completed",
      description: `Bought ${symbol} stock`,
      balance_before: oldBalance,
      balance_after: newBalance,
    });

    return NextResponse.json({ order_id: order.id, symbol, amount: amount_usd, status: order.status });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
