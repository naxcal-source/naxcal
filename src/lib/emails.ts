import { Resend } from "resend";
import {
  welcomeEmail, depositConfirmedEmail, dailyProfitEmail,
  kycApprovedEmail, kycRejectedEmail, withdrawalApprovedEmail, withdrawalRejectedEmail, securityAlertEmail,
  investorOutreachEmail,
} from "./email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Naxcal <noreply@naxcal.com>";
const REPLY_TO = "support@naxcal.com";

export async function sendWelcomeEmail(email: string, name: string) {
  const { subject, html } = welcomeEmail(name);
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendKYCApprovedEmail(email: string, name: string) {
  const { subject, html } = kycApprovedEmail(name);
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendKYCRejectedEmail(email: string, name: string, reason: string) {
  const { subject, html } = kycRejectedEmail(name, reason);
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendDepositConfirmedEmail(email: string, name: string, amount: number, currency: string, txHash?: string) {
  const { subject, html } = depositConfirmedEmail(name, amount, currency, txHash || "");
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendWithdrawalRejectedEmail(email: string, name: string, amount: number, reason: string) {
  const { subject, html } = withdrawalRejectedEmail(name, amount, reason);
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendWithdrawalApprovedEmail(email: string, name: string, amount: number, currency?: string, walletAddress?: string) {
  const { subject, html } = withdrawalApprovedEmail(name, amount, currency || "USDT", walletAddress || "");
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendDailyProfitEmail(email: string, name: string, amount: number, percentage: number, totalEarned?: number, balance?: number) {
  const { subject, html } = dailyProfitEmail(name, amount, percentage, totalEarned || 0, balance || 0);
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendInvestorOutreachEmail(email: string, name: string) {
  const { subject, html } = investorOutreachEmail(name);
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}

export async function sendSecurityAlertEmail(email: string, name: string, device: string, location: string) {
  const time = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const { subject, html } = securityAlertEmail(name, device, location, time);
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}
