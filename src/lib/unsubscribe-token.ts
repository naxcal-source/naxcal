import { createHmac, timingSafeEqual } from "crypto";

function unsubscribeSecret() {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("UNSUBSCRIBE_SECRET must contain at least 32 characters");
  }
  return secret;
}

export function signUnsubscribeToken(email: string): string {
  return createHmac("sha256", unsubscribeSecret()).update(email.trim().toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = signUnsubscribeToken(email);
    const actual = String(token || "");
    if (!/^[0-9a-f]{64}$/i.test(actual)) return false;
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(actual, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://naxcal.us";
  const token = signUnsubscribeToken(email);
  return `${site}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
