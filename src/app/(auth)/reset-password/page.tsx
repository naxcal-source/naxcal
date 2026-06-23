"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Failed to reset password.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#ffffff" }}>
      <div className="w-full max-w-md">
        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
              <CheckCircle2 size={32} className="text-naxcal-teal" />
            </div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Password Updated</h1>
            <p className="text-sm mb-4" style={{ color: "#6b7280" }}>Redirecting to your dashboard...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center mb-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(26,138,110,0.1)" }}>
                <Lock size={24} className="text-naxcal-teal" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: "#0f172a" }}>Set New Password</h1>
            <p className="text-sm mb-8 text-center" style={{ color: "#6b7280" }}>Enter your new password below</p>

            {error && <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#374151" }}>New Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-3 pr-11 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-colors" style={inputStyle} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "#9ca3af" }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#374151" }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-colors" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-lg text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)", boxShadow: "0 0 20px rgba(26,138,110,0.35)" }}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Updating...</> : "Update Password"}
              </button>
            </form>
            <p className="text-sm text-center mt-6" style={{ color: "#6b7280" }}>
              <Link href="/login" className="text-naxcal-teal font-medium hover:underline">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
