const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function layout(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:${FONT}">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="background:#0a0a0a;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
<img src="https://naxcal.com/Naxcal_Primary_Logo.png" alt="Naxcal" width="180" style="height:56px;width:auto;display:inline-block" />
</div>
<div style="background:#ffffff;padding:40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
${content}
</div>
<div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center">
<p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6">Naxcal Capital Ltd is authorised and regulated by the Financial Conduct Authority.<br>Your capital is at risk. Past performance is not indicative of future results.</p>
<p style="margin:0;font-size:11px;color:#d1d5db">
<a href="https://naxcal.com/unsubscribe" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a> &middot; <a href="https://naxcal.com/dashboard/support" style="color:#9ca3af;text-decoration:underline">Help Centre</a> &middot; <a href="https://naxcal.com/legal/privacy" style="color:#9ca3af;text-decoration:underline">Privacy</a>
</p>
<p style="margin:12px 0 0;font-size:10px;color:#d1d5db">&copy; ${new Date().getFullYear()} Naxcal Capital Ltd. All rights reserved.</p>
</div>
</div></body></html>`;
}

const btn = (text: string, href: string) =>
  `<div style="margin:28px 0"><a href="${href}" style="display:block;padding:15px 32px;background:#1a8a6e;color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:600;font-family:${FONT};text-align:center">${text}</a></div>`;

const divider = `<div style="border-top:1px solid #f3f4f6;margin:24px 0"></div>`;

const row = (label: string, value: string) =>
  `<tr><td style="padding:12px 16px;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6">${label}</td><td style="padding:12px 16px;font-size:14px;color:#0a0a0a;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6">${value}</td></tr>`;

export function welcomeEmail(name: string) {
  return {
    subject: `Welcome to Naxcal, ${name} 👋`,
    html: layout(`
<div style="text-align:center;margin-bottom:24px">
<div style="width:56px;height:56px;border-radius:50%;background:#f0fdf4;display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:56px">✓</div>
</div>
<h2 style="margin:0 0 8px;font-size:24px;color:#0a0a0a;font-weight:700;text-align:center">Welcome to Naxcal</h2>
<p style="margin:0 0 24px;font-size:14px;color:#9ca3af;text-align:center">Your account is ready</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px">Hi ${name}, your Naxcal account has been created successfully. You're now part of a community of 4,200+ investors accessing institutional-grade returns.</p>
<div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:0 0 24px">
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600">Next Steps</p>
<div style="display:flex;align-items:center;gap:12px;margin:0 0 12px"><span style="color:#16a34a;font-size:16px">✓</span><span style="color:#374151;font-size:14px">Account Created</span></div>
<div style="display:flex;align-items:center;gap:12px;margin:0 0 12px"><span style="color:#1a8a6e;font-size:16px">→</span><span style="color:#374151;font-size:14px">Complete Identity Verification</span></div>
<div style="display:flex;align-items:center;gap:12px;margin:0 0 12px"><span style="color:#1a8a6e;font-size:16px">→</span><span style="color:#374151;font-size:14px">Make Your First Deposit</span></div>
<div style="display:flex;align-items:center;gap:12px"><span style="color:#1a8a6e;font-size:16px">→</span><span style="color:#374151;font-size:14px">Start Earning Daily Returns</span></div>
</div>
${btn("Complete Verification →", "https://naxcal.com/dashboard/kyc")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Questions? Reply to this email or visit our <a href="https://naxcal.com/help" style="color:#1a8a6e;text-decoration:none">Help Centre</a></p>
`),
  };
}

export function depositConfirmedEmail(name: string, amount: number, currency: string, txHash: string) {
  const fmt = "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return {
    subject: `Deposit Received — ${fmt} ${currency.toUpperCase()}`,
    html: layout(`
<div style="text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:36px;font-weight:700;color:#1a8a6e">${fmt}</p>
<p style="margin:4px 0 0;font-size:14px;color:#6b7280">${currency.toUpperCase()} Deposit Confirmed</p>
</div>
${divider}
<table style="width:100%;border-collapse:collapse">
${row("Amount Received", fmt)}
${row("Currency", currency.toUpperCase())}
${row("Transaction ID", txHash || "—")}
${row("Status", "✅ Confirmed")}
${row("Date", date)}
${row("Processing Time", "Within 30 minutes")}
</table>
<div style="background:#eff6ff;border-radius:12px;padding:16px 20px;margin:24px 0">
<p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6">💡 Your balance will be updated within 30 minutes. You'll receive another notification once your funds are available to invest.</p>
</div>
${btn("View Dashboard →", "https://naxcal.com/dashboard")}
`),
  };
}

export function dailyProfitEmail(name: string, amount: number, percentage: number, totalEarned: number, balance: number) {
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return {
    subject: `💰 Your daily return: +${fmt(amount)} (${percentage}%)`,
    html: layout(`
<div style="text-align:center;margin-bottom:8px">
<p style="margin:0;font-size:36px;font-weight:700;color:#1a8a6e">+${fmt(amount)}</p>
<p style="margin:4px 0 0;font-size:16px;color:#374151;font-weight:600">Daily Return Posted</p>
<p style="margin:4px 0 0;font-size:13px;color:#9ca3af">${percentage}% return for ${date}</p>
</div>
${divider}
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
<tr>
<td style="text-align:center;padding:16px;width:33%">
<p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase">Today's Return</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#16a34a">+${fmt(amount)}</p>
</td>
<td style="text-align:center;padding:16px;width:33%;border-left:1px solid #f3f4f6;border-right:1px solid #f3f4f6">
<p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase">Total Earned</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#0a0a0a">${fmt(totalEarned)}</p>
</td>
<td style="text-align:center;padding:16px;width:33%">
<p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase">Portfolio Value</p>
<p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#0a0a0a">${fmt(balance)}</p>
</td>
</tr>
</table>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">Hi ${name}, your capital continues to work hard across our diversified trading strategies. Today's return has been added to your portfolio balance.</p>
<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:0 0 24px">
<p style="margin:0;font-size:13px;color:#6b7280">⚙️ Returns are set to <strong>auto-reinvest</strong>. <a href="https://naxcal.com/dashboard/settings" style="color:#1a8a6e;text-decoration:none">Manage in Settings</a></p>
</div>
${btn("View Portfolio →", "https://naxcal.com/dashboard")}
${divider}
<p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;text-align:center">Past performance is not indicative of future results. Capital at risk.</p>
`),
  };
}

export function kycApprovedEmail(name: string) {
  return {
    subject: "Identity Verified — You're all set ✓",
    html: layout(`
<div style="background:#16a34a;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:32px">✓</p>
<p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff">Identity Verified</p>
</div>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px">Great news, ${name}! Your identity has been successfully verified. You now have full access to all Naxcal features.</p>
<div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:0 0 24px">
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600">Features Unlocked</p>
<div style="margin:0 0 10px"><span style="color:#16a34a">✓</span> <span style="color:#374151;font-size:14px">Crypto deposits (BTC, ETH, USDT + 300 more)</span></div>
<div style="margin:0 0 10px"><span style="color:#16a34a">✓</span> <span style="color:#374151;font-size:14px">Daily returns on your investment</span></div>
<div style="margin:0 0 10px"><span style="color:#16a34a">✓</span> <span style="color:#374151;font-size:14px">Withdrawal requests</span></div>
<div><span style="color:#16a34a">✓</span> <span style="color:#374151;font-size:14px">Stock investing (coming soon)</span></div>
</div>
${btn("Make Your First Deposit →", "https://naxcal.com/dashboard/deposit")}
`),
  };
}

export function kycRejectedEmail(name: string, reason: string) {
  return {
    subject: "Action Required — Verification Needs Attention",
    html: layout(`
<div style="background:#f59e0b;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:32px">⚠</p>
<p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff">Verification Unsuccessful</p>
</div>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px">Hi ${name}, we were unable to verify your identity at this time.</p>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 24px">
<p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600">Reason</p>
<p style="margin:0;font-size:14px;color:#dc2626">${reason}</p>
</div>
<p style="color:#374151;font-size:15px;font-weight:600;margin:0 0 12px">What to do:</p>
<ol style="color:#374151;font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px">
<li>Review the rejection reason above</li>
<li>Ensure your document is clear, not expired, and matches your registered name</li>
<li>Take a new photo in good lighting with all corners visible</li>
<li>Resubmit via your account settings</li>
</ol>
${btn("Resubmit Documents →", "https://naxcal.com/dashboard/kyc")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Need help? Contact <a href="mailto:support@naxcal.com" style="color:#1a8a6e;text-decoration:none">support@naxcal.com</a></p>
`),
  };
}

export function withdrawalRejectedEmail(name: string, amount: number, reason: string) {
  const fmt = "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    subject: `Withdrawal Update — ${fmt} Returned to Your Balance`,
    html: layout(`
<div style="background:#ef4444;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:32px">↩</p>
<p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff">Withdrawal Unsuccessful</p>
</div>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px">Hi ${name}, your withdrawal request could not be processed at this time.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 20px">
${row("Requested Amount", fmt)}
${row("Status", "❌ Rejected")}
</table>
${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 20px"><p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:600">Reason</p><p style="margin:0;font-size:14px;color:#dc2626">${reason}</p></div>` : ""}
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:0 0 24px">
<p style="margin:0;font-size:14px;color:#16a34a;font-weight:600">✓ ${fmt} has been returned to your Naxcal balance</p>
<p style="margin:6px 0 0;font-size:13px;color:#6b7280">Your funds are safe and available in your account.</p>
</div>
<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px">If you have any questions or would like to submit a new withdrawal request, please visit your dashboard or contact our support team.</p>
${btn("Return to Dashboard →", "https://naxcal.com/dashboard")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Questions? Contact <a href="mailto:support@naxcal.com" style="color:#1a8a6e;text-decoration:none">support@naxcal.com</a></p>
`),
  };
}

export function withdrawalApprovedEmail(name: string, amount: number, currency: string, walletAddress: string) {
  const fmt = "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const truncAddr = walletAddress ? walletAddress.slice(0, 8) + "..." + walletAddress.slice(-6) : "—";
  return {
    subject: `Withdrawal Approved — ${fmt} on its way`,
    html: layout(`
<div style="text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:14px;color:#6b7280">Withdrawal Processing</p>
<p style="margin:4px 0 0;font-size:36px;font-weight:700;color:#0a0a0a">${fmt}</p>
</div>
${divider}
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
${row("Amount", fmt)}
${row("Currency", (currency || "USDT").toUpperCase())}
${row("Wallet Address", truncAddr)}
${row("Status", "⏳ Processing")}
${row("Expected", "Within 24 hours")}
</table>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 24px">
<p style="margin:0;font-size:14px;color:#dc2626;line-height:1.6">🔐 <strong>Security Notice:</strong> If you did not request this withdrawal, contact us immediately at <a href="mailto:security@naxcal.com" style="color:#dc2626">security@naxcal.com</a></p>
</div>
${btn("View Dashboard →", "https://naxcal.com/dashboard")}
`),
  };
}

export function investorOutreachEmail(name: string) {
  const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return {
    subject: `A private invitation from Naxcal Capital`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Private Invitation — Naxcal Capital</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:${F};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#0a0a0a">Daily returns of 1.5–2.1% on your capital. Regulated. Withdraw anytime. &#8203;&nbsp;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;min-height:100vh">
<tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

  <!-- HEADER -->
  <tr><td style="background:#0d1117;border-radius:16px 16px 0 0;padding:32px 40px;border-bottom:1px solid #1a8a6e;text-align:center">
    <img src="https://naxcal.com/Naxcal_Primary_Logo.png" alt="Naxcal" height="48" style="height:48px;width:auto;display:inline-block" />
    <div style="margin-top:16px">
      <span style="display:inline-block;background:rgba(26,138,110,0.15);border:1px solid rgba(26,138,110,0.4);color:#22a882;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border-radius:100px">Private Invitation</span>
    </div>
  </td></tr>

  <!-- HERO -->
  <tr><td style="background:linear-gradient(160deg,#0d1f1a 0%,#060d10 60%,#0a0a0a 100%);padding:52px 40px 44px;text-align:center">
    <h1 style="margin:0 0 16px;font-size:36px;font-weight:800;color:#ffffff;line-height:1.15;letter-spacing:-0.5px">
      Your capital.<br>Working every single day.
    </h1>
    <p style="margin:0 auto;max-width:420px;font-size:16px;color:rgba(255,255,255,0.75);line-height:1.7">
      Naxcal is a regulated investment platform generating consistent daily returns for a select group of private investors. We'd like to invite you in.
    </p>
  </td></tr>

  <!-- STATS ROW -->
  <tr><td style="background:#0d1117;padding:0 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="33%" style="padding:28px 12px 28px 0;border-right:1px solid rgba(255,255,255,0.06);text-align:center">
          <div style="font-size:32px;font-weight:800;color:#22a882;letter-spacing:-1px">2.1%</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Daily Return</div>
        </td>
        <td width="33%" style="padding:28px 12px;border-right:1px solid rgba(255,255,255,0.06);text-align:center">
          <div style="font-size:32px;font-weight:800;color:#f0a500;letter-spacing:-1px">4,200+</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Active Investors</div>
        </td>
        <td width="33%" style="padding:28px 0 28px 12px;text-align:center">
          <div style="font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-1px">FCA</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Regulated</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="background:#0d1117;padding:0 40px"><div style="height:1px;background:rgba(255,255,255,0.06)"></div></td></tr>

  <!-- BODY COPY -->
  <tr><td style="background:#0d1117;padding:40px 40px 32px">
    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.9);line-height:1.8">Hi ${name},</p>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.8">
      We don't advertise. Naxcal grows through introductions — and you came highly recommended. We're reaching out directly to offer you early access before we close our current onboarding window.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.8">
      Our platform deploys capital across a diversified set of proprietary trading strategies — forex, commodities, and digital assets — with daily returns credited directly to your account balance. No lock-in. No hidden fees. Full transparency.
    </p>
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.8">
      To put it plainly: <strong style="color:#ffffff">a $500,000 position at our Gold tier returns approximately $10,500 per day</strong>. Most of our investors treat it as a self-running income stream while their primary assets continue to grow elsewhere.
    </p>
  </td></tr>

  <!-- TIER TABLE -->
  <tr><td style="background:#0d1117;padding:0 40px 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden">
      <tr style="background:rgba(255,255,255,0.04)">
        <td style="padding:12px 20px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">Tier</td>
        <td style="padding:12px 20px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">Min. Deposit</td>
        <td style="padding:12px 20px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">Daily Return</td>
        <td style="padding:12px 20px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">Monthly Est.</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.06)">
        <td style="padding:16px 20px"><span style="color:#cd7f32;font-weight:700;font-size:14px">Bronze</span></td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">$1,000</td>
        <td style="padding:16px 20px;color:#22a882;font-weight:700;font-size:14px">1.5%</td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">~45%</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.06)">
        <td style="padding:16px 20px"><span style="color:#c0c0c0;font-weight:700;font-size:14px">Silver</span></td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">$10,000</td>
        <td style="padding:16px 20px;color:#22a882;font-weight:700;font-size:14px">1.8%</td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">~54%</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.06);background:rgba(26,138,110,0.06)">
        <td style="padding:16px 20px"><span style="color:#f0a500;font-weight:700;font-size:14px">Gold ✦</span></td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">$50,000</td>
        <td style="padding:16px 20px;color:#22a882;font-weight:700;font-size:14px">2.1%</td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">~63%</td>
      </tr>
    </table>
  </td></tr>

  <!-- TRUST ROW -->
  <tr><td style="background:#0d1117;padding:0 40px 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="33%" style="padding-right:8px">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:20px;margin-bottom:6px">🏛️</div>
            <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.85)">FCA Regulated</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px">Fully authorised</div>
          </div>
        </td>
        <td width="33%" style="padding:0 4px">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:20px;margin-bottom:6px">📊</div>
            <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.85)">Live Dashboard</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px">Real-time balance</div>
          </div>
        </td>
        <td width="33%" style="padding-left:8px">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:20px;margin-bottom:6px">⚡</div>
            <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.85)">Withdraw Anytime</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px">No lock-in period</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="background:linear-gradient(135deg,#0d2420,#0a1a14);padding:44px 40px;text-align:center;border-top:1px solid rgba(26,138,110,0.2)">
    <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:2px;font-weight:600">Your Invitation</p>
    <h2 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff">Ready to see it for yourself?</h2>
    <p style="margin:0 0 28px;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7">Create your account in under 2 minutes. No commitment required.</p>
    <a href="https://naxcal.com" style="display:inline-block;background:linear-gradient(135deg,#1a8a6e,#22a882);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:12px;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(26,138,110,0.4)">Get Started →</a>
    <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.35)">Or reply to this email — we're happy to answer any questions first.</p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#060809;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)">
    <img src="https://naxcal.com/Naxcal_Primary_Logo.png" alt="Naxcal" height="28" style="height:28px;width:auto;display:inline-block;opacity:0.4;margin-bottom:16px" />
    <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.35);line-height:1.7">Naxcal Capital LLC &nbsp;·&nbsp; All rights reserved.<br>Your capital is at risk. Past performance is not indicative of future results.</p>
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25)">
      <a href="https://naxcal.com/legal/privacy" style="color:rgba(255,255,255,0.4);text-decoration:none">Privacy Policy</a> &nbsp;·&nbsp;
      <a href="https://naxcal.com/unsubscribe" style="color:rgba(255,255,255,0.4);text-decoration:none">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`,
  };
}

export function securityAlertEmail(name: string, device: string, location: string, time: string) {
  return {
    subject: "New login to your Naxcal account",
    html: layout(`
<div style="background:#ef4444;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:32px">🔐</p>
<p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff">New Login Detected</p>
</div>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px">Hi ${name}, we detected a new login to your Naxcal account.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
${row("Time", time)}
${row("Device", device)}
${row("Location", location)}
</table>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px"><strong>If this was you</strong> — no action is needed.</p>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px"><strong>If this wasn't you</strong> — secure your account immediately:</p>
<div style="text-align:center;margin:28px 0"><a href="https://naxcal.com/dashboard/settings" style="display:inline-block;padding:14px 32px;background:#ef4444;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;font-family:${FONT}">Secure My Account →</a></div>
`),
  };
}
