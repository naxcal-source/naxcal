import assert from "node:assert/strict";
import test from "node:test";
import { hashPin, isValidPin, verifyPin } from "./pin-security";
import { isValidIdempotencyKey } from "./request-security";
import { isWeekendLabel, projectedWeekdayReturn } from "./business-days";

test("withdrawal PINs are hashed and verified", () => {
  const stored = hashPin("123456");
  assert.notEqual(stored, "123456");
  assert.equal(verifyPin("123456", stored).valid, true);
  assert.equal(verifyPin("654321", stored).valid, false);
  assert.equal(verifyPin("123456", "123456").needsUpgrade, true);
  assert.equal(isValidPin("123456"), true);
  assert.equal(isValidPin("12345a"), false);
});

test("weekend labels are rejected", () => {
  assert.equal(isWeekendLabel("2026-08-22"), true);
  assert.equal(isWeekendLabel("2026-08-23"), true);
  assert.equal(isWeekendLabel("2026-08-24"), false);
});

test("weekday projections are deterministic", () => {
  assert.equal(projectedWeekdayReturn(10_000, 0.021, 5), 1_050);
});

test("trade request identifiers reject missing and unsafe values", () => {
  assert.equal(isValidIdempotencyKey(crypto.randomUUID()), true);
  assert.equal(isValidIdempotencyKey("trade_retry:12345678"), true);
  assert.equal(isValidIdempotencyKey(null), false);
  assert.equal(isValidIdempotencyKey("short"), false);
  assert.equal(isValidIdempotencyKey("unsafe key with spaces"), false);
  assert.equal(isValidIdempotencyKey("x".repeat(101)), false);
});
