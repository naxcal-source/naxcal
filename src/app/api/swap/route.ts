import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendDepositConfirmedEmail } from "@/lib/emails";
import { createNotification } from "@/lib/notifications";
import { isValidIdempotencyKey } from "@/lib/request-security";

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
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: allowed } = await supabaseAdmin.rpc("consume_security_rate_limit", { p_key: `swap:${user.id}`, p_limit: 5, p_window_seconds: 60 });

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many swap requests. Please wait." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const idempotencyKey = req.headers.get("idempotency-key");
    if (!isValidIdempotencyKey(idempotencyKey)) return NextResponse.json({ error: "Invalid request identifier" }, { status: 400 });
    const fromToken = String(body.from_token || "").toUpperCase();
    const toToken = String(body.to_token || "").toUpperCase();
    const fromAmount = Number(body.from_amount || 0);

    if (!fromToken || !toToken || !fromAmount || fromAmount <= 0) {
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

    if (fromPrice <= 0 || toPrice <= 0) {
      return NextResponse.json({ error: "Could not fetch prices" }, { status: 502 });
    }

    const fromValueUsd = fromAmount * fromPrice;
    const feeUsd = fromValueUsd * 0.005;
    const netValueUsd = fromValueUsd - feeUsd;
    const toAmount = netValueUsd / toPrice;

    const { data: trade, error: tradeError } = await supabaseAdmin.rpc("execute_crypto_swap", {
      p_user_id: user.id, p_from: fromToken, p_to: toToken, p_from_qty: fromAmount,
      p_from_price: fromPrice, p_to_price: toPrice, p_fee_rate: 0.005, p_key: idempotencyKey,
    });
    if (tradeError) return NextResponse.json({ error: tradeError.message }, { status: 400 });

    if (!trade.duplicate) await createNotification({
      userId: user.id,
      type: "swap",
      title: "Swap completed",
      description: `${fromToken} was swapped to ${toToken}.`,
      body: `Your swap was completed successfully. You swapped ${fromAmount.toFixed(8)} ${fromToken} for ${toAmount.toFixed(8)} ${toToken}. A 0.5% swap fee was applied.`,
      link: "/dashboard/transactions",
      metadata: {
        from_token: fromToken,
        to_token: toToken,
        from_amount: fromAmount,
        to_amount: Number(toAmount.toFixed(8)),
        value_usd: Number(fromValueUsd.toFixed(2)),
        fee_usd: Number(feeUsd.toFixed(2)),
      },
    });

    const { data: userProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    if (userProfile?.email) {
      sendDepositConfirmedEmail(
        userProfile.email,
        userProfile.full_name || "Investor",
        fromValueUsd,
        `${fromToken}→${toToken} Swap`,
      ).catch(console.error);
    }

    return NextResponse.json({
      from_token: fromToken,
      to_token: toToken,
      from_amount: fromAmount,
      to_amount: Number(toAmount.toFixed(8)),
      from_price: fromPrice,
      to_price: toPrice,
      fee: Number(feeUsd.toFixed(2)),
      rate: fromPrice / toPrice,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Swap error:", err);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
