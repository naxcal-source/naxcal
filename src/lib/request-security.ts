const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_-]{8,100}$/;

export function isValidIdempotencyKey(value: string | null | undefined) {
  return typeof value === "string" && IDEMPOTENCY_KEY_PATTERN.test(value);
}
