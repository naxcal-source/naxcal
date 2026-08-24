import { NextResponse } from "next/server";

function requireAdminSecret(request: Request) {
  const expected = process.env.MIGRATION_ADMIN_SECRET;

  if (!expected) return false;

  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const headerSecret = request.headers.get("x-migration-admin-secret");

  return bearer === expected || headerSecret === expected;
}

export async function POST(request: Request) {
  if (!requireAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: "Direct on-chain-to-ledger position replacement is disabled. Use the read-only wallet portfolio and a reviewed atomic migration.",
    },
    { status: 410 },
  );
}
