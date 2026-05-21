"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export function ResearchNotificationBell({ enabled }: { enabled: boolean }) {
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (!enabled) return;
    const response = await fetch("/api/research/tasks", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { notificationCount?: number };
    setCount(payload.notificationCount ?? 0);
  }, [enabled]);

  useEffect(() => {
    loadCount();
    const interval = window.setInterval(loadCount, 4000);
    return () => window.clearInterval(interval);
  }, [loadCount]);

  if (!enabled) return null;

  return (
    <Link
      href="/tasks"
      className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-emerald-100"
      aria-label={`${count} task notifications`}
      title="Task notifications"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-900">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
