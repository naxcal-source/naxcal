import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Naxcal <noreply@naxcal.com>";

function wrap(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:#080f0c;padding:24px 32px;border-radius:16px 16px 0 0;text-align:center">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#1a8a6e;letter-spacing:1px">NAXCAL</h1>
<p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px">Capital Markets</p>
</div>
<div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none">
<h2 style="margin:0 0 16px;font-size:18px;color:#0f172a">${title}</h2>
${body}
</div>
<div style="background:#f8fafc;padding:20px 32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;text-align:center">
<p style="margin:0;font-size:10px;color:#9ca3af;line-height:1.5">
Naxcal Capital Ltd is authorised and regulated by the Financial Conduct Authority.<br>
Capital at risk. Past performance is not indicative of future results.<br><br>
&copy; ${new Date().getFullYear()} Naxcal. All rights reserved.
</p>
</div>
</div>
</body>
</html>`;
}

export async function sendWelcomeEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to Naxcal — Your Account is Ready",
    html: wrap("Welcome, " + name + "!", `
      <p style="color:#374151;font-size:14px;line-height:1.6">Your Naxcal account has been created successfully. You're now part of a growing community of investors accessing institutional-grade strategies.</p>
      <div style="background:rgba(26,138,110,0.06);border:1px solid rgba(26,138,110,0.15);border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0;font-size:13px;color:#0f172a"><strong>Next steps:</strong></p>
        <ul style="margin:8px 0 0;padding-left:20px;color:#374151;font-size:13px;line-height:1.8">
          <li>Complete KYC verification</li>
          <li>Make your first deposit (min. $50)</li>
          <li>Start earning daily returns</li>
        </ul>
      </div>
      <a href="https://naxcal.com/dashboard" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#1a8a6e,#22a882);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Go to Dashboard</a>
    `),
  });
}

export async function sendKYCApprovedEmail(email: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "KYC Approved — You're Verified",
    html: wrap("Identity Verified", `
      <p style="color:#374151;font-size:14px;line-height:1.6">Congratulations ${name}, your identity has been verified successfully. You now have full access to all Naxcal features.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;text-align:center">
        <p style="margin:0;font-size:24px">&#9989;</p>
        <p style="margin:8px 0 0;font-size:14px;color:#16a34a;font-weight:600">KYC Approved</p>
      </div>
      <p style="color:#374151;font-size:14px;line-height:1.6">You can now deposit, withdraw, and access the full investment platform.</p>
      <a href="https://naxcal.com/dashboard/deposit" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#1a8a6e,#22a882);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Make a Deposit</a>
    `),
  });
}

export async function sendKYCRejectedEmail(email: string, name: string, reason: string) {
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: "KYC Review Update — Action Required",
    html: wrap("Verification Update", `
      <p style="color:#374151;font-size:14px;line-height:1.6">Hi ${name}, we were unable to verify your identity at this time.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:20px 0">
        <p style="margin:0;font-size:13px;color:#374151"><strong>Reason:</strong></p>
        <p style="margin:6px 0 0;font-size:13px;color:#dc2626">${reason}</p>
      </div>
      <p style="color:#374151;font-size:14px;line-height:1.6">Please re-submit your documents from your account settings.</p>
      <a href="https://naxcal.com/dashboard/settings" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#1a8a6e,#22a882);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Update Documents</a>
    `),
  });
}

export async function sendDepositConfirmedEmail(email: string, name: string, amount: number, currency: string) {
  const fmt = "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Deposit Confirmed — ${fmt} Added`,
    html: wrap("Deposit Confirmed", `
      <p style="color:#374151;font-size:14px;line-height:1.6">Hi ${name}, your crypto deposit has been confirmed and credited to your account.</p>
      <div style="background:rgba(26,138,110,0.06);border:1px solid rgba(26,138,110,0.15);border-radius:12px;padding:20px;margin:20px 0;text-align:center">
        <p style="margin:0;font-size:28px;font-weight:700;color:#1a8a6e">${fmt}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">via ${currency} deposit</p>
      </div>
      <p style="color:#374151;font-size:14px;line-height:1.6">Your daily returns will begin accruing from tomorrow.</p>
      <a href="https://naxcal.com/dashboard" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#1a8a6e,#22a882);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">View Dashboard</a>
    `),
  });
}

export async function sendWithdrawalApprovedEmail(email: string, name: string, amount: number) {
  const fmt = "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Withdrawal Processed — ${fmt}`,
    html: wrap("Withdrawal Processed", `
      <p style="color:#374151;font-size:14px;line-height:1.6">Hi ${name}, your withdrawal request has been approved and is being processed.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
        <p style="margin:0;font-size:28px;font-weight:700;color:#0f172a">${fmt}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Withdrawal approved</p>
      </div>
      <p style="color:#374151;font-size:14px;line-height:1.6">Funds will arrive in your wallet within 1-24 hours depending on network conditions.</p>
    `),
  });
}

export async function sendDailyProfitEmail(email: string, name: string, amount: number, percentage: number) {
  const fmt = "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return resend.emails.send({
    from: FROM,
    to: email,
    subject: `Daily Return: +${fmt} (+${percentage}%)`,
    html: wrap("Daily Return Posted", `
      <p style="color:#374151;font-size:14px;line-height:1.6">Hi ${name}, your daily return has been credited to your account.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
        <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a">+${fmt}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280">+${percentage}% daily return</p>
      </div>
      <p style="color:#374151;font-size:14px;line-height:1.6">Your returns are automatically reinvested. Log in to view your updated balance.</p>
      <a href="https://naxcal.com/dashboard" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#1a8a6e,#22a882);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">View Dashboard</a>
    `),
  });
}
