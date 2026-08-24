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

async function getCryptoPrice(symbol: string): Promise<number> {
  if (symbol === "USDC" || symbol === "USDT") return 1;

  const geckoId = GECKO_MAP[symbol];
  if (!geckoId) return 0;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`,
      { next: { revalidate: 30 } },
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

    const limit = await durableRateLimit(`swap:${user.id}`, 5, 60000);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many swap requests. Please wait." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json();
    const fromToken = String(body.from_token || "").toUpperCase();
    const toToken = String(body.to_token || "").toUpperCase();
    const fromAmount = Number(body.from_amount);

    if (!fromToken || !toToken || !Number.isFinite(fromAmount) || fromAmount <= 0) {
      return NextResponse.json({ error: "Invalid swap parameters" }, { status: 400 });
    }

    if (fromToken === toToken) {
      return NextResponse.json({ error: "Cannot swap same token" }, { status: 400 });
    }

    if (!GECKO_MAP[fromToken] || !GECKO_MAP[toToken]) {
      return NextResponse.json({ error: "Unsupported token" }, { status: 400 });
    }

    const [fromPrice, toPrice] = await Promise.all([
      getCryptoPrice(fromToken),
      getCryptoPrice(toToken),
    ]);

    if (
      !Number.isFinite(fromPrice) ||
      !Number.isFinite(toPrice) ||
      fromPrice <= 0 ||
      toPrice <= 0
    ) {
      return NextResponse.json({ error: "Could not fetch prices" }, { status: 502 });
    }

    const { data, error } = await supabaseAdmin.rpc("execute_crypto_swap", {
      p_user_id: user.id,
      p_from_symbol: fromToken,
      p_to_symbol: toToken,
      p_from_qty: fromAmount,
      p_from_price_usd: fromPrice,
      p_to_price_usd: toPrice,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const status = tradingRpcErrorStatus(error.message);
      if (status === 500) console.error("Crypto swap RPC error:", error);
      return NextResponse.json(
        { error: status === 500 ? "Internal server error" : error.message },
        { status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Swap error:", err);

    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
