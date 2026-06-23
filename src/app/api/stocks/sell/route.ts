import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStockPrice } from "@/lib/yahoo-finance";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { symbol, qty } = await req.json();
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

    const saleValue = qty * quote.price;
    const remainingQty = Number(position.qty) - qty;

    if (remainingQty < 0.0001) {
      await supabaseAdmin.from("stock_positions").delete().eq("id", position.id);
    } else {
      await supabaseAdmin.from("stock_positions").update({ qty: remainingQty }).eq("id", position.id);
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", user.id).single();
    const oldBal = Number(profile?.balance || 0);
    const newBal = oldBal + saleValue;

    await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      user_id: user.id, type: "stock_sell", amount: saleValue, asset: symbol, status: "completed",
      description: `Sold ${qty.toFixed(4)} shares of ${symbol} @ $${quote.price.toFixed(2)}`,
      balance_before: oldBal, balance_after: newBal,
    });

    return NextResponse.json({ symbol, qty, price: quote.price, value: parseFloat(saleValue.toFixed(2)), new_balance: newBal });
  } catch (err) {
    console.error("Stock sell error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
