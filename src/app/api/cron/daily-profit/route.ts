import { NextRequest, NextResponse } from "next/server";
import { runDailyProfit } from "@/lib/daily-profit";
import { recordSystemEvent } from "@/lib/system-events";

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
