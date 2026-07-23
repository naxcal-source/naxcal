import { Resend } from "resend";
import { unsubscribeUrl } from "./unsubscribe-token";

// Requires a Full-access Resend API key (not the send-only one) — audience
// and broadcast management aren't available to restricted keys.
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Naxcal <noreply@naxcal.us>";
const REPLY_TO = "support@naxcal.us";

export async function listAudiences() {
  const { data, error } = await resend.audiences.list();
  if (error) throw new Error(error.message);
  return data?.data ?? [];
}

export async function listBroadcasts() {
  const { data, error } = await resend.broadcasts.list();
  if (error) throw new Error(error.message);
  return data?.data ?? [];
}

export async function getBroadcast(id: string) {
  const { data, error } = await resend.broadcasts.get(id);
  if (error) throw new Error(error.message);
  return data;
}

export async function createDraftBroadcast(opts: { audienceId: string; name: string; subject: string; html: string }) {
  const { data, error } = await resend.broadcasts.create({
    audienceId: opts.audienceId,
    name: opts.name,
    from: FROM,
    replyTo: REPLY_TO,
    subject: opts.subject,
    html: opts.html,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateDraftBroadcast(id: string, opts: { subject?: string; html?: string; name?: string }) {
  const { data, error } = await resend.broadcasts.update(id, opts);
  if (error) throw new Error(error.message);
  return data;
}

export async function sendBroadcastNow(id: string) {
  const { data, error } = await resend.broadcasts.send(id);
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBroadcast(id: string) {
  const { data, error } = await resend.broadcasts.remove(id);
  if (error) throw new Error(error.message);
  return data;
}

export type AddContactsResult = { added: number; failed: number; failedEmails: string[] };

// Adds pasted emails to an audience one at a time — Resend's contacts API
// has no batch-create endpoint, unlike email sending.
export async function addContactsToAudience(audienceId: string, emails: string[]): Promise<AddContactsResult> {
  let added = 0;
  const failedEmails: string[] = [];
  for (const email of emails) {
    const { error } = await resend.contacts.create({ audienceId, email });
    if (error) failedEmails.push(email);
    else added++;
  }
  return { added, failed: failedEmails.length, failedEmails };
}

// Resend's broadcast API has no "send test" endpoint — it's dashboard-only.
// We replicate it with a normal transactional send to one address. That
// bypasses Resend's own merge-tag resolution, so {{{RESEND_UNSUBSCRIBE_URL}}}
// would otherwise show up as literal broken text — swap in a real link.
export async function sendBroadcastTest(subject: string, html: string, testEmail: string) {
  const resolvedHtml = html.replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", unsubscribeUrl(testEmail));
  const { error } = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: testEmail,
    subject: `[TEST] ${subject}`,
    html: resolvedHtml,
  });
  if (error) throw new Error(error.message);
}
