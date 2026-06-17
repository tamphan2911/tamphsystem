"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import {
  ResearchIconButton,
  researchLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
  submissionCount: number;
  suggestionCount: number;
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
  const blockers = [
    conference.submissionCount > 0
      ? `${conference.submissionCount} submission${
          conference.submissionCount === 1 ? "" : "s"
        }`
      : "",
    conference.suggestionCount > 0
      ? `${conference.suggestionCount} suggested research link${
          conference.suggestionCount === 1 ? "" : "s"
        }`
      : "",
  ].filter(Boolean);
  const blockerText = blockers.join(" and ");

  return (
    <>
      <ResearchIconButton
        type="button"
        onClick={() => setIsOpen(true)}
        label={`Delete ${conference.name}`}
        tone="rose"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

      <ResearchConfirmDialog
        open={isOpen}
        title="Delete this conference?"
        description={
          blockerText
            ? `${conference.name} is still linked to ${blockerText}.`
            : `This will remove ${conference.name} from the conference list.`
        }
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
        {blockerText ? (
          <p>
            Remove the linked submissions or suggested research links first,
            then return here to delete this conference.
          </p>
        ) : (
          <p>
            This conference has no linked submissions or suggested research
            links, so it can be removed now.
          </p>
        )}
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
  const [query, setQuery] = usePersistentTableValue("conferences:q", "");
  const [type, setType] = usePersistentTableValue("conferences:type", "ALL");

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

  const pagination = useTablePagination(filtered, 10, 1, "conferences");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateType(value: string) {
    setType(value);
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search conference, organizer, theme, ISBN..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={type}
            onChange={updateType}
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
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th
                className={isAdmin ? "w-[38%] px-4 py-3" : "w-[42%] px-4 py-3"}
              >
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
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((conference) => {
              const status = conferenceStatus(conference);
              const linkedSummary = [
                conference.submissionCount > 0
                  ? `${conference.submissionCount} submission${
                      conference.submissionCount === 1 ? "" : "s"
                    }`
                  : "",
                conference.suggestionCount > 0
                  ? `${conference.suggestionCount} suggested link${
                      conference.suggestionCount === 1 ? "" : "s"
                    }`
                  : "",
              ]
                .filter(Boolean)
                .join(" / ");

              return (
                <tr
                  key={conference.id}
                  className={`group align-top transition-colors duration-150 hover:bg-[#383838] ${status.rowClass}`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/conferences/${conference.id}`}
                      className={`line-clamp-2 text-base leading-6 ${researchLinkClass}`}
                    >
                      {conference.name}
                    </Link>
                    <p className="mt-1 truncate text-xs text-[#B0B0B0]">
                      {[conference.time, conference.location]
                        .filter(Boolean)
                        .join(" - ") || "Time/location not set"}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#777777]">
                      Organizer: {conference.organizer || "Not set"}
                    </p>
                    {linkedSummary ? (
                      <p className="mt-1 truncate text-xs text-amber-600 dark:text-amber-300">
                        Linked: {linkedSummary}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span className="border border-[#444444] bg-[#202020] px-2 py-1 text-xs font-normal text-[#B0B0B0]">
                      {conference.type || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex border px-2.5 py-1 text-xs font-normal ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <p className="mt-1 truncate text-xs text-[#777777]">
                      {status.detail}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                    <span className="line-clamp-2">
                      {conference.theme || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-[#B0B0B0]">
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
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-2">
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
