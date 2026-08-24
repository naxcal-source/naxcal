import crypto from "crypto";

type SumsubDigestAlgorithm = "HMAC_SHA1_HEX" | "HMAC_SHA256_HEX" | "HMAC_SHA512_HEX";

const SUMSUB_ALGORITHMS: Record<SumsubDigestAlgorithm, "sha1" | "sha256" | "sha512"> = {
  HMAC_SHA1_HEX: "sha1",
  HMAC_SHA256_HEX: "sha256",
  HMAC_SHA512_HEX: "sha512",
};

function canonicaliseJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicaliseJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicaliseJson((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}

function safeHexEqual(provided: string, expected: string): boolean {
  const normalised = provided.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(normalised) || normalised.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(normalised, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}

export function verifyNowPaymentsSignature(
  payload: unknown,
  signature: string,
  secret: string,
): boolean {
  const canonicalPayload = JSON.stringify(canonicaliseJson(payload));
  const expected = crypto
    .createHmac("sha512", secret.trim())
    .update(canonicalPayload)
    .digest("hex");

  return safeHexEqual(signature, expected);
}

export function verifySumsubSignature(
  rawBody: Buffer,
  signature: string,
  algorithmHeader: string,
  secret: string,
): boolean {
  const algorithm = SUMSUB_ALGORITHMS[algorithmHeader as SumsubDigestAlgorithm];
  if (!algorithm) return false;

  const expected = crypto
    .createHmac(algorithm, secret)
    .update(rawBody)
    .digest("hex");

  return safeHexEqual(signature, expected);
}
