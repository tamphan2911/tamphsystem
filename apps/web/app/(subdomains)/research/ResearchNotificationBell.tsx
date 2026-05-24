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
        className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-emerald-100"
        aria-label={`${count} unread notifications`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-900">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/[0.03] animate-[modalPanelIn_180ms_ease-out] dark:border-slate-700 dark:bg-slate-950 dark:shadow-black/40 dark:ring-white/[0.04]">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-sm font-black text-slate-950 dark:text-white">
              New notifications
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {count} unread notification{count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href || "/notifications"}
                  onClick={() => {
                    setOpen(false);
                    markRead(notification.id);
                  }}
                  className="group block rounded-xl px-3 py-2.5 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-200">
                        {notification.title}
                      </span>
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {notification.summary}
                      </span>
                    </span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-300 transition group-hover:text-emerald-500" />
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    <span>{notification.typeLabel}</span>
                    <span>{timeLabel(notification.createdAt)}</span>
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No unread notifications.
              </div>
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-center text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-900/70 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            Open notification center
          </Link>
        </div>
      )}
    </div>
  );
}
