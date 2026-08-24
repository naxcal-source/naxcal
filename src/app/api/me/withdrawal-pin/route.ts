import { NextRequest, NextResponse } from "next/server";
import { mfaAuthErrorResponse, requireMfaAuth } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  hashWithdrawalPin,
  isValidWithdrawalPin,
  verifyWithdrawalPin,
} from "@/lib/withdrawal-pin";
import { durableRateLimit } from "@/lib/durable-rate-limit";

export async function POST(req: NextRequest) {
  const auth = await requireMfaAuth();
  if (!auth.ok) return mfaAuthErrorResponse(auth);
  const { user } = auth;

  const pinLimit = await durableRateLimit(`withdrawal-pin-change:${user.id}`, 5, 15 * 60 * 1000);
  if (!pinLimit.allowed) {
    return NextResponse.json({ error: "Too many PIN attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const currentPin = body?.currentPin;
  const newPin = body?.newPin;
  if (!isValidWithdrawalPin(newPin)) {
    return NextResponse.json({ error: "PIN must be exactly 6 digits." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("withdrawal_pin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.withdrawal_pin) {
    if (!isValidWithdrawalPin(currentPin)) {
      return NextResponse.json({ error: "Enter your current PIN." }, { status: 400 });
    }

    const matches = await verifyWithdrawalPin(currentPin, profile.withdrawal_pin);
    if (!matches) {
      return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 403 });
    }
  }

  const withdrawalPinHash = await hashWithdrawalPin(newPin);
  let updateQuery = supabaseAdmin
    .from("profiles")
    .update({ withdrawal_pin: withdrawalPinHash })
    .eq("id", user.id);

  updateQuery = profile.withdrawal_pin
    ? updateQuery.eq("withdrawal_pin", profile.withdrawal_pin)
    : updateQuery.is("withdrawal_pin", null);

  const { data: updatedProfile, error: updateError } = await updateQuery
    .select("id")
    .maybeSingle();

  if (updateError || !updatedProfile) {
    return NextResponse.json({ error: "Failed to update PIN" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok", has_withdrawal_pin: true });
}
