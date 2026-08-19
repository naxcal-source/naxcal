import { Resend } from "resend";
import fs from "fs";
import path from "path";
import {
  welcomeEmail, depositConfirmedEmail, dailyProfitEmail,
  kycApprovedEmail, kycRejectedEmail, withdrawalApprovedEmail, withdrawalRejectedEmail, withdrawalUnlockedEmail, securityAlertEmail,
  investorOutreachEmail,
} from "./email-templates";
import { migrationSuccessEmail } from "./email-templates";
import { unsubscribeUrl } from "./unsubscribe-token";
import { supabaseAdmin } from "./supabase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Naxcal <noreply@naxcal.us>";
const REPLY_TO = "support@naxcal.us";

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

export async function sendWithdrawalUnlockedEmail(email: string, name: string, balance: number) {
  const { subject, html } = withdrawalUnlockedEmail(name, balance);
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
  const result = await resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });

  // Resend reports API failures in the returned result, so awaiting the call is
  // not enough to make the cron's try/catch observe a rejected delivery.
  if (result.error) {
    throw new Error(`Resend daily profit email failed: ${result.error.message}`);
  }

  return result;
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
  const { subject, html } = investorOutreachEmail(name, unsubUrl);
  return resend.emails.send({
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

export async function sendSecurityAlertEmail(email: string, name: string, device: string, location: string) {
  const time = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const { subject, html } = securityAlertEmail(name, device, location, time);
  return resend.emails.send({ from: FROM, replyTo: REPLY_TO, to: email, subject, html });
}


export async function sendMigrationSuccessEmail(
  email: string,
  name: string,
  integrationWindow = "24 to 48 hours",
  dashboardUrl = "https://naxcal.us/dashboard",
) {
  const { subject, html } = migrationSuccessEmail(name, integrationWindow, dashboardUrl);

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject,
    html,
  });
}

export async function sendEmmettWelcomePackageEmail(email: string) {
  const welcomePackPath = path.join(process.cwd(), "private/email-attachments/emmett-welcome-pack.pdf");
  const agreementPath = path.join(process.cwd(), "private/email-attachments/emmett-client-agreement.pdf");
  const peaceOfMindPath = path.join(process.cwd(), "private/email-attachments/emmett-peace-of-mind-pack.pdf");

  for (const filePath of [welcomePackPath, agreementPath, peaceOfMindPath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing attachment: ${filePath}`);
    }
  }

  const html = `
  <div style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:700px;margin:0 auto;padding:28px 16px;">
      <div style="background:linear-gradient(135deg,#071311 0%,#0b211b 55%,#0f3b31 100%);border-radius:24px;padding:30px;color:#ffffff;box-shadow:0 18px 50px rgba(15,23,42,0.18);">
        <div style="font-size:23px;font-weight:800;letter-spacing:0.08em;margin-bottom:18px;color:#ffffff;">NAXCAL</div>
        <div style="display:inline-block;background:rgba(26,138,110,0.22);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:7px 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#b9eee1;">Client Welcome Package</div>
        <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;color:#ffffff;">Welcome to NAXCAL, Emmett</h1>
        <p style="margin:0;color:#d7eee7;font-size:14px;line-height:1.6;">Your welcome pack, peace of mind guide and client agreement are attached.</p>
      </div>

      <div style="background:#ffffff;border:1px solid #dde7e3;border-radius:18px;margin-top:18px;padding:24px;">
        <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">Hi Emmett,</p>

        <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
          Welcome to NAXCAL. We are pleased to confirm that your account has been onboarded and your client documents are attached for your review.
        </p>

        <div style="background:#eef8f4;border:1px solid #cfe8df;border-radius:14px;padding:16px;margin:18px 0;">
          <div style="font-weight:700;color:#071311;margin-bottom:8px;">Attached documents</div>
          <ol style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.7;">
            <li><strong>NAXCAL Welcome Pack</strong> — explains your account, platform access, investment support, selling and withdrawals.</li>
            <li><strong>NAXCAL Peace of Mind Pack</strong> — explains the checks, account visibility, records and support process designed to keep you informed.</li>
            <li><strong>NAXCAL Client Account Authority Agreement</strong> — pre-filled for your review and signature.</li>
          </ol>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin:18px 0;">
          <div style="font-weight:700;color:#071311;margin-bottom:8px;">How investment support works</div>
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">
            Once funds are received and confirmed, NAXCAL records the account funding, updates the dashboard and may assist with supported investment activity, portfolio monitoring, selling requests and withdrawal processing based on client instruction and account checks.
          </p>
        </div>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:18px 0;">
          <div style="font-weight:700;color:#9a3412;margin-bottom:8px;">Monthly deposits and top-ups</div>
          <p style="margin:0;color:#7c2d12;font-size:14px;line-height:1.7;">
            Monthly deposits or top-ups are optional unless a separate signed funding schedule is agreed. Adding funds regularly may help continue or increase investment activity, but every deposit remains subject to confirmation, account review and standard checks.
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:14px;">
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;width:38%;">Client</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">Emmett Jay Jones</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;">Registered email</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">ejayjonescrypto76@gmail.com</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;">KYC status</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">Approved</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;">Account tier</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">Gold</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;font-weight:700;">Verified wallet</td><td style="padding:11px;word-break:break-all;">0xF6D4E5a7c5215F91f59a95065190CCa24bf64554</td></tr>
        </table>

        <p style="font-size:14px;line-height:1.7;color:#475569;margin:18px 0 0;">
          Please note that investment values can rise and fall, and no return is guaranteed. Withdrawals and transactions may be subject to security, KYC, AML, sanctions, fraud-prevention, liquidity, operational and third-party provider checks.
        </p>

        <p style="font-size:15px;line-height:1.7;margin:22px 0 0;">Kind regards,<br><strong>NAXCAL Team</strong></p>
      </div>
    </div>
  </div>`;

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: "Welcome to NAXCAL - Your Welcome Pack, Agreement and Peace of Mind Guide",
    html,
    attachments: [
      {
        filename: "NAXCAL Welcome Pack - Emmett Jay Jones.pdf",
        content: fs.readFileSync(welcomePackPath),
      },
      {
        filename: "NAXCAL Peace of Mind Pack - Emmett Jay Jones.pdf",
        content: fs.readFileSync(peaceOfMindPath),
      },
      {
        filename: "NAXCAL Client Account Authority Agreement - Emmett Jay Jones.pdf",
        content: fs.readFileSync(agreementPath),
      },
    ],
  });
}

export async function sendTomaWelcomePackageEmail(email: string) {
  const welcomePackPath = path.join(process.cwd(), "private/email-attachments/toma-welcome-pack.pdf");
  const agreementPath = path.join(process.cwd(), "private/email-attachments/toma-client-agreement.pdf");
  const peaceOfMindPath = path.join(process.cwd(), "private/email-attachments/toma-peace-of-mind-pack.pdf");

  for (const filePath of [welcomePackPath, agreementPath, peaceOfMindPath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing attachment: ${filePath}`);
    }
  }

  const html = `
  <div style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:700px;margin:0 auto;padding:28px 16px;">
      <div style="background:linear-gradient(135deg,#071311 0%,#0b211b 55%,#0f3b31 100%);border-radius:24px;padding:30px;color:#ffffff;box-shadow:0 18px 50px rgba(15,23,42,0.18);">
        <div style="font-size:23px;font-weight:800;letter-spacing:0.08em;margin-bottom:18px;color:#ffffff;">NAXCAL</div>
        <div style="display:inline-block;background:rgba(26,138,110,0.22);border:1px solid rgba(255,255,255,0.12);border-radius:999px;padding:7px 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#b9eee1;">Client Welcome Package</div>
        <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;color:#ffffff;">Welcome to NAXCAL, Toma</h1>
        <p style="margin:0;color:#d7eee7;font-size:14px;line-height:1.6;">Your welcome pack, peace of mind guide and client agreement are attached.</p>
      </div>

      <div style="background:#ffffff;border:1px solid #dde7e3;border-radius:18px;margin-top:18px;padding:24px;">
        <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">Hi Toma,</p>

        <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">
          Welcome to NAXCAL. We are pleased to confirm that your account has been onboarded and your client documents are attached for your review.
        </p>

        <div style="background:#eef8f4;border:1px solid #cfe8df;border-radius:14px;padding:16px;margin:18px 0;">
          <div style="font-weight:700;color:#071311;margin-bottom:8px;">Attached documents</div>
          <ol style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.7;">
            <li><strong>NAXCAL Welcome Pack</strong> — explains your account, platform access, investment support, selling and withdrawals.</li>
            <li><strong>NAXCAL Peace of Mind Pack</strong> — explains the checks, account visibility, records and support process designed to keep you informed.</li>
            <li><strong>NAXCAL Client Account Authority Agreement</strong> — pre-filled for your review and signature.</li>
          </ol>
        </div>

        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:18px 0;">
          <div style="font-weight:700;color:#9a3412;margin-bottom:8px;">Monthly deposits and top-ups</div>
          <p style="margin:0;color:#7c2d12;font-size:14px;line-height:1.7;">
            Your current monthly deposit plan is £1,200. Monthly deposits help continue investment activity and may increase the available balance for supported investment opportunities. Each deposit remains subject to confirmation, account review and standard checks.
          </p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:18px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;font-size:14px;">
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;width:38%;">Client</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">Toma Panayotov</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;">Address</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">21 Helmsdale Road, London, SW16 5UT</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;">Registered email</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">panayotovtoma@gmail.com</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;">KYC status</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">Verified</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;">Account tier</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">Gold</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;">Monthly deposit</td><td style="padding:11px;border-bottom:1px solid #e2e8f0;">£1,200</td></tr>
          <tr><td style="padding:11px;background:#f8fafc;font-weight:700;">Verified wallet</td><td style="padding:11px;word-break:break-all;">0x8AfD03c5e96814BE7feA03b5B0a661BfeeD6a90d</td></tr>
        </table>

        <p style="font-size:14px;line-height:1.7;color:#475569;margin:18px 0 0;">
          Please note that investment values can rise and fall, and no return is guaranteed. Withdrawals and transactions may be subject to security, KYC, AML, sanctions, fraud-prevention, liquidity, operational and third-party provider checks.
        </p>

        <p style="font-size:15px;line-height:1.7;margin:22px 0 0;">Kind regards,<br><strong>NAXCAL Team</strong></p>
      </div>
    </div>
  </div>`;

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: "Welcome to NAXCAL - Your Welcome Pack, Agreement and Peace of Mind Guide",
    html,
    attachments: [
      {
        filename: "NAXCAL Welcome Pack - Toma Panayotov.pdf",
        content: fs.readFileSync(welcomePackPath),
      },
      {
        filename: "NAXCAL Peace of Mind Pack - Toma Panayotov.pdf",
        content: fs.readFileSync(peaceOfMindPath),
      },
      {
        filename: "NAXCAL Client Account Authority Agreement - Toma Panayotov.pdf",
        content: fs.readFileSync(agreementPath),
      },
    ],
  });
}
