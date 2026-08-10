"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, History, ArrowDownCircle, ArrowUpCircle,
  Users, Settings, LogOut, Menu, Bell, AlertTriangle,
  Search, BarChart2, ArrowLeftRight, TrendingUp, ShieldCheck,
  HelpCircle, ChevronRight, Briefcase,
} from "lucide-react";
import { ToastProvider } from "@/components/Toast";
import CrispChat from "@/components/CrispChat";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/dashboard/markets", label: "Markets", icon: BarChart2 },
  { href: "/dashboard/swap", label: "Swap", icon: ArrowLeftRight },
  { href: "/dashboard/invest", label: "Invest", icon: TrendingUp },
  { href: "/dashboard/transactions", label: "Transactions", icon: History },
  { href: "/dashboard/deposit", label: "Deposit", icon: ArrowDownCircle },
  { href: "/dashboard/withdraw", label: "Withdraw", icon: ArrowUpCircle },
  { href: "/dashboard/referrals", label: "Referrals", icon: Users },
  { href: "/dashboard/support", label: "Support", icon: HelpCircle },
  { href: "/dashboard/kyc", label: "Verification", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-xs font-mono text-[#9ca3af] hidden sm:inline">{time}</span>;
}

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    description?: string | null;
    link?: string | null;
    is_read: boolean;
    created_at: string;
  }>>([]);

  const loadNotifications = () => {
    fetch("/api/me/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id: string) => {
    setNotifications((items) =>
      items.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      ),
    );

    await fetch("/api/me/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));

    await fetch("/api/me/notifications/read-all", {
      method: "POST",
    }).catch(() => {});
  };

  const timeAgo = (value?: string) => {
    if (!value) return "";
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const unread = notifications.filter((n) => !n.is_read);
  const visibleNotifs = unread.slice(0, 6);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#9ca3af] hover:text-[#475569] hover:bg-[#f1f5f9] transition-all cursor-pointer" style={{ border: "1px solid #e2e8f0" }}>
        <Bell size={16} />
        {unread.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center">{Math.min(unread.length, 9)}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl z-50" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
          <div className="px-4 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0f172a]">Notifications</h3>
            {unread.length > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-naxcal-teal font-medium hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {visibleNotifs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-[#0f172a] font-medium">No new notifications</p>
                <p className="text-xs text-[#6b7280] mt-1">Your latest account updates will appear here.</p>
              </div>
            ) : (
              visibleNotifs.map((n) => (
                <Link
                  key={n.id}
                  href={`/dashboard/notifications/${n.id}`}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 hover:bg-[#f8fafc] transition-colors cursor-pointer border-b border-[#f8fafc]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-emerald-500" />
                    <div className="min-w-0">
                      <p className="text-sm text-[#0f172a] font-medium">{n.title}</p>
                      <p className="text-xs text-[#6b7280]">{n.description}</p>
                      <p className="text-[10px] text-[#9ca3af] mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-[#f1f5f9] text-center">
            <Link href="/dashboard/notifications" className="text-xs text-naxcal-teal font-medium hover:underline" onClick={() => setOpen(false)}>View All</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const rawFirst = profile?.full_name?.split(" ")[0] || "there";
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const tierColor: Record<string, string> = {
    bronze: "bg-orange-100 text-orange-700 border-orange-200",
    silver: "bg-slate-100 text-slate-600 border-slate-200",
    gold: "bg-amber-100 text-amber-700 border-amber-200",
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(26,138,110,0.24), transparent 28%), radial-gradient(circle at 90% 35%, rgba(26,138,110,0.10), transparent 24%), linear-gradient(180deg, #06110e 0%, #07100d 45%, #030807 100%)",
        }}
      />
      <div className="absolute inset-x-4 top-20 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      <div className="absolute -left-20 top-10 w-40 h-40 rounded-full bg-naxcal-teal/10 blur-3xl pointer-events-none" />

      <div className="px-5 pt-6 pb-5 relative z-10">
        <Link
          href="/dashboard"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 rounded-2xl px-3 py-3 bg-white/[0.035] border border-white/[0.06] shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
        >
          <Image
            src="/Naxcal_Primary_Logo.png"
            alt="Naxcal"
            width={150}
            height={44}
            className="h-9 w-auto"
            style={{ filter: "brightness(1.65) drop-shadow(0 0 18px rgba(26,138,110,0.45))" }}
          />
        </Link>

        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-400/[0.06] border border-emerald-300/[0.08]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/70 font-semibold">
            Secure dashboard
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 relative z-10 overflow-y-auto pb-3">
        {navItems.map((navItem) => {
          const active = pathname === navItem.href;
          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] transition-all duration-200",
                active
                  ? "text-white font-semibold"
                  : "text-white/42 hover:text-white/80 hover:bg-white/[0.045]"
              )}
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(26,138,110,0.28), rgba(26,138,110,0.10))",
                      boxShadow:
                        "inset 0 0 0 1px rgba(52,211,153,0.16), 0 14px 35px rgba(26,138,110,0.12)",
                    }
                  : {}
              }
            >
              {active && (
                <>
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
                  <span className="absolute inset-0 rounded-2xl bg-white/[0.025] pointer-events-none" />
                </>
              )}

              <span
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
                  active
                    ? "bg-emerald-300/15 text-emerald-200"
                    : "bg-white/[0.035] text-white/38 group-hover:text-white/80 group-hover:bg-white/[0.07]"
                )}
              >
                <navItem.icon size={16} />
              </span>

              <span className="relative z-10">{navItem.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 relative z-10">
        <div className="rounded-2xl bg-white/[0.045] border border-white/[0.075] p-3 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold text-emerald-100 shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(26,138,110,0.45), rgba(26,138,110,0.16))",
                border: "1px solid rgba(52,211,153,0.28)",
                boxShadow: "0 0 22px rgba(26,138,110,0.16)",
              }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm text-white/88 truncate font-semibold">{profile?.full_name || "User"}</p>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-bold capitalize shrink-0", tierColor[profile?.tier || "bronze"] || tierColor.bronze)}>
                  {profile?.tier || "bronze"}
                </span>
              </div>
              <p className="text-[11px] text-white/34 truncate mt-0.5">{profile?.email}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/dashboard/settings"
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-[11px] text-white/50 hover:text-white/85 hover:bg-white/[0.07] transition-colors text-center"
            >
              Settings
            </Link>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-[11px] text-white/50 hover:text-red-300 hover:bg-red-500/[0.08] transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>

        <p className="text-[9px] text-white/18 mt-3 text-center">Naxcal v1.0</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f1f5f9" }}>
        <div className="w-8 h-8 border-2 border-naxcal-teal/30 border-t-naxcal-teal rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ background: "#f1f5f9", minHeight: "100dvh" }}>
      <aside className="hidden lg:block w-[280px] shrink-0 border-r border-white/[0.06]" style={{ background: "#080f0c" }}>
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px]" style={{ background: "#080f0c" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-16 flex items-center justify-between px-6 shrink-0" style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-[#475569] cursor-pointer" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <p className="text-sm text-[#0f172a] font-semibold">{greeting}, {firstName}</p>
              <p className="text-[11px] text-[#9ca3af]">{dateStr}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/support" className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#9ca3af] hover:text-[#6b7280] hover:bg-[#f1f5f9] transition-colors" style={{ border: "1px solid #e2e8f0" }}>
              <Search size={14} /> Help
            </Link>

            <LiveClock />

            {profile?.kyc_status !== "approved" && (
              <Link href="/dashboard/kyc" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium hover:bg-amber-100 transition-colors">
                <AlertTriangle size={12} /> Verify Identity
              </Link>
            )}

            <NotificationDropdown />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto pb-20 lg:pb-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden flex items-center justify-around py-2 z-40" style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0", boxShadow: "0 -2px 10px rgba(0,0,0,0.05)" }}>
        {[
          { href: "/dashboard", label: "Home", icon: LayoutDashboard },
          { href: "/dashboard/markets", label: "Markets", icon: BarChart2 },
          { href: "/dashboard/deposit", label: "Deposit", icon: ArrowDownCircle },
          { href: "/dashboard/transactions", label: "Activity", icon: History },
          { href: "/dashboard/settings", label: "Settings", icon: Settings },
        ].map((navItem) => {
          const active = pathname === navItem.href;
          return (
            <Link key={navItem.href} href={navItem.href} className={cn("flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors", active ? "text-naxcal-teal" : "text-[#9ca3af]")}>
              <navItem.icon size={20} />
              <span className="text-[10px] font-medium">{navItem.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`body { background: #f1f5f9 !important; }`}</style>
      <DashboardProvider>
        <ToastProvider>
          <CrispChat />
          <DashboardShell>{children}</DashboardShell>
        </ToastProvider>
      </DashboardProvider>
    </>
  );
}
