import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin-security";

const SUPPORTED_ASSETS = new Set(["USDT", "BTC", "ETH", "BNB", "SOL"]);

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount: rawAmount, asset: rawAsset, wallet: rawWallet, pin } = await req.json();
    const amount = Number(rawAmount);
    const asset = String(rawAsset || "USDT").toUpperCase();
    const wallet = String(rawWallet || "").trim();
    const idempotencyKey = req.headers.get("idempotency-key");

    if (!amount || amount <= 0) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    if (amount < 100) return NextResponse.json({ error: "Minimum withdrawal is $100." }, { status: 400 });
    if (!wallet) return NextResponse.json({ error: "Enter a wallet address." }, { status: 400 });
    if (!isValidPin(pin)) return NextResponse.json({ error: "Enter your 6-digit withdrawal PIN." }, { status: 400 });
    if (!SUPPORTED_ASSETS.has(asset)) return NextResponse.json({ error: "Unsupported withdrawal asset." }, { status: 400 });
    if (!idempotencyKey || idempotencyKey.length > 100) return NextResponse.json({ error: "Missing request identifier." }, { status: 400 });

    const { data: allowed } = await supabaseAdmin.rpc("consume_security_rate_limit", {
      p_key: `withdrawal:${user.id}`,
      p_limit: 5,
      p_window_seconds: 900,
    });
    if (!allowed) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance, kyc_status, withdrawal_pin").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (profile.kyc_status !== "approved") return NextResponse.json({ error: "Complete KYC verification before withdrawing." }, { status: 403 });
    if (!profile.withdrawal_pin) return NextResponse.json({ error: "Set a withdrawal PIN in Settings → Security first." }, { status: 400 });
    const pinResult = verifyPin(pin, profile.withdrawal_pin);
    if (!pinResult.valid) return NextResponse.json({ error: "Incorrect withdrawal PIN." }, { status: 400 });
    if (pinResult.needsUpgrade) {
      await supabaseAdmin.from("profiles").update({ withdrawal_pin: hashPin(pin) }).eq("id", user.id);
    }

    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin.rpc("create_withdrawal_request", {
      p_user_id: user.id,
      p_amount: amount,
      p_asset: asset,
      p_wallet: wallet,
      p_idempotency_key: idempotencyKey,
    });

    if (withdrawalError) {
      return NextResponse.json({ error: withdrawalError.message }, { status: 400 });
    }

    if (!withdrawal?.duplicate) await createNotification({
      userId: user.id,
      type: "withdrawal",
      title: "Withdrawal request submitted",
      description: `Your ${asset} withdrawal is now pending review.`,
      body: `Your withdrawal request for $${Number(amount).toFixed(2)} has been submitted and is pending review. You can track the status from your transactions page.`,
      link: "/dashboard/transactions",
      metadata: {
        amount,
        asset,
        wallet_address: wallet,
        status: "pending",
      },
    });

    return NextResponse.json({ status: "ok", ...withdrawal });
  } catch (err) {
    console.error("Withdraw error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
