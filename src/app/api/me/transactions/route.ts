import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "100");

  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;

  let q = client
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) q = q.eq("type", type);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });

  return NextResponse.json(data ?? []);
}
