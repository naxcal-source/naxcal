import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TEXT_FIELDS: Record<string, number> = {
  full_name: 120,
  phone: 40,
  nationality: 80,
  address: 200,
  city: 100,
  country: 100,
  postal_code: 24,
};

function validateProfileUpdates(body: Record<string, unknown>) {
  const updates: Record<string, string | boolean | null> = {};

  for (const [field, maxLength] of Object.entries(TEXT_FIELDS)) {
    if (!(field in body)) continue;
    const value = body[field];

    if (value === null && field !== "full_name") {
      updates[field] = null;
      continue;
    }

    if (typeof value !== "string") return { error: `Invalid ${field}` };
    const trimmed = value.trim();
    if ((field === "full_name" && !trimmed) || trimmed.length > maxLength) {
      return { error: `Invalid ${field}` };
    }
    updates[field] = trimmed || null;
  }

  if ("date_of_birth" in body) {
    const value = body.date_of_birth;
    if (value !== null && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
      return { error: "Invalid date_of_birth" };
    }
    updates.date_of_birth = value as string | null;
  }

  if ("auto_compound" in body) {
    if (typeof body.auto_compound !== "boolean") return { error: "Invalid auto_compound" };
    updates.auto_compound = body.auto_compound;
  }

  if ("display_currency" in body) {
    if (typeof body.display_currency !== "string" || !["USD", "GBP", "EUR"].includes(body.display_currency)) {
      return { error: "Invalid display_currency" };
    }
    updates.display_currency = body.display_currency;
  }

  if ("onboarding_complete" in body) {
    if (body.onboarding_complete !== true) return { error: "Invalid onboarding_complete" };
    updates.onboarding_complete = true;
  }

  return { updates };
}

function serviceRoleConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, phone, date_of_birth, nationality, address, city, country, postal_code, kyc_status, kyc_rejection_reason, tier, balance, total_deposited, total_withdrawn, total_profit, referral_code, referred_by, auto_compound, withdrawal_pin, two_factor_enabled, is_active, onboarding_complete, created_at, updated_at, display_currency")
    .eq("id", user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { withdrawal_pin, ...safeProfile } = data;
  safeProfile.full_name = safeProfile.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Investor";
  safeProfile.email = safeProfile.email || user.email || "";

  return NextResponse.json({
    ...safeProfile,
    has_withdrawal_pin: Boolean(withdrawal_pin),
  });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const validated = validateProfileUpdates(body as Record<string, unknown>);
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const updates = validated.updates || {};
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").update(updates).eq("id", user.id);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
