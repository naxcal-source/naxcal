import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function verifyAdmin() {
  const { user } = await getAuthUserWithClient();
  if (!user) return null;
  const { data } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!data?.is_admin) return null;
  return user;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", id).single(),
    supabaseAdmin.from("transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ profile, transactions: transactions ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  if (action === "adjust") {
    const { amount, type, note } = body;
    const { data: profile } = await supabaseAdmin.from("profiles").select("balance").eq("id", id).single();
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const amt = parseFloat(amount);
    const newBal = type === "add" ? Number(profile.balance) + amt : Math.max(0, Number(profile.balance) - amt);

    await supabaseAdmin.from("profiles").update({ balance: newBal }).eq("id", id);
    await supabaseAdmin.from("transactions").insert({
      user_id: id,
      type: type === "add" ? "bonus" : "fee",
      amount: amt,
      status: "completed",
      description: `Admin adjustment: ${note || "Manual balance change"}`,
      balance_before: Number(profile.balance),
      balance_after: newBal,
    });
    return NextResponse.json({ balance: newBal });
  }

  if (action === "kyc") {
    const { status } = body;
    await supabaseAdmin.from("profiles").update({ kyc_status: status }).eq("id", id);
    return NextResponse.json({ status: "ok" });
  }

  if (action === "freeze") {
    const { data: profile } = await supabaseAdmin.from("profiles").select("is_active").eq("id", id).single();
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await supabaseAdmin.from("profiles").update({ is_active: !profile.is_active }).eq("id", id);
    return NextResponse.json({ is_active: !profile.is_active });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
