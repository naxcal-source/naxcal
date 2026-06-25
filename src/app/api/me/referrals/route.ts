import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("referrals")
    .select("*")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}
