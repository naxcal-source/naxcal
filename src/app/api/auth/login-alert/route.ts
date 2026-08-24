import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { processEmailOutbox } from "@/lib/email-outbox";
import { durableRateLimit } from "@/lib/durable-rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await durableRateLimit(`login-alert:${user.id}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ status: "rate_limited" });

  const [{ data: profile }, { data: preferences, error: preferencesError }] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("notification_preferences")
        .select("security_email")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
  if (preferencesError) {
    console.error("Could not load security email preference", preferencesError);
    return NextResponse.json(
      { error: "Could not verify security email preference" },
      { status: 500 },
    );
  }
  if (preferences?.security_email === false) {
    return NextResponse.json({ status: "disabled_by_preference" });
  }
  const device = req.headers.get("user-agent")?.slice(0, 300) || "Unknown device";
  const location = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) || "Unknown";
  const hour = new Date().toISOString().slice(0, 13);
  const fingerprint = crypto.createHash("sha256").update(`${device}|${location}`).digest("hex").slice(0, 16);
  const dedupeKey = `security-login/${user.id}/${hour}/${fingerprint}`;

  const { error } = await supabaseAdmin.from("email_outbox").insert({
    dedupe_key: dedupeKey,
    user_id: user.id,
    template: "security_alert",
    to_email: user.email,
    payload: { name: profile?.full_name || "Investor", device, location },
  });
  if (error && error.code !== "23505") {
    console.error("Could not queue login alert", error);
    return NextResponse.json({ error: "Could not queue security alert" }, { status: 500 });
  }

  processEmailOutbox({ dedupeKey, limit: 1 }).catch((deliveryError) => {
    console.error("Immediate security alert failed; scheduled retry will continue", deliveryError);
  });
  return NextResponse.json({ status: error?.code === "23505" ? "already_queued" : "queued" });
}
