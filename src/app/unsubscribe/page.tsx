"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, XCircle } from "lucide-react";

function UnsubscribeForm() {
  const params = useSearchParams();
  const email = params.get("email");
  const token = params.get("token");

  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const confirm = async () => {
    if (!email || !token) {
      setErrorMsg("This unsubscribe link is missing information. Please use the link from the email you received.");
      setState("error");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error || "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
          <CheckCircle2 size={32} className="text-naxcal-teal" />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Unsubscribed</h1>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>You&apos;ve been unsubscribed from marketing emails. You&apos;ll still receive essential account notifications (deposits, withdrawals, security alerts).</p>
        <Link href="/" className="text-naxcal-teal text-sm font-medium hover:underline">Back to Naxcal</Link>
      </>
    );
  }

  if (state === "error") {
    return (
      <>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(239,68,68,0.1)" }}>
          <XCircle size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Couldn&apos;t unsubscribe</h1>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>{errorMsg}</p>
        <a href="mailto:support@naxcal.us" className="text-naxcal-teal text-sm font-medium hover:underline">Contact support</a>
      </>
    );
  }

  return (
    <>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
        <Mail size={32} className="text-naxcal-teal" />
      </div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Unsubscribe from Emails</h1>
      <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
        {email ? <>You&apos;ll stop receiving marketing emails at <strong>{email}</strong>.</> : "You'll stop receiving marketing and promotional emails."} Essential account notifications (security, transactions) will continue.
      </p>
      <button onClick={confirm} disabled={state === "loading"}
        className="px-8 py-3 rounded-lg text-white font-semibold text-sm cursor-pointer transition-all disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)" }}>
        {state === "loading" ? "Unsubscribing…" : "Confirm Unsubscribe"}
      </button>
      <p className="text-xs mt-4" style={{ color: "#9ca3af" }}>
        You can re-enable emails in <Link href="/dashboard/settings" className="text-naxcal-teal hover:underline">Settings → Notifications</Link>
      </p>
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#ffffff" }}>
      <div className="w-full max-w-md text-center">
        <Suspense fallback={null}>
          <UnsubscribeForm />
        </Suspense>
      </div>
    </div>
  );
}
