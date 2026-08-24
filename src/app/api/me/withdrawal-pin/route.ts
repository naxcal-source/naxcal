import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin-security";

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPin, newPin } = await req.json();
  if (!isValidPin(newPin)) {
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
    if (!isValidPin(currentPin) || !verifyPin(currentPin, profile.withdrawal_pin).valid) {
      return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 403 });
    }
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ withdrawal_pin: hashPin(newPin) })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Unable to update PIN." }, { status: 500 });
  return NextResponse.json({ status: "ok", has_withdrawal_pin: true });
}
