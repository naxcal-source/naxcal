import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);
const PREFIX = "scrypt";
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export function isValidWithdrawalPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}

export async function hashWithdrawalPin(pin: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES);
  const derived = await scrypt(pin, salt, HASH_BYTES) as Buffer;
  return `${PREFIX}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function isHashedWithdrawalPin(stored: string): boolean {
  const [prefix, saltHex, hashHex, extra] = stored.split("$");
  return prefix === PREFIX &&
    extra === undefined &&
    saltHex.length === SALT_BYTES * 2 &&
    hashHex.length === HASH_BYTES * 2 &&
    /^[0-9a-f]+$/i.test(saltHex) &&
    /^[0-9a-f]+$/i.test(hashHex);
}

export async function verifyWithdrawalPin(pin: string, stored: string): Promise<boolean> {
  const [prefix, saltHex, hashHex] = stored.split("$");

  if (prefix !== PREFIX) {
    const provided = Buffer.from(pin, "utf8");
    const legacy = Buffer.from(stored, "utf8");
    return provided.length === legacy.length && crypto.timingSafeEqual(provided, legacy);
  }

  if (!isHashedWithdrawalPin(stored)) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pin, Buffer.from(saltHex, "hex"), expected.length) as Buffer;
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
