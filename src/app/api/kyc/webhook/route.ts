import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/email-outbox";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifySumsubSignature } from "@/lib/webhook-signatures";

export async function POST(req: NextRequest) {
  try {
    const rawBody = Buffer.from(await req.arrayBuffer());
    const webhookSecret = process.env.SUMSUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("KYC webhook refused: SUMSUB_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
    }

    const digest = req.headers.get("x-payload-digest") || "";
    const digestAlgorithm = req.headers.get("x-payload-digest-alg") || "";
    if (!verifySumsubSignature(rawBody, digest, digestAlgorithm, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const data = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
    if (data.type !== "applicantReviewed" || typeof data.externalUserId !== "string") {
      return NextResponse.json({ status: "ignored" });
    }

    const reviewResult = data.reviewResult as Record<string, unknown> | undefined;
    const reviewAnswer = reviewResult?.reviewAnswer;
    if (reviewAnswer !== "GREEN" && reviewAnswer !== "RED") {
      return NextResponse.json({ status: "ignored" });
    }
    const decision = reviewAnswer === "GREEN" ? "approved" : "rejected";
    const rejectLabels = Array.isArray(reviewResult?.rejectLabels)
      ? reviewResult.rejectLabels.filter((label): label is string => typeof label === "string").join(", ").slice(0, 500)
      : "";
    const createdAtMs = Number(data.createdAtMs);
    const parsedCreatedAt = typeof data.createdAt === "string" ? Date.parse(data.createdAt) : Number.NaN;
    const occurredAt = Number.isFinite(createdAtMs)
      ? new Date(createdAtMs).toISOString()
      : Number.isFinite(parsedCreatedAt)
        ? new Date(parsedCreatedAt).toISOString()
        : new Date().toISOString();
    const eventKey = crypto.createHash("sha256").update(rawBody).digest("hex");

    const { data: result, error } = await supabaseAdmin.rpc("apply_kyc_review", {
      p_event_key: eventKey,
      p_user_id: data.externalUserId,
      p_decision: decision,
      p_reason: decision === "rejected" ? rejectLabels || "Documents could not be verified" : null,
      p_occurred_at: occurredAt,
      p_source: "sumsub",
      p_actor_id: null,
      p_payload: data,
    });
    if (error) {
      console.error("KYC review application failed", error);
      return NextResponse.json({ error: "KYC review could not be applied" }, { status: 500 });
    }

    const response = (result || {}) as Record<string, unknown>;
    if (typeof response.dedupe_key === "string") {
      processEmailOutbox({ dedupeKey: response.dedupe_key, limit: 1 }).catch((deliveryError) => {
        console.error("Immediate KYC email failed; scheduled retry will continue", deliveryError);
      });
    }
    return NextResponse.json({ status: response.status || "ok" });
  } catch (error) {
    console.error("KYC webhook error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
