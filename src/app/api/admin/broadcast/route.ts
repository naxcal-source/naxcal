import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-api";
import { createDraftBroadcast, listAudiences, listBroadcasts } from "@/lib/resend-admin";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const [audiences, broadcasts] = await Promise.all([listAudiences(), listBroadcasts()]);
    return NextResponse.json({ audiences, broadcasts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { audienceId, name, subject, html } = await req.json();
    if (!audienceId || !name || !subject || !html) {
      return NextResponse.json({ error: "Missing audienceId, name, subject, or html" }, { status: 400 });
    }
    const broadcast = await createDraftBroadcast({ audienceId, name, subject, html });
    return NextResponse.json({ broadcast });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
