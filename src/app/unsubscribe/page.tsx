"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2 } from "lucide-react";

export default function UnsubscribePage() {
  const [done, setDone] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#ffffff" }}>
      <div className="w-full max-w-md text-center">
        {done ? (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
              <CheckCircle2 size={32} className="text-naxcal-teal" />
            </div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Unsubscribed</h1>
            <p className="text-sm mb-6" style={{ color: "#6b7280" }}>You&apos;ve been unsubscribed from marketing emails. You&apos;ll still receive essential account notifications (deposits, withdrawals, security alerts).</p>
            <Link href="/" className="text-naxcal-teal text-sm font-medium hover:underline">Back to Naxcal</Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
              <Mail size={32} className="text-naxcal-teal" />
            </div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Unsubscribe from Emails</h1>
            <p className="text-sm mb-6" style={{ color: "#6b7280" }}>You&apos;ll stop receiving marketing and promotional emails. Essential account notifications (security, transactions) will continue.</p>
            <button onClick={() => setDone(true)}
              className="px-8 py-3 rounded-lg text-white font-semibold text-sm cursor-pointer transition-all"
              style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)" }}>
              Confirm Unsubscribe
            </button>
            <p className="text-xs mt-4" style={{ color: "#9ca3af" }}>
              You can re-enable emails in <Link href="/dashboard/settings" className="text-naxcal-teal hover:underline">Settings → Notifications</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
