import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

export async function POST(req: NextRequest) {
  const { email, token } = await req.json();

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid or expired unsubscribe link" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("email_suppressions")
    .upsert({ email: email.trim().toLowerCase() }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "unsubscribed" });
}
