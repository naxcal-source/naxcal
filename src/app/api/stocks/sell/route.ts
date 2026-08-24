import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStockPrice } from "@/lib/yahoo-finance";
import { isValidIdempotencyKey } from "@/lib/request-security";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: allowed } = await supabaseAdmin.rpc("consume_security_rate_limit", { p_key: `stock-sell:${user.id}`, p_limit: 10, p_window_seconds: 60 });
    if (!allowed) return NextResponse.json({ error: "Too many orders. Please wait." }, { status: 429 });

    const { symbol, qty } = await req.json();
    const idempotencyKey = req.headers.get("idempotency-key");
    if (!isValidIdempotencyKey(idempotencyKey)) return NextResponse.json({ error: "Invalid request identifier" }, { status: 400 });
    if (!symbol || !qty || qty <= 0) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data: position } = await supabaseAdmin
      .from("stock_positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .single();

    if (!position || Number(position.qty) < qty) {
      return NextResponse.json({ error: "Insufficient shares" }, { status: 400 });
    }

    const quote = await getStockPrice(symbol);
    if (!quote || quote.price <= 0) return NextResponse.json({ error: "Could not fetch current price" }, { status: 502 });

    const { data: trade, error: tradeError } = await supabaseAdmin.rpc("execute_stock_sell", {
      p_user_id: user.id, p_symbol: String(symbol).toUpperCase(), p_qty: Number(qty), p_price: quote.price, p_key: idempotencyKey,
    });
    if (tradeError) return NextResponse.json({ error: tradeError.message }, { status: 400 });
    const saleValue = Number(trade.value || 0);
    const newBal = Number(trade.new_balance || 0);

    return NextResponse.json({ symbol, qty, price: quote.price, value: parseFloat(saleValue.toFixed(2)), new_balance: newBal });
  } catch (err) {
    console.error("Stock sell error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
