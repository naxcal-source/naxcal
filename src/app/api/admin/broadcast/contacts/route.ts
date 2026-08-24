import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminAccess } from "@/lib/auth-api";

export async function POST() {
  const admin = await requireAdminAccess();
  if (!admin.ok) return adminAuthErrorResponse(admin);
  return NextResponse.json(
    {
      error:
        "Direct audience additions are disabled until contacts can be synchronized with account marketing preferences and suppressions.",
    },
    { status: 410 },
  );
}
