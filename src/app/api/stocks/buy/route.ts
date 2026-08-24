import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStockPrice } from "@/lib/yahoo-finance";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: allowed } = await supabaseAdmin.rpc("consume_security_rate_limit", { p_key: `stock-buy:${user.id}`, p_limit: 10, p_window_seconds: 60 });
    if (!allowed) return NextResponse.json({ error: "Too many orders. Please wait." }, { status: 429 });

    const { symbol, amount_usd } = await req.json();
    const idempotencyKey = req.headers.get("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length > 100) return NextResponse.json({ error: "Missing request identifier" }, { status: 400 });
    if (!symbol || !amount_usd) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (amount_usd < 50) return NextResponse.json({ error: "Minimum investment is $50" }, { status: 400 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance, kyc_status").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (profile.kyc_status !== "approved") return NextResponse.json({ error: "Complete KYC verification first" }, { status: 403 });
    if (Number(profile.balance) < amount_usd) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

    const quote = await getStockPrice(symbol);
    if (!quote || quote.price <= 0) return NextResponse.json({ error: "Could not fetch current price" }, { status: 502 });

    const { data: trade, error: tradeError } = await supabaseAdmin.rpc("execute_stock_buy", {
      p_user_id: user.id, p_symbol: String(symbol).toUpperCase(), p_amount: Number(amount_usd), p_price: quote.price, p_key: idempotencyKey,
    });
    if (tradeError) return NextResponse.json({ error: tradeError.message }, { status: 400 });
    const shares = Number(trade.shares || 0);
    const oldBalance = Number(profile.balance);
    const newBalance = Number(trade.new_balance ?? oldBalance);

    if (!trade.duplicate) await createNotification({
      userId: user.id,
      type: "stock_buy",
      title: "Stock purchase completed",
      description: `${symbol} was added to your portfolio.`,
      body: `Your stock purchase was completed successfully. You invested $${Number(amount_usd).toFixed(2)} into ${symbol}, receiving ${shares.toFixed(4)} shares at $${quote.price.toFixed(2)} per share. Your holding value will move up or down with the live market price.`,
      link: "/dashboard/portfolio",
      metadata: {
        symbol,
        amount_usd: Number(amount_usd),
        shares: Number(shares.toFixed(6)),
        price: Number(quote.price.toFixed(2)),
        balance_before: oldBalance,
        balance_after: newBalance,
      },
    });

    return NextResponse.json({
      symbol, shares: parseFloat(shares.toFixed(4)), price: quote.price,
      amount: amount_usd, new_balance: newBalance,
    });
  } catch (err) {
    console.error("Stock buy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
