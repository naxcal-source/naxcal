import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { mfaAuthErrorResponse, requireMfaAuth } from "@/lib/auth-api";
import { durableRateLimit } from "@/lib/durable-rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireMfaAuth();
    if (!auth.ok) return mfaAuthErrorResponse(auth);
    const { user } = auth;
    const limit = await durableRateLimit(`kyc-token:${user.id}`, 10, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many verification requests" }, { status: 429 });
    }

    const appToken = process.env.SUMSUB_APP_TOKEN;
    const secretKey = process.env.SUMSUB_SECRET_KEY;
    if (!appToken || !secretKey) {
      return NextResponse.json({ error: "KYC is not configured" }, { status: 503 });
    }

    // Never trust a caller-supplied identity for a provider access token.
    await req.json().catch(() => ({}));
    const userId = user.id;
    const ts = Math.floor(Date.now() / 1000).toString();
    const method = "POST";
    const path = `/resources/accessTokens?userId=${userId}&levelName=basic-kyc-level&ttlInSecs=600`;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(ts + method + path)
      .digest("hex");

    const res = await fetch(`https://api.sumsub.com${path}`, {
      method: "POST",
      headers: {
        "X-App-Token": appToken,
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
