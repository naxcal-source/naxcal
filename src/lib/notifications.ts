import { supabaseAdmin } from "@/lib/supabase-admin";

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  description?: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

export async function createNotification(input: CreateNotificationInput) {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    description: input.description || null,
    body: input.body || null,
    link: input.link || null,
    metadata: input.metadata || {},
    is_read: false,
  });

  if (error) {
    console.error("Create notification error:", error.message);
  }
}
