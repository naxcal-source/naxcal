import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminCheck } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!adminCheck?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, balance, tier, kyc_status, created_at, is_active")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
