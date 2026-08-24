import assert from "node:assert/strict";
import test from "node:test";
import { safeInternalRedirect } from "../src/lib/safe-redirect";

test("accepts same-site paths and preserves their query and fragment", () => {
  assert.equal(
    safeInternalRedirect("/dashboard/transactions?status=pending#latest"),
    "/dashboard/transactions?status=pending#latest",
  );
});

test("rejects external, protocol-relative, and backslash redirects", () => {
  assert.equal(safeInternalRedirect("https://example.com"), "/dashboard");
  assert.equal(safeInternalRedirect("//example.com/account"), "/dashboard");
  assert.equal(safeInternalRedirect("/\\example.com/account"), "/dashboard");
});

test("uses the requested fallback for invalid input", () => {
  assert.equal(safeInternalRedirect(null, "/login"), "/login");
  assert.equal(safeInternalRedirect("dashboard", "/login"), "/login");
  assert.equal(safeInternalRedirect("/dashboard\n", "/login"), "/login");
});
