import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: adminProfile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { percentage, fee_percentage } = await req.json();
    if (!percentage || percentage <= 0) return NextResponse.json({ error: "Invalid percentage" }, { status: 400 });

    const { data: eligible } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, balance, total_profit")
      .gt("balance", 0)
      .eq("is_active", true);

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

      const { error } = await supabaseAdmin.from("profiles").update({
        balance: newBalance,
        total_profit: newTotalProfit,
      }).eq("id", u.id);

      if (error) continue;

      await supabaseAdmin.from("transactions").insert({
        user_id: u.id, type: "profit", amount: netProfit, status: "completed",
        description: `Daily return +${percentage}% (net after ${fee}% fee)`,
        balance_before: Number(u.balance), balance_after: newBalance,
      });

      totalDistributed += netProfit;
      usersProcessed++;
    }

    await supabaseAdmin.from("daily_profits").insert({
      percentage, fee_percentage: fee, total_distributed: totalDistributed, users_count: usersProcessed,
    });

    return NextResponse.json({ users: usersProcessed, total: totalDistributed });
  } catch (err) {
    console.error("Post profit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
