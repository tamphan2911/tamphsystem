"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  CheckCircle2,
  ExternalLink,
  Mail,
  MailOpen,
  Trash2,
} from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchIconButton } from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  FilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";

export type NotificationManagementRow = {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  summary: string;
  body: string;
  href: string;
  entityType: string;
  entityId: string;
  recipientName: string;
  recipientEmail: string;
  recipientRoles: string;
  readAt: string;
  createdAt: string;
  createdAtSort: number;
};

function statusClass(readAt: string) {
  if (readAt) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
}

function typeClass(type: string) {
  if (type.includes("TASK")) {
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }
  if (type.includes("SUBMISSION")) {
    return "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
  }
  if (type.includes("PROJECT")) {
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  }
  if (type.includes("PUBLISHED") || type.includes("ACCEPTED")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function DeleteNotificationButton({
  notification,
  deleteNotificationAction,
}: {
  notification: NotificationManagementRow;
  deleteNotificationAction: (notificationId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <ResearchIconButton
        type="button"
        onClick={() => setIsOpen(true)}
        label={`Delete notification: ${notification.title}`}
        tone="rose"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

      <ResearchConfirmDialog
        open={isOpen}
        title="Delete this notification?"
        description={`This will remove the notification for ${notification.recipientName || notification.recipientEmail}.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete notification"}
        isConfirming={isDeleting}
        onCancel={() => setIsOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteNotificationAction(notification.id);
            setIsOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Notification deleted",
              detail: `"${notification.title}" was removed from ${notification.recipientName || notification.recipientEmail}'s notification list.`,
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete notification",
              detail:
                error instanceof Error
                  ? error.message
                  : "The notification was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          This deletes only the notification record. It does not delete the
          related task, research, project, submission, or account data.
        </p>
        <p>
          The recipient will no longer see this item in the notification center
          or unread notification list.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function NotificationsTable({
  rows,
  deleteNotificationAction,
}: {
  rows: NotificationManagementRow[];
  deleteNotificationAction: (notificationId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [recipient, setRecipient] = useState("ALL");

  const typeOptions = useMemo(() => {
    const labels = new Map<string, string>();
    rows.forEach((row) => labels.set(row.type, row.typeLabel));
    return [
      { value: "ALL", label: "All types" },
      ...Array.from(labels.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [rows]);

  const recipientOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(
          rows
            .map((row) =>
              row.recipientName
                ? `${row.recipientName} - ${row.recipientEmail}`
                : row.recipientEmail,
            )
            .filter(Boolean),
        ),
      ).sort(),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const recipientLabel = row.recipientName
        ? `${row.recipientName} - ${row.recipientEmail}`
        : row.recipientEmail;
      const matchesStatus =
        status === "ALL" ||
        (status === "UNREAD" ? !row.readAt : Boolean(row.readAt));
      const matchesType = type === "ALL" || row.type === type;
      const matchesRecipient =
        recipient === "ALL" || recipientLabel === recipient;
      const haystack = [
        row.type,
        row.typeLabel,
        row.title,
        row.summary,
        row.body,
        row.href,
        row.entityType,
        row.entityId,
        row.recipientName,
        row.recipientEmail,
        row.recipientRoles,
        row.createdAt,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesType &&
        matchesRecipient &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [query, recipient, rows, status, type]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search notifications, users, entity..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={status}
            onChange={setStatus}
            ariaLabel="Filter by read status"
            options={[
              { value: "ALL", label: "All status" },
              { value: "UNREAD", label: "Unread" },
              { value: "READ", label: "Read" },
            ]}
          />
          <FilterSelect
            value={type}
            onChange={setType}
            ariaLabel="Filter by notification type"
            options={typeOptions}
          />
          <FilterSelect
            value={recipient}
            onChange={setRecipient}
            ariaLabel="Filter by recipient"
            options={recipientOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All recipients" : item,
            }))}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[88rem] text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="sticky left-0 z-20 w-[25rem] bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">
                Notification
              </th>
              <th className="w-[16rem] px-4 py-3">Recipient</th>
              <th className="w-[12rem] px-3 py-3">Type</th>
              <th className="w-[8rem] px-3 py-3">Status</th>
              <th className="w-[12rem] px-3 py-3">Entity</th>
              <th className="w-[8rem] px-3 py-3">Date</th>
              <th className="w-[5rem] px-2 py-3 text-center">Link</th>
              <th className="w-[5rem] px-2 py-3 text-center">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((notification) => (
              <tr
                key={notification.id}
                className="group align-top transition-colors duration-150 hover:bg-[#383838]"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">
                  <p className="line-clamp-2 text-sm font-normal leading-5 text-[#E4E4E4]">
                    {notification.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                    {notification.summary}
                  </p>
                  {notification.body ? (
                    <p className="mt-1 line-clamp-1 text-xs text-[#777777]">
                      {notification.body}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs leading-5 text-[#B0B0B0]">
                  <span className="block text-[#E4E4E4]">
                    {notification.recipientName || "No name"}
                  </span>
                  <span>{notification.recipientEmail}</span>
                  <span className="block text-[#777777]">
                    {notification.recipientRoles || "No roles"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex max-w-full items-center gap-1.5 rounded-none px-2.5 py-1 text-xs font-bold ring-1 ${typeClass(notification.type)}`}
                  >
                    <BellRing className="h-3.5 w-3.5 flex-none" />
                    <span className="truncate">{notification.typeLabel}</span>
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-none px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(notification.readAt)}`}
                  >
                    {notification.readAt ? (
                      <MailOpen className="h-3.5 w-3.5" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    {notification.readAt ? "Read" : "Unread"}
                  </span>
                  {notification.readAt ? (
                    <p className="mt-1 text-xs text-[#777777]">
                      {notification.readAt}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-xs leading-5 text-[#B0B0B0]">
                  <span className="block text-[#E4E4E4]">
                    {notification.entityType || "Notification"}
                  </span>
                  {notification.entityId ? (
                    <span className="block truncate font-mono">
                      {notification.entityId}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-xs text-[#B0B0B0]">
                  {notification.createdAt}
                </td>
                <td className="px-2 py-3 text-center">
                  {notification.href ? (
                    <Link
                      href={notification.href}
                      className="inline-flex h-9 w-9 items-center justify-center border border-[#444444] bg-slate-50 text-slate-500 transition hover:-translate-y-0.5 hover:bg-white hover:text-blue-600 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-blue-300"
                      aria-label="Open related page"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  ) : (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-600" />
                  )}
                </td>
                <td className="px-2 py-3 text-center">
                  <DeleteNotificationButton
                    notification={notification}
                    deleteNotificationAction={deleteNotificationAction}
                  />
                </td>
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No notifications match the current search."
                    detail="Try another recipient, notification type, entity, or read status."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        total={pagination.total}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
      />
    </div>
  );
}
