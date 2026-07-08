import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-api";
import { getBroadcast, sendBroadcastTest } from "@/lib/resend-admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  try {
    const { testEmail } = await req.json();
    if (!testEmail) return NextResponse.json({ error: "Missing testEmail" }, { status: 400 });

    const broadcast = await getBroadcast(id);
    if (!broadcast?.html || !broadcast?.subject) {
      return NextResponse.json({ error: "Broadcast has no content yet" }, { status: 400 });
    }

    await sendBroadcastTest(broadcast.subject, broadcast.html, testEmail);
    return NextResponse.json({ status: "sent" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
