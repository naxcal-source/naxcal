"use client";

import { useEffect, useState } from "react";
import { Link2, Plus, Trash2, Copy, Check } from "lucide-react";

type Redirect = { slug: string; destination_url: string; created_at: string };

const adminPost = (body: object) =>
  fetch("/api/admin/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function AdminRedirectsPage() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [slug, setSlug] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedSlug, setCopiedSlug] = useState("");

  const load = async () => {
    const data = await fetch("/api/admin/data?type=redirects").then((r) => r.json()).catch(() => []);
    if (Array.isArray(data)) setRedirects(data as Redirect[]);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    const cleanSlug = slug.trim().replace(/^\/+/, "");
    if (!cleanSlug || !destinationUrl.trim()) return;
    setError("");
    setSaving(true);
    const res = await adminPost({ action: "manage_redirect", operation: "insert", data: { slug: cleanSlug, destination_url: destinationUrl.trim() } });
    if (!res.ok) {
      setError("That path is already taken, or the request failed.");
    } else {
      setSlug("");
      setDestinationUrl("");
      await load();
    }
    setSaving(false);
  };

  const handleDelete = async (s: string) => {
    await adminPost({ action: "manage_redirect", operation: "delete", data: { slug: s } });
    load();
  };

  const copyLink = (s: string) => {
    const url = `${window.location.origin}/go/${s}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(s);
    setTimeout(() => setCopiedSlug(""), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link2 size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">Redirects</h1>
      </div>

      <div className="rounded-xl p-5 mb-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-white mb-4">New Redirect</h3>
        <div className="space-y-3">
          <div className="flex items-center rounded-lg overflow-hidden" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="pl-3 text-sm text-white/30 whitespace-nowrap">naxcal.us/go/</span>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="report"
              className="w-full px-2 py-2.5 text-sm text-white placeholder:text-white/20 outline-none bg-transparent" />
          </div>
          <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://naxcal.us/dashboard/report"
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleCreate} disabled={!slug.trim() || !destinationUrl.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-naxcal-teal hover:bg-naxcal-teal-light cursor-pointer disabled:opacity-50">
            <Plus size={14} /> Create
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {redirects.map((r) => (
          <div key={r.slug} className="rounded-xl p-4 flex items-center justify-between gap-3" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="min-w-0">
              <p className="text-sm text-white/80 font-medium">/go/{r.slug}</p>
              <p className="text-xs text-white/40 mt-0.5 truncate">{r.destination_url}</p>
              <p className="text-[10px] text-white/20 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => copyLink(r.slug)} className="p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer text-white/30 hover:text-white/60">
                {copiedSlug === r.slug ? <Check size={14} className="text-naxcal-teal" /> : <Copy size={14} />}
              </button>
              <button onClick={() => handleDelete(r.slug)} className="p-2 rounded-lg hover:bg-red-500/10 cursor-pointer text-white/30 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {redirects.length === 0 && (
          <p className="text-sm text-white/30 text-center py-4">No redirects yet</p>
        )}
      </div>
    </div>
  );
}
