import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("kyc_status")
    .eq("id", user.id)
    .single();

  if (!profile || !["pending", "rejected"].includes(profile.kyc_status)) {
    return NextResponse.json({ error: "KYC status cannot be changed" }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ kyc_status: "submitted", kyc_rejection_reason: null })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Unable to update KYC status" }, { status: 500 });
  return NextResponse.json({ status: "submitted" });
}
