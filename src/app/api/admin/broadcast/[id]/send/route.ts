import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-api";
import { logAdminAction } from "@/lib/audit-log";
import { getBroadcast, sendBroadcastNow } from "@/lib/resend-admin";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  try {
    const broadcast = await getBroadcast(id);
    if (broadcast?.status !== "draft") {
      return NextResponse.json({ error: `Broadcast is already "${broadcast?.status}", refusing to send again` }, { status: 400 });
    }

    const result = await sendBroadcastNow(id);
    await logAdminAction(admin.userId, "broadcast_sent", undefined, { broadcastId: id, subject: broadcast.subject });
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
