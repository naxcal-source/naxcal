import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PREFIX = "scrypt";

export function hashPin(pin: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string) {
  if (!stored.startsWith(`${PREFIX}$`)) {
    return { valid: stored === pin, needsUpgrade: stored === pin };
  }

  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return { valid: false, needsUpgrade: false };

  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
    return {
      valid: expected.length === actual.length && timingSafeEqual(expected, actual),
      needsUpgrade: false,
    };
  } catch {
    return { valid: false, needsUpgrade: false };
  }
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}
