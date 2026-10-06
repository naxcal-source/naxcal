import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAdminAction } from "@/lib/audit-log";
import { createNotification } from "@/lib/notifications";

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
    let withdrawal: { user_id: string; amount: number; asset: string | null } | null = null;
    if (action === "reject") {
      const { data: foundWithdrawal, error: lookupError } = await supabaseAdmin
        .from("transactions")
        .select("user_id, amount, asset")
        .eq("id", id)
        .eq("type", "withdrawal")
        .maybeSingle();

      if (lookupError) return NextResponse.json({ error: "Unable to load withdrawal." }, { status: 500 });
      if (!foundWithdrawal) return NextResponse.json({ error: "Withdrawal not found." }, { status: 404 });
      withdrawal = foundWithdrawal;
    }

    const normalizedReason = typeof reason === "string" ? reason.slice(0, 500).trim() : "";
    const { data, error } = await supabaseAdmin.rpc("resolve_withdrawal_request", {
      p_admin_id: user.id,
      p_transaction_id: id,
      p_action: action,
      p_reason: normalizedReason || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    let notificationCreated = false;
    const result = data as { status?: string; duplicate?: boolean } | null;
    if (action === "reject" && withdrawal && result?.status === "failed" && !result.duplicate) {
      const amount = Number(withdrawal.amount);
      const amountText = `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const reasonText = normalizedReason ? ` Reason: ${normalizedReason}` : "";
      notificationCreated = await createNotification({
        userId: withdrawal.user_id,
        type: "withdrawal_rejected",
        title: "Withdrawal rejected and refunded",
        description: `Your ${amountText} withdrawal was rejected and returned to your available balance.${reasonText}`,
        body: `Your withdrawal request for ${amountText} (${withdrawal.asset || "crypto"}) was rejected. The funds have been returned to your available balance.${reasonText}`,
        link: "/dashboard/withdraw",
        metadata: { transaction_id: id, amount, asset: withdrawal.asset, status: "failed" },
      });
    }

    await logAdminAction(user.id, `${action}_withdrawal`, undefined, { transaction_id: id });
    return NextResponse.json({ status: "ok", ...data, notification_created: notificationCreated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
