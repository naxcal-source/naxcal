import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  SUPPORTED_EVM_CHAINS,
  isValidEvmAddress,
} from "@/lib/blockchain/evm-chains";
import {
  getNativeBalance,
  getTokenBalances,
  getWalletTransactions,
} from "@/lib/blockchain/moralis-client";

const JAY_JONES_USER_ID = "f46c9612-c3be-444a-8373-51575e8947aa";
const JAY_JONES_EVM_WALLET = "0xF6D4E5a7c5215F91f59a95065190CCa24bf64554";

type MigrationResult = {
  success: boolean;
  migrationId?: string;
  walletId?: string;
  status: string;
  message: string;
};

export async function runJayJonesWalletMigration(
  administratorId?: string,
  selectedChainKey?: string,
  options?: { includeTransactions?: boolean },
): Promise<MigrationResult> {
  const includeTransactions = options?.includeTransactions ?? false;
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
      status: "IMPORTING",
      migration_started_at: new Date().toISOString(),
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

  const chainsToImport = selectedChainKey
    ? SUPPORTED_EVM_CHAINS.filter(
        (chain) =>
          chain.moralisChain.toLowerCase() === selectedChainKey.toLowerCase() ||
          chain.chain.toLowerCase() === selectedChainKey.toLowerCase() ||
          String(chain.chainId) === selectedChainKey,
      )
    : SUPPORTED_EVM_CHAINS;

  if (chainsToImport.length === 0) {
    await supabaseAdmin
      .from("migration_runs")
      .update({
        status: "FAILED",
        migration_completed_at: new Date().toISOString(),
        error: `Unsupported chain requested: ${selectedChainKey}`,
      })
      .eq("id", migration.id);

    return {
      success: false,
      migrationId: migration.id,
      walletId: wallet.id,
      status: "FAILED",
      message: `Unsupported chain requested: ${selectedChainKey}`,
    };
  }

  let transactionsDiscovered = 0;
  let transactionsImported = 0;
  let balancesDiscovered = 0;
  let tokensDiscovered = 0;
  let failedChains = 0;

  const supportedChainsChecked = [];

  for (const chain of chainsToImport) {
    try {
      await supabaseAdmin.from("migration_audit_logs").insert({
        migration_id: migration.id,
        user_id: JAY_JONES_USER_ID,
        wallet_id: wallet.id,
        administrator_id: administratorId ?? null,
        chain: chain.chain,
        wallet_address: JAY_JONES_EVM_WALLET,
        action: "CHAIN_IMPORT_STARTED",
        status: "IMPORTING",
        message: includeTransactions
          ? `Started Moralis balance, token, and transaction import for ${chain.chain}.`
          : `Started Moralis balance and token import for ${chain.chain}.`,
      });

      const nativeBalance = await getNativeBalance(JAY_JONES_EVM_WALLET, chain);
      const tokenBalances = await getTokenBalances(JAY_JONES_EVM_WALLET, chain);
      const walletTransactions = includeTransactions
        ? await getWalletTransactions(JAY_JONES_EVM_WALLET, chain)
        : { transactions: [], cursor: null };

      const hasNativeBalance =
        nativeBalance.normalizedBalance !== null &&
        nativeBalance.normalizedBalance > 0;

      const hasActivity =
        hasNativeBalance ||
        tokenBalances.length > 0 ||
        walletTransactions.transactions.length > 0;

      if (nativeBalance.rawBalance !== null) {
        balancesDiscovered += 1;

        await supabaseAdmin.from("onchain_native_balances").upsert(
          {
            wallet_id: wallet.id,
            user_id: JAY_JONES_USER_ID,
            chain: chain.chain,
            chain_id: chain.chainId,
            asset_symbol: chain.nativeSymbol,
            raw_balance: nativeBalance.rawBalance,
            normalized_balance: nativeBalance.normalizedBalance,
            raw_provider_payload: nativeBalance.rawProviderPayload,
          },
          {
            onConflict: "wallet_id,chain_id",
          },
        );
      }

      const validTokenBalances = tokenBalances.filter(
        (token) => token.tokenContractAddress,
      );

      tokensDiscovered += validTokenBalances.length;

      for (const token of validTokenBalances) {
        await supabaseAdmin.from("onchain_token_balances").upsert(
          {
            wallet_id: wallet.id,
            user_id: JAY_JONES_USER_ID,
            chain: chain.chain,
            chain_id: chain.chainId,
            token_contract_address: token.tokenContractAddress,
            token_symbol: token.tokenSymbol,
            token_name: token.tokenName,
            token_decimals: token.tokenDecimals,
            raw_balance: token.rawBalance,
            normalized_balance: token.normalizedBalance,
            balance_source: "moralis",
            raw_provider_payload: token.rawProviderPayload,
          },
          {
            onConflict: "wallet_id,chain_id,token_contract_address",
          },
        );
      }

      transactionsDiscovered += walletTransactions.transactions.length;

      for (const tx of walletTransactions.transactions) {
        if (!tx.txHash) {
          continue;
        }

        const { error: txError } = await supabaseAdmin
          .from("onchain_transactions")
          .upsert(
            {
              wallet_id: wallet.id,
              user_id: JAY_JONES_USER_ID,
              chain: chain.chain,
              chain_id: chain.chainId,
              tx_hash: tx.txHash,
              block_number: tx.blockNumber,
              block_hash: tx.blockHash,
              transaction_index: tx.transactionIndex,
              from_address: tx.fromAddress,
              to_address: tx.toAddress,
              status: tx.status,
              native_value: tx.nativeValue,
              gas_used: tx.gasUsed,
              gas_price: tx.gasPrice,
              transaction_fee: tx.transactionFee,
              timestamp: tx.timestamp,
              raw_provider_payload: tx.rawProviderPayload,
            },
            {
              onConflict: "chain_id,tx_hash",
            },
          );

        if (!txError) {
          transactionsImported += 1;
        }
      }

      await supabaseAdmin.from("wallet_chain_states").upsert(
        {
          wallet_id: wallet.id,
          chain: chain.chain,
          chain_id: chain.chainId,
          address: JAY_JONES_EVM_WALLET,
          has_activity: hasActivity,
          native_balance: nativeBalance.normalizedBalance,
          token_count: validTokenBalances.length,
          transaction_count: walletTransactions.transactions.length,
          last_synced_at: new Date().toISOString(),
          sync_status: "COMPLETED",
          error: null,
        },
        {
          onConflict: "wallet_id,chain_id",
        },
      );

      supportedChainsChecked.push({
        chain: chain.chain,
        chainId: chain.chainId,
        hasActivity,
        nativeBalance: nativeBalance.normalizedBalance,
        tokenCount: validTokenBalances.length,
        transactionCount: walletTransactions.transactions.length,
        lastSynchronizationTime: new Date().toISOString(),
        syncStatus: "COMPLETED",
        error: null,
      });
    } catch (error) {
      failedChains += 1;

      const message =
        error instanceof Error ? error.message : "Unknown Moralis import error";

      await supabaseAdmin.from("wallet_chain_states").upsert(
        {
          wallet_id: wallet.id,
          chain: chain.chain,
          chain_id: chain.chainId,
          address: JAY_JONES_EVM_WALLET,
          has_activity: null,
          native_balance: null,
          token_count: 0,
          transaction_count: 0,
          last_synced_at: new Date().toISOString(),
          sync_status: "FAILED",
          error: message,
        },
        {
          onConflict: "wallet_id,chain_id",
        },
      );

      await supabaseAdmin.from("migration_audit_logs").insert({
        migration_id: migration.id,
        user_id: JAY_JONES_USER_ID,
        wallet_id: wallet.id,
        administrator_id: administratorId ?? null,
        chain: chain.chain,
        wallet_address: JAY_JONES_EVM_WALLET,
        action: "CHAIN_IMPORT_FAILED",
        status: "FAILED",
        error: message,
      });

      supportedChainsChecked.push({
        chain: chain.chain,
        chainId: chain.chainId,
        hasActivity: null,
        nativeBalance: null,
        tokenCount: 0,
        transactionCount: 0,
        lastSynchronizationTime: new Date().toISOString(),
        syncStatus: "FAILED",
        error: message,
      });
    }
  }

  const finalStatus =
    failedChains === 0
      ? "COMPLETED"
      : failedChains === chainsToImport.length
        ? "FAILED"
        : "PARTIAL";

  await supabaseAdmin
    .from("migration_runs")
    .update({
      status: finalStatus,
      migration_completed_at: new Date().toISOString(),
      transactions_discovered: transactionsDiscovered,
      transactions_imported: transactionsImported,
      balances_discovered: balancesDiscovered,
      tokens_discovered: tokensDiscovered,
      error:
        failedChains > 0
          ? `${failedChains} chain(s) failed during Moralis import.`
          : null,
    })
    .eq("id", migration.id);

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
    supportedChainsChecked,
    confirmedOnChainData: {
      note:
        "Confirmed records are stored in onchain_native_balances, onchain_token_balances, and onchain_transactions.",
    },
    internalPlatformData: {
      investmentBalanceUpdated: false,
      ledgerImpact: "none",
      approvalRequired: true,
    },
    unavailableOrUnsupportedData: supportedChainsChecked
      .filter((chain) => chain.syncStatus === "FAILED")
      .map((chain) => ({
        chain: chain.chain,
        reason: chain.error,
      })),
    reconciliationStatus: finalStatus === "COMPLETED" ? "MATCHED" : "PARTIAL",
  };

  await supabaseAdmin.from("migration_reports").insert({
    migration_id: migration.id,
    user_id: JAY_JONES_USER_ID,
    wallet_id: wallet.id,
    report,
  });

  return {
    success: finalStatus !== "FAILED",
    migrationId: migration.id,
    walletId: wallet.id,
    status: finalStatus,
    message:
      finalStatus === "COMPLETED"
        ? "Jay Jones Moralis wallet import completed safely. No internal investment ledger balance was changed."
        : "Jay Jones Moralis wallet import finished with limitations. No internal investment ledger balance was changed.",
  };
}
