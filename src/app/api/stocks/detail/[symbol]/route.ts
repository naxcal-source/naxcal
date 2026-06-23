import { NextRequest, NextResponse } from "next/server";
import { getStockPrice } from "@/lib/yahoo-finance";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  try {
    const quote = await getStockPrice(symbol);
    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const changeAbs = quote.price - quote.prevClose;

    return NextResponse.json({
      symbol: quote.symbol,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changeAbs: parseFloat(changeAbs.toFixed(2)),
      prevClose: quote.prevClose,
      chart: quote.chart,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
