import { NextRequest, NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/email-outbox";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("Email outbox cron refused: CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await processEmailOutbox({ limit: 50 }));
  } catch (error) {
    console.error("Email outbox cron failed", error);
    return NextResponse.json({ error: "Email delivery job failed" }, { status: 500 });
  }
}
