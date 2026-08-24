import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ResendEmailEvent = {
  type: string;
  created_at: string;
  data?: { email_id?: string };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!webhookSecret || !apiKey) {
    console.error("Resend webhook refused: signing secret or API key is missing");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const id = req.headers.get("svix-id") || "";
  const timestamp = req.headers.get("svix-timestamp") || "";
  const signature = req.headers.get("svix-signature") || "";
  const payload = await req.text();

  let event: ResendEmailEvent;
  try {
    const resend = new Resend(apiKey);
    event = await resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    }) as ResendEmailEvent;
  } catch (error) {
    console.error("Invalid Resend webhook signature", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const emailId = event.data?.email_id;
  if (!id || !event.type?.startsWith("email.") || !emailId || !event.created_at) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc("record_resend_delivery_event", {
    p_svix_id: id,
    p_event_type: event.type,
    p_email_id: emailId,
    p_occurred_at: event.created_at,
    p_payload: JSON.parse(payload),
  });
  if (error) {
    console.error("Could not record Resend delivery event", error);
    return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  }

  return NextResponse.json(data || { status: "recorded" });
}
