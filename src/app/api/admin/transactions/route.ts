import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAdminAction } from "@/lib/audit-log";

async function verifyAdmin() {
  const { user } = await getAuthUserWithClient();
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
    .select("id, user_id, amount, asset, wallet_address, status, admin_note, created_at, profiles(full_name, email)")
    .eq("type", "withdrawal")
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, id, reason } = body;

  if ((action === "approve" || action === "reject") && typeof id === "string") {
    const { data, error } = await supabaseAdmin.rpc("resolve_withdrawal_request", {
      p_admin_id: user.id,
      p_transaction_id: id,
      p_action: action,
      p_reason: typeof reason === "string" ? reason.slice(0, 500) : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logAdminAction(user.id, `${action}_withdrawal`, undefined, { transaction_id: id });
    return NextResponse.json({ status: "ok", ...data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
