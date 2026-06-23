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
      subject: `${capFirst}, your Naxcal portfolio is ready`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="background:#0a0a0a;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
<img src="${SITE}/Naxcal_Primary_Logo.png" alt="Naxcal" width="180" style="height:56px;width:auto;display:inline-block" />
</div>
<div style="background:#ffffff;padding:40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">

<div style="text-align:center;margin-bottom:24px">
<div style="width:56px;height:56px;border-radius:50%;background:#f0fdf4;display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:56px">&#10003;</div>
</div>
<h2 style="margin:0 0 8px;font-size:24px;color:#0a0a0a;font-weight:700;text-align:center">Your Portfolio is Ready</h2>
<p style="margin:0 0 24px;font-size:14px;color:#9ca3af;text-align:center">Welcome to Naxcal, ${capFirst}</p>

<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px">Hi ${capName}, your Naxcal investment portfolio has been migrated to our digital platform. All your historical deposits, returns, and investment positions are now accessible online — 24/7.</p>

<div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:0 0 24px">
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600">What You'll Find</p>
<div style="margin:0 0 10px"><span style="color:#16a34a;font-size:16px">&#10003;</span> <span style="color:#374151;font-size:14px">Complete deposit history since May 2025</span></div>
<div style="margin:0 0 10px"><span style="color:#16a34a;font-size:16px">&#10003;</span> <span style="color:#374151;font-size:14px">All daily returns and profit records</span></div>
<div style="margin:0 0 10px"><span style="color:#16a34a;font-size:16px">&#10003;</span> <span style="color:#374151;font-size:14px">Stock & crypto portfolio with live prices</span></div>
<div><span style="color:#16a34a;font-size:16px">&#10003;</span> <span style="color:#374151;font-size:14px">Real-time portfolio tracking & market data</span></div>
</div>

<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 28px">Create your secure login to access your portfolio:</p>

<div style="text-align:center;margin:28px 0"><a href="${SITE}/register?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&invited=true" style="display:inline-block;padding:14px 32px;background:#1a8a6e;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600">Access My Portfolio &#8594;</a></div>

<div style="border-top:1px solid #f3f4f6;margin:24px 0"></div>

<p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0;text-align:center">Questions? Contact us at <a href="mailto:support@naxcal.com" style="color:#1a8a6e;text-decoration:none">support@naxcal.com</a></p>

</div>
<div style="background:#f9fafb;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center">
<p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6">Naxcal Capital Ltd is authorised and regulated by the Financial Conduct Authority.<br>Your capital is at risk. Past performance is not indicative of future results.</p>
<p style="margin:0;font-size:11px;color:#d1d5db">
<a href="${SITE}/legal/privacy" style="color:#9ca3af;text-decoration:underline">Privacy</a> &middot;
<a href="${SITE}/legal/terms" style="color:#9ca3af;text-decoration:underline">Terms</a> &middot;
<a href="${SITE}/unsubscribe" style="color:#9ca3af;text-decoration:underline">Unsubscribe</a>
</p>
<p style="margin:12px 0 0;font-size:10px;color:#d1d5db">&copy; ${new Date().getFullYear()} Naxcal Capital Ltd. All rights reserved.</p>
</div>
</div></body></html>`,
    });

    return NextResponse.json({ status: "sent" });
  } catch (err) {
    console.error("Invite error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
