import { NextResponse } from "next/server";
import { SUPPORTED_EVM_CHAINS } from "@/lib/blockchain/evm-chains";
import { runJayJonesWalletMigration } from "@/lib/migrations/jay-jones-wallet-migration";
import { syncJayJonesCryptoPositions } from "@/lib/migrations/sync-jay-crypto-positions";

export const maxDuration = 300;

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET || process.env.MIGRATION_ADMIN_SECRET;
  if (!expected) return false;

  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const headerSecret =
    request.headers.get("x-cron-secret") ||
    request.headers.get("x-migration-admin-secret");

  return bearer === expected || headerSecret === expected;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = [];

    for (const chain of SUPPORTED_EVM_CHAINS) {
      const result = await runJayJonesWalletMigration(
        undefined,
        chain.moralisChain,
        { includeTransactions: true },
      );

      results.push({
        chain: chain.chain,
        chainId: chain.chainId,
        status: result.status,
        success: result.success,
        migrationId: result.migrationId,
      });
    }

    const cryptoSync = await syncJayJonesCryptoPositions();

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      chainResults: results,
      cryptoSync,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown cron sync error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
