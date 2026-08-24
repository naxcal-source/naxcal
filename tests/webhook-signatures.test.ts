import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
  verifyNowPaymentsSignature,
  verifySumsubSignature,
} from "../src/lib/webhook-signatures";

test("NOWPayments verifies recursively sorted JSON independent of input key order", () => {
  const secret = "nowpayments-test-secret";
  const canonical = '{"a":{"b":2,"c":3},"items":[{"a":1,"z":2}],"z":1}';
  const signature = crypto.createHmac("sha512", secret).update(canonical).digest("hex");

  const payload = { z: 1, items: [{ z: 2, a: 1 }], a: { c: 3, b: 2 } };
  const reordered = { items: [{ a: 1, z: 2 }], a: { b: 2, c: 3 }, z: 1 };

  assert.equal(verifyNowPaymentsSignature(payload, signature, secret), true);
  assert.equal(verifyNowPaymentsSignature(reordered, signature, secret), true);
  assert.equal(verifyNowPaymentsSignature({ ...payload, z: 9 }, signature, secret), false);
});

test("Sumsub verifies every documented digest algorithm and rejects unknown algorithms", () => {
  const secret = "sumsub-test-secret";
  const body = Buffer.from('{"type":"applicantReviewed"}', "utf8");
  const algorithms = {
    HMAC_SHA1_HEX: "sha1",
    HMAC_SHA256_HEX: "sha256",
    HMAC_SHA512_HEX: "sha512",
  } as const;

  for (const [header, algorithm] of Object.entries(algorithms)) {
    const signature = crypto.createHmac(algorithm, secret).update(body).digest("hex");
    assert.equal(verifySumsubSignature(body, signature, header, secret), true);
  }

  assert.equal(verifySumsubSignature(body, "bad", "UNKNOWN", secret), false);
});
