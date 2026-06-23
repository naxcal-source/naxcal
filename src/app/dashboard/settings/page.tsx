"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { Settings, Loader2, CheckCircle2, User, Shield, Bell, Sliders, ChevronRight, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences", icon: Sliders },
];

function TwoFactorSection() {
  const [enrolling, setEnrolling] = useState(false);
  const [qrUri, setQrUri] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (data?.totp && data.totp.length > 0 && data.totp[0].status === "verified") {
        setMfaEnabled(true);
        setFactorId(data.totp[0].id);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnroll = async () => {
    setMfaError("");
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Naxcal Authenticator" });
    if (error) { setMfaError(error.message); setEnrolling(false); return; }
    if (data) {
      setQrUri(data.totp.uri);
      setFactorId(data.id);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) { setMfaError("Enter 6-digit code"); return; }
    setVerifying(true);
    setMfaError("");
    const { data: challenge, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chalErr) { setMfaError(chalErr.message); setVerifying(false); return; }
    const { error: verErr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (verErr) { setMfaError("Invalid code. Please try again."); setVerifying(false); return; }
    setMfaEnabled(true);
    setEnrolling(false);
    setQrUri("");
    setCode("");
    setMfaSuccess("Two-factor authentication enabled!");
    setTimeout(() => setMfaSuccess(""), 3000);
    setVerifying(false);
  };

  const handleDisable = async () => {
    setMfaError("");
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) { setMfaError(error.message); return; }
    setMfaEnabled(false);
    setFactorId("");
    setMfaSuccess("Two-factor authentication disabled");
    setTimeout(() => setMfaSuccess(""), 3000);
  };

  return (
    <div className="card-light p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-[#0f172a]">Two-Factor Authentication</h3>
        {mfaEnabled && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">Active</span>}
      </div>
      <p className="text-xs text-[#6b7280] mb-4">Add an extra layer of security using an authenticator app</p>

      {mfaSuccess && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm mb-3 flex items-center gap-2"><CheckCircle2 size={14} /> {mfaSuccess}</div>}
      {mfaError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm mb-3">{mfaError}</div>}

      {mfaEnabled ? (
        <button onClick={handleDisable} className="px-4 py-2 rounded-lg text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-all cursor-pointer">
          Disable 2FA
        </button>
      ) : enrolling && qrUri ? (
        <div>
          <p className="text-xs text-[#374151] mb-3">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
          <div className="flex justify-center mb-4 p-4 rounded-xl bg-white" style={{ border: "1px solid #e2e8f0" }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`} alt="2FA QR Code" width={200} height={200} />
          </div>
          <p className="text-xs text-[#6b7280] mb-3">Then enter the 6-digit code from your app:</p>
          <div className="flex gap-2">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
              className="flex-1 px-4 py-3 rounded-lg text-sm text-[#0f172a] text-center tracking-[0.5em] font-mono outline-none focus:ring-2 focus:ring-naxcal-teal/20" style={{ border: "1px solid #e2e8f0" }} />
            <button onClick={handleVerify} disabled={verifying || code.length !== 6}
              className="px-5 py-3 rounded-lg text-sm font-semibold text-white btn-teal cursor-pointer disabled:opacity-50">
              {verifying ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={handleEnroll} disabled={enrolling}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-naxcal-teal border border-naxcal-teal/20 hover:bg-naxcal-teal hover:text-white transition-all cursor-pointer disabled:opacity-50">
          {enrolling ? "Loading..." : "Enable 2FA"}
        </button>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { profile, refreshProfile, currency: ctxCurrency, setCurrency: ctxSetCurrency } = useDashboard();
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({ full_name: "", phone: "", dob: "", nationality: "", address: "", city: "", country: "", postal_code: "" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pinForm, setPinForm] = useState({ current: "", newPin: "", confirmPin: "" });
  const [hasPin, setHasPin] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState({ daily_profit: true, deposit: true, withdrawal: true, security: true, marketing: false, announcements: true });
  const [prefs, setPrefs] = useState({ auto_compound: true });
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      const p = profile as Record<string, unknown>;
      setForm({
        full_name: (p.full_name as string) || "", phone: (p.phone as string) || "",
        dob: "", nationality: "", address: "", city: "", country: "", postal_code: "",
      });
      setPrefs({ auto_compound: !!p.auto_compound });
      setHasPin(!!(p.withdrawal_pin as string));
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSaved("");
    if (!profile) return;
    setLoading(true);
    const { error: err } = await supabase.from("profiles").update({
      full_name: form.full_name, phone: form.phone || null,
    }).eq("id", profile.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSaved("Profile updated successfully"); await refreshProfile();
    setTimeout(() => setSaved(""), 3000);
  };

  const handleSavePrefs = async () => {
    if (!profile) return;
    setLoading(true);
    await supabase.from("profiles").update({ auto_compound: prefs.auto_compound }).eq("id", profile.id);
    setLoading(false);
    setSaved("Preferences saved"); setTimeout(() => setSaved(""), 3000);
  };

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const inputCls = "w-full px-4 py-3 rounded-lg text-sm text-[#0f172a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-all";
  const inputStyle = { background: "#ffffff", border: "1px solid #e2e8f0" };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Settings</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Settings size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Account Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-naxcal-teal text-white shadow-sm" : "text-[#6b7280] hover:bg-[#f1f5f9] border border-transparent"
            )}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {saved && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2"><CheckCircle2 size={14} /> {saved}</div>}
      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          {/* KYC Status */}
          <div className="card-light p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Identity Verification</h3>
                <p className="text-xs text-[#6b7280] mt-0.5">KYC status: <span className={profile?.kyc_status === "approved" ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"} style={{ textTransform: "capitalize" }}>{profile?.kyc_status || "pending"}</span></p>
              </div>
              {profile?.kyc_status === "approved" ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 size={14} className="text-emerald-600" /><span className="text-xs text-emerald-700 font-medium">Verified</span>
                </div>
              ) : (
                <Link href="/dashboard/kyc" className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white btn-teal">Verify Now</Link>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="card-light p-6">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Profile Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-naxcal-teal" style={{ background: "rgba(26,138,110,0.1)", border: "2px solid rgba(26,138,110,0.3)" }}>
                  {profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0f172a]">{profile?.full_name || "—"}</p>
                  <p className="text-xs text-[#9ca3af]">{profile?.email}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Full Name</label><input type="text" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className={inputCls} style={inputStyle} /></div>
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Phone</label><input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+44..." className={inputCls} style={inputStyle} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Date of Birth</label><input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} className={inputCls} style={inputStyle} /></div>
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Nationality</label><input type="text" value={form.nationality} onChange={(e) => update("nationality", e.target.value)} placeholder="e.g. British" className={inputCls} style={inputStyle} /></div>
              </div>
              <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Address</label><input type="text" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Street address" className={inputCls} style={inputStyle} /></div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">City</label><input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} className={inputCls} style={inputStyle} /></div>
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Country</label><input type="text" value={form.country} onChange={(e) => update("country", e.target.value)} className={inputCls} style={inputStyle} /></div>
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Postal Code</label><input type="text" value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} className={inputCls} style={inputStyle} /></div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 btn-teal text-white disabled:opacity-50">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-4">
          <div className="card-light p-6">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Change Password</h3>
            <form onSubmit={async (e) => {
              e.preventDefault(); setError(""); setSaved("");
              if (pwForm.newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
              if (pwForm.newPw !== pwForm.confirm) { setError("Passwords do not match."); return; }
              setLoading(true);
              const { error: pwErr } = await supabase.auth.updateUser({ password: pwForm.newPw });
              setLoading(false);
              if (pwErr) { setError(pwErr.message); return; }
              setPwForm({ current: "", newPw: "", confirm: "" });
              setSaved("Password updated successfully"); setTimeout(() => setSaved(""), 3000);
            }} className="space-y-4">
              <div>
                <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} className={inputCls} style={inputStyle} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] cursor-pointer">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">New Password</label><input type="password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} className={inputCls} style={inputStyle} /></div>
                <div><label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Confirm Password</label><input type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className={inputCls} style={inputStyle} /></div>
              </div>
              <button type="submit" className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer btn-teal text-white">Update Password</button>
            </form>
          </div>

          <TwoFactorSection />

          <div className="card-light p-6">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-1">Withdrawal PIN</h3>
            <p className="text-xs text-[#6b7280] mb-4">{hasPin ? "Your PIN is set. You can change it below." : "Set a 6-digit PIN required for all withdrawals."}</p>
            <form onSubmit={async (e) => {
              e.preventDefault(); setError(""); setSaved("");
              if (!profile) return;
              if (pinForm.newPin.length !== 6 || !/^\d{6}$/.test(pinForm.newPin)) { setError("PIN must be exactly 6 digits."); return; }
              if (pinForm.newPin !== pinForm.confirmPin) { setError("PINs do not match."); return; }
              if (hasPin && pinForm.current.length !== 6) { setError("Enter your current PIN."); return; }
              if (hasPin) {
                const { data: check } = await supabase.from("profiles").select("withdrawal_pin").eq("id", profile.id).single();
                if ((check as Record<string, unknown>)?.withdrawal_pin !== pinForm.current) { setError("Current PIN is incorrect."); return; }
              }
              setLoading(true);
              await supabase.from("profiles").update({ withdrawal_pin: pinForm.newPin } as Record<string, unknown>).eq("id", profile.id);
              setLoading(false);
              setHasPin(true);
              setPinForm({ current: "", newPin: "", confirmPin: "" });
              setSaved("Withdrawal PIN updated successfully");
              setTimeout(() => setSaved(""), 3000);
            }} className="space-y-3">
              {hasPin && (
                <div>
                  <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Current PIN</label>
                  <input type="password" value={pinForm.current} onChange={(e) => setPinForm({ ...pinForm, current: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="······" maxLength={6}
                    className={cn(inputCls, "tracking-[0.5em] text-center")} style={inputStyle} />
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">{hasPin ? "New PIN" : "Set PIN"}</label>
                  <input type="password" value={pinForm.newPin} onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6 digits" maxLength={6}
                    className={cn(inputCls, "tracking-[0.5em] text-center")} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Confirm PIN</label>
                  <input type="password" value={pinForm.confirmPin} onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="Re-enter" maxLength={6}
                    className={cn(inputCls, "tracking-[0.5em] text-center")} style={inputStyle} />
                </div>
              </div>
              <button type="submit" disabled={loading || pinForm.newPin.length !== 6} className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer btn-teal text-white disabled:opacity-50">
                {loading ? "Saving..." : hasPin ? "Update PIN" : "Set PIN"}
              </button>
            </form>
          </div>

          <div className="card-light p-6">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-4">Active Sessions</h3>
            <div className="flex items-center justify-between py-3 px-3 rounded-lg bg-[#f8fafc] mb-2">
              <div>
                <p className="text-sm text-[#374151] font-medium">Current Session</p>
                <p className="text-xs text-[#9ca3af]">{typeof navigator !== "undefined" ? navigator.userAgent.split("(")[1]?.split(")")[0] || "This device" : "This device"} · Active now</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[10px] text-[#9ca3af]">Last login: {new Date().toLocaleDateString("en-US", { dateStyle: "medium" })} at {new Date().toLocaleTimeString("en-US", { timeStyle: "short" })}</p>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="card-light p-6">
          <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Email Notifications</h3>
          <div className="space-y-4">
            {[
              { key: "daily_profit", label: "Daily profit emails", desc: "Receive your daily return summary" },
              { key: "deposit", label: "Deposit confirmations", desc: "When a deposit is confirmed" },
              { key: "withdrawal", label: "Withdrawal updates", desc: "When a withdrawal is processed" },
              { key: "security", label: "Security alerts", desc: "New login and security events" },
              { key: "marketing", label: "Marketing emails", desc: "Product updates and promotions" },
              { key: "announcements", label: "Platform announcements", desc: "Important platform updates" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-[#374151] font-medium">{item.label}</p>
                  <p className="text-xs text-[#9ca3af]">{item.desc}</p>
                </div>
                <button onClick={() => setNotifications((p) => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))}
                  className={cn("w-11 h-6 rounded-full transition-all cursor-pointer relative", notifications[item.key as keyof typeof notifications] ? "bg-naxcal-teal" : "bg-[#d1d5db]")}>
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all", notifications[item.key as keyof typeof notifications] ? "left-5.5" : "left-0.5")}
                    style={{ left: notifications[item.key as keyof typeof notifications] ? "22px" : "2px" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <div className="space-y-4">
          <div className="card-light p-6">
            <h3 className="text-sm font-semibold text-[#0f172a] mb-5">Display Preferences</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#6b7280] mb-1.5 uppercase tracking-wider">Currency</label>
                <select value={ctxCurrency} onChange={(e) => ctxSetCurrency(e.target.value)} className={cn(inputCls, "cursor-pointer")} style={inputStyle}>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-light p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Auto-Compound</h3>
                <p className="text-xs text-[#6b7280] mt-0.5">Automatically reinvest daily profits</p>
              </div>
              <button onClick={() => setPrefs({ ...prefs, auto_compound: !prefs.auto_compound })}
                className={cn("w-11 h-6 rounded-full transition-all cursor-pointer relative", prefs.auto_compound ? "bg-naxcal-teal" : "bg-[#d1d5db]")}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
                  style={{ left: prefs.auto_compound ? "22px" : "2px" }} />
              </button>
            </div>
          </div>

          <button onClick={handleSavePrefs} disabled={loading} className="w-full py-3 rounded-lg font-semibold text-sm cursor-pointer btn-teal text-white disabled:opacity-50">
            {loading ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      )}
    </motion.div>
  );
}
