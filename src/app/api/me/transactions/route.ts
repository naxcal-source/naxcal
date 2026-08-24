import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

function normaliseAmount(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function nativeAssetFromChainId(chainId: number | null | undefined) {
  if (chainId === 56) return "BNB";
  if (chainId === 137) return "MATIC";
  if (chainId === 43114) return "AVAX";
  return "ETH";
}

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);
    const type = searchParams.get("type");

    let internalQuery = supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type && type !== "all" && type !== "onchain") {
      internalQuery = internalQuery.eq("type", type);
    }

    const { data: internalTxs, error: internalError } = await internalQuery;

    if (internalError) {
      console.error("Internal transactions error:", internalError);
      return NextResponse.json(
        { error: "Failed to load internal transactions", details: internalError.message },
        { status: 500 },
      );
    }

    const shouldIncludeOnchain = !type || type === "all" || type === "onchain";

    let onchainRows: Array<Record<string, unknown>> = [];

    if (shouldIncludeOnchain) {
      const { data: transactions, error: onchainError } = await supabaseAdmin
        .from("onchain_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (onchainError) {
        console.error("On-chain transactions error:", onchainError);
      }

      onchainRows = (transactions || []).map((tx) => {
        const amount = normaliseAmount(tx.native_value);

        return {
          id: `onchain-transaction-${tx.id}`,
          type: "onchain_activity",
          amount,
          asset: nativeAssetFromChainId(tx.chain_id),
          status: tx.status || "completed",
          description: `On-chain transaction on ${tx.chain}`,
          created_at: tx.timestamp || tx.created_at,
          balance_before: null,
          balance_after: null,
          tx_hash: tx.tx_hash,
          wallet_address: tx.to_address || tx.from_address,
          source: "onchain",
          chain: tx.chain,
          chain_id: tx.chain_id,
          from_address: tx.from_address,
          to_address: tx.to_address,
        };
      });
    }

    const internalRows = (internalTxs || []).map((tx) => ({
      ...tx,
      source: "internal",
    }));

    const combined = [...internalRows, ...onchainRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    return NextResponse.json(combined);
  } catch (error) {
    console.error("Transactions route error:", error);

    return NextResponse.json(
      {
        error: "Failed to load transactions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
