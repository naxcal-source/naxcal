import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStockPrice } from "@/lib/yahoo-finance";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { symbol, amount_usd } = await req.json();
    if (!symbol || !amount_usd) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (amount_usd < 50) return NextResponse.json({ error: "Minimum investment is $50" }, { status: 400 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance, kyc_status").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (profile.kyc_status !== "approved") return NextResponse.json({ error: "Complete KYC verification first" }, { status: 403 });
    if (Number(profile.balance) < amount_usd) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

    const quote = await getStockPrice(symbol);
    if (!quote || quote.price <= 0) return NextResponse.json({ error: "Could not fetch current price" }, { status: 502 });

    const shares = amount_usd / quote.price;
    const oldBalance = Number(profile.balance);
    const newBalance = oldBalance - amount_usd;

    // Check if user already has a position in this stock
    const { data: existing } = await supabaseAdmin
      .from("stock_positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .single();

    if (existing) {
      const oldQty = Number(existing.qty);
      const oldCost = Number(existing.avg_price) * oldQty;
      const newQty = oldQty + shares;
      const newAvg = (oldCost + amount_usd) / newQty;
      await supabaseAdmin.from("stock_positions").update({ qty: newQty, avg_price: newAvg }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("stock_positions").insert({
        user_id: user.id, symbol, qty: shares, avg_price: quote.price,
      });
    }

    await supabaseAdmin.from("profiles").update({ balance: newBalance }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      user_id: user.id, type: "stock_buy", amount: amount_usd, asset: symbol, status: "completed",
      description: `Bought ${shares.toFixed(4)} shares of ${symbol} @ $${quote.price.toFixed(2)}`,
      balance_before: oldBalance, balance_after: newBalance,
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
