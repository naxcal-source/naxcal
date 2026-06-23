"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[#0f172a] mb-2">Something went wrong</h2>
        <p className="text-sm text-[#6b7280] mb-6">{error.message || "An unexpected error occurred. Please try again."}</p>
        <button onClick={reset} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal cursor-pointer">
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    </div>
  );
}
