import crypto from "crypto";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

function generateReferralCode() {
  return `NXC${crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase()}`;
}

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (profile.referral_code) {
    return NextResponse.json({ referral_code: profile.referral_code });
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = generateReferralCode();
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ referral_code: referralCode })
      .eq("id", user.id)
      .is("referral_code", null)
      .select("referral_code")
      .maybeSingle();

    if (data?.referral_code) {
      return NextResponse.json({ referral_code: data.referral_code });
    }
    if (error?.code !== "23505") break;
  }

  const { data: current } = await supabaseAdmin
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .single();

  if (current?.referral_code) {
    return NextResponse.json({ referral_code: current.referral_code });
  }
  return NextResponse.json({ error: "Failed to create referral code" }, { status: 500 });
}
