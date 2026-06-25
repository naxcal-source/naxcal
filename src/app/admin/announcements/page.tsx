"use client";

import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = { id: string; title: string; content: string; type: string; is_active: boolean; created_at: string };

const adminPost = (body: object) =>
  fetch("/api/admin/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const data = await fetch("/api/admin/data?type=announcements").then(r => r.json()).catch(() => []);
    if (Array.isArray(data)) setAnnouncements(data as Announcement[]);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!title || !content) return;
    setSaving(true);
    await adminPost({ action: "manage_announcement", operation: "insert", data: { title, content, type, is_active: true } });
    setTitle(""); setContent(""); setType("info");
    setMessage("Announcement created");
    await load();
    setSaving(false);
  };

  const toggleActive = async (a: Announcement) => {
    await adminPost({ action: "manage_announcement", operation: "update", data: { id: a.id, is_active: !a.is_active } });
    load();
  };

  const handleDelete = async (id: string) => {
    await adminPost({ action: "manage_announcement", operation: "delete", data: { id } });
    load();
  };

  const typeColors: Record<string, string> = { info: "text-blue-400", warning: "text-amber-400", success: "text-emerald-400", urgent: "text-red-400" };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Megaphone size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">Announcements</h1>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-naxcal-teal/15 border border-naxcal-teal/30 text-naxcal-teal text-sm mb-4">{message}</div>
      )}

      {/* Create Form */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-white mb-4">New Announcement</h3>
        <div className="space-y-3">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content" rows={3}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none resize-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <div className="flex items-center gap-3">
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm text-white/70 cursor-pointer outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="urgent">Urgent</option>
            </select>
            <button onClick={handleCreate} disabled={!title || !content || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-naxcal-teal hover:bg-naxcal-teal-light cursor-pointer disabled:opacity-50">
              <Plus size={14} /> Create
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-xl p-4 flex items-start justify-between" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)", opacity: a.is_active ? 1 : 0.5 }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[10px] font-semibold uppercase", typeColors[a.type] || typeColors.info)}>{a.type}</span>
                {!a.is_active && <span className="text-[10px] text-white/30">(hidden)</span>}
              </div>
              <p className="text-sm text-white/80 font-medium">{a.title}</p>
              <p className="text-xs text-white/40 mt-0.5">{a.content}</p>
              <p className="text-[10px] text-white/20 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => toggleActive(a)} className="p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer text-white/30 hover:text-white/60">
                {a.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg hover:bg-red-500/10 cursor-pointer text-white/30 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="text-sm text-white/30 text-center py-4">No announcements yet</p>
        )}
      </div>
    </div>
  );
}
