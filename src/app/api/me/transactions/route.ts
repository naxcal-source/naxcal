import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "100");

  let q = supabaseAdmin
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
