"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ShieldCheck, History, TrendingUp,
  ArrowUpCircle, Megaphone, MessageSquareQuote, Settings,
  LogOut, Menu, ChevronRight, Shield,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/kyc", label: "KYC Review", icon: ShieldCheck },
  { href: "/admin/profit", label: "Post Profit", icon: TrendingUp },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpCircle },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
];

type AdminProfile = { id: string; email: string; full_name: string | null; is_admin: boolean };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("id, email, full_name, is_admin").eq("id", user.id).single();
      if (!data?.is_admin) { router.push("/dashboard"); return; }
      setProfile(data as AdminProfile);
      setLoading(false);
    };
    check();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-8 h-8 border-2 border-naxcal-teal/30 border-t-naxcal-teal rounded-full animate-spin" />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-naxcal-teal" />
          <span className="text-lg font-bold text-white tracking-tight">NAXCAL</span>
        </div>
        <span className="text-[10px] text-red-400 font-semibold uppercase tracking-widest">Admin Panel</span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {adminNav.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
              className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] transition-all",
                active ? "text-naxcal-teal font-semibold bg-white/[0.06]" : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
              )}>
              <item.icon size={17} /><span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/[0.06]">
        <p className="text-xs text-white/50 truncate mb-2">{profile?.email}</p>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-white/30 hover:text-red-400 transition-colors cursor-pointer">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "#111111" }}>
      <aside className="hidden lg:block w-[250px] shrink-0 border-r border-white/[0.06]" style={{ background: "#0a0a0a" }}>
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[250px]" style={{ background: "#0a0a0a" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 flex items-center justify-between px-6 shrink-0 border-b border-white/[0.06]" style={{ background: "#0f0f0f" }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-white/50 cursor-pointer" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <span className="text-sm text-white/70 font-medium">Admin Panel</span>
          </div>
          <Link href="/dashboard" className="text-xs text-naxcal-teal hover:underline flex items-center gap-1">
            User Dashboard <ChevronRight size={12} />
          </Link>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
