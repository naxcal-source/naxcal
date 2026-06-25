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
  const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return {
    subject: `${name}, we'd like to offer you exclusive access to Naxcal Capital`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Exclusive Invitation — Naxcal Capital</title>
</head>
<body style="margin:0;padding:0;background:#080b0f;font-family:${F};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#080b0f">Up to 2.1% daily returns on your capital — FCA regulated, fully transparent, withdraw anytime. &#8203;&nbsp;&#xfeff;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080b0f">
<tr><td align="center" style="padding:48px 16px 64px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

  <!-- TOP BAR -->
  <tr><td style="padding-bottom:28px;text-align:center">
    <img src="https://naxcal.com/Naxcal_Primary_Logo.png" alt="Naxcal Capital" height="40" style="height:40px;width:auto;display:inline-block" />
  </td></tr>

  <!-- HERO CARD -->
  <tr><td style="border-radius:20px 20px 0 0;overflow:hidden;background:linear-gradient(145deg,#0c1e19 0%,#071510 40%,#060d18 100%);border:1px solid rgba(26,138,110,0.25);border-bottom:none;padding:56px 48px 48px;text-align:center">
    <div style="display:inline-block;background:rgba(240,165,0,0.1);border:1px solid rgba(240,165,0,0.3);color:#f0a500;font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;padding:6px 16px;border-radius:100px;margin-bottom:28px">Exclusive Invitation</div>
    <h1 style="margin:0 0 20px;font-size:40px;font-weight:900;color:#ffffff;line-height:1.1;letter-spacing:-1px">
      The returns your<br>portfolio is missing.
    </h1>
    <p style="margin:0 auto;max-width:400px;font-size:16px;color:rgba(255,255,255,0.7);line-height:1.75">
      Naxcal Capital is an FCA-regulated investment platform delivering <strong style="color:#22a882">up to 2.1% daily returns</strong> on capital — fully transparent, no lock-in, and accessible 24/7 from your private dashboard.
    </p>
  </td></tr>

  <!-- STATS BAND -->
  <tr><td style="background:#0a1a14;border-left:1px solid rgba(26,138,110,0.25);border-right:1px solid rgba(26,138,110,0.25)">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="25%" style="padding:24px 8px;text-align:center;border-right:1px solid rgba(255,255,255,0.05)">
          <div style="font-size:26px;font-weight:900;color:#22a882;letter-spacing:-0.5px">2.1%</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px;margin-top:4px">Daily Return</div>
        </td>
        <td width="25%" style="padding:24px 8px;text-align:center;border-right:1px solid rgba(255,255,255,0.05)">
          <div style="font-size:26px;font-weight:900;color:#f0a500;letter-spacing:-0.5px">63%</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px;margin-top:4px">Monthly Est.</div>
        </td>
        <td width="25%" style="padding:24px 8px;text-align:center;border-right:1px solid rgba(255,255,255,0.05)">
          <div style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">4,200+</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px;margin-top:4px">Investors</div>
        </td>
        <td width="25%" style="padding:24px 8px;text-align:center">
          <div style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">FCA</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px;margin-top:4px">Regulated</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:#0d1520;border-left:1px solid rgba(26,138,110,0.25);border-right:1px solid rgba(26,138,110,0.25);padding:44px 48px">

    <p style="margin:0 0 16px;font-size:16px;color:rgba(255,255,255,0.85);line-height:1.8;font-weight:500">Dear ${name},</p>

    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.85">
      At Naxcal Capital, we don't advertise. Every investor on our platform arrived through a personal introduction — and that is exactly how we intend to keep it. We are reaching out to you directly because we believe serious capital deserves a serious home.
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.85">
      Our proprietary trading strategies operate across forex, commodities and digital asset markets — generating consistent daily returns that are credited directly to your account balance every 24 hours. Your capital remains entirely your own: visible in real time, accessible whenever you choose, with no management fees eating into your growth.
    </p>

    <!-- PULL QUOTE -->
    <div style="border-left:3px solid #1a8a6e;padding:16px 20px;margin:28px 0;background:rgba(26,138,110,0.07);border-radius:0 8px 8px 0">
      <p style="margin:0;font-size:16px;color:#ffffff;font-weight:700;line-height:1.6">A $500,000 position at Gold tier generates approximately <span style="color:#22a882">$10,500 every single day.</span></p>
      <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.6)">Compounding daily. No lock-in. Withdraw at any time.</p>
    </div>

    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.85">
      We are currently accepting a limited number of new investors before we close our next onboarding window. We would welcome the opportunity to show you what Naxcal can do for your portfolio.
    </p>
  </td></tr>

  <!-- TIER TABLE -->
  <tr><td style="background:#0d1520;border-left:1px solid rgba(26,138,110,0.25);border-right:1px solid rgba(26,138,110,0.25);padding:0 48px 44px">
    <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:2px">Investment Tiers</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.07)">
      <tr style="background:rgba(255,255,255,0.03)">
        <td style="padding:11px 18px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px">Tier</td>
        <td style="padding:11px 18px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px">Minimum</td>
        <td style="padding:11px 18px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px">Daily</td>
        <td style="padding:11px 18px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px">Monthly Est.</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05)">
        <td style="padding:15px 18px"><span style="color:#cd7f32;font-weight:700;font-size:13px">● Bronze</span></td>
        <td style="padding:15px 18px;color:rgba(255,255,255,0.75);font-size:13px">$1,000</td>
        <td style="padding:15px 18px;color:#22a882;font-weight:700;font-size:14px">+1.5%</td>
        <td style="padding:15px 18px;color:rgba(255,255,255,0.75);font-size:13px">~45%</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05)">
        <td style="padding:15px 18px"><span style="color:#c0c0c0;font-weight:700;font-size:13px">● Silver</span></td>
        <td style="padding:15px 18px;color:rgba(255,255,255,0.75);font-size:13px">$10,000</td>
        <td style="padding:15px 18px;color:#22a882;font-weight:700;font-size:14px">+1.8%</td>
        <td style="padding:15px 18px;color:rgba(255,255,255,0.75);font-size:13px">~54%</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.05);background:rgba(240,165,0,0.04)">
        <td style="padding:15px 18px"><span style="color:#f0a500;font-weight:700;font-size:13px">★ Gold</span></td>
        <td style="padding:15px 18px;color:rgba(255,255,255,0.75);font-size:13px">$50,000</td>
        <td style="padding:15px 18px;color:#22a882;font-weight:700;font-size:14px">+2.1%</td>
        <td style="padding:15px 18px;color:rgba(255,255,255,0.75);font-size:13px">~63%</td>
      </tr>
    </table>
  </td></tr>

  <!-- TRUST ROW -->
  <tr><td style="background:#0a1118;border-left:1px solid rgba(26,138,110,0.25);border-right:1px solid rgba(26,138,110,0.25);padding:32px 48px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="25%" style="padding:0 8px 0 0;vertical-align:top">
          <div style="padding:3px 0 3px 12px;border-left:2px solid #1a8a6e">
            <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.75)">FCA Regulated</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px">UK authorised</div>
          </div>
        </td>
        <td width="25%" style="padding:0 8px;vertical-align:top">
          <div style="padding:3px 0 3px 12px;border-left:2px solid #1a8a6e">
            <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.75)">Daily Payouts</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px">Credited 24/7</div>
          </div>
        </td>
        <td width="25%" style="padding:0 8px;vertical-align:top">
          <div style="padding:3px 0 3px 12px;border-left:2px solid #1a8a6e">
            <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.75)">No Lock-in</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px">Withdraw anytime</div>
          </div>
        </td>
        <td width="25%" style="padding:0 0 0 8px;vertical-align:top">
          <div style="padding:3px 0 3px 12px;border-left:2px solid #1a8a6e">
            <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.75)">Zero Fees</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px">No management fee</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="border-radius:0 0 20px 20px;overflow:hidden;background:linear-gradient(145deg,#0c2018 0%,#071a12 100%);border:1px solid rgba(26,138,110,0.25);border-top:1px solid rgba(26,138,110,0.15);padding:48px 48px 52px;text-align:center">
    <h2 style="margin:0 0 10px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px">Your invitation is waiting.</h2>
    <p style="margin:0 auto 32px;max-width:380px;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.75">
      Join over 4,200 investors already growing their wealth with Naxcal. Registration takes under two minutes — no commitment required.
    </p>
    <a href="https://naxcal.com" style="display:inline-block;background:linear-gradient(135deg,#1a8a6e 0%,#22a882 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:18px 52px;border-radius:14px;letter-spacing:0.2px">
      Visit Naxcal Capital →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:rgba(255,255,255,0.45)">Questions? Simply reply to this email — our team will respond within the hour.</p>
  </td></tr>

  <!-- SPACER -->
  <tr><td style="height:32px"></td></tr>

  <!-- FOOTER -->
  <tr><td style="text-align:center;padding:0 16px">
    <img src="https://naxcal.com/Naxcal_Primary_Logo.png" alt="Naxcal" height="24" style="height:24px;width:auto;display:inline-block;opacity:0.25;margin-bottom:14px" />
    <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.4);line-height:1.7">Naxcal Capital LLC is registered and regulated in the United States.<br>Capital is at risk. Past performance is not indicative of future results.</p>
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3)">
      <a href="https://naxcal.com/legal/privacy" style="color:rgba(255,255,255,0.45);text-decoration:none">Privacy</a> &nbsp;·&nbsp;
      <a href="https://naxcal.com/unsubscribe" style="color:rgba(255,255,255,0.45);text-decoration:none">Unsubscribe</a>
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
