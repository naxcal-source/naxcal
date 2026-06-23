"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Shield, Lock, Eye, EyeOff, TrendingUp, CheckCircle2, Loader2 } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInvited = searchParams.get("invited") === "true";
  const [form, setForm] = useState({
    fullName: searchParams.get("name") || "",
    email: searchParams.get("email") || "",
    password: "",
    confirmPassword: "",
    referralCode: searchParams.get("ref") || "",
    agreed: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.fullName || !form.email || !form.password || !form.confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.agreed) {
      setError("You must agree to the Terms of Service.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName, referred_by: form.referralCode || null },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        console.error("Supabase signup error:", authError);
        const msg = authError.message && authError.message !== "{}"
          ? authError.message
          : "Registration failed. Please try again.";
        setError(msg);
        setLoading(false);
        return;
      }

      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: form.email,
          full_name: form.fullName,
        });
        // Send welcome email
        fetch("/api/auth/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, name: form.fullName }),
        }).catch(() => {});
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error("Signup exception:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[40%] flex-col justify-between p-10 relative overflow-hidden" style={{ background: "#020408" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(26,138,110,0.15) 0%, transparent 70%)" }} />
        <div className="relative z-10">
          <Image src="/Naxcal_Primary_Logo.png" alt="Naxcal" width={180} height={48} className="h-11 w-auto mb-6" style={{ filter: "brightness(1.4) drop-shadow(0 0 16px rgba(26,138,110,0.5))" }} />
          <h2 className="text-2xl font-bold text-white mt-12 mb-3">Deploy Capital. <span className="text-naxcal-teal">Earn Daily.</span></h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Join 4,200+ investors accessing institutional-grade strategies across forex, equities, and crypto markets.
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
          <p className="text-sm text-white/50 italic leading-relaxed">&ldquo;Naxcal has genuinely transformed how I think about passive income. Consistent, transparent, professional.&rdquo;</p>
          <p className="text-xs text-naxcal-teal mt-3 font-medium">— James W., Gold Tier Investor</p>
        </div>
      </div>

      {/* Right form — WHITE */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10" style={{ backgroundColor: "#ffffff" }}>
        <div className="w-full max-w-md">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
                <CheckCircle2 size={32} className="text-naxcal-teal" />
              </div>
              <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Check Your Email</h1>
              <p className="text-sm mb-8" style={{ color: "#6b7280" }}>We&apos;ve sent a verification link to <span style={{ color: "#0f172a" }}>{form.email}</span>. Click it to activate your account.</p>
              <Link href="/login" className="text-naxcal-teal text-sm font-medium hover:underline">Back to Login</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1" style={{ color: "#0f172a" }}>Create your account</h1>
              <p className="text-sm mb-8" style={{ color: "#6b7280" }}>
                Already have an account?{" "}
                <Link href="/login" className="text-naxcal-teal font-medium hover:underline">Login</Link>
              </p>

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{typeof error === "string" ? error : "An error occurred"}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#374151" }}>Full Name</label>
                  <input type="text" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="John Smith" className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-colors" style={{ backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#374151" }}>Email Address</label>
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-colors" style={{ backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#374151" }}>Password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min. 8 characters" className="w-full px-4 py-3 pr-11 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-colors" style={{ backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }} />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "#9ca3af" }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#374151" }}>Confirm Password</label>
                  <div className="relative">
                    <input type={showCpw ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter password" className="w-full px-4 py-3 pr-11 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-colors" style={{ backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }} />
                    <button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "#9ca3af" }}>{showCpw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1.5 uppercase tracking-wider" style={{ color: "#374151" }}>Referral Code <span style={{ color: "#9ca3af" }}>(optional)</span></label>
                  <input type="text" value={form.referralCode} onChange={(e) => update("referralCode", e.target.value)} placeholder="e.g. ABCD1234" className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-naxcal-teal/20 focus:border-naxcal-teal transition-colors" style={{ backgroundColor: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0" }} />
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input type="checkbox" checked={form.agreed} onChange={(e) => update("agreed", e.target.checked)} className="mt-0.5 accent-naxcal-teal" />
                  <span className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>
                    I agree to the <a href="/legal/terms" target="_blank" className="text-naxcal-teal hover:underline">Terms of Service</a> and <a href="/legal/privacy" target="_blank" className="text-naxcal-teal hover:underline">Privacy Policy</a>
                  </span>
                </label>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-lg text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #1a8a6e, #22a882)", boxShadow: "0 0 20px rgba(26,138,110,0.35)" }}>
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Creating Account...</> : "Create Account"}
                </button>
              </form>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "#e5e7eb" }} />
                <span className="text-xs" style={{ color: "#9ca3af" }}>or sign up with</span>
                <div className="flex-1 h-px" style={{ background: "#e5e7eb" }} />
              </div>

              <button onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
              }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all hover:bg-[#f8fafc]" style={{ border: "1px solid #e2e8f0", color: "#374151" }}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <p className="text-[10px] text-center mt-4 leading-relaxed" style={{ color: "#9ca3af" }}>
                By registering you agree to our terms. Capital at risk.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
