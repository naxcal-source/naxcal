import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

const DEFAULTS = {
  daily_profit: true,
  deposit: true,
  withdrawal: true,
  security: true,
  marketing: false,
};

const COLUMN_BY_KEY = {
  daily_profit: "daily_profit_email",
  deposit: "deposit_email",
  withdrawal: "withdrawal_email",
  security: "security_email",
  marketing: "marketing_email",
} as const;

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("daily_profit_email, deposit_email, withdrawal_email, security_email, marketing_email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not load preferences" }, { status: 500 });
  if (!data) return NextResponse.json(DEFAULTS);

  return NextResponse.json({
    daily_profit: data.daily_profit_email,
    deposit: data.deposit_email,
    withdrawal: data.withdrawal_email,
    security: data.security_email,
    marketing: data.marketing_email,
  });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updates: Record<string, boolean | string> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  for (const [key, column] of Object.entries(COLUMN_BY_KEY)) {
    if (!(key in body)) continue;
    const value = (body as Record<string, unknown>)[key];
    if (typeof value !== "boolean") {
      return NextResponse.json({ error: `Invalid ${key} preference` }, { status: 400 });
    }
    updates[column] = value;
  }

  if (Object.keys(updates).length === 2) {
    return NextResponse.json({ error: "No preferences supplied" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert(updates, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: "Could not save preferences" }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
