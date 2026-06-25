"use client";

import { useState } from "react";
import { Send, Plus, Trash2, CheckCircle2, Loader2, AlertTriangle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type Recipient = { name: string; email: string };

export default function AdminOutreachPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([
    { name: "", email: "" },
  ]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ email: string; status: "sent" | "failed" }[]>([]);
  const [done, setDone] = useState(false);

  const addRecipient = () => setRecipients((r) => [...r, { name: "", email: "" }]);
  const removeRecipient = (i: number) => setRecipients((r) => r.filter((_, idx) => idx !== i));
  const updateRecipient = (i: number, field: "name" | "email", val: string) =>
    setRecipients((r) => r.map((rec, idx) => idx === i ? { ...rec, [field]: val } : rec));

  const handleSend = async () => {
    const valid = recipients.filter((r) => r.email.trim() && r.name.trim());
    if (valid.length === 0) return;

    setSending(true);
    setDone(false);
    setResults([]);

    const res: typeof results = [];
    for (const r of valid) {
      try {
        const resp = await fetch("/api/admin/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "investor_outreach", email: r.email.trim(), name: r.name.trim() }),
        });
        res.push({ email: r.email, status: resp.ok ? "sent" : "failed" });
      } catch {
        res.push({ email: r.email, status: "failed" });
      }
    }

    setResults(res);
    setDone(true);
    setSending(false);
  };

  const allValid = recipients.every((r) => r.name.trim() && r.email.trim());
  const sentCount = results.filter((r) => r.status === "sent").length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Mail size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">Investor Outreach</h1>
      </div>
      <p className="text-xs text-white/30 mb-8">Sends a premium HTML invitation email from noreply@naxcal.com</p>

      {done && (
        <div className={cn("p-4 rounded-xl mb-6 flex items-center gap-3",
          sentCount === results.length
            ? "bg-emerald-500/10 border border-emerald-500/20"
            : "bg-amber-500/10 border border-amber-500/20"
        )}>
          <CheckCircle2 size={18} className={sentCount === results.length ? "text-emerald-400" : "text-amber-400"} />
          <div>
            <p className="text-sm font-semibold text-white">{sentCount}/{results.length} emails sent successfully</p>
            <div className="mt-1 space-y-0.5">
              {results.map((r) => (
                <p key={r.email} className="text-xs text-white/40">
                  {r.status === "sent" ? "✓" : "✗"} {r.email} — {r.status}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden mb-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-5 py-4 border-b border-white/[0.06]" style={{ background: "#141414" }}>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Recipients</p>
        </div>
        <div className="p-5 space-y-3">
          {recipients.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Full name"
                value={r.name}
                onChange={(e) => updateRecipient(i, "name", e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none"
                style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <input
                type="email"
                placeholder="Email address"
                value={r.email}
                onChange={(e) => updateRecipient(i, "email", e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none"
                style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              {recipients.length > 1 && (
                <button onClick={() => removeRecipient(i)} className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          <button onClick={addRecipient} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-naxcal-teal cursor-pointer transition-colors mt-1">
            <Plus size={13} /> Add another recipient
          </button>
        </div>
      </div>

      {/* Preview notice */}
      <div className="p-4 rounded-xl mb-6 flex items-start gap-3" style={{ background: "rgba(26,138,110,0.06)", border: "1px solid rgba(26,138,110,0.15)" }}>
        <AlertTriangle size={16} className="text-naxcal-teal shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-naxcal-teal mb-1">What this sends</p>
          <p className="text-xs text-white/40 leading-relaxed">A premium dark-theme HTML email with Naxcal branding, daily return rates, tier breakdown, and a register button. Sent from <span className="text-white/60">noreply@naxcal.com</span> with reply-to <span className="text-white/60">support@naxcal.com</span>.</p>
        </div>
      </div>

      <button
        onClick={handleSend}
        disabled={sending || !allValid}
        className="w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending
          ? <><Loader2 size={16} className="animate-spin" /> Sending {recipients.filter(r => r.email && r.name).length} email{recipients.filter(r => r.email && r.name).length > 1 ? "s" : ""}...</>
          : <><Send size={16} /> Send Invitation{recipients.filter(r => r.email && r.name).length > 1 ? "s" : ""}</>
        }
      </button>
    </div>
  );
}
