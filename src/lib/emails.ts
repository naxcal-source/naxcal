import { Resend } from "resend";
import {
  welcomeEmail,
  depositConfirmedEmail,
  dailyProfitEmail,
  profitReconciliationEmail,
  kycApprovedEmail,
  kycRejectedEmail,
  withdrawalApprovedEmail,
  withdrawalCompletedEmail,
  withdrawalProcessingFailedEmail,
  withdrawalRejectedEmail,
  withdrawalUnlockedEmail,
  securityAlertEmail,
  investorOutreachEmail,
  migrationSuccessEmail,
} from "./email-templates";
import { unsubscribeUrl } from "./unsubscribe-token";
import { supabaseAdmin } from "./supabase-admin";

const FROM = "Naxcal <noreply@naxcal.us>";
const REPLY_TO = "support@naxcal.us";

function safeInline(value: string, maxLength = 300) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replaceAll("&", "＆")
    .replaceAll("<", "‹")
    .replaceAll(">", "›")
    .trim()
    .slice(0, maxLength);
}

function safeDashboardUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && (url.hostname === "naxcal.us" || url.hostname.endsWith(".naxcal.us"))) {
      return url.toString();
    }
  } catch {}
  return "https://naxcal.us/dashboard";
}

async function sendEmail(
  options: Parameters<Resend["emails"]["send"]>[0],
  idempotencyKey?: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const resend = new Resend(apiKey);
  const result = idempotencyKey
    ? await resend.emails.send(options, { idempotencyKey })
    : await resend.emails.send(options);
  if (result.error) {
    throw new Error(`Resend email failed: ${result.error.message}`);
  }
  return result;
}

export async function sendWelcomeEmail(email: string, name: string, idempotencyKey?: string) {
  const { subject, html } = welcomeEmail(safeInline(name, 120));
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendKYCApprovedEmail(email: string, name: string, idempotencyKey?: string) {
  const { subject, html } = kycApprovedEmail(safeInline(name, 120));
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendKYCRejectedEmail(email: string, name: string, reason: string, idempotencyKey?: string) {
  const { subject, html } = kycRejectedEmail(safeInline(name, 120), safeInline(reason, 500));
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendDepositConfirmedEmail(
  email: string,
  name: string,
  amount: number,
  currency: string,
  txHash?: string,
  idempotencyKey?: string,
) {
  const { subject, html } = depositConfirmedEmail(
    safeInline(name, 120),
    amount,
    safeInline(currency, 30),
    safeInline(txHash || "", 200),
  );
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendWithdrawalUnlockedEmail(email: string, name: string, balance: number) {
  const { subject, html } = withdrawalUnlockedEmail(safeInline(name, 120), balance);
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendWithdrawalRejectedEmail(
  email: string,
  name: string,
  amount: number,
  reason: string,
  idempotencyKey?: string,
) {
  const { subject, html } = withdrawalRejectedEmail(safeInline(name, 120), amount, safeInline(reason, 500));
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendWithdrawalApprovedEmail(
  email: string,
  name: string,
  amount: number,
  currency?: string,
  walletAddress?: string,
  idempotencyKey?: string,
) {
  const { subject, html } = withdrawalApprovedEmail(
    safeInline(name, 120),
    amount,
    safeInline(currency || "USDT", 30),
    safeInline(walletAddress || "", 200),
  );
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendWithdrawalCompletedEmail(
  email: string,
  name: string,
  amount: number,
  currency: string,
  settlementNetwork: string,
  settlementAmount: string,
  walletAddress: string,
  payoutReference: string,
  fee: number,
  referenceType: string,
  provider: string | undefined,
  outputIndex: number | undefined,
  idempotencyKey?: string,
) {
  const { subject, html } = withdrawalCompletedEmail(
    safeInline(name, 120),
    amount,
    safeInline(currency || "USDT", 30),
    safeInline(settlementNetwork, 80),
    safeInline(settlementAmount, 80),
    safeInline(walletAddress, 200),
    safeInline(payoutReference, 200),
    fee,
    referenceType === "blockchain" ? "blockchain" : "provider",
    provider ? safeInline(provider, 40) : undefined,
    outputIndex,
  );
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendWithdrawalProcessingFailedEmail(
  email: string,
  name: string,
  amount: number,
  reason: string,
  cashBalance: number,
  idempotencyKey?: string,
) {
  const { subject, html } = withdrawalProcessingFailedEmail(
    safeInline(name, 120),
    amount,
    safeInline(reason, 500),
    cashBalance,
  );
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendDailyProfitEmail(
  email: string,
  name: string,
  amount: number,
  percentage: number,
  totalEarned?: number,
  balance?: number,
  idempotencyKey?: string,
  details?: { profitDate?: string; compoundingApplied?: boolean; policyName?: string },
) {
  const { subject, html } = dailyProfitEmail(
    safeInline(name, 120),
    amount,
    percentage,
    totalEarned || 0,
    balance || 0,
    details ? {
      ...details,
      policyName: details.policyName ? safeInline(details.policyName, 120) : undefined,
    } : undefined,
  );
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendProfitReconciliationEmail(
  email: string,
  name: string,
  totalAmount: number,
  startDate: string,
  endDate: string,
  dayCount: number,
  cashBalance: number,
  idempotencyKey?: string,
  details?: {
    overcreditRemoved?: number;
    historicalTotalOnlyRemoved?: number;
    netChange?: number;
  },
) {
  const { subject, html } = profitReconciliationEmail(
    safeInline(name, 120),
    totalAmount,
    safeInline(startDate, 40),
    safeInline(endDate, 40),
    dayCount,
    cashBalance,
    details,
  );
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendInvestorOutreachEmail(email: string, name: string) {
  const normalized = email.trim().toLowerCase();
  const { data: suppressed } = await supabaseAdmin
    .from("email_suppressions")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();
  if (suppressed) return { data: null, error: null, skipped: true };

  const unsubUrl = unsubscribeUrl(normalized);
  const { subject, html } = investorOutreachEmail(safeInline(name, 120), unsubUrl);
  return sendEmail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject,
    html,
    headers: {
      "List-Unsubscribe": `<${unsubUrl}>, <mailto:support@naxcal.us?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

export async function sendSecurityAlertEmail(
  email: string,
  name: string,
  device: string,
  location: string,
  idempotencyKey?: string,
) {
  const time = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const { subject, html } = securityAlertEmail(
    safeInline(name, 120),
    safeInline(device, 300),
    safeInline(location, 100),
    time,
  );
  return sendEmail({ from: FROM, replyTo: REPLY_TO, to: email, subject, html }, idempotencyKey);
}

export async function sendMigrationSuccessEmail(
  email: string,
  name: string,
  integrationWindow = "24 to 48 hours",
  dashboardUrl = "https://naxcal.us/dashboard",
) {
  const { subject, html } = migrationSuccessEmail(
    safeInline(name, 120),
    safeInline(integrationWindow, 80),
    safeDashboardUrl(dashboardUrl),
  );
  return sendEmail({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject,
    html,
  });
}
