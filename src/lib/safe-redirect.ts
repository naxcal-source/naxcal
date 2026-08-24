const REDIRECT_BASE = "https://redirect.invalid";

export function safeInternalRedirect(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  if (
    !value ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, REDIRECT_BASE);
    if (parsed.origin !== REDIRECT_BASE) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
