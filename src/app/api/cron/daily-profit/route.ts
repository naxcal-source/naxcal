import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendDailyProfitEmail } from "@/lib/emails";
import { createNotification } from "@/lib/notifications";
import { accountValue, getPersistedCryptoValues } from "@/lib/portfolio-value";
import { isWeekendLabel } from "@/lib/business-days";
import { recordSystemEvent } from "@/lib/system-events";

export const TIER_RATES: Record<string, number> = {
  bronze: 1.5,
  silver: 1.8,
  gold: 2.1,
};

export async function runDailyProfit(label?: string) {
  if (isWeekendLabel(label)) {
    console.log("Daily profit skipped for weekend", label);
    return { users: 0, total: 0 };
  }

  const { data: users, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, balance, total_profit, tier, notification_preferences")
    .eq("is_active", true);

  if (fetchError) throw new Error("Failed to fetch users: " + fetchError.message);
  if (!users || users.length === 0) return { users: 0, total: 0 };

  // Migrated wallets can have no cash balance while their investable value lives
  // entirely in crypto_positions. Use the same persisted positions that power the
  // crypto portfolio instead of excluding those users at the profile query.
  const cryptoValueByUser = await getPersistedCryptoValues(users.map((user) => user.id));

  let totalDistributed = 0;
  let usersProcessed = 0;
  let eligibleUsers = 0;
  let duplicateSkipped = 0;
  let balanceUpdateFailed = 0;
  let transactionFailed = 0;
  let emailSent = 0;
  let emailFailed = 0;
  let emailSkipped = 0;

  for (const user of users) {
    const tier = (user.tier as string) || "bronze";
    const rate = TIER_RATES[tier] ?? 1.5;
    const cashBalance = Number(user.balance || 0);
    const cryptoValue = cryptoValueByUser.get(user.id) || 0;
    const investmentBalance = accountValue(cashBalance, cryptoValue);

    if (investmentBalance <= 0) continue;
    eligibleUsers++;

    const profit = investmentBalance * (rate / 100);
    const newCashBalance = cashBalance + profit;
    const newInvestmentBalance = investmentBalance + profit;
    const newTotalProfit = Number(user.total_profit || 0) + profit;
    const description = `Eligible-weekday credit +${rate}% (${tier} tier)${label ? ` — ${label}` : ""}`;

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
        duplicateSkipped++;
        continue;
      }
    }

    const { error } = await supabaseAdmin.from("profiles").update({
      balance: newCashBalance,
      total_profit: newTotalProfit,
    }).eq("id", user.id);

    if (error) {
      console.error("Profile update error for", user.id, error);
      balanceUpdateFailed++;
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
      transactionFailed++;
    } else {
      await createNotification({
        userId: user.id,
        type: "profit",
        title: "Eligible-weekday credit posted",
        description: `$${profit.toFixed(2)} has been credited to your account.`,
        body: `Your ${tier} tier eligible-weekday credit has been posted. A ${rate}% credit of $${profit.toFixed(2)} was added to your balance. Your new account balance is $${newInvestmentBalance.toFixed(2)}.`,
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

    const emailPreferences = user.notification_preferences as Record<string, boolean> | null;
    if (user.email && emailPreferences?.daily_profit !== false) {
      try {
        await sendDailyProfitEmail(
          user.email,
          user.full_name || "Investor",
          profit,
          rate,
          newTotalProfit,
          newInvestmentBalance,
        );
        emailSent++;
      } catch (emailError) {
        emailFailed++;
        console.error("Daily profit email failed for", user.email, emailError);
        await recordSystemEvent("daily_profit_email_failed", "error", "Daily profit email failed", {
          user_id: user.id,
          label: label || null,
          error: emailError instanceof Error ? emailError.message : "Unknown email error",
        });
      }
    } else {
      emailSkipped++;
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

  return {
    users: usersProcessed,
    eligible_users: eligibleUsers,
    duplicate_skipped: duplicateSkipped,
    balance_update_failed: balanceUpdateFailed,
    transaction_failed: transactionFailed,
    email_sent: emailSent,
    email_failed: emailFailed,
    email_skipped: emailSkipped,
    total: parseFloat(totalDistributed.toFixed(2)),
  };
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
    await recordSystemEvent("daily_profit_completed", "info", "Daily profit cron completed", { date: today, ...result });
    return NextResponse.json({ message: "Daily profit posted", ...result });
  } catch (err) {
    console.error("Cron daily profit error:", err);
    await recordSystemEvent("daily_profit_failed", "error", "Daily profit cron failed", {
      error: err instanceof Error ? err.message : "Unknown cron error",
    });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
