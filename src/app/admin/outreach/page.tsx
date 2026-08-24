import Link from "next/link";
import { MailCheck, ShieldCheck } from "lucide-react";

export default function AdminOutreachPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center gap-3">
        <MailCheck size={22} className="text-naxcal-teal" />
        <div>
          <h1 className="text-xl font-bold text-white">Investor Outreach</h1>
          <p className="mt-1 text-xs text-white/40">
            Consent-based email delivery
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-6"
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="mb-4 flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-naxcal-teal" />
          <div>
            <h2 className="text-sm font-semibold text-white">
              Direct recipient entry is disabled
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Customer and investor emails must use registered accounts with an
              explicit marketing opt-in. This protects unsubscribe choices,
              bounce suppressions, delivery records, and sender reputation.
            </p>
          </div>
        </div>

        <Link
          href="/admin/broadcast"
          className="inline-flex rounded-lg bg-naxcal-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-naxcal-teal-light"
        >
          Open consent-based campaigns
        </Link>
      </div>
    </div>
  );
}
