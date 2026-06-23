import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStockPrice } from "@/lib/yahoo-finance";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: positions } = await supabaseAdmin
      .from("stock_positions")
      .select("symbol, qty, avg_price")
      .eq("user_id", user.id);

    if (!positions || positions.length === 0) return NextResponse.json([]);

    const result = await Promise.all(
      positions.map(async (pos) => {
        const quote = await getStockPrice(pos.symbol);
        const currentPrice = quote?.price || Number(pos.avg_price);
        const qty = Number(pos.qty);
        const avgEntry = Number(pos.avg_price);
        const marketValue = qty * currentPrice;
        const costBasis = qty * avgEntry;
        const unrealizedPl = marketValue - costBasis;
        const unrealizedPlpc = costBasis > 0 ? (unrealizedPl / costBasis) * 100 : 0;

        return {
          symbol: pos.symbol,
          name: quote?.name || pos.symbol,
          qty,
          avg_entry: avgEntry,
          current_price: currentPrice,
          market_value: parseFloat(marketValue.toFixed(2)),
          unrealized_pl: parseFloat(unrealizedPl.toFixed(2)),
          unrealized_plpc: parseFloat(unrealizedPlpc.toFixed(2)),
        };
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("Portfolio error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
