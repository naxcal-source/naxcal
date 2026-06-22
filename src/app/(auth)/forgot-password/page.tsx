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
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
    });
    setLoading(false);

    if (resetError) { setError(resetError.message); return; }
    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0a0e14" }}>
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-naxcal-teal/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-naxcal-teal" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Check Your Email</h1>
            <p className="text-white/50 text-sm">We&apos;ve sent a password reset link to <span className="text-white/80">{email}</span>.</p>
          </div>
        ) : (
          <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-12 h-12 rounded-full bg-naxcal-teal/15 flex items-center justify-center mb-5">
              <Mail size={22} className="text-naxcal-teal" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Reset Your Password</h1>
            <p className="text-white/40 text-sm mb-6">Enter your email and we&apos;ll send you a reset link.</p>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-naxcal-teal transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-lg text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)", boxShadow: "0 0 20px rgba(26,138,110,0.35)" }}>
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : "Send Reset Link"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
