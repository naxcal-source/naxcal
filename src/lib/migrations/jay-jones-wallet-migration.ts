import { supabaseAdmin } from "@/lib/supabase-admin";

const JAY_JONES_USER_ID = "f46c9612-c3be-444a-8373-51575e8947aa";
const JAY_JONES_EVM_WALLET = "0xF6D4E5a7c5215F91f59a95065190CCa24bf64554";

const SUPPORTED_EVM_CHAINS = [
  { chain: "Ethereum", chainId: 1, nativeSymbol: "ETH" },
  { chain: "BNB Smart Chain", chainId: 56, nativeSymbol: "BNB" },
  { chain: "Polygon", chainId: 137, nativeSymbol: "MATIC" },
  { chain: "Arbitrum", chainId: 42161, nativeSymbol: "ETH" },
  { chain: "Optimism", chainId: 10, nativeSymbol: "ETH" },
  { chain: "Base", chainId: 8453, nativeSymbol: "ETH" },
  { chain: "Avalanche", chainId: 43114, nativeSymbol: "AVAX" },
];

function isValidEvmAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

type MigrationResult = {
  success: boolean;
  migrationId?: string;
  walletId?: string;
  status: string;
  message: string;
};

export async function runJayJonesWalletMigration(
  administratorId?: string,
): Promise<MigrationResult> {
  if (!isValidEvmAddress(JAY_JONES_EVM_WALLET)) {
    return {
      success: false,
      status: "FAILED",
      message: "Invalid EVM wallet address.",
    };
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", JAY_JONES_USER_ID)
    .single();

  if (userError || !user) {
    return {
      success: false,
      status: "FAILED",
      message: "Jay Jones profile was not found using the supplied UUID.",
    };
  }

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .upsert(
      {
        user_id: JAY_JONES_USER_ID,
        wallet_type: "evm",
        address: JAY_JONES_EVM_WALLET,
        ownership_status: "verification_required",
        source: "admin_migration",
      },
      {
        onConflict: "user_id,wallet_type,address",
      },
    )
    .select()
    .single();

  if (walletError || !wallet) {
    return {
      success: false,
      status: "FAILED",
      message: `Could not register wallet: ${walletError?.message ?? "Unknown error"}`,
    };
  }

  const { data: migration, error: migrationError } = await supabaseAdmin
    .from("migration_runs")
    .insert({
      user_id: JAY_JONES_USER_ID,
      wallet_id: wallet.id,
      administrator_id: administratorId ?? null,
      wallet_address: JAY_JONES_EVM_WALLET,
      status: "OWNERSHIP_VERIFICATION_REQUIRED",
      migration_started_at: new Date().toISOString(),
      error:
        "Wallet was registered but ownership is not verified. Historical import is paused until provider/indexer integration and ownership verification are completed.",
    })
    .select()
    .single();

  if (migrationError || !migration) {
    return {
      success: false,
      status: "FAILED",
      walletId: wallet.id,
      message: `Could not create migration run: ${migrationError?.message ?? "Unknown error"}`,
    };
  }

  for (const chain of SUPPORTED_EVM_CHAINS) {
    const { error: chainError } = await supabaseAdmin
      .from("wallet_chain_states")
      .upsert(
        {
          wallet_id: wallet.id,
          chain: chain.chain,
          chain_id: chain.chainId,
          address: JAY_JONES_EVM_WALLET,
          has_activity: null,
          native_balance: null,
          token_count: 0,
          transaction_count: 0,
          last_synced_block: null,
          last_synced_at: null,
          sync_status: "PAUSED",
          error:
            "Not indexed yet. Provider integration is required before activity, balances, tokens, and transactions can be confirmed.",
        },
        {
          onConflict: "wallet_id,chain_id",
        },
      );

    if (chainError) {
      await supabaseAdmin.from("migration_audit_logs").insert({
        migration_id: migration.id,
        user_id: JAY_JONES_USER_ID,
        wallet_id: wallet.id,
        administrator_id: administratorId ?? null,
        chain: chain.chain,
        wallet_address: JAY_JONES_EVM_WALLET,
        action: "CHAIN_DISCOVERY_PLACEHOLDER",
        status: "FAILED",
        error: chainError.message,
      });
    } else {
      await supabaseAdmin.from("migration_audit_logs").insert({
        migration_id: migration.id,
        user_id: JAY_JONES_USER_ID,
        wallet_id: wallet.id,
        administrator_id: administratorId ?? null,
        chain: chain.chain,
        wallet_address: JAY_JONES_EVM_WALLET,
        action: "CHAIN_DISCOVERY_PLACEHOLDER",
        status: "PAUSED",
        message:
          "Chain registered for future indexing. No balance or transaction values were fabricated.",
      });
    }
  }

  const report = {
    user: {
      id: user.id,
      name: user.full_name ?? "Jay Jones",
      email: user.email,
    },
    wallet: {
      id: wallet.id,
      address: JAY_JONES_EVM_WALLET,
      walletType: "evm",
      ownershipStatus: "verification_required",
    },
    supportedChainsChecked: SUPPORTED_EVM_CHAINS.map((chain) => ({
      chain: chain.chain,
      chainId: chain.chainId,
      hasActivity: null,
      nativeBalance: null,
      tokenCount: 0,
      transactionCount: 0,
      lastIndexedBlock: null,
      lastSynchronizationTime: null,
      syncStatus: "PAUSED",
      error:
        "Unavailable until blockchain provider/indexer is connected and ownership verification is completed.",
    })),
    confirmedOnChainData: {
      nativeAssets: [],
      tokens: [],
      transactions: [],
      balances: [],
    },
    internalPlatformData: {
      investmentBalanceUpdated: false,
      ledgerImpact: "none",
      approvalRequired: true,
    },
    unavailableOrUnsupportedData: SUPPORTED_EVM_CHAINS.map((chain) => ({
      chain: chain.chain,
      reason:
        "Historical on-chain data has not been obtained yet. Provider/indexer integration required.",
    })),
    reconciliationStatus: "NOT_RUN",
  };

  await supabaseAdmin.from("migration_reports").insert({
    migration_id: migration.id,
    user_id: JAY_JONES_USER_ID,
    wallet_id: wallet.id,
    report,
  });

  return {
    success: true,
    migrationId: migration.id,
    walletId: wallet.id,
    status: "OWNERSHIP_VERIFICATION_REQUIRED",
    message:
      "Jay Jones wallet migration record created safely. No internal investment ledger balance was changed.",
  };
}
