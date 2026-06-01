"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "../components/ResearchConfirmDialog";
import { ResearchEmptyState } from "../components/ResearchState";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { useResearchToast } from "../components/ResearchToast";

export type ConferenceRow = {
  id: string;
  name: string;
  type: string;
  time: string;
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  acceptanceNotification: string;
  closeDate: string;
  location: string;
  organizer: string;
  theme: string;
  isbn: string;
};

const conferenceTypes = ["ALL", "International", "National"];

function formatDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function conferenceStatus(conference: ConferenceRow) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = conference.submissionDeadline
    ? new Date(`${conference.submissionDeadline}T00:00:00`)
    : null;
  const close = conference.closeDate
    ? new Date(`${conference.closeDate}T00:00:00`)
    : null;

  if (deadline && deadline >= today) {
    return {
      label: "Submission Open",
      detail: `Deadline ${formatDate(conference.submissionDeadline)}`,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
      rowClass: "",
    };
  }
  if (close && close < today) {
    return {
      label: "Closed",
      detail: `Closed ${formatDate(conference.closeDate)}`,
      className:
        "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
      rowClass:
        "bg-rose-50/45 hover:bg-rose-50 dark:bg-rose-950/15 dark:hover:bg-rose-950/25",
    };
  }
  return {
    label: "Up coming",
    detail: conference.time ? `Conference ${conference.time}` : "Date not set",
    className:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    rowClass: "",
  };
}

function DeleteConferenceButton({
  conference,
  deleteAction,
}: {
  conference: ConferenceRow;
  deleteAction: (conferenceId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <IconHint label="Delete conference">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete ${conference.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={isOpen}
        title="Delete this conference?"
        description={`This will remove ${conference.name} from the conference list.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete conference"}
        isConfirming={isDeleting}
        onCancel={() => setIsOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteAction(conference.id);
            setIsOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Conference deleted",
              detail: `${conference.name} has been removed from the conference list.`,
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete conference",
              detail:
                error instanceof Error
                  ? error.message
                  : "The conference was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          Conferences with linked submissions or associated research cannot be
          deleted. Delete those linked records first, then return here.
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function ConferencesTable({
  rows,
  isAdmin,
  deleteAction,
}: {
  rows: ConferenceRow[];
  isAdmin: boolean;
  deleteAction: (conferenceId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesType = type === "ALL" || row.type === type;
      const haystack = [
        row.name,
        row.type,
        row.time,
        row.submissionDeadline,
        row.acceptanceNotification,
        row.closeDate,
        row.location,
        row.organizer,
        row.theme,
        row.isbn,
      ]
        .join(" ")
        .toLowerCase();
      return matchesType && (!needle || haystack.includes(needle));
    });
  }, [query, rows, type]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search conference, organizer, theme, ISBN..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={type}
            onChange={setType}
            ariaLabel="Filter by conference type"
            options={conferenceTypes.map((item) => ({
              value: item,
              label: item === "ALL" ? "All types" : item,
            }))}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className={isAdmin ? "w-[38%] px-4 py-3" : "w-[42%] px-4 py-3"}>
                Conference
              </th>
              <th className="w-[10%] px-3 py-3">Type</th>
              <th className="w-[18%] px-3 py-3">Status</th>
              <th className="w-[22%] px-3 py-3">Theme</th>
              <th className="w-[8%] px-3 py-3">ISBN</th>
              {isAdmin && (
                <th className="w-[4%] px-2 py-3 text-center">
                  <IconHint label="Delete conference">
                    <Trash2
                      className="mx-auto h-4 w-4 text-rose-500 dark:text-rose-300"
                      aria-hidden="true"
                    />
                  </IconHint>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((conference) => {
              const status = conferenceStatus(conference);

              return (
                <tr
                  key={conference.id}
                  className={`group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40 ${status.rowClass}`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/conferences/${conference.id}`}
                      className="line-clamp-2 text-base font-normal leading-6 text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                    >
                      {conference.name}
                    </Link>
                    <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                      {[conference.time, conference.location]
                        .filter(Boolean)
                        .join(" - ") || "Time/location not set"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                      Organizer: {conference.organizer || "Not set"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                      {conference.type || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                      {status.detail}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="line-clamp-2">
                      {conference.theme || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="block truncate">
                      {conference.isbn || "-"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-2 py-3 text-center">
                      <DeleteConferenceButton
                        conference={conference}
                        deleteAction={deleteAction}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  className="px-4 py-2"
                >
                  <ResearchEmptyState
                    title="No conferences match the current search."
                    detail="Try another conference, organizer, theme, location, or ISBN."
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
