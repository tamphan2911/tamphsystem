"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  ExternalLink,
  Mail,
  MailCheck,
  MailOpen,
  Trash2,
} from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
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
    return "text-[#1F7180] hover:text-[#155864] dark:text-[#8FCFD1] dark:hover:text-[#C9F0F2]";
  }
  return "text-[#B33E5C] hover:text-[#8F2D45] dark:text-[#F0A6B5] dark:hover:text-[#FFC1CC]";
}

function typeClass(type: string) {
  if (type.includes("TASK")) {
    return "text-[#1F7180] hover:text-[#155864] dark:text-[#8FCFD1] dark:hover:text-[#C9F0F2]";
  }
  if (type.includes("SUBMISSION")) {
    return "text-[#6F5AA8] hover:text-[#513E86] dark:text-[#CDB6E8] dark:hover:text-[#E7D8F7]";
  }
  if (type.includes("PROJECT")) {
    return "text-[#A06716] hover:text-[#7C4D0F] dark:text-[#F4D47A] dark:hover:text-[#FFE7A3]";
  }
  if (type.includes("PUBLISHED") || type.includes("ACCEPTED")) {
    return "text-[#2F8F62] hover:text-[#246F4C] dark:text-[#9CE6C7] dark:hover:text-[#C9F0F2]";
  }
  return "text-slate-600 hover:text-slate-900 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]";
}

function hasEmailDelivery(type: string) {
  return (
    type.startsWith("TASK_") ||
    type === "PROPOSAL_ACCEPTED" ||
    type === "PROPOSAL_DECLINED"
  );
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
      <IconHint label={`Delete notification: ${notification.title}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={`Delete notification: ${notification.title}`}
          className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-rose-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#FFC1CC] dark:hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={isOpen}
        title="Delete this notification?"
        description={`This will remove the notification for ${notification.recipientName || notification.recipientEmail || "this user"}.`}
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
              detail: `"${notification.title}" was removed from ${notification.recipientName || notification.recipientEmail || "this user"}'s notification list.`,
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
  const [query, setQuery] = usePersistentTableValue("notifications:q", "");
  const [status, setStatus] = usePersistentTableValue(
    "notifications:status",
    "ALL",
  );
  const [type, setType] = usePersistentTableValue("notifications:type", "ALL");
  const [recipient, setRecipient] = usePersistentTableValue(
    "notifications:recipient",
    "ALL",
  );

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
        : row.recipientEmail || "No email";
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

  const pagination = useTablePagination(filtered, 10, 1, "notifications");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value);
    pagination.setPage(1);
  }

  function updateType(value: string) {
    setType(value);
    pagination.setPage(1);
  }

  function updateRecipient(value: string) {
    setRecipient(value);
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search notifications, users, type..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={status}
            onChange={updateStatus}
            ariaLabel="Filter by read status"
            options={[
              { value: "ALL", label: "All status" },
              { value: "UNREAD", label: "Unread" },
              { value: "READ", label: "Read" },
            ]}
          />
          <FilterSelect
            value={type}
            onChange={updateType}
            ariaLabel="Filter by notification type"
            options={typeOptions}
          />
          <FilterSelect
            value={recipient}
            onChange={updateRecipient}
            ariaLabel="Filter by recipient"
            options={recipientOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All recipients" : item,
            }))}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[45%] px-4 py-3">Notification</th>
              <th className="w-[22%] px-4 py-3">Recipient</th>
              <th className="w-[6%] px-3 py-3 text-center">Type</th>
              <th className="w-[7%] px-3 py-3 text-center">Status</th>
              <th className="w-[9%] px-3 py-3">Date</th>
              <th className="w-[5%] px-2 py-3 text-center">Link</th>
              <th className="w-[6%] px-2 py-3 text-center">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((notification) => {
              const includesEmail = hasEmailDelivery(notification.type);
              const StatusIcon = notification.readAt ? MailOpen : Mail;

              return (
                <tr
                  key={notification.id}
                  className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-normal leading-5 text-[#E4E4E4]">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#B0B0B0]">
                      {notification.summary}
                    </p>
                    {notification.body ? (
                      <p className="mt-1 text-xs leading-5 text-[#777777]">
                        {notification.body}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-[#B0B0B0]">
                    <span className="block text-[#E4E4E4]">
                      {notification.recipientName || "No name"}
                    </span>
                    <span className="break-words">
                      {notification.recipientEmail}
                    </span>
                    <span className="block text-[#777777]">
                      {notification.recipientRoles || "No roles"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center align-top">
                    <span className="inline-flex items-center justify-center gap-2">
                      <IconHint
                        label={`Site notification: ${notification.typeLabel}`}
                      >
                        <span
                          className={`inline-flex cursor-help items-center transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] ${typeClass(notification.type)}`}
                        >
                          <BellRing className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">
                            Site notification: {notification.typeLabel}
                          </span>
                        </span>
                      </IconHint>
                      {includesEmail ? (
                        <IconHint
                          label={`Email also sent: ${notification.typeLabel}`}
                        >
                          <span className="inline-flex cursor-help items-center text-[#A06716] transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-[#7C4D0F] hover:drop-shadow-[0_0_0.45rem_rgba(160,103,22,0.18)] dark:text-[#F4D47A] dark:hover:text-[#FFE7A3] dark:hover:drop-shadow-[0_0_0.45rem_rgba(244,212,122,0.22)]">
                            <MailCheck className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">
                              Email also sent: {notification.typeLabel}
                            </span>
                          </span>
                        </IconHint>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center align-top">
                    <IconHint
                      label={
                        notification.readAt
                          ? `Read ${notification.readAt}`
                          : "Unread"
                      }
                    >
                      <span
                        className={`inline-flex cursor-help items-center transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] ${statusClass(notification.readAt)}`}
                      >
                        <StatusIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">
                          {notification.readAt ? "Read" : "Unread"}
                        </span>
                      </span>
                    </IconHint>
                  </td>
                  <td className="px-3 py-3 text-xs text-[#B0B0B0]">
                    {notification.createdAt}
                  </td>
                  <td className="px-2 py-3 align-top">
                    {notification.href ? (
                      <div className="flex justify-center">
                        <IconHint label="Open related page">
                          <Link
                            href={notification.href}
                            className="research-allow-transform inline-flex h-5 w-5 items-start justify-center border-0 bg-transparent p-0 text-slate-600 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#1F7180] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
                            aria-label="Open related page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </IconHint>
                      </div>
                    ) : (
                      <span className="text-[#555555]">-</span>
                    )}
                  </td>
                  <td className="px-2 py-3 align-top">
                    <div className="flex justify-center">
                      <DeleteNotificationButton
                        notification={notification}
                        deleteNotificationAction={deleteNotificationAction}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No notifications match the current search."
                    detail="Try another recipient, notification type, or read status."
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
