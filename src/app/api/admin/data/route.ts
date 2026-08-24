import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminAccess();
    if (!admin.ok) return adminAuthErrorResponse(admin);

    const type = req.nextUrl.searchParams.get("type");

    if (type === "profiles") {
      const { data } = await supabaseAdmin.from("profiles")
        .select("id, email, full_name, kyc_status, tier, balance, total_deposited, total_withdrawn, total_profit, is_active, created_at")
        .order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "transactions") {
      const userId = req.nextUrl.searchParams.get("user_id");
      let q = supabaseAdmin.from("transactions")
        .select("id, user_id, type, amount, asset, status, description, tx_hash, wallet_address, admin_note, balance_before, balance_after, created_at, updated_at")
        .order("created_at", { ascending: false }).limit(50);
      if (userId) q = q.eq("user_id", userId);
      const { data } = await q;
      return NextResponse.json(data || []);
    }

    if (type === "kyc") {
      const { data } = await supabaseAdmin.from("profiles").select("id, full_name, email, kyc_status, tier, balance, created_at").in("kyc_status", ["pending", "submitted"]).order("created_at", { ascending: true });
      return NextResponse.json(data || []);
    }

    if (type === "withdrawals") {
      const { data } = await supabaseAdmin.from("transactions")
        .select("id, user_id, amount, asset, wallet_address, status, admin_note, created_at, profiles(full_name, email)")
        .eq("type", "withdrawal").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "profile") {
      const userId = req.nextUrl.searchParams.get("user_id");
      if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      const { data } = await supabaseAdmin.from("profiles")
        .select("id, email, full_name, phone, date_of_birth, nationality, address, city, country, postal_code, kyc_status, kyc_rejection_reason, tier, balance, total_deposited, total_withdrawn, total_profit, referral_code, referred_by, auto_compound, two_factor_enabled, is_active, onboarding_complete, created_at, updated_at, display_currency")
        .eq("id", userId).single();
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
    const admin = await requireAdminAccess();
    if (!admin.ok) return adminAuthErrorResponse(admin);

    const body = await req.json();
    const { action } = body;

    if (["update_profile", "update_transaction", "insert_transaction"].includes(action)) {
      return NextResponse.json({ error: "Generic financial mutations are disabled" }, { status: 410 });
    }

    if (action === "update_kyc") {
      const userId = typeof body.user_id === "string" ? body.user_id : "";
      const decision = body.status;
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
      if (!/^[0-9a-f-]{36}$/i.test(userId) || !["approved", "rejected"].includes(decision)) {
        return NextResponse.json({ error: "Invalid KYC review" }, { status: 400 });
      }
      if (decision === "rejected" && reason.length < 3) {
        return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
      }
      const eventKey = `admin-${crypto.randomUUID()}`;
      const { data, error } = await supabaseAdmin.rpc("apply_kyc_review", {
        p_event_key: eventKey,
        p_user_id: userId,
        p_decision: decision,
        p_reason: reason || null,
        p_occurred_at: new Date().toISOString(),
        p_source: "admin",
        p_actor_id: admin.userId,
        p_payload: {},
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 409 });
      return NextResponse.json(data || { status: "applied" });
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
