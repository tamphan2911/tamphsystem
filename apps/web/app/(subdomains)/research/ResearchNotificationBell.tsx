"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ExternalLink } from "lucide-react";

type NotificationItem = {
  id: string;
  typeLabel: string;
  title: string;
  summary: string;
  href: string;
  createdAt: string;
};

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ResearchNotificationBell({ enabled }: { enabled: boolean }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!enabled) return;
    const response = await fetch("/api/research/notifications?scope=unread", {
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      unreadCount?: number;
      notifications?: NotificationItem[];
    };
    setCount(payload.unreadCount ?? 0);
    setNotifications(payload.notifications ?? []);
  }, [enabled]);

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 4000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (!enabled) return null;

  async function markRead(notificationId: string) {
    setNotifications((items) =>
      items.filter((notification) => notification.id !== notificationId),
    );
    setCount((value) => Math.max(0, value - 1));
    await fetch("/api/research/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    }).catch(() => null);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-[#E4E4E4] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
        aria-label={`${count} unread notifications`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-normal leading-none text-white shadow-sm shadow-red-950/25 ring-1 ring-red-300/30">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[22rem] animate-[modalPanelIn_180ms_ease-out] overflow-hidden rounded-none border border-[#444444] bg-[#2C2C2C] shadow-[0_22px_60px_rgba(0,0,0,0.42)] ring-1 ring-[#A8DADC]/10">
          <span className="absolute right-4 top-0 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-l border-t border-[#444444] bg-[#2C2C2C]" />
          <div className="border-b border-[#444444] bg-[#242424] px-4 py-3">
            <p className="text-sm font-semibold text-[#E4E4E4]">
              New notifications
            </p>
            <p className="text-xs text-[#B0B0B0]">
              {count} unread notification{count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto bg-[#2C2C2C]">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href || "/notifications"}
                  onClick={() => {
                    setOpen(false);
                    markRead(notification.id);
                  }}
                  className="group block border-b border-[#3A3A3A] px-4 py-3 transition-[background-color,border-color,transform] duration-180 ease-out last:border-b-0 hover:border-[#444444] hover:bg-[#383838] hover:shadow-[inset_3px_0_0_#A8DADC] active:scale-[0.99] motion-reduce:transition-none"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#E4E4E4] transition-colors group-hover:text-[#A8DADC]">
                        {notification.title}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                        {notification.summary}
                      </span>
                    </span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-none text-[#777777] transition-[color,transform] duration-180 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#A8DADC]" />
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-[11px] font-normal text-[#777777]">
                    <span>{notification.typeLabel}</span>
                    <span>{timeLabel(notification.createdAt)}</span>
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-[#B0B0B0]">
                No unread notifications.
              </div>
            )}
          </div>
          <Link
            href="/notification-center"
            onClick={() => setOpen(false)}
            className="block border-t border-[#444444] bg-[#242424] px-4 py-3 text-center text-sm font-semibold text-[#A8DADC] transition-[background-color,color] duration-180 hover:bg-[#303030] hover:text-[#C9F0F2]"
          >
            Open notification center
          </Link>
        </div>
      )}
    </div>
  );
}
