import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const BASE = process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets";

export async function POST(req: NextRequest) {
  try {
    const { symbol, qty, user_id } = await req.json();
    if (!symbol || !qty || !user_id) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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
        qty: qty.toString(),
        side: "sell",
        type: "market",
        time_in_force: "day",
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || "Sell failed" }, { status: 502 });
    }

    const order = await orderRes.json();

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", user_id).single();
    const estimatedValue = Number(qty) * (order.filled_avg_price || 0);
    if (profile && estimatedValue > 0) {
      const oldBal = Number(profile.balance);
      const newBal = oldBal + estimatedValue;
      await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", user_id);
      await supabaseAdmin.from("transactions").insert({
        user_id,
        type: "stock_sell",
        amount: estimatedValue,
        asset: symbol,
        status: "completed",
        description: `Sold ${qty} shares of ${symbol}`,
        balance_before: oldBal,
        balance_after: newBal,
      });
    }

    return NextResponse.json({ order_id: order.id, symbol, qty, status: order.status });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
