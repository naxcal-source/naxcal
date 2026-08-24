import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#020408] px-6 text-white flex items-center justify-center">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-naxcal-teal">404</p>
        <h1 className="mt-4 text-4xl font-bold">Page not found</h1>
        <p className="mt-4 text-sm leading-6 text-white/55">
          The page may have moved, or the address may be incorrect. No account action was taken.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="rounded-xl bg-naxcal-teal px-6 py-3 text-sm font-semibold text-white">
            Go to dashboard
          </Link>
          <Link href="/" className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
