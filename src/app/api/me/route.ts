import { NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Prefer service role (bypasses RLS); fall back to user's own session (RLS allows own profile reads)
  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (!data.full_name) {
    data.full_name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Investor";
  }
  data.email = data.email || user.email;

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates = await req.json();
  delete updates.is_admin;
  delete updates.balance;
  delete updates.total_deposited;
  delete updates.total_withdrawn;
  delete updates.total_profit;
  delete updates.id;
  delete updates.created_at;

  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
  const { error } = await client.from("profiles").update(updates).eq("id", user.id);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
