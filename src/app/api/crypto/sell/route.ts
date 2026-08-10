import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

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

    const { allowed } = rateLimit(`crypto-sell:${user.id}`, 5, 60000);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many sell requests. Please wait." },
        { status: 429 },
      );
    }

    const body = await req.json();
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const oldCryptoQty = Number(position.qty);
    const remainingQty = oldCryptoQty - amount;
    const balanceBefore = Number(profile.balance || 0);
    const balanceAfter = balanceBefore + netUsd;

    if (remainingQty < 0.00000001) {
      const { error: deleteError } = await supabaseAdmin
        .from("crypto_positions")
        .delete()
        .eq("id", position.id);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
    } else {
      const { error: updateCryptoError } = await supabaseAdmin
        .from("crypto_positions")
        .update({ qty: remainingQty })
        .eq("id", position.id);

      if (updateCryptoError) {
        return NextResponse.json({ error: updateCryptoError.message }, { status: 500 });
      }
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({
        balance: balanceAfter,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }

    await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "crypto_sell",
      amount: netUsd,
      asset: `${symbol}→USD`,
      status: "completed",
      description: `Sold ${amount.toFixed(8)} ${symbol} to USD balance`,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
    });

    await createNotification({
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
      balance_before: Number(balanceBefore.toFixed(2)),
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
