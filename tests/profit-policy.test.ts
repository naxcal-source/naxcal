import assert from "node:assert/strict";
import test from "node:test";
import {
  AVERAGE_WEEKDAYS_PER_MONTH,
  getTierDailyRatePercent,
  isProfitDate,
  TIER_DAILY_RATE_PERCENT,
  WEEKDAYS_PER_WEEK,
  WEEKDAYS_PER_YEAR,
} from "../src/lib/profit-policy";
import { profitReconciliationEmail } from "../src/lib/email-templates";

test("uses the configured daily percentage for every tier", () => {
  assert.equal(getTierDailyRatePercent("bronze"), 1.5);
  assert.equal(getTierDailyRatePercent("silver"), 1.8);
  assert.equal(getTierDailyRatePercent("gold"), 2.1);
  assert.equal(getTierDailyRatePercent("unknown"), TIER_DAILY_RATE_PERCENT.bronze);
});

test("credits returns on weekdays and never on weekends", () => {
  assert.equal(isProfitDate("2026-08-17"), true); // Monday
  assert.equal(isProfitDate("2026-08-21"), true); // Friday
  assert.equal(isProfitDate("2026-08-22"), false); // Saturday
  assert.equal(isProfitDate("2026-08-23"), false); // Sunday
});

test("projection periods exclude weekends", () => {
  assert.equal(WEEKDAYS_PER_WEEK, 5);
  assert.equal(AVERAGE_WEEKDAYS_PER_MONTH, 22);
  assert.equal(WEEKDAYS_PER_YEAR, 260);
});

test("reconciliation email discloses gross credit, removal, and net change", () => {
  const email = profitReconciliationEmail(
    "Investor",
    240_020.40130002,
    "2026-08-12",
    "2026-08-19",
    6,
    360_030.60195002,
    {
      overcreditRemoved: 88_585.78961113,
      historicalTotalOnlyRemoved: 85_917.71834497,
      netChange: 151_434.61168889,
    },
  );

  assert.equal(email.subject, "Account profit reconciliation completed");
  assert.match(email.html, /Missing weekday profit credited/);
  assert.match(email.html, /Prior automated over-credit removed/);
  assert.match(email.html, /Historical profit statistic corrected/);
  assert.match(email.html, /Net cash-balance change/);
});
