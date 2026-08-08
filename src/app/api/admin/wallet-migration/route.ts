import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SUPPORTED_EVM_CHAINS } from "@/lib/blockchain/evm-chains";
import { runJayJonesWalletMigration } from "@/lib/migrations/jay-jones-wallet-migration";

const JAY_JONES_USER_ID = "f46c9612-c3be-444a-8373-51575e8947aa";
const JAY_JONES_EVM_WALLET = "0xF6D4E5a7c5215F91f59a95065190CCa24bf64554";

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
