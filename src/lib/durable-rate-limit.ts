import "server-only";

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function durableRateLimit(key: string, limit: number, windowMs: number) {
  const bucketKey = crypto.createHash("sha256").update(key).digest("hex");
  const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
    p_bucket_key: bucketKey,
    p_limit: limit,
    p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
  });
  if (error) {
    console.error("Durable rate-limit check failed", error);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  const result = (data || {}) as Record<string, unknown>;
  return {
    allowed: result.allowed === true,
    remaining: Number(result.remaining || 0),
    retryAfterSeconds: Number(result.retry_after_seconds || 0),
  };
}
