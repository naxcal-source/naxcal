"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { Settings, Loader2, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { profile, refreshProfile } = useDashboard();
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", city: "", country: "", postal_code: "" });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || "", phone: (profile as Record<string, unknown>).phone as string || "", address: "", city: "", country: "", postal_code: "" });
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSaved(false);
    if (!profile) return;
    setLoading(true);
    const { error: err } = await supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone, address: form.address || null, city: form.city || null, country: form.country || null, postal_code: form.postal_code || null, updated_at: new Date().toISOString() }).eq("id", profile.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSaved(true); await refreshProfile(); setTimeout(() => setSaved(false), 3000);
  };

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const inputStyle = { background: "#ffffff", border: "1px solid #e2e8f0" };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Account Settings</h1>
      </div>

      <div className="card-light p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Identity Verification</h3>
            <p className="text-xs text-[#6b7280] mt-0.5">KYC status: <span className={
              profile?.kyc_status === "approved" ? "text-emerald-600 font-medium" :
              profile?.kyc_status === "submitted" ? "text-amber-600 font-medium" : "text-[#6b7280]"
            } style={{ textTransform: "capitalize" }}>{profile?.kyc_status || "pending"}</span></p>
          </div>
          {profile?.kyc_status === "approved" ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={14} className="text-emerald-600" /><span className="text-xs text-emerald-700 font-medium">Verified</span>
            </div>
          ) : (
            <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">Pending</span>
          )}
        </div>
      </div>

      <div className="card-light p-6">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Profile Information</h3>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}
        {saved && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 size={14} /> Profile updated successfully.</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Full Name</label><input type="text" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-naxcal-teal" style={inputStyle} /></div>
            <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Phone</label><input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+44..." className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:border-naxcal-teal" style={inputStyle} /></div>
          </div>
          <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Address</label><input type="text" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Street address" className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:border-naxcal-teal" style={inputStyle} /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">City</label><input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-naxcal-teal" style={inputStyle} /></div>
            <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Country</label><input type="text" value={form.country} onChange={(e) => update("country", e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-naxcal-teal" style={inputStyle} /></div>
            <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Postal Code</label><input type="text" value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] focus:outline-none focus:border-naxcal-teal" style={inputStyle} /></div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-lg font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 btn-teal text-white disabled:opacity-50">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Changes"}
          </button>
        </form>
        <div className="mt-6 pt-5 border-t border-[#e5e7eb]">
          <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Email Address</label>
          <p className="text-sm text-[#374151]">{profile?.email}</p>
          <p className="text-[10px] text-[#9ca3af] mt-1">Email cannot be changed. Contact support if needed.</p>
        </div>
      </div>
    </motion.div>
  );
}
