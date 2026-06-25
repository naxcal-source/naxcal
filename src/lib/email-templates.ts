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
  const F = "Georgia,'Times New Roman',Times,serif";
  const SF = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return {
    subject: `A private introduction — Naxcal Capital`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Naxcal Capital — Private Introduction</title>
</head>
<body style="margin:0;padding:0;background:#07080a;font-family:${SF};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#07080a">2.1% daily returns. Fully regulated. No lock-in. A private invitation from Naxcal Capital.&#8203;&nbsp;&#xfeff;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#07080a">
<tr><td align="center" style="padding:52px 20px 72px">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%">

  <!-- LETTERHEAD -->
  <tr><td style="text-align:center;padding-bottom:36px">
    <img src="https://naxcal.com/Naxcal_Primary_Logo.png" alt="Naxcal Capital" height="38" style="height:38px;width:auto;display:inline-block" />
    <div style="margin-top:20px;height:1px;background:linear-gradient(90deg,transparent,#c9a84c,transparent)"></div>
    <div style="margin-top:12px;font-family:${SF};font-size:10px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:#c9a84c">Private Client Services</div>
  </td></tr>

  <!-- LETTER BODY -->
  <tr><td style="background:#0c0d10;border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:52px 56px">

    <p style="margin:0 0 32px;font-family:${F};font-size:15px;color:#9ea3b0;font-style:italic;letter-spacing:0.3px">Strictly Private &amp; Confidential</p>

    <p style="margin:0 0 24px;font-family:${SF};font-size:17px;font-weight:400;color:#e8eaf0;line-height:1.6">Dear ${name},</p>

    <p style="margin:0 0 22px;font-family:${SF};font-size:15px;font-weight:300;color:#b0b5c4;line-height:1.9">
      At Naxcal Capital, we do not solicit. Every investor who holds a position with us arrived through a personal referral — and that standard will not change. Your name was brought to our attention by a trusted contact, and on that basis alone we are extending this introduction.
    </p>

    <p style="margin:0 0 22px;font-family:${SF};font-size:15px;font-weight:300;color:#b0b5c4;line-height:1.9">
      We operate proprietary trading strategies across global forex, commodities and digital asset markets. Returns are generated daily and credited directly to your account — no waiting periods, no lock-in, no management fees. Your capital remains yours, visible in real time, accessible whenever you choose.
    </p>

    <p style="margin:0 0 36px;font-family:${SF};font-size:15px;font-weight:300;color:#b0b5c4;line-height:1.9">
      We are currently holding a small number of positions open before our next intake closes. We would be pleased to have you among our investors.
    </p>

    <!-- GOLD DIVIDER -->
    <div style="height:1px;background:rgba(201,168,76,0.2);margin-bottom:36px"></div>

    <!-- STAT ROW -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px">
      <tr>
        <td width="33%" style="text-align:center;padding:0 12px 0 0;border-right:1px solid rgba(255,255,255,0.06)">
          <div style="font-family:${SF};font-size:34px;font-weight:700;color:#1a8a6e;letter-spacing:-1px;line-height:1">2.1%</div>
          <div style="font-family:${SF};font-size:10px;font-weight:500;color:#6b7180;text-transform:uppercase;letter-spacing:2px;margin-top:8px">Daily Return</div>
        </td>
        <td width="33%" style="text-align:center;padding:0 12px;border-right:1px solid rgba(255,255,255,0.06)">
          <div style="font-family:${SF};font-size:34px;font-weight:700;color:#c9a84c;letter-spacing:-1px;line-height:1">4,200+</div>
          <div style="font-family:${SF};font-size:10px;font-weight:500;color:#6b7180;text-transform:uppercase;letter-spacing:2px;margin-top:8px">Active Investors</div>
        </td>
        <td width="33%" style="text-align:center;padding:0 0 0 12px">
          <div style="font-family:${SF};font-size:34px;font-weight:700;color:#e8eaf0;letter-spacing:-1px;line-height:1">$0</div>
          <div style="font-family:${SF};font-size:10px;font-weight:500;color:#6b7180;text-transform:uppercase;letter-spacing:2px;margin-top:8px">Management Fees</div>
        </td>
      </tr>
    </table>

    <!-- GOLD DIVIDER -->
    <div style="height:1px;background:rgba(201,168,76,0.2);margin-bottom:36px"></div>

    <!-- TIER TABLE -->
    <p style="margin:0 0 16px;font-family:${SF};font-size:10px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#6b7180">Investment Tiers</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
        <td style="padding:8px 0;font-family:${SF};font-size:10px;font-weight:600;color:#4a4f5e;text-transform:uppercase;letter-spacing:1.5px">Tier</td>
        <td style="padding:8px 0;font-family:${SF};font-size:10px;font-weight:600;color:#4a4f5e;text-transform:uppercase;letter-spacing:1.5px">Min. Capital</td>
        <td style="padding:8px 0;font-family:${SF};font-size:10px;font-weight:600;color:#4a4f5e;text-transform:uppercase;letter-spacing:1.5px">Daily</td>
        <td style="padding:8px 0;font-family:${SF};font-size:10px;font-weight:600;color:#4a4f5e;text-transform:uppercase;letter-spacing:1.5px;text-align:right">Monthly Est.</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
        <td style="padding:16px 0;font-family:${SF};font-size:13px;font-weight:600;color:#b08050">Bronze</td>
        <td style="padding:16px 0;font-family:${SF};font-size:13px;color:#8a8f9e">$1,000</td>
        <td style="padding:16px 0;font-family:${SF};font-size:14px;font-weight:700;color:#1a8a6e">1.5%</td>
        <td style="padding:16px 0;font-family:${SF};font-size:13px;color:#8a8f9e;text-align:right">~45% / mo</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
        <td style="padding:16px 0;font-family:${SF};font-size:13px;font-weight:600;color:#a0a8b8">Silver</td>
        <td style="padding:16px 0;font-family:${SF};font-size:13px;color:#8a8f9e">$10,000</td>
        <td style="padding:16px 0;font-family:${SF};font-size:14px;font-weight:700;color:#1a8a6e">1.8%</td>
        <td style="padding:16px 0;font-family:${SF};font-size:13px;color:#8a8f9e;text-align:right">~54% / mo</td>
      </tr>
      <tr>
        <td style="padding:16px 0;font-family:${SF};font-size:13px;font-weight:700;color:#c9a84c">Gold</td>
        <td style="padding:16px 0;font-family:${SF};font-size:13px;color:#8a8f9e">$50,000</td>
        <td style="padding:16px 0;font-family:${SF};font-size:14px;font-weight:700;color:#1a8a6e">2.1%</td>
        <td style="padding:16px 0;font-family:${SF};font-size:13px;color:#c9a84c;font-weight:600;text-align:right">~63% / mo</td>
      </tr>
    </table>

    <!-- GOLD DIVIDER -->
    <div style="height:1px;background:rgba(201,168,76,0.2);margin:36px 0"></div>

    <!-- CALLOUT -->
    <div style="background:#0a0d0b;border-left:2px solid #1a8a6e;padding:20px 24px;margin-bottom:36px">
      <p style="margin:0;font-family:${SF};font-size:14px;color:#e8eaf0;line-height:1.7;font-weight:400">
        A $500,000 Gold position returns <strong style="color:#1a8a6e;font-weight:700">$10,500 per day</strong> — credited to your balance every 24 hours, compounding automatically, with no lock-in and no fees deducted.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:12px">
      <a href="https://naxcal.com" style="display:inline-block;background:#1a8a6e;color:#ffffff;text-decoration:none;font-family:${SF};font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;padding:16px 48px;border-radius:3px">
        View Naxcal Capital
      </a>
    </div>
    <p style="margin:16px 0 0;text-align:center;font-family:${SF};font-size:12px;color:#4a4f5e;line-height:1.7">
      Or reply directly to this message — our team responds within the hour.
    </p>

  </td></tr>

  <!-- SPACER -->
  <tr><td style="height:40px"></td></tr>

  <!-- FOOTER -->
  <tr><td style="text-align:center">
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent);margin-bottom:24px"></div>
    <img src="https://naxcal.com/Naxcal_Primary_Logo.png" alt="Naxcal" height="22" style="height:22px;width:auto;display:inline-block;opacity:0.3;margin-bottom:16px" />
    <p style="margin:0 0 10px;font-family:${SF};font-size:11px;color:#3e4250;line-height:1.8">
      Naxcal Capital LLC &nbsp;·&nbsp; Private Client Services<br>
      Capital is at risk. Past performance is not indicative of future results.
    </p>
    <p style="margin:0;font-family:${SF};font-size:11px;color:#2e3040">
      <a href="https://naxcal.com/legal/privacy" style="color:#4a5060;text-decoration:none">Privacy Policy</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="https://naxcal.com/unsubscribe" style="color:#4a5060;text-decoration:none">Unsubscribe</a>
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
