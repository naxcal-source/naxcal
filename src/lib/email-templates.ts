import { TIER_DAILY_RATE_PERCENT } from "./profit-policy";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function layout(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:${FONT}">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="background:#0a0a0a;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
<img src="https://naxcal.us/Naxcal_Primary_Logo.png" alt="Naxcal" width="180" style="height:56px;width:auto;display:inline-block" />
</div>
<div style="background:#ffffff;padding:40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
${content}
</div>
<div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center">
<p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6">Investment products involve risk and values can rise or fall.<br>Past performance is not indicative of future results.</p>
<p style="margin:0;font-size:11px;color:#d1d5db">
<a href="https://naxcal.us/unsubscribe" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a> &middot; <a href="https://naxcal.us/dashboard/support" style="color:#9ca3af;text-decoration:underline">Help Centre</a> &middot; <a href="https://naxcal.us/legal/privacy" style="color:#9ca3af;text-decoration:underline">Privacy</a>
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
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px">Hi ${name}, your Naxcal account has been created successfully. You can now complete identity verification and review your account securely online.</p>
<div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:0 0 24px">
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600">Next Steps</p>
<div style="display:flex;align-items:center;gap:12px;margin:0 0 12px"><span style="color:#16a34a;font-size:16px">✓</span><span style="color:#374151;font-size:14px">Account Created</span></div>
<div style="display:flex;align-items:center;gap:12px;margin:0 0 12px"><span style="color:#1a8a6e;font-size:16px">→</span><span style="color:#374151;font-size:14px">Complete Identity Verification</span></div>
<div style="display:flex;align-items:center;gap:12px;margin:0 0 12px"><span style="color:#1a8a6e;font-size:16px">→</span><span style="color:#374151;font-size:14px">Make Your First Deposit</span></div>
<div style="display:flex;align-items:center;gap:12px"><span style="color:#1a8a6e;font-size:16px">→</span><span style="color:#374151;font-size:14px">Review the Monday–Friday Return Policy</span></div>
</div>
${btn("Complete Verification →", "https://naxcal.us/dashboard/kyc")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Questions? Reply to this email or visit our <a href="https://naxcal.us/help" style="color:#1a8a6e;text-decoration:none">Help Centre</a></p>
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
${row("Processing Target", "Typically within 30 minutes")}
</table>
<div style="background:#eff6ff;border-radius:12px;padding:16px 20px;margin:24px 0">
<p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6">💡 Balance updates are typically completed within 30 minutes, but provider and network delays can take longer. You'll receive another notification when the funds are available.</p>
</div>
${btn("View Dashboard →", "https://naxcal.us/dashboard")}
`),
  };
}

export function dailyProfitEmail(
  name: string,
  amount: number,
  percentage: number,
  totalEarned: number,
  balance: number,
  details?: { profitDate?: string; compoundingApplied?: boolean; policyName?: string },
) {
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parsedDate = details?.profitDate ? new Date(`${details.profitDate}T00:00:00Z`) : new Date();
  const date = parsedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const compoundingText = details?.compoundingApplied
    ? "This return is included in the basis for future accruals."
    : "This return is kept separate from the basis for future accruals.";
  return {
    subject: `Profit credited: +${fmt(amount)} (${percentage}%)`,
    html: layout(`
<div style="text-align:center;margin-bottom:8px">
<p style="margin:0;font-size:36px;font-weight:700;color:#1a8a6e">+${fmt(amount)}</p>
<p style="margin:4px 0 0;font-size:16px;color:#374151;font-weight:600">Weekday Profit Posted</p>
<p style="margin:4px 0 0;font-size:13px;color:#9ca3af">${percentage}% effective rate for ${date}</p>
</div>
${divider}
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
<tr>
<td style="text-align:center;padding:16px;width:33%">
<p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase">Return</p>
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
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">Hi ${name}, the weekday profit accrual shown above has been added to your cash balance. Returns are credited Monday through Friday only; weekends are excluded.</p>
${details?.policyName ? `<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 16px">Policy: ${details.policyName}</p>` : ""}
<div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin:0 0 24px">
<p style="margin:0;font-size:13px;color:#6b7280">⚙️ ${compoundingText} <a href="https://naxcal.us/dashboard/settings" style="color:#1a8a6e;text-decoration:none">Manage in Settings</a></p>
</div>
${btn("View Portfolio →", "https://naxcal.us/dashboard")}
${divider}
<p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;text-align:center">Past performance is not indicative of future results. Capital at risk.</p>
`),
  };
}

export function profitReconciliationEmail(
  name: string,
  totalAmount: number,
  startDate: string,
  endDate: string,
  dayCount: number,
  cashBalance: number,
  details?: {
    overcreditRemoved?: number;
    historicalTotalOnlyRemoved?: number;
    netChange?: number;
  },
) {
  const fmt = (value: number) => "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hasLedgerAdjustment = Number.isFinite(details?.overcreditRemoved);
  const overcreditRemoved = hasLedgerAdjustment ? Math.max(details?.overcreditRemoved || 0, 0) : 0;
  const historicalTotalOnlyRemoved = Number.isFinite(details?.historicalTotalOnlyRemoved)
    ? Math.max(details?.historicalTotalOnlyRemoved || 0, 0)
    : 0;
  const netChange = Number.isFinite(details?.netChange)
    ? details?.netChange || 0
    : totalAmount - overcreditRemoved;
  return {
    subject: hasLedgerAdjustment
      ? "Account profit reconciliation completed"
      : `Profit correction completed: +${fmt(totalAmount)}`,
    html: layout(`
<h2 style="margin:0 0 12px;font-size:24px;color:#0a0a0a">Profit correction completed</h2>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px">Hi ${name}, we reviewed your account, posted the missing weekday profit accruals, and reconciled the automated ledger calculations.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
${row("Correction period", `${startDate} to ${endDate}`)}
${row("Accrual weekdays posted", String(dayCount))}
${row("Missing weekday profit credited", `+${fmt(totalAmount)}`)}
${hasLedgerAdjustment ? row("Prior automated over-credit removed", `-${fmt(overcreditRemoved)}`) : ""}
${historicalTotalOnlyRemoved > 0 ? row("Historical profit statistic corrected (no cash impact)", `-${fmt(historicalTotalOnlyRemoved)}`) : ""}
${hasLedgerAdjustment ? row("Net cash-balance change", `${netChange >= 0 ? "+" : "-"}${fmt(Math.abs(netChange))}`) : ""}
${row("Current cash balance", fmt(cashBalance))}
</table>
<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 20px">Each Monday–Friday accrual and any compensating adjustment has its own immutable ledger entry. Saturdays and Sundays are excluded, compounding is not applied, and duplicate protection prevents the same date from being credited twice.</p>
${btn("Review Transactions →", "https://naxcal.us/dashboard/transactions")}
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
<div style="margin:0 0 10px"><span style="color:#16a34a">✓</span> <span style="color:#374151;font-size:14px">Monday–Friday returns on your investment</span></div>
<div style="margin:0 0 10px"><span style="color:#16a34a">✓</span> <span style="color:#374151;font-size:14px">Withdrawal requests</span></div>
<div><span style="color:#16a34a">✓</span> <span style="color:#374151;font-size:14px">Stock investing (coming soon)</span></div>
</div>
${btn("Make Your First Deposit →", "https://naxcal.us/dashboard/deposit")}
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
${btn("Resubmit Documents →", "https://naxcal.us/dashboard/kyc")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Need help? Contact <a href="mailto:support@naxcal.us" style="color:#1a8a6e;text-decoration:none">support@naxcal.us</a></p>
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
${btn("Return to Dashboard →", "https://naxcal.us/dashboard")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Questions? Contact <a href="mailto:support@naxcal.us" style="color:#1a8a6e;text-decoration:none">support@naxcal.us</a></p>
`),
  };
}

export function withdrawalUnlockedEmail(name: string, balance: number) {
  const fmt = "$" + balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    subject: "Your withdrawals are now available — Naxcal Capital",
    html: layout(`
<div style="background:linear-gradient(135deg,#1a8a6e,#22a882);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:32px">🔓</p>
<p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff">Withdrawals Unlocked</p>
</div>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px">Hi ${name}, your lock-up period has ended — you can now withdraw funds from your Naxcal account.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
${row("Account Status", "✅ Withdrawals Active")}
${row("Available Balance", fmt)}
${row("Minimum Withdrawal", "$100")}
${row("Processing Target", "Typically within 24 hours")}
</table>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">To make a withdrawal, log in to your dashboard, navigate to <strong>Withdraw</strong>, and enter your wallet address and PIN.</p>
${btn("Withdraw Now →", "https://naxcal.us/dashboard/withdraw")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Questions? Contact <a href="mailto:support@naxcal.us" style="color:#1a8a6e;text-decoration:none">support@naxcal.us</a></p>
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
${row("Processing Target", "Typically within 24 hours")}
</table>
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 24px">
<p style="margin:0;font-size:14px;color:#dc2626;line-height:1.6">🔐 <strong>Security Notice:</strong> If you did not request this withdrawal, contact us immediately at <a href="mailto:security@naxcal.us" style="color:#dc2626">security@naxcal.us</a></p>
</div>
${btn("View Dashboard →", "https://naxcal.us/dashboard")}
`),
  };
}

export function withdrawalCompletedEmail(
  name: string,
  amount: number,
  currency: string,
  settlementNetwork: string,
  settlementAmount: string,
  walletAddress: string,
  payoutReference: string,
  fee: number,
  referenceType: string,
  provider?: string,
  outputIndex?: number,
) {
  const fmt = (value: number) => "$" + value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const netAmount = Math.max(amount - fee, 0);
  const decimalMatch = settlementAmount.match(/^(\d+)(?:\.(\d{1,18}))?$/);
  const whole = (decimalMatch?.[1] || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (decimalMatch?.[2] || "").replace(/0+$/, "");
  const assetAmount = `${whole}${fraction ? `.${fraction}` : ""}`;
  const truncatedWallet = walletAddress.length > 18
    ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`
    : walletAddress || "—";
  const truncatedReference = payoutReference.length > 28
    ? `${payoutReference.slice(0, 14)}...${payoutReference.slice(-10)}`
    : payoutReference;

  return {
    subject: `Withdrawal completed — ${assetAmount} ${currency.toUpperCase()} sent`,
    html: layout(`
<div style="text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:14px;color:#16a34a;font-weight:600">✓ Withdrawal Completed</p>
<p style="margin:6px 0 0;font-size:36px;font-weight:700;color:#0a0a0a">${assetAmount} ${currency.toUpperCase()}</p>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280">Amount sent</p>
</div>
${divider}
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px">Hi ${name}, your withdrawal payout has been completed.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
${row("Requested Cash Amount", fmt(amount))}
${row("Agreed Payout Fee (USD)", fmt(fee))}
${row("Net Payout Value (USD)", fmt(netAmount))}
${row("Amount Sent", `${assetAmount} ${(currency || "USDT").toUpperCase()}`)}
${row("Network", settlementNetwork)}
${row("Destination", truncatedWallet)}
${row("Proof Type", referenceType === "blockchain" ? "Blockchain transaction" : `Provider payout (${provider || "provider"})`)}
${row("Payout Reference", truncatedReference)}
${referenceType === "blockchain" ? row("Transfer / Output Index", String(outputIndex ?? 0)) : ""}
${row("Status", "✅ Completed")}
</table>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin:0 0 24px">
<p style="margin:0;font-size:13px;color:#166534;line-height:1.6">Keep the payout reference above for your records. You can also review the completed transaction in your dashboard.</p>
</div>
${btn("Review Transaction →", "https://naxcal.us/dashboard/transactions")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Questions? Contact <a href="mailto:support@naxcal.us" style="color:#1a8a6e;text-decoration:none">support@naxcal.us</a></p>
`),
  };
}

export function withdrawalProcessingFailedEmail(
  name: string,
  amount: number,
  reason: string,
  cashBalance: number,
) {
  const fmt = (value: number) => "$" + value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    subject: `Withdrawal payout unsuccessful — ${fmt(amount)} restored`,
    html: layout(`
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
<p style="margin:0;font-size:28px">↩</p>
<p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#b91c1c">Payout Unsuccessful</p>
</div>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px">Hi ${name}, the approved withdrawal payout could not be completed. No payout was recorded, and the full reserved amount has been returned to your Naxcal cash balance.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 24px">
${row("Amount Restored", fmt(amount))}
${row("Current Cash Balance", fmt(cashBalance))}
${row("Status", "❌ Payout unsuccessful — refunded")}
</table>
<div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin:0 0 24px">
<p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase">Reason</p>
<p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${reason}</p>
</div>
${btn("Review Transactions →", "https://naxcal.us/dashboard/transactions")}
${divider}
<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Questions? Contact <a href="mailto:support@naxcal.us" style="color:#1a8a6e;text-decoration:none">support@naxcal.us</a></p>
`),
  };
}

export function investorOutreachEmail(name: string, unsubscribeUrl: string) {
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
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#0a0a0a">Review the published ${TIER_DAILY_RATE_PERCENT.bronze}–${TIER_DAILY_RATE_PERCENT.gold}% weekday policy. Weekends are excluded and returns are not guaranteed. &#8203;&nbsp;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;min-height:100vh">
<tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

  <!-- HEADER -->
  <tr><td style="background:#0d1117;border-radius:16px 16px 0 0;padding:32px 40px;border-bottom:1px solid #1a8a6e;text-align:center">
    <img src="https://naxcal.us/Naxcal_Primary_Logo.png" alt="Naxcal" height="48" style="height:48px;width:auto;display:inline-block" />
    <div style="margin-top:16px">
      <span style="display:inline-block;background:rgba(26,138,110,0.15);border:1px solid rgba(26,138,110,0.4);color:#22a882;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border-radius:100px">Private Invitation</span>
    </div>
  </td></tr>

  <!-- HERO -->
  <tr><td style="background:linear-gradient(160deg,#0d1f1a 0%,#060d10 60%,#0a0a0a 100%);padding:52px 40px 44px;text-align:center">
    <h1 style="margin:0 0 16px;font-size:36px;font-weight:800;color:#ffffff;line-height:1.15;letter-spacing:-0.5px">
      Your capital.<br>Working every weekday.
    </h1>
    <p style="margin:0 auto;max-width:420px;font-size:16px;color:rgba(255,255,255,0.75);line-height:1.7">
      Naxcal is an investment platform generating returns Monday through Friday for a select group of private investors. Saturdays and Sundays are excluded.
    </p>
  </td></tr>

  <!-- STATS ROW -->
  <tr><td style="background:#0d1117;padding:0 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="33%" style="padding:28px 12px 28px 0;border-right:1px solid rgba(255,255,255,0.06);text-align:center">
          <div style="font-size:32px;font-weight:800;color:#22a882;letter-spacing:-1px">${TIER_DAILY_RATE_PERCENT.gold}%</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Weekday Return</div>
        </td>
        <td width="33%" style="padding:28px 12px;border-right:1px solid rgba(255,255,255,0.06);text-align:center">
          <div style="font-size:32px;font-weight:800;color:#f0a500;letter-spacing:-1px">24/7</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Account Access</div>
        </td>
        <td width="33%" style="padding:28px 0 28px 12px;text-align:center">
          <div style="font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-1px">KYC</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Identity Checks</div>
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
      Our platform presents account activity across forex, commodities, and digital assets, with the applicable return policy operating Monday through Friday. Weekends are excluded. Fees, eligibility checks, and processing rules are disclosed before a request is submitted.
    </p>
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.8">
      As an illustration only, applying the published Gold rate to $500,000 produces $10,500 for one eligible weekday. This is not a guarantee or personalised advice. Saturdays and Sundays do not accrue returns.
    </p>
  </td></tr>

  <!-- TIER TABLE -->
  <tr><td style="background:#0d1117;padding:0 40px 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden">
      <tr style="background:rgba(255,255,255,0.04)">
        <td style="padding:12px 20px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">Tier</td>
        <td style="padding:12px 20px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">Min. Deposit</td>
        <td style="padding:12px 20px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">Weekday Return</td>
        <td style="padding:12px 20px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">Monthly Est.</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.06)">
        <td style="padding:16px 20px"><span style="color:#cd7f32;font-weight:700;font-size:14px">Bronze</span></td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">$1,000</td>
        <td style="padding:16px 20px;color:#22a882;font-weight:700;font-size:14px">${TIER_DAILY_RATE_PERCENT.bronze}%</td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">~33%</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.06)">
        <td style="padding:16px 20px"><span style="color:#c0c0c0;font-weight:700;font-size:14px">Silver</span></td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">$10,000</td>
        <td style="padding:16px 20px;color:#22a882;font-weight:700;font-size:14px">${TIER_DAILY_RATE_PERCENT.silver}%</td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">~39.6%</td>
      </tr>
      <tr style="border-top:1px solid rgba(255,255,255,0.06);background:rgba(26,138,110,0.06)">
        <td style="padding:16px 20px"><span style="color:#f0a500;font-weight:700;font-size:14px">Gold ✦</span></td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">$50,000</td>
        <td style="padding:16px 20px;color:#22a882;font-weight:700;font-size:14px">${TIER_DAILY_RATE_PERCENT.gold}%</td>
        <td style="padding:16px 20px;color:rgba(255,255,255,0.7);font-size:14px">~46.2%</td>
      </tr>
    </table>
  </td></tr>

  <!-- TRUST ROW -->
  <tr><td style="background:#0d1117;padding:0 40px 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="33%" style="padding-right:8px">
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:20px;margin-bottom:6px">🔐</div>
            <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.85)">Identity Checks</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px">Account verification</div>
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
            <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.85)">Withdrawal Controls</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px">Eligibility checks apply</div>
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
    <a href="https://naxcal.us" style="display:inline-block;background:linear-gradient(135deg,#1a8a6e,#22a882);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:12px;letter-spacing:0.3px;box-shadow:0 4px 24px rgba(26,138,110,0.4)">Get Started →</a>
    <p style="margin:20px 0 0;font-size:12px;color:rgba(255,255,255,0.35)">Or reply to this email — we're happy to answer any questions first.</p>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#060809;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)">
    <img src="https://naxcal.us/Naxcal_Primary_Logo.png" alt="Naxcal" height="28" style="height:28px;width:auto;display:inline-block;opacity:0.4;margin-bottom:16px" />
    <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.35);line-height:1.7">Naxcal Capital LLC &nbsp;·&nbsp; All rights reserved.<br>Your capital is at risk. Past performance is not indicative of future results.</p>
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25)">
      <a href="https://naxcal.us/legal/privacy" style="color:rgba(255,255,255,0.4);text-decoration:none">Privacy Policy</a> &nbsp;·&nbsp;
      <a href="${unsubscribeUrl}" style="color:rgba(255,255,255,0.4);text-decoration:none">Unsubscribe</a>
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
<div style="text-align:center;margin:28px 0"><a href="https://naxcal.us/dashboard/settings" style="display:inline-block;padding:14px 32px;background:#ef4444;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;font-family:${FONT}">Secure My Account →</a></div>
`),
  };
}

export function migrationSuccessEmail(
  name: string,
  integrationWindow = "24 to 48 hours",
  dashboardUrl = "https://naxcal.us/dashboard",
) {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    subject: "Your Naxcal account migration has been completed",
    html: layout(`
<div style="text-align:center;margin-bottom:24px">
<div style="width:64px;height:64px;border-radius:50%;background:#f0fdf4;display:inline-flex;align-items:center;justify-content:center;font-size:32px;line-height:64px">✓</div>
</div>

<h2 style="margin:0 0 8px;font-size:24px;color:#0a0a0a;font-weight:700;text-align:center">
Congratulations, ${name}
</h2>

<p style="margin:0 0 24px;font-size:14px;color:#9ca3af;text-align:center">
Your Naxcal migration has been completed successfully
</p>

<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px">
We are pleased to confirm that your account migration to the new Naxcal platform has been successfully completed.
</p>

<div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:0 0 24px">
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600">
Migration Status
</p>

<table style="width:100%;border-collapse:collapse">
${row("Status", "✅ Completed")}
${row("Migration Date", date)}
${row("Full Integration Window", integrationWindow)}
${row("Dashboard Access", "Available")}
</table>
</div>

<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
Your verified on-chain portfolio has now been reflected on your account. You should be able to view your updated investment balance and portfolio information from your dashboard.
</p>

<div style="background:#eff6ff;border-radius:12px;padding:16px 20px;margin:24px 0">
<p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6">
Please allow ${integrationWindow} for full integration across all areas of the platform, including transaction visibility, portfolio reporting, account analytics and dashboard updates.
</p>
</div>

<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
If some sections do not appear immediately, there is no need to worry. Your account may continue updating during the integration window.
</p>

${btn("View Your Dashboard →", dashboardUrl)}

${divider}

<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">
Thank you for your patience during the migration process.<br>
Welcome to the new Naxcal platform.
</p>
`),
  };
}
