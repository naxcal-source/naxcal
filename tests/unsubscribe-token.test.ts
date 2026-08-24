import assert from "node:assert/strict";
import test from "node:test";
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "../src/lib/unsubscribe-token";

test("unsubscribe tokens are bound to a normalized email", () => {
  process.env.UNSUBSCRIBE_SECRET = "test-only-secret-that-is-longer-than-32-characters";
  const token = signUnsubscribeToken(" Investor@Example.com ");

  assert.equal(verifyUnsubscribeToken("investor@example.com", token), true);
  assert.equal(verifyUnsubscribeToken("other@example.com", token), false);
  assert.equal(verifyUnsubscribeToken("investor@example.com", "not-a-token"), false);
});

test("unsubscribe signing fails closed without a dedicated secret", () => {
  const previous = process.env.UNSUBSCRIBE_SECRET;
  delete process.env.UNSUBSCRIBE_SECRET;
  assert.throws(() => signUnsubscribeToken("investor@example.com"));
  assert.equal(verifyUnsubscribeToken("investor@example.com", "0".repeat(64)), false);
  if (previous === undefined) delete process.env.UNSUBSCRIBE_SECRET;
  else process.env.UNSUBSCRIBE_SECRET = previous;
});
