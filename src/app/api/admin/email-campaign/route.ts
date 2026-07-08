import { NextRequest, NextResponse } from "next/server";
import { getAuthUserWithClient } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logAdminAction } from "@/lib/audit-log";
import { CAMPAIGN_BATCH_SIZE, CampaignContact, dedupeContacts, filterSuppressed, sendCampaignChunk } from "@/lib/email-campaign";

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUserWithClient();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const authClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase;
    const { data: adminProfile } = await authClient.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!adminProfile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { subject, html, contacts } = await req.json();
    if (!subject || !html || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "Missing subject, html, or contacts" }, { status: 400 });
    }
    if (contacts.length > CAMPAIGN_BATCH_SIZE) {
      return NextResponse.json({ error: `Send at most ${CAMPAIGN_BATCH_SIZE} contacts per request` }, { status: 400 });
    }

    const raw: CampaignContact[] = (contacts as Array<{ email?: unknown; name?: unknown }>)
      .filter((c) => typeof c?.email === "string" && c.email.length > 0)
      .map((c) => ({ email: c.email as string, name: typeof c.name === "string" ? c.name : undefined }));

    const deduped = dedupeContacts(raw);
    const eligible = await filterSuppressed(deduped);
    const skipped = deduped.length - eligible.length;

    const result = eligible.length > 0
      ? await sendCampaignChunk(subject, html, eligible)
      : { sent: 0, failed: 0, failedEmails: [] };

    await logAdminAction(user.id, "email_campaign_batch", undefined, {
      subject,
      total: deduped.length,
      skipped,
      sent: result.sent,
      failed: result.failed,
    });

    return NextResponse.json({ total: deduped.length, skipped, sent: result.sent, failed: result.failed, failedEmails: result.failedEmails });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Email campaign error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
