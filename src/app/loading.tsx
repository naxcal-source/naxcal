export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020408] px-6" aria-busy="true" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/15 border-t-[#22a882] animate-spin" aria-hidden="true" />
        <p className="mt-4 text-sm text-white/60">Loading Naxcal…</p>
      </div>
    </main>
  );
}
