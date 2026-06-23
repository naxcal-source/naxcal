import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendDailyProfitEmail } from "@/lib/emails";

const TIER_RATES: Record<string, number> = {
  bronze: 1.5,
  silver: 1.8,
  gold: 2.1,
};

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or admin with secret)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, balance, total_profit, tier, is_active")
      .eq("is_active", true)
      .gt("balance", 0);

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No eligible users", users: 0 });
    }

    let totalDistributed = 0;
    let usersProcessed = 0;

    for (const user of users) {
      const tier = (user.tier as string) || "bronze";
      const rate = TIER_RATES[tier] || 1.5;
      const balance = Number(user.balance);
      const profit = balance * (rate / 100);
      const newBalance = balance + profit;
      const newTotalProfit = Number(user.total_profit || 0) + profit;

      const { error } = await supabaseAdmin.from("profiles").update({
        balance: newBalance,
        total_profit: newTotalProfit,
      }).eq("id", user.id);

      if (error) continue;

      await supabaseAdmin.from("transactions").insert({
        user_id: user.id,
        type: "profit",
        amount: profit,
        status: "completed",
        description: `Daily return +${rate}% (${tier} tier)`,
        balance_before: balance,
        balance_after: newBalance,
      });

      if (user.email) {
        sendDailyProfitEmail(
          user.email, user.full_name || "Investor",
          profit, rate, newTotalProfit, newBalance
        ).catch(console.error);
      }

      totalDistributed += profit;
      usersProcessed++;
    }

    await supabaseAdmin.from("daily_profits").insert({
      percentage: 0,
      fee_percentage: 0,
      total_distributed: totalDistributed,
      users_count: usersProcessed,
    });

    return NextResponse.json({
      message: "Daily profit posted successfully",
      users: usersProcessed,
      total: parseFloat(totalDistributed.toFixed(2)),
    });
  } catch (err) {
    console.error("Cron daily profit error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
