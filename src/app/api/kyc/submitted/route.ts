import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ kyc_status: "submitted" })
    .eq("id", user.id)
    .in("kyc_status", ["pending", "rejected"])
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to update KYC status" }, { status: 500 });
  if (!data) return NextResponse.json({ status: "unchanged" });
  return NextResponse.json({ status: "submitted" });
}
