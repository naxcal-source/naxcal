"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { ShieldCheck, ChevronRight, Check, Clock, AlertTriangle, Loader2 } from "lucide-react";

const SumsubWebSdk = dynamic(() => import("@sumsub/websdk-react"), { ssr: false });

export default function KYCPage() {
  const { profile, refreshProfile } = useDashboard();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const res = await fetch("/api/kyc/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      if (!res.ok) throw new Error("Failed to get token");
      const data = await res.json();
      return data.token as string;
    } catch (err) {
      console.error("KYC token error:", err);
      setError("Failed to load verification. Please try again.");
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      if (profile?.kyc_status === "approved") { setLoading(false); return; }
      const token = await fetchToken();
      if (token) setAccessToken(token);
      setLoading(false);
    };
    if (profile) init();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-naxcal-teal" size={24} />
      </div>
    );
  }

  if (profile?.kyc_status === "approved") {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(22,163,74,0.1)" }}>
          <Check size={36} className="text-emerald-500" />
        </div>
        <h1 className="text-xl font-bold text-[#0f172a] mb-2">Identity Verified</h1>
        <p className="text-sm text-[#6b7280] mb-6">Your account is fully verified. You have access to all features.</p>
        <Link href="/dashboard" className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal">Back to Dashboard</Link>
      </motion.div>
    );
  }

  if (profile?.kyc_status === "submitted") {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(245,158,11,0.1)" }}>
          <Clock size={36} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-[#0f172a] mb-2">Verification Under Review</h1>
        <p className="text-sm text-[#6b7280] mb-2">We&apos;re reviewing your documents. This typically takes under 24 hours.</p>
        <p className="text-xs text-[#9ca3af]">We&apos;ll email you at {profile?.email} when complete.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Identity Verification</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <ShieldCheck size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-[#0f172a]">Verify Your Identity</h1>
      </div>
      <p className="text-sm text-[#6b7280] mb-6">Complete verification to unlock deposits and withdrawals. Takes 2-3 minutes.</p>

      {profile?.kyc_status === "rejected" && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-6" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm text-[#374151] font-medium">Previous verification was unsuccessful</p>
            <p className="text-xs text-[#6b7280]">Please resubmit your documents below.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl mb-6" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {accessToken && (
        <div className="card-light overflow-hidden" style={{ minHeight: 500 }}>
          <SumsubWebSdk
            accessToken={accessToken}
            expirationHandler={async () => {
              const token = await fetchToken();
              return token || "";
            }}
            onMessage={(type: string) => {
              if (type === "idCheck.applicantSubmitted") {
                if (profile) {
                  supabase.from("profiles").update({ kyc_status: "submitted" }).eq("id", profile.id).then(() => {
                    refreshProfile();
                  });
                }
              }
            }}
            onError={(error: unknown) => console.error("Sumsub error:", error)}
          />
        </div>
      )}
    </motion.div>
  );
}
