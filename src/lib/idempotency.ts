const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export const TRADE_IDEMPOTENCY_STORAGE_KEYS = {
  stockBuy: "naxcal:idempotency:stock-buy",
  stockSell: "naxcal:idempotency:stock-sell",
  cryptoSell: "naxcal:idempotency:crypto-sell",
  cryptoSwap: "naxcal:idempotency:crypto-swap",
} as const;

export type PendingIdempotentRequest = {
  fingerprint: string;
  key: string;
};

function readStoredRequest(storageKey: string): PendingIdempotentRequest | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingIdempotentRequest>;
    if (
      typeof parsed.fingerprint !== "string" ||
      typeof parsed.key !== "string" ||
      !IDEMPOTENCY_KEY_PATTERN.test(parsed.key)
    ) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }

    return { fingerprint: parsed.fingerprint, key: parsed.key };
  } catch {
    return null;
  }
}

function storeRequest(storageKey: string, request: PendingIdempotentRequest) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(request));
  } catch {}
}

export function readIdempotencyKey(headers: Headers): string | null {
  const key = headers.get("Idempotency-Key")?.trim();
  return key && IDEMPOTENCY_KEY_PATTERN.test(key) ? key : null;
}

export function getOrCreateIdempotentRequest(
  pending: PendingIdempotentRequest | null,
  fingerprint: string,
  storageKey: string,
): PendingIdempotentRequest {
  if (pending?.fingerprint === fingerprint) {
    storeRequest(storageKey, pending);
    return pending;
  }

  const stored = readStoredRequest(storageKey);
  if (stored?.fingerprint === fingerprint) return stored;

  const request = {
    fingerprint,
    key: globalThis.crypto.randomUUID(),
  };
  storeRequest(storageKey, request);
  return request;
}

export function clearIdempotentRequest(storageKey: string, key: string) {
  if (typeof window === "undefined") return;

  try {
    const stored = readStoredRequest(storageKey);
    if (!stored || stored.key === key) {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {}
}

export function shouldResetIdempotencyKey(status: number): boolean {
  return status < 500 && ![401, 408, 425, 429].includes(status);
}

export function tradingRpcErrorStatus(message: string): number {
  if (
    message === "Account is inactive" ||
    message.startsWith("Complete KYC verification")
  ) {
    return 403;
  }

  if (message === "Profile not found") return 404;
  if (message.startsWith("Idempotency key was reused")) return 409;

  if (
    message.startsWith("Insufficient ") ||
    message.startsWith("Invalid ") ||
    message.startsWith("Minimum investment") ||
    message.startsWith("Unsupported ") ||
    message.startsWith("Cannot swap ") ||
    message.endsWith("is outside the supported range") ||
    message.endsWith("is too small")
  ) {
    return 400;
  }

  return 500;
}
