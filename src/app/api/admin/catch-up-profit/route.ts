import { NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { runDailyProfit } from "@/app/api/cron/daily-profit/route";

export async function POST() {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
  const { data: adminProfile } = await authClient.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!adminProfile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server configuration error: service role key not set" }, { status: 500 });
  }

  // Find the last date profits were posted
  const { data: lastEntry } = await supabaseAdmin
    .from("daily_profits")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const now = new Date();
  // Default to June 22 if no history exists
  const lastDate = lastEntry ? new Date(lastEntry.created_at) : new Date("2026-06-22T00:00:00Z");

  // Build list of missed days (day after lastDate up to yesterday — today runs via cron)
  const missedDays: string[] = [];
  const cursor = new Date(lastDate);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  cursor.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(23, 59, 59, 999);

  while (cursor <= yesterday) {
    missedDays.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (missedDays.length === 0) {
    return NextResponse.json({ message: "No missed days to catch up", days: 0 });
  }

  let totalUsers = 0;
  let totalAmount = 0;

  for (const day of missedDays) {
    const result = await runDailyProfit(day);
    totalUsers = result.users;
    totalAmount += result.total;
  }

  return NextResponse.json({
    message: `Caught up ${missedDays.length} missed day(s)`,
    days: missedDays.length,
    dates: missedDays,
    users: totalUsers,
    total: parseFloat(totalAmount.toFixed(2)),
  });
}

export async function GET() {
  // Preview: tell admin how many days are missed without posting
  const { data: lastEntry } = await supabaseAdmin
    .from("daily_profits")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const now = new Date();
  const lastDate = lastEntry ? new Date(lastEntry.created_at) : new Date("2026-06-22T00:00:00Z");

  const missedDays: string[] = [];
  const cursor = new Date(lastDate);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  cursor.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(23, 59, 59, 999);

  while (cursor <= yesterday) {
    missedDays.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return NextResponse.json({ missedDays, count: missedDays.length });
}
