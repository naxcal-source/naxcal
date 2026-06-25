import { NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;

  const { data } = await client
    .from("referrals")
    .select("*")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
