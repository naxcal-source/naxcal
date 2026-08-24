import { NextRequest, NextResponse } from "next/server";
import { mfaAuthErrorResponse, requireMfaAuth } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import {
  hashWithdrawalPin,
  isHashedWithdrawalPin,
  isValidWithdrawalPin,
  verifyWithdrawalPin,
} from "@/lib/withdrawal-pin";

const SUPPORTED_ASSETS = new Set(["USDT", "BTC", "ETH", "BNB", "SOL"]);

function isValidWallet(asset: string, wallet: string) {
  if (asset === "USDT") return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(wallet);
  if (asset === "BTC") return /^(bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(wallet);
  if (asset === "ETH" || asset === "BNB") return /^0x[a-fA-F0-9]{40}$/.test(wallet);
  if (asset === "SOL") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMfaAuth();
    if (!auth.ok) return mfaAuthErrorResponse(auth);
    const { user } = auth;

    const body = await req.json().catch(() => null);
    const amount = Number(body?.amount);
    const asset = typeof body?.asset === "string" ? body.asset.toUpperCase() : "";
    const wallet = typeof body?.wallet === "string" ? body.wallet.trim() : "";
    const pin = body?.pin;
    const idempotencyKey = req.headers.get("idempotency-key") || "";

    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    if (amount < 100) return NextResponse.json({ error: "Minimum withdrawal is $100." }, { status: 400 });
    if (amount > 10_000_000) return NextResponse.json({ error: "Withdrawal amount exceeds the supported limit." }, { status: 400 });
    if (!SUPPORTED_ASSETS.has(asset)) return NextResponse.json({ error: "Unsupported withdrawal asset." }, { status: 400 });
    if (!isValidWallet(asset, wallet)) return NextResponse.json({ error: `Enter a valid ${asset} wallet address.` }, { status: 400 });
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      return NextResponse.json({ error: "Missing or invalid request key." }, { status: 400 });
    }
    if (!isValidWithdrawalPin(pin)) return NextResponse.json({ error: "Enter your 6-digit withdrawal PIN." }, { status: 400 });

    const pinLimit = await durableRateLimit(`withdrawal-pin:${user.id}`, 5, 15 * 60 * 1000);
    if (!pinLimit.allowed) {
      return NextResponse.json({ error: "Too many PIN attempts. Try again later." }, { status: 429 });
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("withdrawal_pin").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (!profile.withdrawal_pin) return NextResponse.json({ error: "Set a withdrawal PIN in Settings → Security first." }, { status: 400 });
    if (!(await verifyWithdrawalPin(pin, profile.withdrawal_pin))) {
      return NextResponse.json({ error: "Incorrect withdrawal PIN." }, { status: 400 });
    }
    if (!isHashedWithdrawalPin(profile.withdrawal_pin)) {
      const upgradedPin = await hashWithdrawalPin(pin);
      await supabaseAdmin
        .from("profiles")
        .update({ withdrawal_pin: upgradedPin })
        .eq("id", user.id)
        .eq("withdrawal_pin", profile.withdrawal_pin);
    }
    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin.rpc(
      "create_withdrawal_request",
      {
        p_user_id: user.id,
        p_amount: amount,
        p_asset: asset,
        p_wallet: wallet,
        p_idempotency_key: idempotencyKey,
      },
    );

    if (withdrawalError) {
      const message = withdrawalError.message || "Withdrawal request failed";
      const status = message.includes("inactive") || message.includes("KYC") || message.includes("lock-up") ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    const result = (withdrawal || {}) as Record<string, unknown>;

    return NextResponse.json({
      status: result.transaction_status || "pending",
      transaction_id: result.transaction_id,
      already_exists: result.already_exists === true,
      new_balance: Number(result.new_balance || 0),
    });
  } catch (err) {
    console.error("Withdraw error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
