import { NextResponse } from "next/server";

const BASE = process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets";

export async function GET() {
  try {
    const res = await fetch(`${BASE}/v2/positions`, {
      headers: {
        "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
        "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET!,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch positions" }, { status: 502 });
    }

    const positions = await res.json();
    const mapped = (positions as Array<Record<string, string>>).map((p) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      avg_entry: parseFloat(p.avg_entry_price),
      current_price: parseFloat(p.current_price),
      market_value: parseFloat(p.market_value),
      unrealized_pl: parseFloat(p.unrealized_pl),
      unrealized_plpc: parseFloat(p.unrealized_plpc) * 100,
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json({ error: "Portfolio fetch failed" }, { status: 500 });
  }
}
