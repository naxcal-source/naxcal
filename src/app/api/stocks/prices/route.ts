import { NextResponse } from "next/server";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "JPM", "BAC"];
const BASE = process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets";

export async function GET() {
  try {
    const res = await fetch(`${BASE}/v2/stocks/snapshots?symbols=${SYMBOLS.join(",")}`, {
      headers: {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
        "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET!,
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch stock prices", status: res.status }, { status: 502 });
    }

    const data = await res.json();
    const prices = Object.entries(data).map(([symbol, snapshot]: [string, unknown]) => {
      const s = snapshot as { latestTrade?: { p: number }; prevDailyBar?: { c: number } };
      const price = s.latestTrade?.p ?? 0;
      const prevClose = s.prevDailyBar?.c ?? price;
      const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      return { symbol, price, change: parseFloat(change.toFixed(2)) };
    });

    return NextResponse.json(prices);
  } catch {
    return NextResponse.json({ error: "Stock price fetch failed" }, { status: 500 });
  }
}
