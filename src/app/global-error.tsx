"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020408", color: "#ffffff", fontFamily: "Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div role="alert" style={{ maxWidth: 520, textAlign: "center" }}>
            <p style={{ color: "#22a882", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
              Naxcal
            </p>
            <h1 style={{ margin: "16px 0 0", fontSize: 36 }}>We could not load this page</h1>
            <p style={{ margin: "16px 0 0", color: "#a7b0bd", lineHeight: 1.6 }}>
              Your account was not changed. Try loading the page again, or contact support if the problem continues.
            </p>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{ marginTop: 28, border: 0, borderRadius: 12, padding: "13px 24px", background: "#1a8a6e", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}
            >
              Try again
            </button>
            {error.digest ? (
              <p style={{ marginTop: 20, color: "#6b7280", fontSize: 12 }}>Reference: {error.digest}</p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
