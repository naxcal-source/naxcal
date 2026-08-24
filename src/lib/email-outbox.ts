import "server-only";

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  sendDailyProfitEmail,
  sendDepositConfirmedEmail,
  sendKYCApprovedEmail,
  sendKYCRejectedEmail,
  sendProfitReconciliationEmail,
  sendSecurityAlertEmail,
  sendWelcomeEmail,
  sendWithdrawalApprovedEmail,
  sendWithdrawalCompletedEmail,
  sendWithdrawalProcessingFailedEmail,
  sendWithdrawalRejectedEmail,
} from "@/lib/emails";

type EmailOutboxRow = {
  id: string;
  dedupe_key: string;
  template: string;
  to_email: string;
  payload: Record<string, unknown> | null;
  attempts: number;
  lease_id: string | null;
};

type ProcessEmailOutboxOptions = {
  dedupeKey?: string;
  limit?: number;
};

function requiredString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Email payload is missing ${key}`);
  }
  return value;
}

function requiredNumber(payload: Record<string, unknown>, key: string) {
  const value = Number(payload[key]);
  if (!Number.isFinite(value)) {
    throw new Error(`Email payload has an invalid ${key}`);
  }
  return value;
}

async function deliver(row: EmailOutboxRow) {
  const payload = row.payload || {};

  switch (row.template) {
    case "welcome":
      return sendWelcomeEmail(
        row.to_email,
        requiredString(payload, "name"),
        row.dedupe_key,
      );
    case "security_alert":
      return sendSecurityAlertEmail(
        row.to_email,
        requiredString(payload, "name"),
        requiredString(payload, "device"),
        requiredString(payload, "location"),
        row.dedupe_key,
      );
    case "kyc_approved":
      return sendKYCApprovedEmail(
        row.to_email,
        requiredString(payload, "name"),
        row.dedupe_key,
      );
    case "kyc_rejected":
      return sendKYCRejectedEmail(
        row.to_email,
        requiredString(payload, "name"),
        typeof payload.reason === "string" ? payload.reason : "Documents could not be verified",
        row.dedupe_key,
      );
    case "deposit_confirmed":
      return sendDepositConfirmedEmail(
        row.to_email,
        requiredString(payload, "name"),
        requiredNumber(payload, "amount"),
        requiredString(payload, "currency"),
        requiredString(payload, "payment_id"),
        row.dedupe_key,
      );
    case "daily_profit":
      return sendDailyProfitEmail(
        row.to_email,
        requiredString(payload, "name"),
        requiredNumber(payload, "amount"),
        requiredNumber(payload, "percentage"),
        requiredNumber(payload, "total_earned"),
        requiredNumber(payload, "balance"),
        row.dedupe_key,
        {
          profitDate: typeof payload.profit_date === "string" ? payload.profit_date : undefined,
          compoundingApplied: typeof payload.compounding_applied === "boolean" ? payload.compounding_applied : undefined,
          policyName: typeof payload.policy_name === "string" ? payload.policy_name : undefined,
        },
      );
    case "profit_reconciliation":
      return sendProfitReconciliationEmail(
        row.to_email,
        requiredString(payload, "name"),
        requiredNumber(payload, "total_amount"),
        requiredString(payload, "start_date"),
        requiredString(payload, "end_date"),
        requiredNumber(payload, "day_count"),
        requiredNumber(payload, "cash_balance"),
        row.dedupe_key,
        {
          overcreditRemoved: payload.overcredit_removed == null
            ? undefined
            : requiredNumber(payload, "overcredit_removed"),
          historicalTotalOnlyRemoved: payload.historical_total_only_removed == null
            ? undefined
            : requiredNumber(payload, "historical_total_only_removed"),
          netChange: payload.net_change == null
            ? undefined
            : requiredNumber(payload, "net_change"),
        },
      );
    case "withdrawal_approved":
      return sendWithdrawalApprovedEmail(
        row.to_email,
        requiredString(payload, "name"),
        requiredNumber(payload, "amount"),
        requiredString(payload, "currency"),
        requiredString(payload, "wallet_address"),
        row.dedupe_key,
      );
    case "withdrawal_completed":
      return sendWithdrawalCompletedEmail(
        row.to_email,
        requiredString(payload, "name"),
        requiredNumber(payload, "amount"),
        requiredString(payload, "currency"),
        requiredString(payload, "settlement_network"),
        requiredString(payload, "settlement_amount"),
        typeof payload.wallet_address === "string" ? payload.wallet_address : "",
        requiredString(payload, "payout_reference"),
        requiredNumber(payload, "fee"),
        requiredString(payload, "reference_type"),
        typeof payload.provider === "string" ? payload.provider : undefined,
        payload.output_index == null ? undefined : requiredNumber(payload, "output_index"),
        row.dedupe_key,
      );
    case "withdrawal_processing_failed":
      return sendWithdrawalProcessingFailedEmail(
        row.to_email,
        requiredString(payload, "name"),
        requiredNumber(payload, "amount"),
        requiredString(payload, "reason"),
        requiredNumber(payload, "cash_balance"),
        row.dedupe_key,
      );
    case "withdrawal_rejected":
      return sendWithdrawalRejectedEmail(
        row.to_email,
        requiredString(payload, "name"),
        requiredNumber(payload, "amount"),
        typeof payload.reason === "string" ? payload.reason : "",
        row.dedupe_key,
      );
    default:
      throw new Error(`Unsupported email template: ${row.template}`);
  }
}

function retryAt(attempts: number) {
  const delayMinutes = Math.min(360, 2 ** Math.min(Math.max(attempts, 1), 8));
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

export async function processEmailOutbox(options: ProcessEmailOutboxOptions = {}) {
  const workerId = crypto.randomUUID();
  const { data, error } = await supabaseAdmin.rpc("claim_email_outbox", {
    p_worker_id: workerId,
    p_limit: Math.min(Math.max(options.limit || 20, 1), 100),
    p_dedupe_key: options.dedupeKey || null,
  });

  if (error) throw new Error(`Could not claim email jobs: ${error.message}`);

  const rows = (data || []) as EmailOutboxRow[];
  let sent = 0;
  let failed = 0;

  const processRow = async (row: EmailOutboxRow) => {
    try {
      const { data: suppression, error: suppressionError } = await supabaseAdmin
        .from("email_suppressions")
        .select("scope, reason")
        .eq("email", row.to_email.trim().toLowerCase())
        .maybeSingle();
      if (suppressionError) throw new Error(`Could not check email suppression: ${suppressionError.message}`);
      if (suppression?.scope === "all") {
        const { data: marked, error: markError } = await supabaseAdmin
          .from("email_outbox")
          .update({
            status: "suppressed",
            last_error: `Recipient suppressed: ${suppression.reason || "delivery failure"}`,
            updated_at: new Date().toISOString(),
            locked_at: null,
            lease_id: null,
          })
          .eq("id", row.id)
          .eq("lease_id", workerId)
          .select("id")
          .maybeSingle();
        if (markError || !marked) throw new Error(markError?.message || "Could not mark email suppressed");
        failed++;
        return;
      }

      const result = await deliver(row);
      const { data: marked, error: markError } = await supabaseAdmin
        .from("email_outbox")
        .update({
          status: "sent",
          provider_message_id: result.data?.id || null,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          locked_at: null,
          lease_id: null,
          last_error: null,
        })
        .eq("id", row.id)
        .eq("lease_id", workerId)
        .select("id")
        .maybeSingle();

      if (markError || !marked) {
        throw new Error(markError?.message || "Email lease was lost before completion");
      }
      sent++;
    } catch (deliveryError) {
      const message = deliveryError instanceof Error ? deliveryError.message : "Email delivery failed";
      const { error: retryError } = await supabaseAdmin
        .from("email_outbox")
        .update({
          status: "failed",
          last_error: message.slice(0, 1000),
          next_attempt_at: retryAt(row.attempts),
          updated_at: new Date().toISOString(),
          locked_at: null,
          lease_id: null,
        })
        .eq("id", row.id)
        .eq("lease_id", workerId);

      if (retryError) {
        console.error("Could not schedule email retry", row.id, retryError.message);
      }
      console.error("Email outbox delivery failed", row.id, message);
      failed++;
    }
  };

  // Keep concurrency bounded so one slow provider request cannot make every
  // later message miss the serverless execution window.
  for (let index = 0; index < rows.length; index += 5) {
    await Promise.all(rows.slice(index, index + 5).map(processRow));
  }

  return { claimed: rows.length, sent, failed };
}
