import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,ripple,cardano,dogecoin,matic-network,avalanche-2,chainlink,uniswap&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch prices" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Price fetch failed" }, { status: 500 });
  }
}
