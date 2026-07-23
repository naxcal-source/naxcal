import { createHmac, timingSafeEqual } from "crypto";

// Reuses the service-role key as an HMAC secret purely so unsubscribe links
// can't be forged/guessed — no new secret to provision or deploy.
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function signUnsubscribeToken(email: string): string {
  return createHmac("sha256", SECRET).update(email.trim().toLowerCase()).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = signUnsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function unsubscribeUrl(email: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://naxcal.us";
  const token = signUnsubscribeToken(email);
  return `${site}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
