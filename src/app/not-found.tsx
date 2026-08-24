import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020408] px-6 text-white">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-[0.25em] text-[#22a882]">404</p>
        <h1 className="mt-3 text-3xl font-bold">Page not found</h1>
        <p className="mt-3 text-sm text-white/55">The page may have moved, or the address may be incorrect.</p>
        <Link href="/" className="mt-7 inline-flex rounded-lg bg-[#1a8a6e] px-5 py-2.5 text-sm font-semibold hover:bg-[#22a882]">
          Return home
        </Link>
      </div>
    </main>
  );
}
