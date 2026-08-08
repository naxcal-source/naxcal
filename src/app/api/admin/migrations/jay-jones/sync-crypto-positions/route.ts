import { NextResponse } from "next/server";
import { syncJayJonesCryptoPositions } from "@/lib/migrations/sync-jay-crypto-positions";

function requireAdminSecret(request: Request) {
  const expected = process.env.MIGRATION_ADMIN_SECRET;

  if (!expected) return false;

  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const headerSecret = request.headers.get("x-migration-admin-secret");

  return bearer === expected || headerSecret === expected;
}

export async function POST(request: Request) {
  try {
    if (!requireAdminSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncJayJonesCryptoPositions();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
