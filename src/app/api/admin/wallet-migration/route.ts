import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SUPPORTED_EVM_CHAINS } from "@/lib/blockchain/evm-chains";
import { runJayJonesWalletMigration } from "@/lib/migrations/jay-jones-wallet-migration";

const JAY_JONES_USER_ID = "f46c9612-c3be-444a-8373-51575e8947aa";
const JAY_JONES_EVM_WALLET = "0xF6D4E5a7c5215F91f59a95065190CCa24bf64554";

const TRUSTED_STABLECOIN_CONTRACTS: Record<
  string,
  { symbol: string; name: string }
> = {
  // Official Circle USDC contracts only.
  "1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
    symbol: "USDC",
    name: "Ethereum USDC",
  },
  "10:0x0b2c639c533813f4aa9d7837caf62653d097ff85": {
    symbol: "USDC",
    name: "Optimism USDC",
  },
  "137:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": {
    symbol: "USDC",
    name: "Polygon USDC",
  },
  "42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831": {
    symbol: "USDC",
    name: "Arbitrum USDC",
  },
  "43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": {
    symbol: "USDC",
    name: "Avalanche USDC",
  },
  "8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": {
    symbol: "USDC",
    name: "Base USDC",
  },
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


async function approveStablecoinBalancesToInternalLedger(adminUserId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, balance, total_deposited")
    .eq("id", JAY_JONES_USER_ID)
    .single();

  if (profileError || !profile) {
    throw new Error("Jay Jones profile not found.");
  }

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("id, address")
    .eq("user_id", JAY_JONES_USER_ID)
    .eq("wallet_type", "evm")
    .eq("address", JAY_JONES_EVM_WALLET)
    .single();

  if (walletError || !wallet) {
    throw new Error("Jay Jones EVM wallet not found.");
  }

  const { data: tokenBalances, error: tokenError } = await supabaseAdmin
    .from("onchain_token_balances")
    .select("*")
    .eq("wallet_id", wallet.id);

  if (tokenError) {
    throw new Error(tokenError.message);
  }

  const eligibleBalances = (tokenBalances || []).filter((token) => {
    const amount = Number(token.normalized_balance || 0);
    const trustedStablecoin = getTrustedStablecoin(token);

    return amount > 0 && Boolean(trustedStablecoin);
  });

  let currentBalance = Number(profile.balance || 0);
  let currentTotalDeposited = Number(profile.total_deposited || 0);
  let approvedAmount = 0;
  let transactionsCreated = 0;
  const skipped: string[] = [];

  for (const token of eligibleBalances) {
    const amount = Number(token.normalized_balance || 0);
    const trustedStablecoin = getTrustedStablecoin(token);

    if (!trustedStablecoin) {
      skipped.push(
        `${token.chain} ${token.token_symbol} skipped because the contract is not trusted`,
      );
      continue;
    }

    const migrationTxHash = [
      "onchain_migration",
      wallet.id,
      token.chain_id,
      token.token_contract_address,
    ].join(":");

    const { data: existingTransaction } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("user_id", JAY_JONES_USER_ID)
      .eq("tx_hash", migrationTxHash)
      .maybeSingle();

    if (existingTransaction) {
      skipped.push(`${token.chain} ${token.token_symbol} already approved`);
      continue;
    }

    const balanceBefore = currentBalance;
    const balanceAfter = currentBalance + amount;

    const { error: insertError } = await supabaseAdmin.from("transactions").insert({
      user_id: JAY_JONES_USER_ID,
      type: "deposit",
      amount,
      asset: trustedStablecoin.symbol,
      status: "completed",
      description: `Approved on-chain migration credit: ${trustedStablecoin.name}`,
      tx_hash: migrationTxHash,
      wallet_address: JAY_JONES_EVM_WALLET,
      admin_note: `Approved by admin ${adminUserId}. Source: onchain_token_balances.${token.id}. Internal ledger credit created from trusted official stablecoin contract only: ${trustedStablecoin.name}.`,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }

    currentBalance = balanceAfter;
    currentTotalDeposited += amount;
    approvedAmount += amount;
    transactionsCreated += 1;
  }

  if (transactionsCreated > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        balance: currentBalance,
        total_deposited: currentTotalDeposited,
        updated_at: new Date().toISOString(),
      })
      .eq("id", JAY_JONES_USER_ID);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return {
    success: true,
    approvedAmount,
    transactionsCreated,
    skipped,
    message:
      transactionsCreated > 0
        ? `Approved ${approvedAmount.toFixed(8)} trusted USDC value into the internal investment ledger.`
        : "No new eligible trusted USDC balances to approve. Existing approvals were not duplicated.",
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

    return NextResponse.json({
      user: profile,
      wallet,
      supportedChains: SUPPORTED_EVM_CHAINS,
      chainStates: chainStates || [],
      nativeBalances: nativeBalances || [],
      tokenBalances: tokenBalances || [],
      migrationRuns: migrationRuns || [],
      warning:
        "On-chain wallet data is separate from the internal investment ledger. This page does not update the user's internal balance.",
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

    if (action === "approve_stablecoins_to_internal_ledger") {
      const result = await approveStablecoinBalancesToInternalLedger(admin.user.id);
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
