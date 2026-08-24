import "server-only";

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ProfitJob = {
  id: string;
  user_id: string;
  profit_date: string;
  policy_id: string;
  basis_override: number | string | null;
  source: string;
  email_mode: "daily" | "none";
  attempts: number;
};

function retryAt(attempts: number) {
  const minutes = Math.min(360, 2 ** Math.min(Math.max(attempts, 1), 8));
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export async function processProfitJobs(limit = 20) {
  const workerId = crypto.randomUUID();
  const { data, error } = await supabaseAdmin.rpc("claim_profit_accrual_jobs", {
    p_worker_id: workerId,
    p_limit: Math.min(Math.max(limit, 1), 100),
  });
  if (error) throw new Error(`Could not claim profit jobs: ${error.message}`);

  const jobs = (data || []) as ProfitJob[];
  let succeeded = 0;
  let failed = 0;

  const processJob = async (job: ProfitJob) => {
    const { data: result, error: accrualError } = await supabaseAdmin.rpc("accrue_daily_profit", {
      p_user_id: job.user_id,
      p_profit_date: job.profit_date,
      p_policy_id: job.policy_id,
      p_basis_override: job.basis_override,
      p_source: job.source,
      p_email_mode: job.email_mode,
      p_dry_run: false,
    });

    if (accrualError) {
      const { error: updateError } = await supabaseAdmin
        .from("profit_accrual_jobs")
        .update({
          status: "failed",
          last_error: accrualError.message.slice(0, 1000),
          next_attempt_at: retryAt(job.attempts),
          locked_at: null,
          lease_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("lease_id", workerId);
      if (updateError) console.error("Could not schedule profit retry", job.id, updateError.message);
      failed++;
      return;
    }

    const { data: marked, error: markError } = await supabaseAdmin
      .from("profit_accrual_jobs")
      .update({
        status: "succeeded",
        result: result || {},
        last_error: null,
        locked_at: null,
        lease_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("lease_id", workerId)
      .select("id")
      .maybeSingle();

    if (markError || !marked) {
      console.error("Could not complete profit job", job.id, markError?.message || "lease lost");
      failed++;
      return;
    }
    succeeded++;
  };

  for (let index = 0; index < jobs.length; index += 5) {
    await Promise.all(jobs.slice(index, index + 5).map(processJob));
  }

  return { claimed: jobs.length, succeeded, failed };
}
