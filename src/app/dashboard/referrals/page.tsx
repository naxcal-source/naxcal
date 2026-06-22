"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { Users, Copy, CheckCircle2, Gift } from "lucide-react";

type Referral = { id: string; referred_id: string; bonus_amount: number; status: string; created_at: string; };

export default function ReferralsPage() {
  const { profile } = useDashboard();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  const referralLink = profile?.referral_code ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${profile.referral_code}` : "";

  useEffect(() => {
    if (!profile) return;
    supabase.from("referrals").select("*").eq("referrer_id", profile.id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setReferrals(data); });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = () => { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const totalBonus = referrals.reduce((acc, r) => acc + Number(r.bonus_amount), 0);
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users size={22} className="text-blue-600" />
        <h1 className="text-xl font-bold text-[#0f172a]">Referral Program</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Your Code", value: profile?.referral_code || "—", color: "text-naxcal-teal" },
          { label: "Total Referrals", value: referrals.length.toString(), color: "text-blue-600" },
          { label: "Total Bonus Earned", value: fmt(totalBonus), color: "text-amber-600" },
        ].map((stat, i) => (
          <div key={i} className="card-light p-5 text-center">
            <p className="text-xs text-[#6b7280] mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card-light p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift size={18} className="text-naxcal-teal" />
          <h3 className="text-sm font-semibold text-[#0f172a]">Share Your Referral Link</h3>
        </div>
        <p className="text-xs text-[#6b7280] mb-4">Invite friends and earn a bonus when they make their first deposit.</p>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 rounded-lg text-sm text-[#475569] truncate font-mono bg-[#f8fafc] border border-[#e2e8f0]">{referralLink || "Loading..."}</div>
          <button onClick={handleCopy} className="px-4 py-3 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-1.5 shrink-0 transition-all" style={{ background: copied ? "#f0fdf4" : "rgba(26,138,110,0.08)", border: `1px solid ${copied ? "#bbf7d0" : "rgba(26,138,110,0.2)"}`, color: copied ? "#16a34a" : "#1a8a6e" }}>
            {copied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>

      <div className="card-light overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5e7eb] bg-[#f8fafc]">
          <h3 className="text-sm font-semibold text-[#0f172a]">Referred Users</h3>
        </div>
        {referrals.length === 0 ? (
          <div className="py-12 text-center text-[#9ca3af] text-sm">No referrals yet. Share your link to start earning bonuses.</div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#f8fafc] transition-colors">
                <div>
                  <p className="text-sm text-[#374151]">User {ref.referred_id.slice(0, 8)}...</p>
                  <p className="text-[10px] text-[#9ca3af]">{new Date(ref.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#16a34a]">{fmt(Number(ref.bonus_amount))}</p>
                  <p className="text-[10px] text-[#9ca3af] capitalize">{ref.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
