import { supabaseAdmin } from "@/lib/supabase-admin";

export async function recordSystemEvent(
  eventType: string,
  severity: "info" | "warning" | "error",
  message: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabaseAdmin.from("system_events").insert({
    event_type: eventType,
    severity,
    message,
    metadata,
  });

  if (error) console.error("Unable to record system event:", error.message);
}
