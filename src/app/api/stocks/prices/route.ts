import { NextResponse } from "next/server";
import { getBatchPrices } from "@/lib/yahoo-finance";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "JPM", "BAC"];

export async function GET() {
  try {
    const quotes = await getBatchPrices(SYMBOLS);
    return NextResponse.json(quotes.map((q) => ({ symbol: q.symbol, price: q.price, change: q.change })));
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
