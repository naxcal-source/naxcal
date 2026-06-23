import { NextRequest, NextResponse } from "next/server";
import { sendSecurityAlertEmail } from "@/lib/emails";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("email", email).single();
    const name = profile?.full_name || "Investor";
    const device = req.headers.get("user-agent")?.split("(")[1]?.split(")")[0] || "Unknown device";
    const ip = req.headers.get("x-forwarded-for") || "Unknown";

    await sendSecurityAlertEmail(email, name, device, ip);
    return NextResponse.json({ status: "sent" });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
