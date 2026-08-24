import { NextRequest, NextResponse } from "next/server";
import { processProfitJobs } from "@/lib/profit-worker";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await processProfitJobs(30));
  } catch (error) {
    console.error("Profit worker failed", error);
    return NextResponse.json({ error: "Profit worker failed" }, { status: 500 });
  }
}
