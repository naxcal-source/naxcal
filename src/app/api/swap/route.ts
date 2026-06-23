import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendDepositConfirmedEmail } from "@/lib/emails";

async function getCryptoPrice(geckoId: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data[geckoId]?.usd || 0;
  } catch { return 0; }
}

const GECKO_MAP: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", USDT: "tether", BNB: "binancecoin",
  SOL: "solana", XRP: "ripple", ADA: "cardano", DOGE: "dogecoin",
};

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { allowed } = rateLimit(`swap:${user.id}`, 5, 60000);
    if (!allowed) return NextResponse.json({ error: "Too many swap requests. Please wait." }, { status: 429 });

    const { from_token, to_token, from_amount } = await req.json();
    if (!from_token || !to_token || !from_amount || from_amount <= 0) {
      return NextResponse.json({ error: "Invalid swap parameters" }, { status: 400 });
    }
    if (from_token === to_token) {
      return NextResponse.json({ error: "Cannot swap same token" }, { status: 400 });
    }

    const fromGecko = GECKO_MAP[from_token];
    const toGecko = GECKO_MAP[to_token];
    if (!fromGecko || !toGecko) {
      return NextResponse.json({ error: "Unsupported token" }, { status: 400 });
    }

    const [fromPrice, toPrice] = await Promise.all([getCryptoPrice(fromGecko), getCryptoPrice(toGecko)]);
    if (fromPrice <= 0 || toPrice <= 0) {
      return NextResponse.json({ error: "Could not fetch prices" }, { status: 502 });
    }

    const fromValueUsd = from_amount * fromPrice;
    const fee = fromValueUsd * 0.005; // 0.5% fee
    const netValueUsd = fromValueUsd - fee;
    const toAmount = netValueUsd / toPrice;

    // Check user has enough of from_token
    // If from_token is "USDT" we check USD balance, otherwise check crypto_positions
    if (from_token === "USDT") {
      const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", user.id).single();
      if (!profile || Number(profile.balance) < fromValueUsd) {
        return NextResponse.json({ error: "Insufficient USDT balance" }, { status: 400 });
      }
      // Deduct from USD balance
      await supabaseAdmin.from("profiles").update({ balance: Number(profile.balance) - fromValueUsd }).eq("id", user.id);
    } else {
      const { data: pos } = await supabaseAdmin.from("crypto_positions").select("*").eq("user_id", user.id).eq("symbol", from_token).single();
      if (!pos || Number(pos.qty) < from_amount) {
        return NextResponse.json({ error: `Insufficient ${from_token} balance` }, { status: 400 });
      }
      const remaining = Number(pos.qty) - from_amount;
      if (remaining < 0.00000001) {
        await supabaseAdmin.from("crypto_positions").delete().eq("id", pos.id);
      } else {
        await supabaseAdmin.from("crypto_positions").update({ qty: remaining }).eq("id", pos.id);
      }
    }

    // Credit to_token
    if (to_token === "USDT") {
      const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", user.id).single();
      await supabaseAdmin.from("profiles").update({ balance: Number(profile?.balance || 0) + netValueUsd }).eq("id", user.id);
    } else {
      const { data: existing } = await supabaseAdmin.from("crypto_positions").select("*").eq("user_id", user.id).eq("symbol", to_token).single();
      if (existing) {
        const oldQty = Number(existing.qty);
        const oldCost = Number(existing.avg_price) * oldQty;
        const newQty = oldQty + toAmount;
        const newAvg = (oldCost + netValueUsd) / newQty;
        await supabaseAdmin.from("crypto_positions").update({ qty: newQty, avg_price: newAvg }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("crypto_positions").insert({ user_id: user.id, symbol: to_token, qty: toAmount, avg_price: toPrice });
      }
    }

    // Record transaction
    await supabaseAdmin.from("transactions").insert({
      user_id: user.id, type: "swap", amount: fromValueUsd, asset: `${from_token}→${to_token}`,
      status: "completed", description: `Swapped ${from_amount.toFixed(6)} ${from_token} for ${toAmount.toFixed(6)} ${to_token}`,
    });

    // Send swap confirmation email
    const { data: userProfile } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", user.id).single();
    if (userProfile?.email) {
      sendDepositConfirmedEmail(userProfile.email, userProfile.full_name || "Investor", fromValueUsd, `${from_token}→${to_token} Swap`).catch(console.error);
    }

    return NextResponse.json({
      from_token, to_token, from_amount, to_amount: parseFloat(toAmount.toFixed(8)),
      from_price: fromPrice, to_price: toPrice, fee: parseFloat(fee.toFixed(2)),
      rate: fromPrice / toPrice,
    });
  } catch (err) {
    console.error("Swap error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
