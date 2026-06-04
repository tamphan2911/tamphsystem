"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ExternalLink,
  Inbox,
  MailOpen,
  Sparkles,
} from "lucide-react";
import {
  FilterSelect,
  TableSearchInput,
} from "@/sites/research/components/TableControls";

export type NotificationCenterItem = {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  summary: string;
  body: string;
  href: string;
  entityType: string;
  entityId: string;
  readAt: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function notificationColor(type: string) {
  if (type.includes("TASK")) {
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900";
  }
  if (type.includes("SUBMISSION")) {
    return "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900";
  }
  if (type.includes("PROJECT")) {
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900";
  }
  if (type.includes("PUBLISHED") || type.includes("ACCEPTED")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";
}

export function NotificationsCenter({
  initialNotifications,
}: {
  initialNotifications: NotificationCenterItem[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [selectedId, setSelectedId] = useState(
    initialNotifications[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("ALL");
  const [type, setType] = useState("ALL");

  const typeOptions = useMemo(() => {
    const labels = new Map<string, string>();
    notifications.forEach((item) => labels.set(item.type, item.typeLabel));
    return [
      { value: "ALL", label: "All types" },
      ...Array.from(labels.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notifications.filter((item) => {
      const matchesScope =
        scope === "ALL" ||
        (scope === "UNREAD" ? !item.readAt : Boolean(item.readAt));
      const matchesType = type === "ALL" || item.type === type;
      const haystack = [
        item.title,
        item.summary,
        item.body,
        item.typeLabel,
        item.entityType,
        item.entityId,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesScope && matchesType && (!needle || haystack.includes(needle))
      );
    });
  }, [notifications, query, scope, type]);

  const selected =
    filteredNotifications.find((item) => item.id === selectedId) ??
    filteredNotifications[0] ??
    notifications.find((item) => item.id === selectedId) ??
    null;

  async function markRead(notificationId: string) {
    setSelectedId(notificationId);
    const current = notifications.find((item) => item.id === notificationId);
    if (!current || current.readAt) return;

    const readAt = new Date().toISOString();
    setNotifications((items) =>
      items.map((item) =>
        item.id === notificationId ? { ...item, readAt } : item,
      ),
    );
    await fetch("/api/research/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    }).catch(() => null);
  }

  async function markAllRead() {
    const readAt = new Date().toISOString();
    setNotifications((items) =>
      items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
    );
    await fetch("/api/research/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => null);
  }

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.04] dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900">
              <BellRing className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-950 dark:text-white">
                Notification center
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-sm dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
        >
          <MailOpen className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.04] dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-800">
            <TableSearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search notifications..."
            />
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                value={scope}
                onChange={setScope}
                ariaLabel="Filter read status"
                options={[
                  { value: "ALL", label: "All" },
                  { value: "UNREAD", label: "Unread" },
                  { value: "READ", label: "Read" },
                ]}
              />
              <FilterSelect
                value={type}
                onChange={setType}
                ariaLabel="Filter notification type"
                options={typeOptions}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredNotifications.length > 0 ? (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => {
                  const active = selected?.id === notification.id;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className={`w-full cursor-pointer rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        active
                          ? "border-blue-200 bg-blue-50/80 shadow-sm dark:border-blue-800 dark:bg-blue-950/35"
                          : "border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`inline-flex max-w-[12rem] items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${notificationColor(notification.type)}`}
                        >
                          <span className="truncate">
                            {notification.typeLabel}
                          </span>
                        </span>
                        {!notification.readAt && (
                          <span className="mt-1 h-2 w-2 flex-none rounded-full bg-red-500 shadow-sm shadow-red-500/30" />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-950 dark:text-white">
                        {notification.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {notification.summary}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        {relativeTime(notification.createdAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-72 flex-col items-center justify-center px-6 text-center">
                <Inbox className="h-9 w-9 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No notifications found
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Adjust search or filter to see more results.
                </p>
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto p-5">
          {selected ? (
            <article className="mx-auto max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${notificationColor(selected.type)}`}
                >
                  {selected.typeLabel}
                </span>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {formatDate(selected.createdAt)}
                </span>
                {selected.readAt ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Read
                  </span>
                ) : null}
              </div>

              <h2 className="mt-5 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
                {selected.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                {selected.summary}
              </p>

              {selected.body ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200">
                  {selected.body}
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Entity
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selected.entityType || "Notification"}
                  </p>
                  {selected.entityId ? (
                    <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                      {selected.entityId}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {selected.readAt ? "Read" : "Unread"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selected.readAt
                      ? formatDate(selected.readAt)
                      : "Waiting for review"}
                  </p>
                </div>
              </div>

              {selected.href ? (
                <Link
                  href={selected.href}
                  className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-200 dark:hover:bg-blue-900/50"
                >
                  Open related page
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </article>
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center text-center">
              <Sparkles className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Select a notification
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
