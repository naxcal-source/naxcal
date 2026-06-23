import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

const GECKO_MAP: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", USDT: "tether", BNB: "binancecoin",
  SOL: "solana", XRP: "ripple", ADA: "cardano", DOGE: "dogecoin",
};

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: positions } = await supabaseAdmin
      .from("crypto_positions")
      .select("symbol, qty, avg_price")
      .eq("user_id", user.id);

    if (!positions || positions.length === 0) return NextResponse.json([]);

    const geckoIds = positions.map((p) => GECKO_MAP[p.symbol]).filter(Boolean).join(",");
    let prices: Record<string, { usd: number }> = {};
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd`);
      if (res.ok) prices = await res.json();
    } catch {}

    const result = positions.map((pos) => {
      const geckoId = GECKO_MAP[pos.symbol];
      const currentPrice = prices[geckoId]?.usd || Number(pos.avg_price);
      const qty = Number(pos.qty);
      const avgEntry = Number(pos.avg_price);
      const marketValue = qty * currentPrice;
      const costBasis = qty * avgEntry;
      const unrealizedPl = marketValue - costBasis;
      return {
        symbol: pos.symbol, qty, avg_price: avgEntry, current_price: currentPrice,
        market_value: parseFloat(marketValue.toFixed(2)),
        unrealized_pl: parseFloat(unrealizedPl.toFixed(2)),
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
