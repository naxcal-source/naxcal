import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://naxcal.com";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const firstName = name.split(" ")[0];
    const capFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    const capName = name.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

    await resend.emails.send({
      from: "Naxcal <noreply@naxcal.com>",
      replyTo: "support@naxcal.com",
      to: email,
      subject: `Your Naxcal investment portfolio is ready`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<div style="max-width:560px;margin:0 auto;padding:40px 16px">

<!-- White card -->
<div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">

  <!-- Logo -->
  <div style="padding:32px 40px 0">
    <img src="${SITE}/Naxcal_Primary_Logo.png" alt="Naxcal" width="180" style="height:56px;width:auto;display:block" />
  </div>

  <!-- Content -->
  <div style="padding:32px 40px 40px">

    <h1 style="margin:0 0 24px;font-size:28px;color:#0a0a0a;font-weight:700;line-height:1.3">Your investment portfolio is ready to view</h1>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px">Hi ${capName},</p>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 20px">We've finished migrating your portfolio to the Naxcal platform. Your complete investment history — including deposits, daily returns, stock holdings, and crypto positions — is now available in your personal dashboard.</p>

    <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 28px">To get started, create your login credentials below. Your details will be pre-filled.</p>

    <!-- CTA -->
    <a href="${SITE}/register?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&invited=true"
       style="display:block;padding:15px 32px;background:#1a8a6e;color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:600;text-align:center;letter-spacing:0.2px">
      View my portfolio
    </a>

    <!-- Divider -->
    <div style="border-top:1px solid #f3f4f6;margin:32px 0 24px"></div>

    <!-- What's included -->
    <p style="margin:0 0 16px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Included in your account</p>

    <table style="width:100%">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px">Deposit history</td><td style="padding:6px 0;color:#9ca3af;font-size:13px;text-align:right">Since May 2025</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px">Daily return records</td><td style="padding:6px 0;color:#9ca3af;font-size:13px;text-align:right">Updated daily</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px">Stock portfolio</td><td style="padding:6px 0;color:#9ca3af;font-size:13px;text-align:right">AAPL, NVDA, MSFT +</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px">Crypto holdings</td><td style="padding:6px 0;color:#9ca3af;font-size:13px;text-align:right">ETH, BTC, SOL</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px">Live market data</td><td style="padding:6px 0;color:#9ca3af;font-size:13px;text-align:right">Real-time</td></tr>
    </table>

  </div>
</div>

<!-- Footer -->
<div style="padding:24px 16px;text-align:center">
  <p style="margin:0 0 4px;font-size:11px;color:#9ca3af">Naxcal Capital Ltd · <a href="mailto:support@naxcal.com" style="color:#9ca3af;text-decoration:none">support@naxcal.com</a></p>
  <p style="margin:0;font-size:11px;color:#c0c0c0">Your capital is at risk. Past performance is not indicative of future results.</p>
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
