import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);
  await params;
  return NextResponse.json(
    {
      error:
        "Broadcast sending is disabled until the Resend audience is synchronized with account marketing preferences and suppressions.",
    },
    { status: 410 },
  );
}
