import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, balance, tier, kyc_status, created_at, is_active")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
