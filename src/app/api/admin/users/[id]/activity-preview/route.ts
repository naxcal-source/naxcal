import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const [
    profileResult,
    cryptoResult,
    internalResult,
    onchainResult,
    internalCountResult,
    onchainCountResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, balance, total_profit, total_deposited, tier, kyc_status")
      .eq("id", id)
      .single(),

    supabaseAdmin
      .from("crypto_positions")
      .select("id, symbol, qty, avg_price")
      .eq("user_id", id)
      .order("symbol", { ascending: true }),

    supabaseAdmin
      .from("transactions")
      .select("id, type, amount, asset, status, description, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),

    supabaseAdmin
      .from("onchain_transactions")
      .select("id, chain, native_value, tx_hash, status, timestamp, created_at")
      .eq("user_id", id)
      .order("timestamp", { ascending: false })
      .limit(50),

    supabaseAdmin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id),

    supabaseAdmin
      .from("onchain_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id),
  ]);

  if (profileResult.error || !profileResult.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const cryptoPositions = cryptoResult.data ?? [];
  const cryptoValue = cryptoPositions.reduce((sum, pos) => {
    return sum + Number(pos.qty || 0) * Number(pos.avg_price || 0);
  }, 0);

  const swaps = (internalResult.data ?? []).filter((tx) => tx.type === "swap");
  const profits = (internalResult.data ?? []).filter((tx) => tx.type === "profit");

  return NextResponse.json({
    profile: profileResult.data,
    cryptoPositions,
    cryptoValue,
    internalTransactions: internalResult.data ?? [],
    onchainTransactions: onchainResult.data ?? [],
    swaps,
    profits,
    counts: {
      internalTransactions: internalCountResult.count ?? 0,
      onchainTransactions: onchainCountResult.count ?? 0,
      cryptoPositions: cryptoPositions.length,
    },
  });
}
