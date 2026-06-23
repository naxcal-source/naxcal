"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { MessageSquareQuote, Plus, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Testimonial = {
  id: string; client_name: string; location: string; profit_amount: string;
  quote: string; tier: string; rating: number; initials: string;
  is_visible: boolean; created_at: string;
};

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [form, setForm] = useState({
    client_name: "", location: "", profit_amount: "", quote: "",
    tier: "gold", rating: 5, initials: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
    if (data) setTestimonials(data as Testimonial[]);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateForm = (field: string, value: string | number) => setForm((p) => ({ ...p, [field]: value }));

  const handleCreate = async () => {
    if (!form.client_name || !form.quote) return;
    setSaving(true);
    const initials = form.initials || form.client_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    await supabase.from("testimonials").insert({ ...form, initials, is_visible: true });
    setForm({ client_name: "", location: "", profit_amount: "", quote: "", tier: "gold", rating: 5, initials: "" });
    setMessage("Testimonial added");
    await load();
    setSaving(false);
  };

  const toggleVisible = async (id: string, visible: boolean) => {
    await supabase.from("testimonials").update({ is_visible: !visible }).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("testimonials").delete().eq("id", id);
    load();
  };

  const tierColor: Record<string, string> = { bronze: "text-orange-400", silver: "text-slate-400", gold: "text-amber-400" };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquareQuote size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">Testimonials</h1>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-naxcal-teal/15 border border-naxcal-teal/30 text-naxcal-teal text-sm mb-4">{message}</div>
      )}

      {/* Create Form */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Add Testimonial</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input type="text" value={form.client_name} onChange={(e) => updateForm("client_name", e.target.value)} placeholder="Client name"
            className="px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <input type="text" value={form.location} onChange={(e) => updateForm("location", e.target.value)} placeholder="Location (e.g. London, UK)"
            className="px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <input type="text" value={form.profit_amount} onChange={(e) => updateForm("profit_amount", e.target.value)} placeholder="Profit amount (e.g. $12,400)"
            className="px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
          <input type="text" value={form.initials} onChange={(e) => updateForm("initials", e.target.value)} placeholder="Initials (auto if blank)"
            className="px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
        <textarea value={form.quote} onChange={(e) => updateForm("quote", e.target.value)} placeholder="Quote..." rows={2}
          className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder:text-white/20 outline-none resize-none mb-3" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
        <div className="flex items-center gap-3">
          <select value={form.tier} onChange={(e) => updateForm("tier", e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white/70 cursor-pointer outline-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
          </select>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => updateForm("rating", s)} className="cursor-pointer">
                <Star size={16} className={s <= form.rating ? "text-amber-400 fill-amber-400" : "text-white/20"} />
              </button>
            ))}
          </div>
          <button onClick={handleCreate} disabled={!form.client_name || !form.quote || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-naxcal-teal hover:bg-naxcal-teal-light cursor-pointer disabled:opacity-50 ml-auto">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {testimonials.map((t) => (
          <div key={t.id} className="rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)", opacity: t.is_visible ? 1 : 0.5 }}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-naxcal-teal bg-naxcal-teal/15 shrink-0">{t.initials}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white/80 font-medium">{t.client_name}</p>
                    <span className={cn("text-[10px] font-semibold capitalize", tierColor[t.tier] || "text-white/40")}>{t.tier}</span>
                  </div>
                  <p className="text-[10px] text-white/30">{t.location} {t.profit_amount && `• ${t.profit_amount}`}</p>
                  <p className="text-xs text-white/50 mt-1 italic">&ldquo;{t.quote}&rdquo;</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleVisible(t.id, t.is_visible)} className="p-2 rounded-lg hover:bg-white/[0.05] cursor-pointer text-white/30 hover:text-white/60">
                  {t.is_visible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-2 rounded-lg hover:bg-red-500/10 cursor-pointer text-white/30 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {testimonials.length === 0 && <p className="text-sm text-white/30 text-center py-4">No testimonials yet</p>}
      </div>
    </div>
  );
}
