"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, CheckCircle2 } from "lucide-react";
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
