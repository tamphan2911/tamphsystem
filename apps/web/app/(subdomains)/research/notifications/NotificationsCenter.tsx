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
    return "border-blue-900/70 bg-blue-950/35 text-blue-200";
  }
  if (type.includes("SUBMISSION")) {
    return "border-violet-900/70 bg-violet-950/35 text-violet-200";
  }
  if (type.includes("PROJECT")) {
    return "border-amber-900/70 bg-amber-950/35 text-amber-200";
  }
  if (type.includes("PUBLISHED") || type.includes("ACCEPTED")) {
    return "border-emerald-900/70 bg-emerald-950/35 text-emerald-200";
  }
  return "border-[#444444] bg-[#202020] text-[#B0B0B0]";
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
      <div className="flex flex-col gap-3 border border-[#444444] bg-[#2C2C2C] px-4 py-3 shadow-none lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 flex-none text-[#A8DADC]" />
            <div>
              <h1 className="text-sm font-normal uppercase tracking-wide text-[#E4E4E4]">
                Notification Center
              </h1>
              <p className="mt-1 text-xs text-[#B0B0B0]">
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 border border-[#A8DADC] bg-[#263636] px-4 text-sm font-normal text-[#A8DADC] shadow-none transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#303F3F] disabled:cursor-not-allowed disabled:border-[#444444] disabled:bg-transparent disabled:text-[#666666] disabled:hover:translate-y-0"
        >
          <MailOpen className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      <div className="grid min-h-0 flex-1 overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none lg:grid-cols-[24rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-[#444444] lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-[#444444] bg-[#2C2C2C] p-3">
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

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredNotifications.length > 0 ? (
              <div className="divide-y divide-[#444444]">
                {filteredNotifications.map((notification) => {
                  const active = selected?.id === notification.id;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className={`w-full cursor-pointer border-l-2 px-3 py-3 text-left transition duration-150 ease-out ${
                        active
                          ? "border-l-[#A8DADC] bg-[#303F3F]"
                          : "border-l-transparent odd:bg-[#282828] even:bg-[#242424] hover:border-l-[#5A5A5A] hover:bg-[#303030]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`inline-flex max-w-[12rem] items-center border px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide ${notificationColor(notification.type)}`}
                        >
                          <span className="truncate">
                            {notification.typeLabel}
                          </span>
                        </span>
                        {!notification.readAt && (
                          <span className="mt-1 h-2 w-2 flex-none rounded-full bg-red-600 shadow-sm shadow-red-600/30" />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-normal text-[#E4E4E4]">
                        {notification.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                        {notification.summary}
                      </p>
                      <p className="mt-2 text-[11px] font-normal text-[#777777]">
                        {relativeTime(notification.createdAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-72 flex-col items-center justify-center px-6 text-center">
                <Inbox className="h-9 w-9 text-[#777777]" />
                <p className="mt-3 text-sm font-normal text-[#E4E4E4]">
                  No notifications found
                </p>
                <p className="mt-1 text-xs text-[#B0B0B0]">
                  Adjust search or filter to see more results.
                </p>
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto bg-[#242424] p-5">
          {selected ? (
            <article className="mx-auto max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center border px-2.5 py-1 text-[11px] font-normal uppercase tracking-wide ${notificationColor(selected.type)}`}
                >
                  {selected.typeLabel}
                </span>
                <span className="text-xs font-medium text-[#777777]">
                  {formatDate(selected.createdAt)}
                </span>
                {selected.readAt ? (
                  <span className="inline-flex items-center gap-1 border border-[#444444] bg-[#202020] px-2.5 py-1 text-xs font-normal text-[#B0B0B0]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Read
                  </span>
                ) : null}
              </div>

              <h2 className="mt-5 text-lg font-normal leading-tight text-[#E4E4E4]">
                {selected.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#B0B0B0]">
                {selected.summary}
              </p>

              {selected.body ? (
                <div className="mt-6 border border-[#444444] bg-[#2C2C2C] p-4 text-sm leading-7 text-[#B0B0B0]">
                  {selected.body}
                </div>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="border border-[#444444] bg-[#2C2C2C] p-4">
                  <p className="text-xs font-normal uppercase tracking-wide text-[#777777]">
                    Entity
                  </p>
                  <p className="mt-2 text-sm font-normal text-[#E4E4E4]">
                    {selected.entityType || "Notification"}
                  </p>
                  {selected.entityId ? (
                    <p className="mt-1 break-all text-xs text-[#B0B0B0]">
                      {selected.entityId}
                    </p>
                  ) : null}
                </div>
                <div className="border border-[#444444] bg-[#2C2C2C] p-4">
                  <p className="text-xs font-normal uppercase tracking-wide text-[#777777]">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-normal text-[#E4E4E4]">
                    {selected.readAt ? "Read" : "Unread"}
                  </p>
                  <p className="mt-1 text-xs text-[#B0B0B0]">
                    {selected.readAt
                      ? formatDate(selected.readAt)
                      : "Waiting for review"}
                  </p>
                </div>
              </div>

              {selected.href ? (
                <Link
                  href={selected.href}
                  className="mt-6 inline-flex cursor-pointer items-center gap-2 border border-[#A8DADC] bg-[#263636] px-4 py-2.5 text-sm font-normal text-[#A8DADC] shadow-none transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#303F3F]"
                >
                  Open related page
                  <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </article>
          ) : (
            <div className="flex h-full min-h-80 flex-col items-center justify-center text-center">
              <Sparkles className="h-10 w-10 text-[#777777]" />
              <p className="mt-3 text-sm font-normal text-[#E4E4E4]">
                Select a notification
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
