"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronRight, ArrowLeft } from "lucide-react";

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

export default function NotificationDetailPage() {
  const params = useParams<{ id: string }>();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;

    fetch(`/api/me/notifications/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setNotification(data);
      })
      .catch(() => setError("Failed to load notification"));
  }, [params?.id]);

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (!notification) {
    return <div className="text-sm text-[#9ca3af]">Loading notification...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[#9ca3af] mb-4">
        <Link href="/dashboard" className="hover:text-naxcal-teal">
          Dashboard
        </Link>
        <ChevronRight size={12} />
        <Link href="/dashboard/notifications" className="hover:text-naxcal-teal">
          Notifications
        </Link>
        <ChevronRight size={12} />
        <span className="text-[#374151]">Details</span>
      </div>

      <Link
        href="/dashboard/notifications"
        className="inline-flex items-center gap-2 text-xs text-naxcal-teal hover:underline mb-5"
      >
        <ArrowLeft size={14} /> Back to notifications
      </Link>

      <div className="card-light p-6">
        <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-4">
          <Bell size={20} />
        </div>

        <h1 className="text-xl font-bold text-[#0f172a]">{notification.title}</h1>

        <p className="text-xs text-[#9ca3af] mt-1">
          {new Date(notification.created_at).toLocaleString()}
        </p>

        {notification.description && (
          <p className="text-sm text-[#475569] mt-5">{notification.description}</p>
        )}

        <div className="mt-5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-4 text-sm text-[#334155] leading-relaxed">
          {notification.body ||
            "This notification has been marked as read. Further account updates will appear in your notification centre."}
        </div>

        {notification.link && (
          <Link
            href={notification.link}
            className="inline-flex mt-5 px-4 py-2 rounded-lg text-xs font-semibold text-white btn-teal"
          >
            Open related page
          </Link>
        )}
      </div>
    </div>
  );
}
