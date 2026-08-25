"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, CheckCircle2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const visibleNotifications = notifications.filter((notification) => {
    if (view === "unread" && notification.is_read) return false;
    if (view === "read" && !notification.is_read) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [notification.title, notification.description, notification.body, notification.type]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });

  useEffect(() => {
    fetch("/api/me/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));

    await fetch("/api/me/notifications/read-all", {
      method: "POST",
    }).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">
          Dashboard
        </Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Notifications</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={22} className="text-naxcal-teal" />
          <div>
            <h1 className="text-xl font-bold text-[#0f172a]">Notification Centre</h1>
            <p className="text-sm text-[#64748b] mt-1">
              Account updates, profits, swaps, sells and wallet activity.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-naxcal-teal border border-naxcal-teal/20 hover:bg-naxcal-teal/5"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notifications..."
            aria-label="Search notifications"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#0f172a] outline-none focus:ring-2 focus:ring-naxcal-teal/20"
          />
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#f1f5f9]" aria-label="Notification status filter">
          {(["all", "unread", "read"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors",
                view === option ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]",
              )}
            >
              {option}{option === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          ))}
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
        ) : visibleNotifications.length === 0 ? (
          <div className="py-14 text-center text-sm text-[#9ca3af]">
            No notifications match this filter.
          </div>
        ) : (
          <div className="divide-y divide-[#f1f5f9]">
            {visibleNotifications.map((n) => (
              <Link
                key={n.id}
                href={`/dashboard/notifications/${n.id}`}
                className={cn(
                  "block p-4 hover:bg-[#f8fafc] transition-colors",
                  !n.is_read && "bg-emerald-50/40",
                )}
              >
                <div className="flex gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0",
                      n.is_read ? "bg-slate-300" : "bg-emerald-500",
                    )}
                  >
                    <CheckCircle2 size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-[#0f172a]">
                          {n.title}
                        </h2>
                        <p className="text-xs text-[#64748b] mt-1">
                          {n.description || "Open to read more."}
                        </p>
                      </div>
                      <span className="text-[11px] text-[#9ca3af] whitespace-nowrap">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {!n.is_read && (
                      <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-700">
                        Unread
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
