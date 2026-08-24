import { NextRequest, NextResponse } from "next/server";
import { mfaAuthErrorResponse, requireMfaAuth } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStockPrice } from "@/lib/yahoo-finance";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import { readIdempotencyKey, tradingRpcErrorStatus } from "@/lib/idempotency";

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

    const limit = await durableRateLimit(`stock-sell:${user.id}`, 10, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many sell requests. Please wait." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const body = await req.json();
    const symbol = String(body.symbol || "").trim().toUpperCase();
    const qty = Number(body.qty);

    if (!/^[A-Z0-9^][A-Z0-9.^-]{0,19}$/.test(symbol)) {
      return NextResponse.json({ error: "Invalid stock symbol" }, { status: 400 });
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: "Invalid sell quantity" }, { status: 400 });
    }

    const quote = await getStockPrice(symbol);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) {
      return NextResponse.json({ error: "Could not fetch current price" }, { status: 502 });
    }

    const { data, error } = await supabaseAdmin.rpc("execute_stock_sell", {
      p_user_id: user.id,
      p_symbol: symbol,
      p_qty: qty,
      p_price_usd: quote.price,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      const status = tradingRpcErrorStatus(error.message);
      if (status === 500) console.error("Stock sell RPC error:", error);
      return NextResponse.json(
        { error: status === 500 ? "Internal server error" : error.message },
        { status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Stock sell error:", err);
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
