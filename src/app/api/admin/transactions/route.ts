import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function verifyAdmin() {
  const user = await getAuthUser();
  if (!user) return null;
  const { data } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) return null;
  return user;
}

export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("transactions")
    .select("id, user_id, amount, asset, wallet_address, status, created_at, profiles(full_name, email)")
    .eq("type", "withdrawal")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, id } = body;

  if (action === "approve") {
    await supabaseAdmin.from("transactions").update({ status: "completed" }).eq("id", id);
    return NextResponse.json({ status: "ok" });
  }

  if (action === "reject") {
    const { user_id, amount } = body;
    await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("id", id);

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", user_id).single();
    if (profile) {
      await supabaseAdmin.from("profiles").update({ balance: Number(profile.balance) + amount }).eq("id", user_id);
    }
    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
