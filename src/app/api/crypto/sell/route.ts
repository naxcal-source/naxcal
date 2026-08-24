import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";

const GECKO_MAP: Record<string, string> = {
  ETH: "ethereum",
  BNB: "binancecoin",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
  USDC: "usd-coin",
};

async function getCryptoPrice(symbol: string) {
  if (symbol === "USDC") return 1;

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
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: allowed } = await supabaseAdmin.rpc("consume_security_rate_limit", { p_key: `crypto-sell:${user.id}`, p_limit: 5, p_window_seconds: 60 });

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many sell requests. Please wait." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const idempotencyKey = req.headers.get("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length > 100) return NextResponse.json({ error: "Missing request identifier" }, { status: 400 });
    const symbol = String(body.symbol || "").toUpperCase();
    const amount = Number(body.amount || 0);

    if (!symbol || !GECKO_MAP[symbol]) {
      return NextResponse.json({ error: "Unsupported crypto asset" }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid sell amount" }, { status: 400 });
    }

    const { data: position, error: positionError } = await supabaseAdmin
      .from("crypto_positions")
      .select("*")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .maybeSingle();

    if (positionError) {
      return NextResponse.json({ error: positionError.message }, { status: 500 });
    }

    if (!position || Number(position.qty) < amount) {
      return NextResponse.json({ error: `Insufficient ${symbol} balance` }, { status: 400 });
    }

    const price = await getCryptoPrice(symbol);

    if (price <= 0) {
      return NextResponse.json({ error: "Could not fetch market price" }, { status: 502 });
    }

    const grossUsd = amount * price;
    const feeUsd = grossUsd * 0.005;
    const netUsd = grossUsd - feeUsd;

    const oldCryptoQty = Number(position.qty);
    const { data: trade, error: tradeError } = await supabaseAdmin.rpc("execute_crypto_sell", {
      p_user_id: user.id, p_symbol: symbol, p_qty: amount, p_price: price, p_fee_rate: 0.005, p_key: idempotencyKey,
    });
    if (tradeError) return NextResponse.json({ error: tradeError.message }, { status: 400 });
    const remainingQty = Number(trade.remaining_qty ?? oldCryptoQty - amount);
    const balanceAfter = Number(trade.new_balance || 0);

    if (!trade.duplicate) await createNotification({
      userId: user.id,
      type: "crypto_sell",
      title: "Crypto sold to USD balance",
      description: `${symbol} was sold and credited to your USD balance.`,
      body: `You sold ${amount.toFixed(8)} ${symbol}. After fees, $${netUsd.toFixed(2)} was credited to your USD balance.`,
      link: "/dashboard/transactions",
      metadata: {
        symbol,
        sold_amount: amount,
        gross_usd: Number(grossUsd.toFixed(2)),
        fee_usd: Number(feeUsd.toFixed(2)),
        net_usd: Number(netUsd.toFixed(2)),
      },
    });

    return NextResponse.json({
      success: true,
      symbol,
      sold_amount: amount,
      price,
      gross_usd: Number(grossUsd.toFixed(2)),
      fee_usd: Number(feeUsd.toFixed(2)),
      net_usd: Number(netUsd.toFixed(2)),
      balance_after: Number(balanceAfter.toFixed(2)),
      remaining_crypto_qty: Number(remainingQty.toFixed(8)),
    });
  } catch (error) {
    console.error("Crypto sell error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sell crypto",
      },
      { status: 500 },
    );
  }
}
