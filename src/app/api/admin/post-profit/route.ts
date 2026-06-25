import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAdminAction } from "@/lib/audit-log";
import { sendDailyProfitEmail } from "@/lib/emails";

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUserWithClient();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use service role if available, fall back to user's own session (RLS allows reading own profile)
    const authClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
    const { data: adminProfile } = await authClient.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Profit distribution always requires service role (reading/updating all users)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server configuration error: service role key not set" }, { status: 500 });
    }

    const { percentage, fee_percentage } = await req.json();
    if (!percentage || percentage <= 0) return NextResponse.json({ error: "Invalid percentage" }, { status: 400 });

    const { data: eligible, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, balance, total_profit")
      .gt("balance", 0)
      .eq("is_active", true);

    if (fetchError) {
      console.error("Fetch eligible users error:", fetchError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    if (!eligible || eligible.length === 0) {
      return NextResponse.json({ error: "No eligible users" }, { status: 400 });
    }

    let totalDistributed = 0;
    let usersProcessed = 0;
    const fee = fee_percentage || 0;

    for (const u of eligible) {
      const grossProfit = Number(u.balance) * (percentage / 100);
      const userFee = grossProfit * (fee / 100);
      const netProfit = grossProfit - userFee;
      const newBalance = Number(u.balance) + netProfit;
      const newTotalProfit = Number(u.total_profit || 0) + netProfit;

      const { error: updateError } = await supabaseAdmin.from("profiles").update({
        balance: newBalance,
        total_profit: newTotalProfit,
      }).eq("id", u.id);

      if (updateError) {
        console.error("Profile update error for user", u.id, updateError);
        continue;
      }

      await supabaseAdmin.from("transactions").insert({
        user_id: u.id,
        type: "profit",
        amount: netProfit,
        status: "completed",
        description: `Daily return +${percentage}%${fee > 0 ? ` (net after ${fee}% fee)` : ""}`,
        balance_before: Number(u.balance),
        balance_after: newBalance,
      });

      if (u.email) {
        sendDailyProfitEmail(u.email, u.full_name || "Investor", netProfit, percentage, newTotalProfit, newBalance).catch(() => {});
      }

      totalDistributed += netProfit;
      usersProcessed++;
    }

    // daily_profits uses profit_percentage + users_credited (original schema.sql columns)
    const { error: historyError } = await supabaseAdmin.from("daily_profits").insert({
      profit_percentage: percentage,
      total_distributed: totalDistributed,
      users_credited: usersProcessed,
      notes: fee > 0 ? `Admin fee: ${fee}%` : null,
    });

    if (historyError) {
      // History insert failed but balances are already updated — log and continue
      console.error("daily_profits insert error (non-critical):", historyError);
    }

    await logAdminAction(user.id, "post_profit", undefined, {
      percentage,
      fee_percentage: fee,
      total_distributed: totalDistributed,
      users_count: usersProcessed,
    });

    return NextResponse.json({ users: usersProcessed, total: totalDistributed });
  } catch (err) {
    console.error("Post profit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
