import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin-security";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPin = body?.currentPin;
  const currentPassword = body?.currentPassword;
  const recovery = body?.recovery === true;
  const newPin = body?.newPin;
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
    if (recovery) {
      if (typeof currentPassword !== "string" || !currentPassword || !user.email) {
        return NextResponse.json({ error: "Enter your account password to reset your PIN." }, { status: 400 });
      }

      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { error: passwordError } = await supabaseAuth.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (passwordError) {
        return NextResponse.json({ error: "Account password is incorrect." }, { status: 403 });
      }
    } else if (!isValidPin(currentPin) || !verifyPin(currentPin, profile.withdrawal_pin).valid) {
      return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 403 });
    }
  } else if (recovery) {
    return NextResponse.json({ error: "No withdrawal PIN is set." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ withdrawal_pin: hashPin(newPin) })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Unable to update PIN." }, { status: 500 });
  return NextResponse.json({ status: "ok", has_withdrawal_pin: true });
}
