import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Merge auth metadata for full_name fallback
  if (!data.full_name) {
    data.full_name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Investor";
  }
  data.email = data.email || user.email;

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates = await req.json();
  // Prevent privilege escalation or balance tampering
  delete updates.is_admin;
  delete updates.balance;
  delete updates.total_deposited;
  delete updates.total_withdrawn;
  delete updates.total_profit;
  delete updates.id;
  delete updates.created_at;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
