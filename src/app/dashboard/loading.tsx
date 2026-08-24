export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard</span>
      <div className="h-8 w-48 rounded-lg bg-slate-200 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        ))}
      </div>
      <div className="h-80 rounded-2xl border border-slate-200 bg-white animate-pulse" />
    </div>
  );
}
