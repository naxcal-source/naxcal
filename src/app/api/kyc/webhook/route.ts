import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendKYCApprovedEmail, sendKYCRejectedEmail } from "@/lib/emails";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const digest = req.headers.get("x-payload-digest") || "";
    if (process.env.SUMSUB_WEBHOOK_SECRET) {
      const expected = crypto
        .createHmac("sha1", process.env.SUMSUB_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");
      if (digest !== expected) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const data = JSON.parse(rawBody);
    const { type, externalUserId, reviewResult } = data;

    if (type !== "applicantReviewed" || !externalUserId) {
      return NextResponse.json({ status: "ignored" });
    }

    const userId = externalUserId;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (reviewResult?.reviewAnswer === "GREEN") {
      await supabaseAdmin
        .from("profiles")
        .update({ kyc_status: "approved" })
        .eq("id", userId);

      if (profile?.email) {
        await sendKYCApprovedEmail(profile.email, profile.full_name || "Investor").catch(console.error);
      }
    } else if (reviewResult?.reviewAnswer === "RED") {
      const rejectLabels = reviewResult.rejectLabels?.join(", ") || "Documents could not be verified";
      await supabaseAdmin
        .from("profiles")
        .update({ kyc_status: "rejected", kyc_rejection_reason: rejectLabels } as Record<string, unknown>)
        .eq("id", userId);

      if (profile?.email) {
        await sendKYCRejectedEmail(profile.email, profile.full_name || "Investor", rejectLabels).catch(console.error);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("KYC webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
