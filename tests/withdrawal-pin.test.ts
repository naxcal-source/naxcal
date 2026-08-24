import assert from "node:assert/strict";
import test from "node:test";
import {
  hashWithdrawalPin,
  isHashedWithdrawalPin,
  isValidWithdrawalPin,
  verifyWithdrawalPin,
} from "../src/lib/withdrawal-pin";

test("withdrawal PIN format and scrypt verification", async () => {
  assert.equal(isValidWithdrawalPin("123456"), true);
  assert.equal(isValidWithdrawalPin("12345"), false);
  assert.equal(isValidWithdrawalPin("abcdef"), false);

  const hashed = await hashWithdrawalPin("123456");
  assert.equal(isHashedWithdrawalPin(hashed), true);
  assert.equal(await verifyWithdrawalPin("123456", hashed), true);
  assert.equal(await verifyWithdrawalPin("654321", hashed), false);
});

test("legacy PINs work while malformed hashes fail closed", async () => {
  assert.equal(await verifyWithdrawalPin("123456", "123456"), true);
  assert.equal(await verifyWithdrawalPin("654321", "123456"), false);
  assert.equal(await verifyWithdrawalPin("123456", "scrypt$bad$bad"), false);
  assert.equal(await verifyWithdrawalPin("123456", "scrypt$$"), false);
});
