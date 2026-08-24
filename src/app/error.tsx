"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020408] px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#22a882]">Temporary issue</p>
        <h1 className="mt-3 text-2xl font-bold">This page could not load</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Your account data has not been changed. Try loading the page again, or return to your dashboard.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={reset} className="rounded-lg bg-[#1a8a6e] px-5 py-2.5 text-sm font-semibold hover:bg-[#22a882] cursor-pointer">
            Try again
          </button>
          <Link href="/dashboard" className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/75 hover:bg-white/[0.05]">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
