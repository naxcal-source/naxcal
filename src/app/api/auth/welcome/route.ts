import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/emails";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
    await sendWelcomeEmail(email, name || "Investor");
    return NextResponse.json({ status: "sent" });
  } catch (err) {
    console.error("Welcome email error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
