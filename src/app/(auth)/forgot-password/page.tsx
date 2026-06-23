"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Please enter your email address."); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (resetError) { setError(resetError.message); return; }
    setSuccess(true);
  };

  const inputStyle = { backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#ffffff" }}>
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-naxcal-teal" style={{ color: "#6b7280" }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
              <CheckCircle2 size={32} className="text-naxcal-teal" />
            </div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Check Your Email</h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>We&apos;ve sent a password reset link to <span style={{ color: "#0f172a" }}>{email}</span>.</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(26,138,110,0.1)" }}>
              <Mail size={22} className="text-naxcal-teal" />
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "#0f172a" }}>Reset Your Password</h1>
            <p className="text-sm mb-6" style={{ color: "#6b7280" }}>Enter your email and we&apos;ll send you a reset link.</p>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#374151" }}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-colors placeholder:text-[#9ca3af]" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-lg text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)", boxShadow: "0 0 20px rgba(26,138,110,0.35)" }}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : "Send Reset Link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
