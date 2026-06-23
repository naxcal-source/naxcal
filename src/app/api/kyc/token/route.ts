import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const ts = Math.floor(Date.now() / 1000).toString();
    const method = "POST";
    const path = `/resources/accessTokens?userId=${userId}&levelName=basic-kyc-level&ttlInSecs=600`;

    const signature = crypto
      .createHmac("sha256", process.env.SUMSUB_SECRET_KEY!)
      .update(ts + method + path)
      .digest("hex");

    const res = await fetch(`https://api.sumsub.com${path}`, {
      method: "POST",
      headers: {
        "X-App-Token": process.env.SUMSUB_APP_TOKEN!,
        "X-App-Access-Ts": ts,
        "X-App-Access-Sig": signature,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Sumsub token error:", res.status, errData);
      return NextResponse.json({ error: "Failed to generate KYC token" }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json({ token: data.token });
  } catch (err) {
    console.error("KYC token error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
