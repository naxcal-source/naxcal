import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAdminAction } from "@/lib/audit-log";
import { accountValue, getPersistedCryptoValues } from "@/lib/portfolio-value";

const ADMIN_PROFILE_FIELDS = "id, email, full_name, phone, date_of_birth, nationality, address, city, country, postal_code, kyc_status, kyc_rejection_reason, tier, balance, total_deposited, total_withdrawn, total_profit, referral_code, referred_by, auto_compound, is_active, is_admin, created_at, updated_at";
const ADMIN_PROFILE_UPDATES = new Set(["full_name", "phone", "date_of_birth", "nationality", "address", "city", "country", "postal_code", "kyc_status", "kyc_rejection_reason", "tier", "auto_compound", "is_active"]);
const TRANSACTION_UPDATES = new Set(["status", "admin_note"]);

function pickAllowed(input: unknown, allowed: Set<string>) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).filter(([key]) => allowed.has(key)));
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: adminCheck } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const type = req.nextUrl.searchParams.get("type");

    if (type === "profiles") {
      const { data } = await supabaseAdmin.from("profiles").select(ADMIN_PROFILE_FIELDS).order("created_at", { ascending: false });
      const profiles = data || [];
      const cryptoValues = await getPersistedCryptoValues(profiles.map((profile) => profile.id));
      return NextResponse.json(profiles.map((profile) => ({
        ...profile,
        crypto_value: cryptoValues.get(profile.id) || 0,
        account_value: accountValue(profile.balance, cryptoValues.get(profile.id)),
      })));
    }

    if (type === "transactions") {
      const userId = req.nextUrl.searchParams.get("user_id");
      let q = supabaseAdmin.from("transactions").select("*").order("created_at", { ascending: false }).limit(50);
      if (userId) q = q.eq("user_id", userId);
      const { data } = await q;
      return NextResponse.json(data || []);
    }

    if (type === "kyc") {
      const { data } = await supabaseAdmin.from("profiles").select("id, full_name, email, kyc_status, tier, balance, created_at").in("kyc_status", ["pending", "submitted"]).order("created_at", { ascending: true });
      return NextResponse.json(data || []);
    }

    if (type === "withdrawals") {
      const { data } = await supabaseAdmin.from("transactions").select("*, profiles(full_name, email)").eq("type", "withdrawal").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "profile") {
      const userId = req.nextUrl.searchParams.get("user_id");
      if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      const { data } = await supabaseAdmin.from("profiles").select(ADMIN_PROFILE_FIELDS).eq("id", userId).single();
      return NextResponse.json(data);
    }

    if (type === "announcements") {
      const { data } = await supabaseAdmin.from("announcements").select("*").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "daily_profits") {
      const { data } = await supabaseAdmin.from("daily_profits").select("*").order("created_at", { ascending: false }).limit(10);
      return NextResponse.json(data || []);
    }

    if (type === "testimonials") {
      const { data } = await supabaseAdmin.from("testimonials").select("*").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "redirects") {
      const { data } = await supabaseAdmin.from("redirects").select("*").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "audit") {
      const { data } = await supabaseAdmin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      return NextResponse.json(data || []);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: adminCheck } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    if (action === "update_profile") {
      const { user_id, updates } = body;
      const safeUpdates = pickAllowed(updates, ADMIN_PROFILE_UPDATES);
      if (!user_id || Object.keys(safeUpdates).length === 0) return NextResponse.json({ error: "Invalid profile update" }, { status: 400 });
      const { error } = await supabaseAdmin.from("profiles").update(safeUpdates).eq("id", user_id);
      if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
      await logAdminAction(user.id, "update_profile", user_id, { fields: Object.keys(safeUpdates) });
      return NextResponse.json({ status: "ok" });
    }

    if (action === "update_transaction") {
      const { tx_id, updates } = body;
      const safeUpdates = pickAllowed(updates, TRANSACTION_UPDATES);
      if (!tx_id || Object.keys(safeUpdates).length === 0) return NextResponse.json({ error: "Invalid transaction update" }, { status: 400 });
      const { error } = await supabaseAdmin.from("transactions").update(safeUpdates).eq("id", tx_id);
      if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
      await logAdminAction(user.id, "update_transaction", undefined, { transaction_id: tx_id, fields: Object.keys(safeUpdates) });
      return NextResponse.json({ status: "ok" });
    }

    if (action === "insert_transaction") {
      return NextResponse.json({ error: "Use the guarded transaction adjustment endpoint" }, { status: 410 });
    }

    if (action === "manage_announcement") {
      const { operation, data } = body;
      if (operation === "insert") await supabaseAdmin.from("announcements").insert(data);
      if (operation === "update") await supabaseAdmin.from("announcements").update(data).eq("id", data.id);
      if (operation === "delete") await supabaseAdmin.from("announcements").delete().eq("id", data.id);
      return NextResponse.json({ status: "ok" });
    }

    if (action === "manage_redirect") {
      const { operation, data } = body;
      if (operation === "insert") await supabaseAdmin.from("redirects").insert(data);
      if (operation === "delete") await supabaseAdmin.from("redirects").delete().eq("slug", data.slug);
      return NextResponse.json({ status: "ok" });
    }

    if (action === "manage_testimonial") {
      const { operation, data } = body;
      if (operation === "insert") await supabaseAdmin.from("testimonials").insert(data);
      if (operation === "update") await supabaseAdmin.from("testimonials").update(data).eq("id", data.id);
      if (operation === "delete") await supabaseAdmin.from("testimonials").delete().eq("id", data.id);
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
