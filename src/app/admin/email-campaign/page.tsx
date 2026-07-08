"use client";

import { useMemo, useRef, useState } from "react";
import { Send, Loader2, CheckCircle2, AlertTriangle, Mail, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const CHUNK_SIZE = 100;

type Contact = { email: string; name?: string };

function parseContacts(raw: string): Contact[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [first, second] = line.split(",").map((s) => s.trim());
      const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);
      if (second && isEmail(second)) return { email: second, name: first };
      return { email: first };
    })
    .filter((c) => /\S+@\S+\.\S+/.test(c.email));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default function EmailCampaignPage() {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [contactsRaw, setContactsRaw] = useState("");

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totals, setTotals] = useState({ total: 0, skipped: 0, sent: 0, failed: 0 });
  const [failedEmails, setFailedEmails] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  const htmlFileRef = useRef<HTMLInputElement>(null);
  const contactsFileRef = useRef<HTMLInputElement>(null);

  const contacts = useMemo(() => parseContacts(contactsRaw), [contactsRaw]);
  const canSend = subject.trim() && html.trim() && contacts.length > 0 && !sending;

  const handleHtmlUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setHtml(String(reader.result || ""));
      setUploadedFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleContactsUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setContactsRaw(String(reader.result || ""));
    reader.readAsText(file);
  };

  const handleSend = async () => {
    if (!canSend) return;
    if (!confirm(`Send this email to ${contacts.length} recipient${contacts.length > 1 ? "s" : ""}? This can't be undone.`)) return;

    setSending(true);
    setDone(false);
    setError("");
    setProgress(0);
    setFailedEmails([]);
    const running = { total: 0, skipped: 0, sent: 0, failed: 0 };
    const runningFailed: string[] = [];

    const batches = chunk(contacts, CHUNK_SIZE);
    for (let i = 0; i < batches.length; i++) {
      try {
        const res = await fetch("/api/admin/email-campaign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, html, contacts: batches[i] }),
        });
        const body = await res.json();
        if (!res.ok) {
          setError(body.error || "Batch failed");
          break;
        }
        running.total += body.total;
        running.skipped += body.skipped;
        running.sent += body.sent;
        running.failed += body.failed;
        runningFailed.push(...(body.failedEmails || []));
      } catch {
        setError("Network error while sending a batch");
        break;
      }
      setTotals({ ...running });
      setFailedEmails([...runningFailed]);
      setProgress(Math.round(((i + 1) / batches.length) * 100));
    }

    setSending(false);
    setDone(true);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Mail size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">Email Campaign</h1>
      </div>
      <p className="text-xs text-white/30 mb-8">
        Sends custom HTML to a pasted list of contacts, in batches of {CHUNK_SIZE}. Anyone who previously unsubscribed is skipped automatically.
      </p>

      {done && (
        <div className={cn("p-4 rounded-xl mb-6 flex items-start gap-3",
          totals.failed === 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"
        )}>
          <CheckCircle2 size={18} className={cn("shrink-0 mt-0.5", totals.failed === 0 ? "text-emerald-400" : "text-amber-400")} />
          <div className="text-sm text-white/70">
            <p className="font-semibold text-white mb-1">
              {totals.sent} sent · {totals.skipped} skipped (unsubscribed) · {totals.failed} failed
            </p>
            {failedEmails.length > 0 && (
              <p className="text-xs text-white/40 mt-1 break-all">Failed: {failedEmails.join(", ")}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-white/70">{error}</p>
        </div>
      )}

      <div className="max-w-3xl space-y-4 mb-6">
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your subject line — {{name}} is supported"
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block">HTML body — edit and preview</label>
        <div className="flex items-center gap-2">
          {uploadedFileName && <span className="text-[11px] text-white/30 truncate max-w-[160px]">{uploadedFileName}</span>}
          <button
            onClick={() => htmlFileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-naxcal-teal cursor-pointer transition-colors px-2.5 py-1 rounded-md"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Upload size={12} /> Upload .html
          </button>
          <input
            ref={htmlFileRef}
            type="file"
            accept=".html,text/html"
            className="hidden"
            onChange={(e) => handleHtmlUpload(e.target.files?.[0])}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <textarea
          value={html}
          onChange={(e) => { setHtml(e.target.value); setUploadedFileName(""); }}
          placeholder="Paste full HTML, or upload a .html file above. {{name}} and {{unsubscribe_url}} are replaced per recipient. An unsubscribe link is auto-added if you don't include one. Edits update the preview live."
          className="w-full h-[420px] px-3 py-2.5 rounded-lg text-xs font-mono text-white placeholder:text-white/20 outline-none resize-none"
          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <div className="h-[420px] rounded-lg overflow-hidden bg-white" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          {html.trim() ? (
            <iframe title="preview" srcDoc={html} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-black/30">Preview appears here as you type</div>
          )}
        </div>
      </div>

      <div className="max-w-3xl space-y-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block">
              Recipients ({contacts.length} valid)
            </label>
            <button
              onClick={() => contactsFileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-naxcal-teal cursor-pointer transition-colors px-2.5 py-1 rounded-md"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Upload size={12} /> Upload .csv/.txt
            </button>
            <input
              ref={contactsFileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => handleContactsUpload(e.target.files?.[0])}
            />
          </div>
          <textarea
            value={contactsRaw}
            onChange={(e) => setContactsRaw(e.target.value)}
            placeholder={"One per line: email\nor: Name, email@example.com\n\n...or upload a .csv/.txt file above"}
            rows={8}
            className="w-full px-3 py-2.5 rounded-lg text-xs font-mono text-white placeholder:text-white/20 outline-none resize-y"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
      </div>

      <div className="max-w-3xl">
      {sending && (
        <div className="mb-4">
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-naxcal-teal transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-white/40 mt-1.5">{progress}% — {totals.sent + totals.skipped + totals.failed} of {contacts.length} processed</p>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={!canSend}
        className="w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending
          ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
          : <><Send size={16} /> Send to {contacts.length || 0} recipient{contacts.length === 1 ? "" : "s"}</>
        }
      </button>
      </div>
    </div>
  );
}
