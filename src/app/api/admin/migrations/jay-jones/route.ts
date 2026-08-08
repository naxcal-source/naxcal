import { NextResponse } from "next/server";
import { SUPPORTED_EVM_CHAINS } from "@/lib/blockchain/evm-chains";
import { runJayJonesWalletMigration } from "@/lib/migrations/jay-jones-wallet-migration";

export async function POST(request: Request) {
  try {
    const expectedSecret = process.env.MIGRATION_ADMIN_SECRET;
    const providedSecret = request.headers.get("x-migration-secret");

    if (!expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          status: "FAILED",
          message: "MIGRATION_ADMIN_SECRET is not configured.",
        },
        { status: 500 },
      );
    }

    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          status: "FAILED",
          message: "Unauthorized migration request.",
        },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const chain = url.searchParams.get("chain");

    if (!chain) {
      return NextResponse.json(
        {
          success: false,
          status: "CHAIN_REQUIRED",
          message:
            "Add ?chain=ethereum, bsc, polygon, arbitrum, optimism, base, or avalanche. This endpoint now runs one chain at a time for safety.",
          supportedChains: SUPPORTED_EVM_CHAINS.map((item) => ({
            chain: item.chain,
            chainId: item.chainId,
            key: item.moralisChain,
          })),
        },
        { status: 400 },
      );
    }

    const includeTransactions =
      url.searchParams.get("includeTransactions") === "true";

    const result = await runJayJonesWalletMigration(undefined, chain, {
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
        message: error instanceof Error ? error.message : "Unknown migration error",
      },
      { status: 500 },
    );
  }
}
