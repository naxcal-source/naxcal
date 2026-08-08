import { supabaseAdmin } from "@/lib/supabase-admin";

export const JAY_JONES_USER_ID = "f46c9612-c3be-444a-8373-51575e8947aa";
export const JAY_JONES_WALLET_ID = "c3b7ed62-e083-42d7-b2bc-03214c9a28bd";

const TRUSTED_USDC_CONTRACTS: Record<string, string> = {
  "1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "Ethereum USDC",
  "10:0x0b2c639c533813f4aa9d7837caf62653d097ff85": "Optimism USDC",
  "137:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": "Polygon USDC",
  "42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831": "Arbitrum USDC",
  "43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": "Avalanche USDC",
  "8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "Base USDC",
};

const NATIVE_ASSETS: Record<string, string> = {
  ETH: "ethereum",
  BNB: "binancecoin",
  MATIC: "matic-network",
  AVAX: "avalanche-2",
};

async function fetchNativePrices() {
  const ids = Object.values(NATIVE_ASSETS).join(",");
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");

  url.searchParams.set("ids", ids);
  url.searchParams.set("vs_currencies", "usd");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko price request failed: ${response.status}`);
  }

  return (await response.json()) as Record<string, { usd?: number }>;
}

export async function syncJayJonesCryptoPositions() {
  const prices = await fetchNativePrices();

  const { data: nativeBalances, error: nativeError } = await supabaseAdmin
    .from("onchain_native_balances")
    .select("*")
    .eq("wallet_id", JAY_JONES_WALLET_ID)
    .eq("user_id", JAY_JONES_USER_ID);

  if (nativeError) throw new Error(nativeError.message);

  const grouped = new Map<string, { qty: number; avg_price: number }>();

  for (const row of nativeBalances || []) {
    const symbol = String(row.asset_symbol || "").toUpperCase();
    const coinGeckoId = NATIVE_ASSETS[symbol];
    const qty = Number(row.normalized_balance || 0);

    if (!coinGeckoId || qty <= 0) continue;

    const price = Number(prices[coinGeckoId]?.usd || 0);
    if (price <= 0) continue;

    const current = grouped.get(symbol) || { qty: 0, avg_price: price };
    current.qty += qty;
    current.avg_price = price;
    grouped.set(symbol, current);
  }

  for (const key of Object.keys(TRUSTED_USDC_CONTRACTS)) {
    const [chainId, address] = key.split(":");

    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from("onchain_token_balances")
      .select("*")
      .eq("wallet_id", JAY_JONES_WALLET_ID)
      .eq("user_id", JAY_JONES_USER_ID)
      .eq("chain_id", Number(chainId))
      .ilike("token_contract_address", address);

    if (tokenError) throw new Error(tokenError.message);

    for (const token of tokens || []) {
      const qty = Number(token.normalized_balance || 0);
      if (qty <= 0) continue;

      const current = grouped.get("USDC") || { qty: 0, avg_price: 1 };
      current.qty += qty;
      current.avg_price = 1;
      grouped.set("USDC", current);
    }
  }

  const positions = Array.from(grouped.entries()).map(([symbol, value]) => ({
    user_id: JAY_JONES_USER_ID,
    symbol,
    qty: value.qty,
    avg_price: value.avg_price,
  }));

  const { error: deleteError } = await supabaseAdmin
    .from("crypto_positions")
    .delete()
    .eq("user_id", JAY_JONES_USER_ID);

  if (deleteError) throw new Error(deleteError.message);

  if (positions.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("crypto_positions")
      .insert(positions);

    if (insertError) throw new Error(insertError.message);
  }

  return {
    userId: JAY_JONES_USER_ID,
    walletId: JAY_JONES_WALLET_ID,
    positions,
    note: "Synced verified native balances and official USDC only. Spam tokens excluded.",
  };
}
