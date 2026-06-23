"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { Users, Copy, CheckCircle2, Gift, ChevronRight, Share2, MessageCircle, Mail, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Referral = { id: string; referred_id: string; bonus_amount: number; status: string; created_at: string };

export default function ReferralsPage() {
  const { profile } = useDashboard();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const supabase = createClient();

  const code = profile?.referral_code || "";
  const referralUrl = code ? `https://naxcal.com/register?ref=${code}` : "";

  useEffect(() => {
    if (!profile) return;
    supabase.from("referrals").select("*").eq("referrer_id", profile.id).order("created_at", { ascending: false }).then(({ data }) => { if (data) setReferrals(data); });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyLink = () => { navigator.clipboard.writeText(referralUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const copyCode = () => { navigator.clipboard.writeText(code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); };

  const totalBonus = referrals.reduce((s, r) => s + Number(r.bonus_amount), 0);
  const activeReferrals = referrals.filter((r) => r.status === "active").length;
  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on Naxcal and start earning daily returns on your capital! ${referralUrl}`)}`, "_blank");
  const shareEmail = () => window.open(`mailto:?subject=${encodeURIComponent("Join Naxcal")}&body=${encodeURIComponent(`I've been using Naxcal for daily investment returns. Join here: ${referralUrl}`)}`, "_blank");

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Referrals</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Users size={22} className="text-blue-600" />
        <h1 className="text-xl font-bold text-[#0f172a]">Referral Program</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card-light p-5 text-center">
          <p className="text-xs text-[#6b7280] mb-1">Total Referred</p>
          <p className="text-2xl font-bold text-blue-600">{referrals.length}</p>
        </div>
        <div className="card-light p-5 text-center">
          <p className="text-xs text-[#6b7280] mb-1">Active Investors</p>
          <p className="text-2xl font-bold text-naxcal-teal">{activeReferrals}</p>
        </div>
        <div className="card-light p-5 text-center">
          <p className="text-xs text-[#6b7280] mb-1">Bonus Earned</p>
          <p className="text-2xl font-bold text-amber-600">{fmt(totalBonus)}</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="card-light p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Gift size={18} className="text-naxcal-teal" />
          <h3 className="text-sm font-semibold text-[#0f172a]">Your Referral Code</h3>
        </div>

        <div className="flex items-center justify-center gap-3 p-4 rounded-xl mb-4" style={{ background: "rgba(26,138,110,0.04)", border: "1px solid rgba(26,138,110,0.15)" }}>
          <span className="text-2xl font-bold text-naxcal-teal tracking-[0.3em] font-mono">{code || "—"}</span>
          <button onClick={copyCode} className="p-2 rounded-lg hover:bg-naxcal-teal/10 cursor-pointer transition-colors">
            {copiedCode ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} className="text-naxcal-teal" />}
          </button>
        </div>

        <p className="text-xs text-[#6b7280] mb-3">Share your link and earn <span className="text-naxcal-teal font-semibold">5% of your referral&apos;s first deposit</span> as a bonus.</p>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 px-3 py-2.5 rounded-lg text-xs text-[#475569] truncate font-mono bg-[#f8fafc] border border-[#e2e8f0]">{referralUrl || "Loading..."}</div>
          <button onClick={copyLink} className="px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1 shrink-0 transition-all" style={{ background: copied ? "#f0fdf4" : "rgba(26,138,110,0.08)", border: `1px solid ${copied ? "#bbf7d0" : "rgba(26,138,110,0.2)"}`, color: copied ? "#16a34a" : "#1a8a6e" }}>
            {copied ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2">
          <button onClick={shareWhatsApp} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium cursor-pointer text-[#25d366] hover:bg-[#25d366]/10 transition-all" style={{ border: "1px solid rgba(37,211,102,0.2)" }}>
            <MessageCircle size={14} /> WhatsApp
          </button>
          <button onClick={shareEmail} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium cursor-pointer text-blue-600 hover:bg-blue-50 transition-all" style={{ border: "1px solid rgba(59,130,246,0.2)" }}>
            <Mail size={14} /> Email
          </button>
          <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium cursor-pointer text-[#374151] hover:bg-[#f1f5f9] transition-all" style={{ border: "1px solid #e2e8f0" }}>
            <Link2 size={14} /> Copy Link
          </button>
        </div>
      </div>

      {/* Commission structure */}
      <div className="card-light p-5 mb-4">
        <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Commission Structure</h3>
        <div className="space-y-2">
          {[
            { range: "1-10 referrals", commission: "5% of first deposit" },
            { range: "11-50 referrals", commission: "7% of first deposit" },
            { range: "50+ referrals", commission: "10% of first deposit" },
          ].map((tier, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: i === 0 && referrals.length <= 10 ? "rgba(26,138,110,0.04)" : undefined }}>
              <span className="text-xs text-[#374151]">{tier.range}</span>
              <span className="text-xs font-semibold text-naxcal-teal">{tier.commission}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Referred Users */}
      <div className="card-light overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5e7eb] bg-[#f8fafc]">
          <h3 className="text-sm font-semibold text-[#0f172a]">Referred Users</h3>
        </div>
        {referrals.length === 0 ? (
          <div className="py-12 text-center text-[#9ca3af] text-sm">No referrals yet. Share your link to start earning.</div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {referrals.map((ref, i) => (
              <div key={ref.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#f8fafc] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#f1f5f9] flex items-center justify-center text-xs font-bold text-[#6b7280]">
                    {String.fromCharCode(65 + (i % 26))}
                  </div>
                  <div>
                    <p className="text-sm text-[#374151] font-medium">User ***{ref.referred_id.slice(-4)}</p>
                    <p className="text-[10px] text-[#9ca3af]">{new Date(ref.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#16a34a]">+{fmt(Number(ref.bonus_amount))}</p>
                  <span className={cn("text-[10px] capitalize px-1.5 py-0.5 rounded-full font-medium",
                    ref.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  )}>{ref.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
