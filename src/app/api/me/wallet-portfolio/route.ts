import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

const TRUSTED_STABLECOIN_CONTRACTS: Record<
  string,
  { symbol: string; name: string; priceUsd: number }
> = {
  "1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
    symbol: "USDC",
    name: "Ethereum USDC",
    priceUsd: 1,
  },
  "10:0x0b2c639c533813f4aa9d7837caf62653d097ff85": {
    symbol: "USDC",
    name: "Optimism USDC",
    priceUsd: 1,
  },
  "137:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": {
    symbol: "USDC",
    name: "Polygon USDC",
    priceUsd: 1,
  },
  "42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831": {
    symbol: "USDC",
    name: "Arbitrum USDC",
    priceUsd: 1,
  },
  "43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": {
    symbol: "USDC",
    name: "Avalanche USDC",
    priceUsd: 1,
  },
  "8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": {
    symbol: "USDC",
    name: "Base USDC",
    priceUsd: 1,
  },
};

const NATIVE_ASSET_PRICE_IDS: Record<
  string,
  { symbol: string; coinGeckoId: string }
> = {
  ETH: { symbol: "ETH", coinGeckoId: "ethereum" },
  BNB: { symbol: "BNB", coinGeckoId: "binancecoin" },
  MATIC: { symbol: "MATIC", coinGeckoId: "matic-network" },
  AVAX: { symbol: "AVAX", coinGeckoId: "avalanche-2" },
};

function getTrustedStablecoin(token: {
  chain_id: number | string;
  token_contract_address: string | null;
}) {
  const chainId = Number(token.chain_id);
  const address = String(token.token_contract_address || "").toLowerCase();
  return TRUSTED_STABLECOIN_CONTRACTS[`${chainId}:${address}`];
}

async function fetchNativeUsdPrices() {
  const ids = Object.values(NATIVE_ASSET_PRICE_IDS)
    .map((asset) => asset.coinGeckoId)
    .join(",");

  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", ids);
  url.searchParams.set("vs_currencies", "usd");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko price request failed: ${response.status}`);
  }

  return (await response.json()) as Record<string, { usd?: number }>;
}

async function fetchTrustedStablecoinBalances(walletId: string) {
  const trustedRows = [];

  for (const key of Object.keys(TRUSTED_STABLECOIN_CONTRACTS)) {
    const [chainId, address] = key.split(":");

    const { data, error } = await supabaseAdmin
      .from("onchain_token_balances")
      .select("*")
      .eq("wallet_id", walletId)
      .eq("chain_id", Number(chainId))
      .ilike("token_contract_address", address);

    if (error) {
      throw new Error(error.message);
    }

    trustedRows.push(...(data || []));
  }

  return trustedRows;
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: wallets, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .eq("wallet_type", "evm")
      .order("created_at", { ascending: false })
      .limit(1);

    if (walletError) {
      throw new Error(walletError.message);
    }

    const wallet = wallets?.[0];

    if (!wallet) {
      return NextResponse.json({
        wallet: null,
        rows: [],
        totalUsd: 0,
        pricedAt: new Date().toISOString(),
        note: "No migrated EVM wallet found for this user.",
      });
    }

    const prices = await fetchNativeUsdPrices();

    const { data: nativeBalances, error: nativeError } = await supabaseAdmin
      .from("onchain_native_balances")
      .select("*")
      .eq("wallet_id", wallet.id);

    if (nativeError) {
      throw new Error(nativeError.message);
    }

    const trustedStablecoins = await fetchTrustedStablecoinBalances(wallet.id);

    const rows: {
      source: "native" | "trusted_stablecoin";
      chain: string;
      chainId: number;
      asset: string;
      balance: number;
      priceUsd: number | null;
      valueUsd: number;
      verification: string;
    }[] = [];

    for (const native of nativeBalances || []) {
      const symbol = String(native.asset_symbol || "").toUpperCase();
      const supportedAsset = NATIVE_ASSET_PRICE_IDS[symbol];
      const balance = Number(native.normalized_balance || 0);

      if (!supportedAsset || balance <= 0) continue;

      const priceUsd = prices[supportedAsset.coinGeckoId]?.usd ?? null;
      const valueUsd = priceUsd ? balance * priceUsd : 0;

      rows.push({
        source: "native",
        chain: native.chain,
        chainId: Number(native.chain_id),
        asset: symbol,
        balance,
        priceUsd,
        valueUsd,
        verification: `Native ${symbol} balance valued using live USD price.`,
      });
    }

    for (const token of trustedStablecoins || []) {
      const trustedStablecoin = getTrustedStablecoin(token);
      const balance = Number(token.normalized_balance || 0);

      if (!trustedStablecoin || balance <= 0) continue;

      rows.push({
        source: "trusted_stablecoin",
        chain: token.chain,
        chainId: Number(token.chain_id),
        asset: trustedStablecoin.symbol,
        balance,
        priceUsd: trustedStablecoin.priceUsd,
        valueUsd: balance * trustedStablecoin.priceUsd,
        verification: `Trusted official USDC contract: ${trustedStablecoin.name}.`,
      });
    }

    rows.sort((a, b) => b.valueUsd - a.valueUsd);

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        address: wallet.address,
        ownershipStatus: wallet.ownership_status,
      },
      rows,
      totalUsd: rows.reduce((total, row) => total + row.valueUsd, 0),
      pricedAt: new Date().toISOString(),
      note:
        "This breakdown shows verified migrated on-chain balances only. Spam/reward/claim tokens are excluded.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load wallet portfolio",
      },
      { status: 500 },
    );
  }
}
