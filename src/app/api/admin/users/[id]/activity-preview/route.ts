import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function verifyAdmin() {
  const { user } = await getAuthUserWithClient();
  if (!user) return null;

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!data?.is_admin) return null;
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [
    profileResult,
    cryptoResult,
    internalResult,
    onchainResult,
    internalCountResult,
    onchainCountResult,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", id).single(),

    supabaseAdmin
      .from("crypto_positions")
      .select("*")
      .eq("user_id", id)
      .order("symbol", { ascending: true }),

    supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50),

    supabaseAdmin
      .from("onchain_transactions")
      .select("*")
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
