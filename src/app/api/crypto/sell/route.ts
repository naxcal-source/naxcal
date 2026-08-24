import { NextRequest, NextResponse } from "next/server";
import { mfaAuthErrorResponse, requireMfaAuth } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import { readIdempotencyKey, tradingRpcErrorStatus } from "@/lib/idempotency";

const GECKO_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  USDC: "usd-coin",
  USDT: "tether",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
};

async function getCryptoPrice(symbol: string) {
  if (symbol === "USDC" || symbol === "USDT") return 1;

  const geckoId = GECKO_MAP[symbol];
  if (!geckoId) return 0;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`,
      { cache: "no-store" },
    );

    if (!res.ok) return 0;

    const data = await res.json();
    return Number(data[geckoId]?.usd || 0);
  } catch {
    return 0;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMfaAuth();
    if (!auth.ok) return mfaAuthErrorResponse(auth);
    const { user } = auth;

    const idempotencyKey = readIdempotencyKey(req.headers);
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: "Missing or invalid Idempotency-Key header" },
        { status: 400 },
      );
    }

    const limit = await durableRateLimit(`crypto-sell:${user.id}`, 5, 60000);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many sell requests. Please wait." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json();
    const symbol = String(body.symbol || "").toUpperCase();
    const amount = Number(body.amount);

    if (!symbol || !GECKO_MAP[symbol]) {
      return NextResponse.json({ error: "Unsupported crypto asset" }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid sell amount" }, { status: 400 });
    }

    const price = await getCryptoPrice(symbol);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Could not fetch market price" }, { status: 502 });
    }

    const { data, error } = await supabaseAdmin.rpc("execute_crypto_sell", {
      p_user_id: user.id,
      p_symbol: symbol,
      p_qty: amount,
      p_price_usd: price,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const status = tradingRpcErrorStatus(error.message);
      if (status === 500) console.error("Crypto sell RPC error:", error);
      return NextResponse.json(
        { error: status === 500 ? "Failed to sell crypto" : error.message },
        { status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Crypto sell error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to sell crypto" },
      { status: 500 },
    );
  }
}
