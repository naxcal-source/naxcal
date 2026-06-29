import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

  if (action === "approve") {
    await supabaseAdmin
      .from("transactions")
      .update({ status: "completed", admin_note: reason || "Approved by admin" })
      .eq("id", id);
    return NextResponse.json({ status: "ok" });
  }

  if (action === "reject") {
    const { user_id, amount } = body;
    await supabaseAdmin
      .from("transactions")
      .update({ status: "failed", admin_note: reason || "Rejected by admin" })
      .eq("id", id);

    // Refund the balance and create a credit transaction
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("balance")
      .eq("id", user_id)
      .single();

    if (profile) {
      const oldBalance = Number(profile.balance);
      const newBalance = oldBalance + Number(amount);
      await supabaseAdmin
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", user_id);

      await supabaseAdmin.from("transactions").insert({
        user_id,
        type: "adjustment_credit",
        amount: Number(amount),
        status: "completed",
        description: "Withdrawal refund — request declined",
        balance_before: oldBalance,
        balance_after: newBalance,
      });
    }
    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
