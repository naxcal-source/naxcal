import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SUPPORTED_EVM_CHAINS } from "@/lib/blockchain/evm-chains";
import { runJayJonesWalletMigration } from "@/lib/migrations/jay-jones-wallet-migration";

const JAY_JONES_USER_ID = "f46c9612-c3be-444a-8373-51575e8947aa";
const JAY_JONES_EVM_WALLET = "0xF6D4E5a7c5215F91f59a95065190CCa24bf64554";

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

async function requireAdmin() {
  const user = await getAuthUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: adminCheck } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!adminCheck?.is_admin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    user,
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

async function getJayWallet() {
  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("user_id", JAY_JONES_USER_ID)
    .eq("wallet_type", "evm")
    .eq("address", JAY_JONES_EVM_WALLET)
    .single();

  if (walletError || !wallet) {
    throw new Error("Jay Jones EVM wallet not found.");
  }

  return wallet;
}

async function buildVerifiedPortfolioValuation(walletId: string) {
  const prices = await fetchNativeUsdPrices();

  const { data: nativeBalances, error: nativeError } = await supabaseAdmin
    .from("onchain_native_balances")
    .select("*")
    .eq("wallet_id", walletId);

  if (nativeError) {
    throw new Error(nativeError.message);
  }

  const { data: tokenBalances, error: tokenError } = await supabaseAdmin
    .from("onchain_token_balances")
    .select("*")
    .eq("wallet_id", walletId);

  if (tokenError) {
    throw new Error(tokenError.message);
  }

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

async function approveVerifiedPortfolioToInternalLedger(adminUserId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, balance, total_deposited")
    .eq("id", JAY_JONES_USER_ID)
    .single();

  if (profileError || !profile) {
    throw new Error("Jay Jones profile not found.");
  }

  const wallet = await getJayWallet();
  const valuation = await buildVerifiedPortfolioValuation(wallet.id);

  if (valuation.missingPrices.length > 0) {
    throw new Error(
      `Cannot approve because prices are missing for: ${valuation.missingPrices.join(
        ", ",
      )}`,
    );
  }

  const approvedAmount = Number(valuation.totalUsd.toFixed(2));

  if (approvedAmount <= 0) {
    throw new Error("Verified portfolio value is zero.");
  }

  const verifiedTxHash = `onchain_verified_portfolio:${wallet.id}:v1`;

  const { data: existingVerified } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("user_id", JAY_JONES_USER_ID)
    .eq("tx_hash", verifiedTxHash)
    .maybeSingle();

  if (existingVerified) {
    return {
      success: true,
      approvedAmount: 0,
      transactionsCreated: 0,
      message:
        "Verified on-chain portfolio value was already approved. Duplicate credit skipped.",
    };
  }

  const { data: oldStableApprovals } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("user_id", JAY_JONES_USER_ID)
    .like("tx_hash", "onchain_migration:%")
    .limit(1);

  if ((oldStableApprovals || []).length > 0) {
    throw new Error(
      "Existing on-chain migration approvals were found. Refusing to approve full verified portfolio to avoid double credit.",
    );
  }

  const balanceBefore = Number(profile.balance || 0);
  const balanceAfter = balanceBefore + approvedAmount;
  const totalDepositedBefore = Number(profile.total_deposited || 0);
  const totalDepositedAfter = totalDepositedBefore + approvedAmount;

  const { error: insertError } = await supabaseAdmin.from("transactions").insert({
    user_id: JAY_JONES_USER_ID,
    type: "deposit",
    amount: approvedAmount,
    asset: "USD",
    status: "completed",
    description: "Approved verified on-chain migration portfolio value",
    tx_hash: verifiedTxHash,
    wallet_address: JAY_JONES_EVM_WALLET,
    admin_note: `Approved by admin ${adminUserId}. Verified valuation rows: ${valuation.rows.length}. Priced at ${valuation.pricedAt}. Native prices from CoinGecko. Trusted USDC contracts only. Spam tokens excluded.`,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      balance: balanceAfter,
      total_deposited: totalDepositedAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", JAY_JONES_USER_ID);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await supabaseAdmin.from("migration_audit_logs").insert({
    user_id: JAY_JONES_USER_ID,
    wallet_id: wallet.id,
    administrator_id: adminUserId,
    wallet_address: JAY_JONES_EVM_WALLET,
    action: "APPROVE_VERIFIED_PORTFOLIO_TO_INTERNAL_LEDGER",
    status: "COMPLETED",
    message: `Approved verified on-chain portfolio value of ${approvedAmount.toFixed(
      2,
    )} USD into internal ledger.`,
    metadata: valuation,
  });

  return {
    success: true,
    approvedAmount,
    transactionsCreated: 1,
    valuation,
    message: `Approved verified on-chain portfolio value of $${approvedAmount.toLocaleString()} into the internal investment ledger.`,
  };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, balance, is_admin")
      .eq("id", JAY_JONES_USER_ID)
      .single();

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("user_id", JAY_JONES_USER_ID)
      .eq("wallet_type", "evm")
      .eq("address", JAY_JONES_EVM_WALLET)
      .maybeSingle();

    const walletId = wallet?.id;

    const { data: chainStates } = walletId
      ? await supabaseAdmin
          .from("wallet_chain_states")
          .select("*")
          .eq("wallet_id", walletId)
          .order("chain_id", { ascending: true })
      : { data: [] };

    const { data: nativeBalances } = walletId
      ? await supabaseAdmin
          .from("onchain_native_balances")
          .select("*")
          .eq("wallet_id", walletId)
          .order("chain_id", { ascending: true })
      : { data: [] };

    const { data: tokenBalances } = walletId
      ? await supabaseAdmin
          .from("onchain_token_balances")
          .select("*")
          .eq("wallet_id", walletId)
          .order("normalized_balance", { ascending: false })
          .limit(25)
      : { data: [] };

    const { data: migrationRuns } = await supabaseAdmin
      .from("migration_runs")
      .select("*")
      .eq("wallet_address", JAY_JONES_EVM_WALLET)
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
        "On-chain wallet data is separate from the internal investment ledger until an admin approves the verified valuation.",
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
      const result = await approveVerifiedPortfolioToInternalLedger(admin.user.id);
      return NextResponse.json(result);
    }

    const chain = body.chain as string | undefined;
    const includeTransactions = Boolean(body.includeTransactions);

    if (!chain) {
      return NextResponse.json({ error: "Missing chain" }, { status: 400 });
    }

    const result = await runJayJonesWalletMigration(admin.user.id, chain, {
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
