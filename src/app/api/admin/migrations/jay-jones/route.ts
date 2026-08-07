import { NextResponse } from "next/server";
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

    const result = await runJayJonesWalletMigration();

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
