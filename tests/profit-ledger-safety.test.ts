import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accrualMigration = readFileSync(
  new URL("../supabase/migrations/202608190004_profit_accrual_queue.sql", import.meta.url),
  "utf8",
);
const correctionMigration = readFileSync(
  new URL("../supabase/migrations/202608190006_admin_and_kyc_commands.sql", import.meta.url),
  "utf8",
);

test("profit policies and historical state fail closed", () => {
  assert.match(accrualMigration, /enabled BOOLEAN NOT NULL DEFAULT false/);
  assert.match(accrualMigration, /ALTER COLUMN enabled SET DEFAULT false/);
  assert.match(
    accrualMigration,
    /Profit account state is missing; reconcile historical profit before non-compounding accrual/,
  );
  assert.doesNotMatch(
    accrualMigration,
    /excluded_noncompounding_profit\s*[^;]{0,80}:=\s*COALESCE\([^)]*total_profit/i,
  );
});

test("batch catch-up dates are recovered before duplicate detection", () => {
  const descriptionBackfill = accrualMigration.indexOf("Older jobs put the intended accrual date");
  const duplicateGuard = accrualMigration.indexOf("Duplicate historical profit rows require reconciliation");
  assert.ok(descriptionBackfill >= 0);
  assert.ok(duplicateGuard > descriptionBackfill);
});

test("profit baselines and corrections require exact reviewed commands", () => {
  assert.match(accrualMigration, /INITIALIZE PROFIT STATE /);
  assert.match(accrualMigration, /profit_account_baselines_immutable/);
  assert.match(correctionMigration, /p_adjust_cash BOOLEAN/);
  assert.match(correctionMigration, /THEN ' CASH' ELSE ' TOTAL ONLY'/);
  assert.match(correctionMigration, /profit_correction_events_immutable/);
});

test("withdrawal profit reservations restore only on failure", () => {
  assert.match(accrualMigration, /noncompounding_profit_removed/);
  assert.match(accrualMigration, /OLD\.status IN \('pending', 'processing'\)/);
  assert.match(accrualMigration, /NEW\.status = 'failed'/);
  assert.match(accrualMigration, /noncompounding_profit_restored_at/);
});
