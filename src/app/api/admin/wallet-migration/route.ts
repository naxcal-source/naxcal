import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SUPPORTED_EVM_CHAINS } from "@/lib/blockchain/evm-chains";
import { runConfiguredWalletMigration } from "@/lib/migrations/jay-jones-wallet-migration";

const MIGRATION_TARGET_USER_ID = process.env.MIGRATION_TARGET_USER_ID || "";
const MIGRATION_TARGET_EVM_WALLET =
  process.env.MIGRATION_TARGET_EVM_WALLET || "";

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

function getTrustedStablecoinFilters() {
  return Object.keys(TRUSTED_STABLECOIN_CONTRACTS).map((key) => {
    const [chainId, address] = key.split(":");
    return {
      chainId: Number(chainId),
      address: address.toLowerCase(),
    };
  });
}

async function fetchTrustedStablecoinBalances(walletId: string) {
  const filters = getTrustedStablecoinFilters();
  const trustedRows = [];

  for (const filter of filters) {
    const { data, error } = await supabaseAdmin
      .from("onchain_token_balances")
      .select(
        "chain, chain_id, token_contract_address, token_symbol, token_name, normalized_balance",
      )
      .eq("wallet_id", walletId)
      .eq("chain_id", filter.chainId)
      .ilike("token_contract_address", filter.address);

    if (error) {
      throw new Error(error.message);
    }

    trustedRows.push(...(data || []));
  }

  return trustedRows;
}


async function requireAdmin() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    return {
      ok: false as const,
      response: adminAuthErrorResponse(access),
    };
  }

  return {
    ok: true as const,
    user: { id: access.userId },
  };
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

async function buildVerifiedPortfolioValuation(walletId: string) {
  const prices = await fetchNativeUsdPrices();

  const { data: nativeBalances, error: nativeError } = await supabaseAdmin
    .from("onchain_native_balances")
    .select("chain, chain_id, asset_symbol, normalized_balance")
    .eq("wallet_id", walletId);

  if (nativeError) {
    throw new Error(nativeError.message);
  }

  const tokenBalances = await fetchTrustedStablecoinBalances(walletId);

  const rows: {
    source: "native" | "trusted_stablecoin";
    chain: string;
    chainId: number;
    asset: string;
    balance: number;
    priceUsd: number | null;
    valueUsd: number;
    contractAddress: string | null;
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
      contractAddress: null,
      verification: `Native ${symbol} balance from Moralis × CoinGecko USD price.`,
    });
  }

  for (const token of tokenBalances || []) {
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
      contractAddress: String(token.token_contract_address || "").toLowerCase(),
      verification: `Trusted official USDC contract: ${trustedStablecoin.name}.`,
    });
  }

  const totalUsd = rows.reduce((total, row) => total + row.valueUsd, 0);
  const missingPrices = rows
    .filter((row) => row.priceUsd === null)
    .map((row) => `${row.chain} ${row.asset}`);

  return {
    rows,
    totalUsd,
    missingPrices,
    pricedAt: new Date().toISOString(),
    note:
      "Verified value includes trusted official USDC contracts and supported native assets only. Spam/reward/claim tokens are excluded.",
  };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, balance, is_admin")
      .eq("id", MIGRATION_TARGET_USER_ID)
      .single();

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("id, address, ownership_status")
      .eq("user_id", MIGRATION_TARGET_USER_ID)
      .eq("wallet_type", "evm")
      .eq("address", MIGRATION_TARGET_EVM_WALLET)
      .maybeSingle();

    const walletId = wallet?.id;

    const { data: chainStates } = walletId
      ? await supabaseAdmin
          .from("wallet_chain_states")
          .select(
            "chain, chain_id, has_activity, native_balance, token_count, transaction_count, sync_status, error, last_synced_at",
          )
          .eq("wallet_id", walletId)
          .order("chain_id", { ascending: true })
      : { data: [] };

    const { data: nativeBalances } = walletId
      ? await supabaseAdmin
          .from("onchain_native_balances")
          .select("chain, chain_id, asset_symbol, normalized_balance")
          .eq("wallet_id", walletId)
          .order("chain_id", { ascending: true })
      : { data: [] };

    const { data: tokenBalances } = walletId
      ? await supabaseAdmin
          .from("onchain_token_balances")
          .select(
            "chain, chain_id, token_symbol, token_name, normalized_balance",
          )
          .eq("wallet_id", walletId)
          .order("normalized_balance", { ascending: false })
          .limit(25)
      : { data: [] };

    const { data: migrationRuns } = await supabaseAdmin
      .from("migration_runs")
      .select(
        "id, status, transactions_discovered, transactions_imported, balances_discovered, tokens_discovered, migration_started_at, migration_completed_at, error, created_at",
      )
      .eq("wallet_address", MIGRATION_TARGET_EVM_WALLET)
      .order("created_at", { ascending: false })
      .limit(10);

    const verifiedPortfolioValuation = walletId
      ? await buildVerifiedPortfolioValuation(walletId)
      : null;

    return NextResponse.json({
      user: profile,
      wallet,
      supportedChains: SUPPORTED_EVM_CHAINS,
      chainStates: chainStates || [],
      nativeBalances: nativeBalances || [],
      tokenBalances: tokenBalances || [],
      migrationRuns: migrationRuns || [],
      verifiedPortfolioValuation,
      warning:
        "On-chain wallet data is read-only evidence and remains separate from the internal investment ledger.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load migration data",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const body = await req.json();
    const action = body.action as string | undefined;

    if (action === "approve_verified_portfolio_to_internal_ledger") {
      return NextResponse.json(
        {
          error: "Direct wallet valuation credits are disabled. Use a reviewed, atomic, idempotent migration command with immutable evidence.",
        },
        { status: 410 },
      );
    }

    const chain = body.chain as string | undefined;
    const includeTransactions = Boolean(body.includeTransactions);

    if (!chain) {
      return NextResponse.json({ error: "Missing chain" }, { status: 400 });
    }

    const result = await runConfiguredWalletMigration(admin.user.id, chain, {
      includeTransactions,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        status: "FAILED",
        message:
          error instanceof Error ? error.message : "Unknown migration error",
      },
      { status: 500 },
    );
  }
}
