import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-api";
import { addContactsToAudience } from "@/lib/resend-admin";

function parseEmails(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of raw.split(/[\s,;]+/)) {
    const email = token.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { audienceId, emails: rawEmails } = await req.json();
    if (!audienceId || !rawEmails) return NextResponse.json({ error: "Missing audienceId or emails" }, { status: 400 });

    const emails = parseEmails(String(rawEmails));
    if (emails.length === 0) return NextResponse.json({ error: "No valid email addresses found" }, { status: 400 });

    const result = await addContactsToAudience(audienceId, emails);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
