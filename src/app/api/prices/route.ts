import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = rateLimit(`prices:${ip}`, 30, 60000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,ripple,cardano,dogecoin,matic-network,avalanche-2,chainlink,uniswap&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );

    if (!res.ok) return NextResponse.json({ error: "Failed to fetch prices" }, { status: 502 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Price fetch failed" }, { status: 500 });
  }
}
