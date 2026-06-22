"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Shield, Lock, TrendingUp, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[40%] flex-col justify-between p-10 relative overflow-hidden" style={{ background: "#020408" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(26,138,110,0.15) 0%, transparent 70%)" }} />
        <div className="relative z-10">
          <Image src="/Naxcal_Primary_Logo.png" alt="Naxcal" width={160} height={44} className="h-10 w-auto mb-6" style={{ filter: "drop-shadow(0 0 12px rgba(26,138,110,0.4))" }} />
          <h2 className="text-2xl font-bold text-white mt-12 mb-3">Welcome Back to <span className="text-naxcal-teal">Naxcal</span></h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Access your portfolio, track your daily returns, and manage your capital deployment.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: Shield, text: "FCA Authorised & Regulated" },
              { icon: Lock, text: "256-bit SSL Encryption" },
              { icon: TrendingUp, text: "1.5% – 2.1% Daily Returns" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(26,138,110,0.12)", border: "1px solid rgba(26,138,110,0.25)" }}>
                  <item.icon size={16} className="text-naxcal-teal" />
                </div>
                <span className="text-sm text-white/60">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 p-5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm text-white/50 italic leading-relaxed">&ldquo;The transparency and consistency of returns has been exceptional. Best platform I&apos;ve used.&rdquo;</p>
          <p className="text-xs text-naxcal-teal mt-3 font-medium">— Sarah M., Gold Tier Investor</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10" style={{ background: "#0a0e14" }}>
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/40 text-sm mb-8">Sign in to your Naxcal account</p>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-naxcal-teal transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-white/50 uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-xs text-naxcal-teal hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full px-4 py-3 pr-11 rounded-lg text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-naxcal-teal transition-colors" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-lg text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)", boxShadow: "0 0 20px rgba(26,138,110,0.35)" }}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing In...</> : "Sign In"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-white/25">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <p className="text-sm text-white/40 text-center">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-naxcal-teal font-medium hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
