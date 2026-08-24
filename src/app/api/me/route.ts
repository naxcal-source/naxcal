import { NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PROFILE_SELECT = "id, email, full_name, phone, date_of_birth, nationality, address, city, country, postal_code, kyc_status, tier, balance, total_deposited, total_withdrawn, total_profit, referral_code, referred_by, auto_compound, two_factor_enabled, is_active, display_currency, notification_preferences, created_at, updated_at, withdrawal_pin";

const EDITABLE_FIELDS = new Set([
  "full_name", "phone", "date_of_birth", "nationality", "address", "city",
  "country", "postal_code", "auto_compound", "display_currency", "referral_code", "notification_preferences",
]);

const NOTIFICATION_KEYS = new Set(["daily_profit", "deposit", "withdrawal", "security", "marketing", "announcements"]);

function sanitizeNotificationPreferences(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value).filter(([key, enabled]) => NOTIFICATION_KEYS.has(key) && typeof enabled === "boolean"),
  );
}

export async function GET() {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Prefer service role (bypasses RLS); fall back to user's own session (RLS allows own profile reads)
  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (!data.full_name) {
    data.full_name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Investor";
  }
  data.email = data.email || user.email;
  const { withdrawal_pin: withdrawalPin, ...safeProfile } = data;
  return NextResponse.json({
    ...safeProfile,
    has_withdrawal_pin: Boolean(withdrawalPin),
  });
}

export async function PATCH(req: Request) {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = await req.json();
  const updates = Object.fromEntries(
    Object.entries(input).filter(([key]) => EDITABLE_FIELDS.has(key)),
  );
  if ("notification_preferences" in updates) {
    const preferences = sanitizeNotificationPreferences(updates.notification_preferences);
    if (!preferences || Object.keys(preferences).length === 0) {
      return NextResponse.json({ error: "Invalid notification preferences" }, { status: 400 });
    }
    updates.notification_preferences = preferences;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  }

  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
  const { error } = await client.from("profiles").update(updates).eq("id", user.id);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
