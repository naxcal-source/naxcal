import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendDailyProfitEmail } from "@/lib/emails";
import { createNotification } from "@/lib/notifications";

export const TIER_RATES: Record<string, number> = {
  bronze: 1.5,
  silver: 1.8,
  gold: 2.1,
};

function isWeekendLabel(label?: string) {
  if (!label || !/^\\d{4}-\\d{2}-\\d{2}$/.test(label)) return false;

  const day = new Date(\`${label}T00:00:00Z\`).getUTCDay();
  return day === 0 || day === 6;
}

export async function runDailyProfit(label?: string) {
  if (isWeekendLabel(label)) {
    console.log("Daily profit skipped for weekend", label);
    return { users: 0, total: 0 };
  }

  const { data: users, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, balance, total_profit, tier")
    .eq("is_active", true);

  if (fetchError) throw new Error("Failed to fetch users: " + fetchError.message);
  if (!users || users.length === 0) return { users: 0, total: 0 };

  // Migrated wallets can have no cash balance while their investable value lives
  // entirely in crypto_positions. Use the same persisted positions that power the
  // crypto portfolio instead of excluding those users at the profile query.
  const { data: cryptoPositions, error: cryptoError } = await supabaseAdmin
    .from("crypto_positions")
    .select("user_id, qty, avg_price")
    .in("user_id", users.map((user) => user.id));

  if (cryptoError) {
    throw new Error("Failed to fetch crypto positions: " + cryptoError.message);
  }

  const cryptoValueByUser = new Map<string, number>();
  for (const position of cryptoPositions || []) {
    const value = Number(position.qty || 0) * Number(position.avg_price || 0);
    if (!Number.isFinite(value) || value <= 0) continue;

    cryptoValueByUser.set(
      position.user_id,
      (cryptoValueByUser.get(position.user_id) || 0) + value,
    );
  }

  let totalDistributed = 0;
  let usersProcessed = 0;

  for (const user of users) {
    const tier = (user.tier as string) || "bronze";
    const rate = TIER_RATES[tier] ?? 1.5;
    const cashBalance = Number(user.balance || 0);
    const cryptoValue = cryptoValueByUser.get(user.id) || 0;
    const investmentBalance = cashBalance + cryptoValue;

    if (investmentBalance <= 0) continue;

    const profit = investmentBalance * (rate / 100);
    const newCashBalance = cashBalance + profit;
    const newInvestmentBalance = investmentBalance + profit;
    const newTotalProfit = Number(user.total_profit || 0) + profit;
    const description = `Daily return +${rate}% (${tier} tier)${label ? ` — ${label}` : ""}`;

    if (label) {
      const { data: existingProfit } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "profit")
        .ilike("description", `%${label}%`)
        .limit(1)
        .maybeSingle();

      if (existingProfit) {
        console.log("Daily profit already posted for", user.id, label);
        continue;
      }
    }

    const { error } = await supabaseAdmin.from("profiles").update({
      balance: newCashBalance,
      total_profit: newTotalProfit,
    }).eq("id", user.id);

    if (error) {
      console.error("Profile update error for", user.id, error);
      continue;
    }

    const { error: txError } = await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "profit",
      amount: profit,
      asset: "USDC",
      status: "completed",
      description,
      balance_before: investmentBalance,
      balance_after: newInvestmentBalance,
    });

    if (txError) {
      console.error("Profit transaction insert error for", user.id, txError);
    } else {
      await createNotification({
        userId: user.id,
        type: "profit",
        title: "Daily profit credited",
        description: `$${profit.toFixed(2)} has been credited to your account.`,
        body: `Your ${tier} tier daily return has been credited. A ${rate}% daily profit of $${profit.toFixed(2)} was added to your balance. Your new account balance is $${newInvestmentBalance.toFixed(2)}.`,
        link: "/dashboard/transactions",
        metadata: {
          tier,
          rate,
          profit: Number(profit.toFixed(2)),
          balance_before: Number(investmentBalance.toFixed(2)),
          balance_after: Number(newInvestmentBalance.toFixed(2)),
          crypto_value: Number(cryptoValue.toFixed(2)),
          label: label || null,
        },
      });
    }

    if (user.email) {
      try {
        await sendDailyProfitEmail(
          user.email,
          user.full_name || "Investor",
          profit,
          rate,
          newTotalProfit,
          newInvestmentBalance,
        );
      } catch (emailError) {
        console.error("Daily profit email failed for", user.email, emailError);
      }
    }

    totalDistributed += profit;
    usersProcessed++;
  }

  // Use correct column names from schema.sql
  await supabaseAdmin.from("daily_profits").insert({
    profit_percentage: 0,
    total_distributed: totalDistributed,
    users_credited: usersProcessed,
    notes: `Auto tier-based${label ? ` — ${label}` : ""}`,
  });

  return { users: usersProcessed, total: parseFloat(totalDistributed.toFixed(2)) };
}

// Vercel Cron calls this on weekdays at 08:00 UTC
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await runDailyProfit(today);
    return NextResponse.json({ message: "Daily profit posted", ...result });
  } catch (err) {
    console.error("Cron daily profit error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
