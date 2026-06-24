"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type User = {
  id: string; full_name: string | null; email: string; balance: number;
  tier: string; kyc_status: string; created_at: string; is_active: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filterKYC, setFilterKYC] = useState("all");
  const [filterTier, setFilterTier] = useState("all");
  useEffect(() => {
    fetch("/api/admin/data?type=profiles").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data as User[]);
    }).catch(() => {});
  }, []);

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const filtered = users.filter((u) => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) && !(u.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterKYC !== "all" && u.kyc_status !== filterKYC) return false;
    if (filterTier !== "all" && u.tier !== filterTier) return false;
    return true;
  });

  const kycBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
      submitted: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      rejected: "bg-red-500/15 text-red-400 border-red-500/20",
    };
    return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", styles[status] || styles.pending)}>{status}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Users</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Search size={14} className="text-white/30" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none w-48" />
        </div>
        <select value={filterKYC} onChange={(e) => setFilterKYC(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white/70 cursor-pointer outline-none" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <option value="all">All KYC</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white/70 cursor-pointer outline-none" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <option value="all">All Tiers</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 font-medium">Name</th>
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 font-medium">Email</th>
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 font-medium">Balance</th>
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 font-medium">Tier</th>
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 font-medium">KYC</th>
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 font-medium">Joined</th>
                <th className="text-left text-[10px] text-white/30 uppercase tracking-wider px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white/80 font-medium">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-white/50">{u.email}</td>
                  <td className="px-4 py-3 text-white/80 font-semibold">{fmt(u.balance)}</td>
                  <td className="px-4 py-3 capitalize text-white/60">{u.tier}</td>
                  <td className="px-4 py-3">{kycBadge(u.kyc_status)}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="text-naxcal-teal text-xs hover:underline flex items-center gap-0.5">
                      View <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-white/30 text-sm py-8">No users found</p>}
      </div>
    </div>
  );
}
