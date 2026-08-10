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
  const { profile } = useDashboard();
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    type: string;
    amount: number;
    asset?: string | null;
    status?: string | null;
    description?: string | null;
    created_at: string;
    source?: string | null;
    chain?: string | null;
  }>>([]);

  useEffect(() => {
    if (!profile) return;

    fetch("/api/me/transactions?limit=5")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .catch(() => setTransactions([]));
  }, [profile]);

  const fmt = (n: number) =>
    "$" +
    Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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

  const notifs: Array<{
    title: string;
    desc: string;
    time?: string;
    color: string;
  }> = [];

  if (profile?.kyc_status === "approved") {
    notifs.push({
      title: "KYC approved",
      desc: "Your account verification is complete.",
      color: "bg-emerald-500",
    });
  } else {
    notifs.push({
      title: "Verify your identity",
      desc: "Complete KYC to unlock full account access.",
      color: "bg-amber-500",
    });
  }

  for (const tx of transactions.slice(0, 4)) {
    const type = String(tx.type || "").toLowerCase();

    if (type === "profit") {
      notifs.push({
        title: "Daily profit credited",
        desc: `${fmt(Number(tx.amount || 0))} ${tx.asset || "USDC"} added to your account.`,
        time: timeAgo(tx.created_at),
        color: "bg-emerald-500",
      });
    } else if (type === "swap") {
      notifs.push({
        title: "Swap completed",
        desc: tx.description || `A crypto swap was completed.`,
        time: timeAgo(tx.created_at),
        color: "bg-blue-500",
      });
    } else if (type === "crypto_sell") {
      notifs.push({
        title: "Crypto sold to USD balance",
        desc: tx.description || `${fmt(Number(tx.amount || 0))} credited to USD balance.`,
        time: timeAgo(tx.created_at),
        color: "bg-emerald-500",
      });
    } else if (String(tx.source || "") === "onchain") {
      notifs.push({
        title: "On-chain activity synced",
        desc: `${tx.chain || "Wallet"} transaction imported.`,
        time: timeAgo(tx.created_at),
        color: "bg-blue-500",
      });
    } else if (type === "deposit") {
      notifs.push({
        title: "Deposit confirmed",
        desc: `${fmt(Number(tx.amount || 0))} ${tx.asset || "USD"} credited.`,
        time: timeAgo(tx.created_at),
        color: "bg-emerald-500",
      });
    }
  }

  const visibleNotifs =
    notifs.length > 0
      ? notifs
      : [
          {
            title: "No new notifications",
            desc: "Your latest account updates will appear here.",
            color: "bg-slate-300",
          },
        ];

  const count = notifs.length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#9ca3af] hover:text-[#475569] hover:bg-[#f1f5f9] transition-all cursor-pointer" style={{ border: "1px solid #e2e8f0" }}>
        <Bell size={16} />
        {count > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white font-bold flex items-center justify-center">{Math.min(count, 9)}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl z-50" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
          <div className="px-4 py-3 border-b border-[#f1f5f9]">
            <h3 className="text-sm font-semibold text-[#0f172a]">Notifications</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {visibleNotifs.map((n, i) => (
              <div key={i} className="px-4 py-3 hover:bg-[#f8fafc] transition-colors cursor-pointer border-b border-[#f8fafc]">
                <div className="flex items-start gap-3">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", n.color)} />
                  <div className="min-w-0">
                    <p className="text-sm text-[#0f172a] font-medium">{n.title}</p>
                    <p className="text-xs text-[#6b7280]">{n.desc}</p>
                    {n.time && <p className="text-[10px] text-[#9ca3af] mt-0.5">{n.time}</p>}
                  </div>
                </div>
              </div>
            ))}
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
    <div className="flex flex-col h-full relative">
      <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(26,138,110,0.12), transparent)" }} />

      <div className="p-6 pb-5 relative z-10">
        <Image src="/Naxcal_Primary_Logo.png" alt="Naxcal" width={180} height={52} className="h-12 w-auto" style={{ filter: "brightness(1.5) drop-shadow(0 0 20px rgba(26,138,110,0.6))" }} />
      </div>

      <nav className="flex-1 px-3 space-y-0.5 relative z-10 overflow-y-auto">
        {navItems.map((navItem) => {
          const active = pathname === navItem.href;
          return (
            <Link key={navItem.href} href={navItem.href} onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] transition-all duration-200",
                active ? "text-naxcal-teal font-semibold" : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              )}
              style={active ? { background: "rgba(26,138,110,0.12)", borderLeft: "3px solid #1a8a6e" } : {}}>
              <navItem.icon size={17} /><span>{navItem.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/[0.06] relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-naxcal-teal shrink-0" style={{ background: "rgba(26,138,110,0.15)", border: "2px solid rgba(26,138,110,0.4)" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-white/80 truncate font-medium">{profile?.full_name || "User"}</p>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-semibold capitalize", tierColor[profile?.tier || "bronze"] || tierColor.bronze)}>
                {profile?.tier || "bronze"}
              </span>
            </div>
            <p className="text-[11px] text-white/30 truncate">{profile?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-white/30 hover:text-red-400 transition-colors cursor-pointer w-full">
          <LogOut size={14} /> Sign Out
        </button>
        <p className="text-[9px] text-white/15 mt-3">Naxcal v1.0</p>
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
