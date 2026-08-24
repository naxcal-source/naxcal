import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";

export async function POST() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);

  return NextResponse.json(
    {
      error:
        "Direct customer email sending is disabled. Transactional messages must come from a verified ledger or account event, and marketing must pass saved consent and suppression checks.",
    },
    { status: 410 },
  );
}
