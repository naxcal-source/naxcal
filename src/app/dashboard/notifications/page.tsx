"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Repeat2, TrendingUp, Wallet, ShieldCheck, ChevronRight } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  asset?: string | null;
  status?: string | null;
  description?: string | null;
  created_at: string;
  source?: string | null;
  chain?: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  desc: string;
  time?: string;
  color: string;
  icon: "kyc" | "profit" | "swap" | "sell" | "onchain" | "deposit" | "default";
};

function fmt(n: number) {
  return "$" + Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function timeAgo(value?: string) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function iconFor(type: NotificationItem["icon"]) {
  if (type === "kyc") return <ShieldCheck size={18} />;
  if (type === "profit") return <TrendingUp size={18} />;
  if (type === "swap") return <Repeat2 size={18} />;
  if (type === "sell") return <Wallet size={18} />;
  if (type === "onchain") return <Bell size={18} />;
  if (type === "deposit") return <CheckCircle2 size={18} />;
  return <Bell size={18} />;
}

export default function NotificationsPage() {
  const { profile } = useDashboard();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    fetch("/api/me/transactions?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [profile]);

  const notifications: NotificationItem[] = [];

  if (profile?.kyc_status === "approved") {
    notifications.push({
      id: "kyc-approved",
      title: "KYC approved",
      desc: "Your account verification is complete.",
      color: "bg-emerald-500",
      icon: "kyc",
    });
  } else {
    notifications.push({
      id: "kyc-pending",
      title: "Verify your identity",
      desc: "Complete KYC to unlock full account access.",
      color: "bg-amber-500",
      icon: "kyc",
    });
  }

  for (const tx of transactions) {
    const type = String(tx.type || "").toLowerCase();

    if (type === "profit") {
      notifications.push({
        id: tx.id,
        title: "Daily profit credited",
        desc: `${fmt(Number(tx.amount || 0))} ${tx.asset || "USDC"} added to your account.`,
        time: timeAgo(tx.created_at),
        color: "bg-emerald-500",
        icon: "profit",
      });
    } else if (type === "swap") {
      notifications.push({
        id: tx.id,
        title: "Swap completed",
        desc: tx.description || "A crypto swap was completed.",
        time: timeAgo(tx.created_at),
        color: "bg-blue-500",
        icon: "swap",
      });
    } else if (type === "crypto_sell") {
      notifications.push({
        id: tx.id,
        title: "Crypto sold to USD balance",
        desc: tx.description || `${fmt(Number(tx.amount || 0))} credited to USD balance.`,
        time: timeAgo(tx.created_at),
        color: "bg-emerald-500",
        icon: "sell",
      });
    } else if (String(tx.source || "") === "onchain") {
      notifications.push({
        id: tx.id,
        title: "On-chain activity synced",
        desc: `${tx.chain || "Wallet"} transaction imported.`,
        time: timeAgo(tx.created_at),
        color: "bg-blue-500",
        icon: "onchain",
      });
    } else if (type === "deposit") {
      notifications.push({
        id: tx.id,
        title: "Deposit confirmed",
        desc: `${fmt(Number(tx.amount || 0))} ${tx.asset || "USD"} credited.`,
        time: timeAgo(tx.created_at),
        color: "bg-emerald-500",
        icon: "deposit",
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">
          Dashboard
        </Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Notifications</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Bell size={22} className="text-naxcal-teal" />
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Notification Centre</h1>
          <p className="text-sm text-[#64748b] mt-1">
            Account updates, profits, swaps, sells and wallet activity.
          </p>
        </div>
      </div>

      <div className="card-light overflow-hidden">
        {loading ? (
          <div className="py-14 text-center text-sm text-[#9ca3af]">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-14 text-center text-sm text-[#9ca3af]">
            No new notifications. Your latest account updates will appear here.
          </div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 hover:bg-[#f8fafc] transition-colors">
                <div className="flex gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0", n.color)}>
                    {iconFor(n.icon)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-[#0f172a]">{n.title}</h2>
                        <p className="text-xs text-[#64748b] mt-1">{n.desc}</p>
                      </div>
                      {n.time && (
                        <span className="text-[11px] text-[#9ca3af] whitespace-nowrap">
                          {n.time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
