import { NextRequest, NextResponse } from "next/server";
import { searchStocks, getStockPrice } from "@/lib/yahoo-finance";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    const results = await searchStocks(q);

    const withPrices = await Promise.all(
      results.slice(0, 10).map(async (r) => {
        const quote = await getStockPrice(r.symbol);
        return {
          symbol: r.symbol,
          name: r.name,
          exchange: r.exchange,
          type: r.type,
          price: quote?.price || 0,
          change: quote?.change || 0,
          chart: quote?.chart || [],
        };
      })
    );

    return NextResponse.json(withPrices);
  } catch {
    return NextResponse.json([]);
  }
}
