"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ShieldCheck, TrendingUp,
  ArrowUpCircle, Megaphone, MessageSquareQuote,
  LogOut, Menu, ChevronRight, Shield, Mail, Send, Radio,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/kyc", label: "KYC Review", icon: ShieldCheck },
  { href: "/admin/profit", label: "Post Profit", icon: TrendingUp },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpCircle },
  { href: "/admin/outreach", label: "Outreach", icon: Mail },
  { href: "/admin/email-campaign", label: "Email Campaign", icon: Send },
  { href: "/admin/broadcast", label: "Broadcast", icon: Radio },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { href: "/admin/audit", label: "Audit Log", icon: Shield },
];

type AdminProfile = { id: string; email: string; full_name: string | null; is_admin: boolean };

export default function AdminLayoutClient({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: AdminProfile;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <Image src="/Naxcal_Primary_Logo.png" alt="Naxcal" width={140} height={40} className="h-9 w-auto mb-2" style={{ filter: "brightness(1.5) drop-shadow(0 0 16px rgba(26,138,110,0.5))" }} />
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
        <p className="text-xs text-white/50 truncate mb-2">{profile.email}</p>
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
