"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, Loader2, CheckCircle2, AlertTriangle, Upload, Send, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Audience = { id: string; name: string };
type BroadcastSummary = { id: string; name: string; audience_id: string | null; status: string; created_at: string; sent_at: string | null };
type BroadcastDetail = { id: string; name: string; audience_id: string | null; subject: string | null; html: string | null; status: string };

export default function BroadcastPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [audienceId, setAudienceId] = useState("");

  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [pastedEmails, setPastedEmails] = useState("");
  const [addingContacts, setAddingContacts] = useState(false);

  const htmlFileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/broadcast");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load");
      setAudiences(body.audiences);
      setBroadcasts(body.broadcasts);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setSelectedId(null);
    setName("");
    setSubject("");
    setHtml("");
    setAudienceId(audiences[0]?.id || "");
    setStatus("");
    setError("");
  };

  const openDraft = async (id: string) => {
    setError("");
    setStatus("");
    const res = await fetch(`/api/admin/broadcast/${id}`);
    const body = await res.json();
    if (!res.ok) { setError(body.error || "Failed to load broadcast"); return; }
    const b: BroadcastDetail = body.broadcast;
    setSelectedId(b.id);
    setName(b.name);
    setSubject(b.subject || "");
    setHtml(b.html || "");
    setAudienceId(b.audience_id || "");
  };

  const handleHtmlUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHtml(String(reader.result || ""));
    reader.readAsText(file);
  };

  const canSave = name.trim() && subject.trim() && html.trim() && audienceId && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      if (selectedId) {
        const res = await fetch(`/api/admin/broadcast/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subject, html }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setStatus("Draft updated.");
      } else {
        const res = await fetch("/api/admin/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audienceId, name, subject, html }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setSelectedId(body.broadcast.id);
        setStatus("Draft created.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!selectedId || !testEmail.trim()) return;
    setTestSending(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/admin/broadcast/${selectedId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testEmail.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setStatus(`Test sent to ${testEmail.trim()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send test");
    }
    setTestSending(false);
  };

  const handleSend = async () => {
    if (!selectedId) return;
    const audienceName = audiences.find((a) => a.id === audienceId)?.name || "this audience";
    if (!confirm(`Send "${name}" to every contact in "${audienceName}"? This can't be undone.`)) return;
    setSending(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/admin/broadcast/${selectedId}/send`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setStatus("Broadcast sent!");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    }
    setSending(false);
  };

  const handleAddContacts = async () => {
    if (!audienceId || !pastedEmails.trim()) return;
    setAddingContacts(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/broadcast/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audienceId, emails: pastedEmails }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const { added, failed } = body.result;
      setStatus(`Added ${added} contact${added === 1 ? "" : "s"} to the audience.${failed ? ` ${failed} failed (likely already existed).` : ""}`);
      setPastedEmails("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add contacts");
    }
    setAddingContacts(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft?")) return;
    await fetch(`/api/admin/broadcast/${id}`, { method: "DELETE" });
    if (selectedId === id) resetForm();
    await load();
  };

  if (loading) return <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 size={16} className="animate-spin" /> Loading...</div>;
  if (loadError) return <div className="text-red-400 text-sm">{loadError}. Make sure RESEND_API_KEY is a Full-access key.</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Radio size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">Resend Broadcast</h1>
      </div>
      <p className="text-xs text-white/30 mb-8">
        Sends via Resend&apos;s native Broadcast feature to an Audience — no daily send cap, unlike the Email Campaign tool.
      </p>

      <div className="max-w-3xl">
      {broadcasts.length > 0 && (
        <div className="mb-6">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Existing broadcasts</label>
          <div className="space-y-1.5">
            {broadcasts.map((b) => (
              <div key={b.id} className={cn("flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer",
                selectedId === b.id ? "bg-white/[0.08]" : "bg-white/[0.03] hover:bg-white/[0.05]"
              )} onClick={() => openDraft(b.id)}>
                <span className="text-white/70">{b.name}</span>
                <div className="flex items-center gap-3">
                  <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full",
                    b.status === "draft" ? "bg-white/10 text-white/50" : "bg-emerald-500/15 text-emerald-400"
                  )}>{b.status}</span>
                  {b.status === "draft" && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }} className="text-white/20 hover:text-red-400 cursor-pointer">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={resetForm} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-naxcal-teal mt-3 cursor-pointer">
            <Plus size={13} /> New broadcast
          </button>
        </div>
      )}

      {status && (
        <div className="p-4 rounded-xl mb-6 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-white/70">{status}</p>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-white/70">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Audience</label>
          <select
            value={audienceId}
            onChange={(e) => setAudienceId(e.target.value)}
            disabled={!!selectedId}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none disabled:opacity-50"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <option value="">Select an audience...</option>
            {audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {audienceId && (
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Paste emails to add to this audience</label>
            <textarea
              value={pastedEmails}
              onChange={(e) => setPastedEmails(e.target.value)}
              placeholder="One per line, or comma/space separated"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none resize-none mb-2"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <button
              onClick={handleAddContacts}
              disabled={!pastedEmails.trim() || addingContacts}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/15 cursor-pointer disabled:opacity-50"
            >
              {addingContacts ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : "Add to audience"}
            </button>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Internal name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 Performance Report"
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Your subject line"
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
      </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block">HTML body — edit and preview</label>
        <button
          onClick={() => htmlFileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-naxcal-teal cursor-pointer transition-colors px-2.5 py-1 rounded-md"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Upload size={12} /> Upload .html
        </button>
        <input ref={htmlFileRef} type="file" accept=".html,text/html" className="hidden" onChange={(e) => handleHtmlUpload(e.target.files?.[0])} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="Paste full HTML, or upload a .html file above. Edits here update the preview live."
          className="w-full h-[520px] px-3 py-2.5 rounded-lg text-xs font-mono text-white placeholder:text-white/20 outline-none resize-none"
          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <div className="h-[520px] rounded-lg overflow-hidden bg-white" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          {html.trim() ? (
            <iframe title="preview" srcDoc={html} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-black/30">Preview appears here as you type</div>
          )}
        </div>
      </div>

      <div className="max-w-3xl">
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : selectedId ? "Save changes to draft" : "Create draft"}
      </button>

      {selectedId && (
        <>
          <div className="flex gap-2 mb-4">
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <button
              onClick={handleTest}
              disabled={!testEmail.trim() || testSending}
              className="px-4 py-2.5 rounded-lg text-sm text-white/80 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {testSending ? "Sending..." : "Send test"}
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 bg-naxcal-teal hover:bg-naxcal-teal-light transition-colors disabled:opacity-50"
          >
            {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send broadcast to audience</>}
          </button>
        </>
      )}
      </div>
    </div>
  );
}
