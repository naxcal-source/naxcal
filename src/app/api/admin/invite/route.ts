import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://naxcal.com";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const firstName = name.split(" ")[0];

    await resend.emails.send({
      from: "Naxcal <noreply@naxcal.com>",
      replyTo: "support@naxcal.com",
      to: email,
      subject: `${firstName}, your Naxcal investment portfolio is ready to view`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">

<!-- Header with Logo -->
<div style="background:#0a0a0a;padding:32px 40px;border-radius:16px 16px 0 0;text-align:center">
  <img src="${SITE}/Naxcal_Primary_Logo.png" alt="Naxcal" width="180" height="50" style="height:50px;width:auto;display:inline-block" />
</div>

<!-- Main Content -->
<div style="background:#ffffff;padding:48px 40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">

  <p style="color:#374151;font-size:17px;line-height:1.7;margin:0 0 24px">Dear ${name},</p>

  <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 20px">We are pleased to inform you that your investment portfolio has been fully migrated to the Naxcal digital platform. You now have 24/7 access to monitor your investments, track your daily returns, and manage your capital — all from one secure dashboard.</p>

  <!-- Portfolio Summary Card -->
  <div style="background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;padding:28px;margin:28px 0">
    <p style="margin:0 0 16px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;font-weight:600">Your Portfolio Includes</p>

    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:10px 0;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Complete deposit history</td>
        <td style="padding:10px 0;color:#1a8a6e;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6">Since May 2025</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Daily return records</td>
        <td style="padding:10px 0;color:#1a8a6e;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6">280+ entries</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Stock investments</td>
        <td style="padding:10px 0;color:#1a8a6e;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6">AAPL, NVDA, MSFT & more</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#374151;font-size:14px;border-bottom:1px solid #f3f4f6">Crypto holdings</td>
        <td style="padding:10px 0;color:#1a8a6e;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid #f3f4f6">ETH, BTC, SOL</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#374151;font-size:14px">Real-time market data</td>
        <td style="padding:10px 0;color:#1a8a6e;font-size:14px;text-align:right;font-weight:600">Live prices</td>
      </tr>
    </table>
  </div>

  <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 8px">To access your portfolio, please create your secure login credentials using the link below:</p>

  <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 28px">Your name and email will be pre-filled. Simply choose a password to complete your registration.</p>

  <!-- CTA Button -->
  <div style="text-align:center;margin:32px 0">
    <a href="${SITE}/register?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&invited=true"
       style="display:inline-block;padding:16px 48px;background:#1a8a6e;color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px">
      Access My Portfolio
    </a>
  </div>

  <!-- Security Note -->
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:28px 0">
    <p style="margin:0;font-size:13px;color:#166534;line-height:1.6">
      <strong>🔒 Security:</strong> Your account is protected with 256-bit SSL encryption, two-factor authentication, and is regulated under FCA guidelines. Your data and funds are fully secure.
    </p>
  </div>

  <!-- Divider -->
  <div style="border-top:1px solid #f3f4f6;margin:28px 0"></div>

  <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 8px">Should you have any questions or require assistance, please do not hesitate to reach out.</p>

  <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 4px">Kind regards,</p>
  <p style="color:#0a0a0a;font-size:15px;font-weight:600;margin:0 0 4px">The Naxcal Team</p>
  <p style="color:#9ca3af;font-size:13px;margin:0">
    <a href="mailto:support@naxcal.com" style="color:#1a8a6e;text-decoration:none">support@naxcal.com</a> ·
    <a href="https://t.me/naxcal" style="color:#1a8a6e;text-decoration:none">Telegram</a>
  </p>

</div>

<!-- Footer -->
<div style="background:#f9fafb;padding:24px 40px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;text-align:center">
  <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6">
    Naxcal Capital Ltd is authorised and regulated by the Financial Conduct Authority.<br>
    Your capital is at risk. Past performance is not indicative of future results.
  </p>
  <p style="margin:0;font-size:10px;color:#d1d5db">
    <a href="${SITE}/legal/privacy" style="color:#9ca3af;text-decoration:underline">Privacy Policy</a> ·
    <a href="${SITE}/legal/terms" style="color:#9ca3af;text-decoration:underline">Terms of Service</a> ·
    <a href="${SITE}/unsubscribe" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
  </p>
  <p style="margin:12px 0 0;font-size:10px;color:#d1d5db">&copy; ${new Date().getFullYear()} Naxcal Capital Ltd. All rights reserved.</p>
</div>

</div>
</body>
</html>`,
    });

    return NextResponse.json({ status: "sent" });
  } catch (err) {
    console.error("Invite error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
