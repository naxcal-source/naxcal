import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { createClient } from "@/lib/supabase-server";

function normaliseAmount(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500);
  const type = searchParams.get("type");

  const client = await createClient();

  let internalQuery = client
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type && type !== "all") {
    internalQuery = internalQuery.eq("type", type);
  }

  const { data: internalTxs, error: internalError } = await internalQuery;

  if (internalError) {
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }

  const shouldIncludeOnchain = !type || type === "all" || type === "onchain";

  let onchainRows: any[] = [];

  if (shouldIncludeOnchain) {
    const { data: transfers } = await client
      .from("onchain_transfers")
      .select("*")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(limit);

    const transferRows = (transfers || []).map((tx) => {
      const amount = normaliseAmount(tx.normalized_amount);
      const direction = String(tx.transfer_type || "").toLowerCase();

      return {
        id: `onchain-transfer-${tx.id}`,
        type: direction === "out" || direction === "send" ? "onchain_send" : "onchain_receive",
        amount,
        asset: tx.asset_symbol || "CRYPTO",
        status: "completed",
        description: `${tx.asset_symbol || "Crypto"} ${direction === "out" || direction === "send" ? "sent" : "received"} on ${tx.chain}`,
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

    const { data: transactions } = await client
      .from("onchain_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(limit);

    const transactionRows = (transactions || []).map((tx) => {
      const amount = normaliseAmount(tx.native_value);
      const isOutgoing = String(tx.from_address || "").toLowerCase() === String(tx.wallet_address || "").toLowerCase();

      return {
        id: `onchain-transaction-${tx.id}`,
        type: isOutgoing ? "onchain_send" : "onchain_activity",
        amount,
        asset:
          tx.chain_id === 56
            ? "BNB"
            : tx.chain_id === 137
              ? "MATIC"
              : tx.chain_id === 43114
                ? "AVAX"
                : "ETH",
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

    const seen = new Set<string>();
    onchainRows = [...transferRows, ...transactionRows].filter((tx) => {
      const key = `${tx.chain_id}:${tx.tx_hash}:${tx.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
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
}
