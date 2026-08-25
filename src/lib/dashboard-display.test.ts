import assert from "node:assert/strict";
import test from "node:test";
import { calendarMonthKey, depositActiveStage, withdrawalActiveStage } from "./dashboard-display";

test("statement months use a stable year-month key", () => {
  assert.equal(calendarMonthKey("2026-08-25T12:00:00Z"), "2026-08");
});

test("deposit lifecycle distinguishes credited, detected, and failed payments", () => {
  assert.equal(depositActiveStage("completed"), 3);
  assert.equal(depositActiveStage("pending"), 1);
  assert.equal(depositActiveStage("failed"), -1);
});

test("withdrawal lifecycle includes review and processing states", () => {
  assert.equal(withdrawalActiveStage("completed"), 2);
  assert.equal(withdrawalActiveStage("processing"), 1);
  assert.equal(withdrawalActiveStage("failed"), -1);
});
