import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendDepositConfirmedEmail } from "@/lib/emails";

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

async function getPosition(userId: string, symbol: string) {
  const { data } = await supabaseAdmin
    .from("crypto_positions")
    .select("*")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .maybeSingle();

  return data;
}

async function debitPosition(userId: string, symbol: string, amount: number) {
  const position = await getPosition(userId, symbol);

  if (!position || Number(position.qty) < amount) {
    throw new Error(`Insufficient ${symbol} balance`);
  }

  const remaining = Number(position.qty) - amount;

  if (remaining < 0.00000001) {
    const { error } = await supabaseAdmin
      .from("crypto_positions")
      .delete()
      .eq("id", position.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin
      .from("crypto_positions")
      .update({ qty: remaining })
      .eq("id", position.id);

    if (error) throw new Error(error.message);
  }
}

async function creditPosition(
  userId: string,
  symbol: string,
  amount: number,
  valueUsd: number,
  marketPrice: number,
) {
  const existing = await getPosition(userId, symbol);

  if (existing) {
    const oldQty = Number(existing.qty);
    const oldCost = Number(existing.avg_price || 0) * oldQty;
    const newQty = oldQty + amount;
    const newAvg = newQty > 0 ? (oldCost + valueUsd) / newQty : marketPrice;

    const { error } = await supabaseAdmin
      .from("crypto_positions")
      .update({ qty: newQty, avg_price: newAvg })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("crypto_positions").insert({
      user_id: userId,
      symbol,
      qty: amount,
      avg_price: marketPrice,
    });

    if (error) throw new Error(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = rateLimit(`swap:${user.id}`, 5, 60000);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many swap requests. Please wait." },
        { status: 429 },
      );
    }

    const body = await req.json();
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

    await debitPosition(user.id, fromToken, fromAmount);
    await creditPosition(user.id, toToken, toAmount, netValueUsd, toPrice);

    await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "swap",
      amount: fromValueUsd,
      asset: `${fromToken}→${toToken}`,
      status: "completed",
      description: `Swapped ${fromAmount.toFixed(8)} ${fromToken} for ${toAmount.toFixed(8)} ${toToken}`,
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
