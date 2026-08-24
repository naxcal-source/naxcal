import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { processEmailOutbox } from "@/lib/email-outbox";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const user = await getAuthUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const dedupeKey = `welcome/${user.id}`;
  const { error } = await supabaseAdmin.from("email_outbox").insert({
    dedupe_key: dedupeKey,
    user_id: user.id,
    template: "welcome",
    to_email: user.email,
    payload: {
      name: profile?.full_name || user.user_metadata?.full_name || "Investor",
    },
  });
  if (error && error.code !== "23505") {
    console.error("Could not queue welcome email", error);
    return NextResponse.json({ error: "Could not queue welcome email" }, { status: 500 });
  }

  processEmailOutbox({ dedupeKey, limit: 1 }).catch((deliveryError) => {
    console.error("Immediate welcome email failed; scheduled retry will continue", deliveryError);
  });
  return NextResponse.json({ status: error?.code === "23505" ? "already_queued" : "queued" });
}
