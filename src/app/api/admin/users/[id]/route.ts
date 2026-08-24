import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { processEmailOutbox } from "@/lib/email-outbox";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid user" }, { status: 400 });

  const [{ data: profile, error: profileError }, { data: transactions, error: transactionError }] = await Promise.all([
    supabaseAdmin.from("profiles")
      .select("id, email, full_name, phone, date_of_birth, nationality, address, city, country, postal_code, kyc_status, kyc_rejection_reason, tier, balance, total_deposited, total_withdrawn, total_profit, referral_code, referred_by, auto_compound, two_factor_enabled, is_active, onboarding_complete, created_at, updated_at, display_currency")
      .eq("id", id).single(),
    supabaseAdmin.from("transactions")
      .select("id, type, amount, asset, status, description, tx_hash, wallet_address, admin_note, balance_before, balance_after, created_at, updated_at")
      .eq("user_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  if (profileError || !profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (transactionError) return NextResponse.json({ error: "Could not load transactions" }, { status: 500 });
  return NextResponse.json({ profile, transactions: transactions ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid user" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action === "adjust") {
    const amount = Number(body.amount);
    const direction = body.type;
    const reason = typeof body.note === "string" ? body.note.trim() : "";
    const requestKey = req.headers.get("idempotency-key") || "";
    if (!Number.isFinite(amount) || amount <= 0 || !["add", "subtract"].includes(direction)) {
      return NextResponse.json({ error: "Invalid adjustment amount" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.rpc("adjust_user_balance", {
      p_user_id: id,
      p_delta: direction === "add" ? amount : -amount,
      p_reason: reason,
      p_admin_id: admin.userId,
      p_request_key: requestKey,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(data || { status: "applied" });
  }

  if (body.action === "kyc") {
    const decision = body.status;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (!["approved", "rejected"].includes(decision) || (decision === "rejected" && reason.length < 3)) {
      return NextResponse.json({ error: "Invalid KYC review" }, { status: 400 });
    }
    const eventKey = `admin-${crypto.randomUUID()}`;
    const { data, error } = await supabaseAdmin.rpc("apply_kyc_review", {
      p_event_key: eventKey,
      p_user_id: id,
      p_decision: decision,
      p_reason: reason || null,
      p_occurred_at: new Date().toISOString(),
      p_source: "admin",
      p_actor_id: admin.userId,
      p_payload: {},
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    const result = (data || {}) as Record<string, unknown>;
    if (typeof result.dedupe_key === "string") {
      processEmailOutbox({ dedupeKey: result.dedupe_key, limit: 1 }).catch(console.error);
    }
    return NextResponse.json(result);
  }

  if (body.action === "freeze") {
    const desiredState = body.is_active;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (typeof desiredState !== "boolean") {
      return NextResponse.json({ error: "Desired account state is required" }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin.rpc("set_user_active_state", {
      p_user_id: id,
      p_is_active: desiredState,
      p_admin_id: admin.userId,
      p_reason: reason,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json(data || { status: "applied" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
