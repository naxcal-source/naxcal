import { Resend } from "resend";
import { supabaseAdmin } from "./supabase-admin";
import { unsubscribeUrl } from "./unsubscribe-token";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Naxcal <noreply@naxcal.com>";
const REPLY_TO = "support@naxcal.com";

// Resend's batch endpoint accepts up to 100 emails per request.
export const CAMPAIGN_BATCH_SIZE = 100;
// Gap between batch requests — well under Resend's rate limit, keeps us from
// tripping 429s without meaningfully slowing a ~700-recipient send.
const BATCH_DELAY_MS = 400;

export type CampaignContact = { email: string; name?: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function dedupeContacts(contacts: CampaignContact[]): CampaignContact[] {
  const seen = new Set<string>();
  const out: CampaignContact[] = [];
  for (const c of contacts) {
    const email = c.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({ email, name: c.name?.trim() });
  }
  return out;
}

// Anyone who previously hit /unsubscribe gets dropped before we ever build a send.
export async function filterSuppressed(contacts: CampaignContact[]): Promise<CampaignContact[]> {
  if (contacts.length === 0) return contacts;
  const emails = contacts.map((c) => c.email);
  const { data } = await supabaseAdmin.from("email_suppressions").select("email").in("email", emails);
  const suppressed = new Set((data ?? []).map((r) => r.email));
  return contacts.filter((c) => !suppressed.has(c.email));
}

function personalize(subject: string, html: string, contact: CampaignContact) {
  const name = contact.name || "there";
  const unsubUrl = unsubscribeUrl(contact.email);

  // Support both our own placeholder and Resend Broadcast's reserved merge
  // tag, so the same template file works unmodified through either tool.
  let body = html
    .replaceAll("{{name}}", name)
    .replaceAll("{{unsubscribe_url}}", unsubUrl)
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", unsubUrl);
  // If the pasted HTML didn't include an unsubscribe link, add one — every
  // marketing send needs a working one, not just the transactional templates.
  if (!body.includes(unsubUrl)) {
    const footer = `<p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:24px">You're receiving this because you're a Naxcal contact. <a href="${unsubUrl}" style="color:#9ca3af">Unsubscribe</a></p>`;
    body = body.includes("</body>") ? body.replace("</body>", `${footer}</body>`) : `${body}${footer}`;
  }

  return {
    from: FROM,
    replyTo: REPLY_TO,
    to: contact.email,
    subject: subject.replaceAll("{{name}}", name),
    html: body,
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>, <mailto:${REPLY_TO}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

export type ChunkSendResult = { sent: number; failed: number; failedEmails: string[] };

export async function sendCampaignChunk(subject: string, html: string, contacts: CampaignContact[]): Promise<ChunkSendResult> {
  const payload = contacts.map((c) => personalize(subject, html, c));

  for (let attempt = 0; attempt <= 3; attempt++) {
    const { error } = await resend.batch.send(payload);
    if (!error) return { sent: contacts.length, failed: 0, failedEmails: [] };
    if (error.statusCode === 429 && attempt < 3) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    console.error("Campaign batch send error:", error.message);
    return { sent: 0, failed: contacts.length, failedEmails: contacts.map((c) => c.email) };
  }
  return { sent: 0, failed: contacts.length, failedEmails: contacts.map((c) => c.email) };
}

// Sends the whole list, chunked and paced. Used by the CLI script; the admin
// API route calls sendCampaignChunk directly, one chunk per request, so the
// UI can show real progress instead of one long blocking call.
export async function runEmailCampaign(subject: string, html: string, contacts: CampaignContact[]) {
  const deduped = dedupeContacts(contacts);
  const eligible = await filterSuppressed(deduped);
  const skipped = deduped.length - eligible.length;

  let sent = 0;
  let failed = 0;
  const failedEmails: string[] = [];

  const chunks = chunk(eligible, CAMPAIGN_BATCH_SIZE);
  for (let i = 0; i < chunks.length; i++) {
    const result = await sendCampaignChunk(subject, html, chunks[i]);
    sent += result.sent;
    failed += result.failed;
    failedEmails.push(...result.failedEmails);
    if (i < chunks.length - 1) await sleep(BATCH_DELAY_MS);
  }

  return { total: deduped.length, skipped, sent, failed, failedEmails };
}
