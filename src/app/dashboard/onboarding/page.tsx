"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { Shield, TrendingUp, Wallet, ArrowRight, CheckCircle2, Star, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const { profile } = useDashboard();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const supabase = createClient();
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const complete = async () => {
    if (profile) await supabase.from("profiles").update({ onboarding_complete: true } as Record<string, unknown>).eq("id", profile.id);
    router.push("/dashboard");
  };

  const skip = () => complete();

  const slides = [
    // Step 0: Welcome
    <motion.div key="welcome" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
        <span className="text-3xl font-bold text-naxcal-teal">N</span>
      </div>
      <h1 className="text-2xl font-bold text-[#0f172a] mb-2">Welcome to Naxcal, {firstName}!</h1>
      <p className="text-sm text-[#6b7280] max-w-md mx-auto">You&apos;re about to access institutional-grade investment strategies. Let us show you around.</p>
    </motion.div>,

    // Step 1: How it works
    <motion.div key="how" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <h2 className="text-xl font-bold text-[#0f172a] text-center mb-6">How Naxcal Works</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Wallet, title: "Deposit Capital", desc: "Fund your account with crypto. 12+ currencies supported." },
          { icon: TrendingUp, title: "Earn Daily", desc: "Our AI-driven strategies generate 1.5%–2.1% daily returns." },
          { icon: Shield, title: "Withdraw Anytime", desc: "Your capital is never locked. Withdraw within 24 hours." },
        ].map((item, i) => (
          <div key={i} className="text-center p-5 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(26,138,110,0.1)" }}>
              <item.icon size={22} className="text-naxcal-teal" />
            </div>
            <h3 className="text-sm font-semibold text-[#0f172a] mb-1">{item.title}</h3>
            <p className="text-xs text-[#6b7280]">{item.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>,

    // Step 2: Tiers
    <motion.div key="tiers" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
      <h2 className="text-xl font-bold text-[#0f172a] text-center mb-6">Investment Tiers</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { tier: "Bronze", rate: "1.5%", min: "$0", color: "text-orange-700", bg: "linear-gradient(135deg, rgba(180,83,9,0.06), rgba(180,83,9,0.02))", border: "rgba(180,83,9,0.15)" },
          { tier: "Silver", rate: "1.8%", min: "$5,000", color: "text-slate-600", bg: "linear-gradient(135deg, rgba(100,116,139,0.06), rgba(100,116,139,0.02))", border: "rgba(100,116,139,0.15)" },
          { tier: "Gold", rate: "2.1%", min: "$25,000", color: "text-amber-600", bg: "linear-gradient(135deg, rgba(240,165,0,0.06), rgba(240,165,0,0.02))", border: "rgba(240,165,0,0.15)" },
        ].map((t) => (
          <div key={t.tier} className="p-5 rounded-xl text-center" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
            <Star size={20} className={cn(t.color, "mx-auto mb-2")} />
            <h3 className={cn("text-lg font-bold", t.color)}>{t.tier}</h3>
            <p className="text-2xl font-bold text-[#0f172a] my-1">{t.rate}</p>
            <p className="text-xs text-[#6b7280]">daily · min {t.min}</p>
          </div>
        ))}
      </div>
    </motion.div>,

    // Step 3: Verify
    <motion.div key="verify" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(26,138,110,0.1)" }}>
        <ShieldCheck size={36} className="text-naxcal-teal" />
      </div>
      <h2 className="text-xl font-bold text-[#0f172a] mb-2">Verify Your Identity</h2>
      <p className="text-sm text-[#6b7280] max-w-md mx-auto mb-4">Complete KYC to unlock deposits, withdrawals, and full platform access. It only takes 2 minutes.</p>
      <div className="inline-flex flex-col gap-2 text-left">
        {["Unlock crypto deposits", "Enable withdrawals", "Higher tier access", "Priority support"].map((b) => (
          <div key={b} className="flex items-center gap-2 text-sm text-[#374151]">
            <CheckCircle2 size={14} className="text-naxcal-teal" /> {b}
          </div>
        ))}
      </div>
    </motion.div>,

    // Step 4: Ready
    <motion.div key="ready" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-[#0f172a] mb-2">You&apos;re All Set!</h2>
      <p className="text-sm text-[#6b7280] max-w-md mx-auto">Your account is ready. Start by completing verification, then make your first deposit to begin earning.</p>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.97)" }}>
      <div className="w-full max-w-2xl px-6">
        <AnimatePresence mode="wait">
          {slides[step]}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button onClick={skip} className="text-xs text-[#9ca3af] hover:text-[#6b7280] cursor-pointer">Skip</button>

          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <div key={i} className={cn("w-2 h-2 rounded-full transition-all", step === i ? "bg-naxcal-teal w-6" : "bg-[#d1d5db]")} />
            ))}
          </div>

          {step < slides.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal cursor-pointer">
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={complete} className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal cursor-pointer">
              Go to Dashboard <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
