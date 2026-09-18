"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CircleCheck,
  CircleX,
  Clock3,
  LibraryBig,
  Building2,
  Trash2,
} from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import {
  cx,
  researchLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  IconHint,
  MultiFilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
  usePersistentMultiFilter,
} from "@/sites/research/components/TableControls";

export type SuggestionKind = "Journal" | "Conference";
export type SuggestionStatus =
  | "WAITING_APPROVAL"
  | "PENDING_JOURNAL_ADDING"
  | "PENDING_PUBLISHER_ADDING"
  | "APPROVED"
  | "DECLINED";

export type SuggestionRow = {
  id: string;
  kind: SuggestionKind;
  projectId: string;
  projectTitle: string;
  projectCode: string;
  venueId: string;
  venueName: string;
  venueHref: string;
  status: SuggestionStatus;
  venueMeta: string;
  scope: string;
  suggestedBy: string;
  suggestedByMeta: string;
  createdAt: string;
  createdAtSort: number;
};

type DeleteSuggestionResult = {
  ok: boolean;
  message?: string;
};

function typeClass(kind: SuggestionKind) {
  if (kind === "Journal") {
    return "text-[#1F7180] hover:text-[#155864] dark:text-[#8FCFD1] dark:hover:text-[#C9F0F2]";
  }
  return "text-[#6F5AA8] hover:text-[#513E86] dark:text-[#CDB6E8] dark:hover:text-[#E7D8F7]";
}

function statusPresentation(status: SuggestionStatus) {
  if (status === "APPROVED") {
    return {
      label: "Approved",
      icon: CircleCheck,
      className: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (status === "DECLINED") {
    return {
      label: "Declined",
      icon: CircleX,
      className: "text-rose-700 dark:text-rose-300",
    };
  }
  if (status === "PENDING_JOURNAL_ADDING") {
    return {
      label: "Pending journal adding",
      icon: LibraryBig,
      className: "text-sky-700 dark:text-sky-300",
    };
  }
  if (status === "PENDING_PUBLISHER_ADDING") {
    return {
      label: "Pending publisher adding",
      icon: Building2,
      className: "text-violet-700 dark:text-violet-300",
    };
  }
  return {
    label: "Waiting approval",
    icon: Clock3,
    className: "text-amber-700 dark:text-amber-300",
  };
}

function DeleteSuggestionButton({
  suggestion,
  deleteJournalAction,
  deleteConferenceAction,
}: {
  suggestion: SuggestionRow;
  deleteJournalAction: (
    projectId: string,
    journalId: string,
  ) => Promise<DeleteSuggestionResult>;
  deleteConferenceAction: (
    projectId: string,
    conferenceId: string,
  ) => Promise<DeleteSuggestionResult>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <IconHint label={`Delete suggestion for ${suggestion.venueName}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={`Delete suggestion for ${suggestion.venueName}`}
          className="inline-flex h-5 w-5 cursor-pointer items-start justify-center border border-transparent bg-transparent p-0 text-rose-700 shadow-none outline-none transition-[color,transform] duration-150 ease-out hover:border-transparent hover:bg-transparent hover:text-rose-800 hover:shadow-none active:scale-95 focus-visible:ring-0 dark:text-rose-300 dark:hover:text-rose-200"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={isOpen}
        title="Delete this suggestion?"
        description={`This will remove ${suggestion.venueName} from the suggested venues for this research.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete suggestion"}
        isConfirming={isDeleting}
        onCancel={() => setIsOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            const result =
              suggestion.kind === "Journal"
                ? await deleteJournalAction(
                    suggestion.projectId,
                    suggestion.venueId,
                  )
                : await deleteConferenceAction(
                    suggestion.projectId,
                    suggestion.venueId,
                  );
            if (!result.ok) {
              toast.showError({
                title: "Could not delete suggestion",
                detail:
                  result.message ||
                  "The suggestion was not removed. Please refresh the page and try again.",
              });
              return;
            }
            setIsOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Suggestion deleted",
              detail: `${suggestion.venueName} is no longer suggested for ${suggestion.projectCode || "this research"}.`,
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete suggestion",
              detail:
                error instanceof Error
                  ? error.message
                  : "The suggestion was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          This removes only the suggestion link. It does not delete the
          research, journal, or conference record.
        </p>
        <p>
          If this suggestion is blocking venue deletion, remove it here first,
          then return to the journal or conference list.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function SuggestionsTable({
  rows,
  deleteJournalAction,
  deleteConferenceAction,
}: {
  rows: SuggestionRow[];
  deleteJournalAction: (
    projectId: string,
    journalId: string,
  ) => Promise<DeleteSuggestionResult>;
  deleteConferenceAction: (
    projectId: string,
    conferenceId: string,
  ) => Promise<DeleteSuggestionResult>;
}) {
  const [query, setQuery] = usePersistentTableValue("suggestions:q", "");
  const suggestionKinds = ["ALL", "Journal", "Conference"];
  const suggestionStatuses = [
    "ALL",
    "WAITING_APPROVAL",
    "PENDING_JOURNAL_ADDING",
    "PENDING_PUBLISHER_ADDING",
    "APPROVED",
    "DECLINED",
  ];
  const suggestedByOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(rows.map((row) => row.suggestedBy))).sort(),
    ],
    [rows],
  );
  const [kinds, setKinds] = usePersistentMultiFilter(
    "suggestions:kind",
    suggestionKinds,
  );
  const [statuses, setStatuses] = usePersistentMultiFilter(
    "suggestions:status",
    suggestionStatuses,
  );
  const [suggestedUsers, setSuggestedUsers] = usePersistentMultiFilter(
    "suggestions:suggestedBy",
    suggestedByOptions,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesKind = kinds.length === 0 || kinds.includes(row.kind);
      const matchesStatus =
        statuses.length === 0 || statuses.includes(row.status);
      const matchesSuggestedBy =
        suggestedUsers.length === 0 || suggestedUsers.includes(row.suggestedBy);
      const haystack = [
        row.kind,
        row.projectCode,
        row.projectTitle,
        row.venueName,
        row.venueMeta,
        statusPresentation(row.status).label,
        row.scope,
        row.suggestedBy,
        row.suggestedByMeta,
        row.createdAt,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesKind &&
        matchesStatus &&
        matchesSuggestedBy &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [kinds, query, rows, statuses, suggestedUsers]);

  const pagination = useTablePagination(filtered, 10, 1, "suggestions");

  function resetPageAfter<T>(update: (value: T) => void) {
    return (value: T) => {
      update(value);
      pagination.setPage(1);
    };
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#333333] bg-[#242424] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={resetPageAfter(setQuery)}
          placeholder="Search suggestion, research, venue, user..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <MultiFilterSelect
            values={kinds}
            onChange={resetPageAfter(setKinds)}
            ariaLabel="Filter by suggestion type"
            options={[
              { value: "ALL", label: "All types" },
              { value: "Journal", label: "Journals" },
              { value: "Conference", label: "Conferences" },
            ]}
          />
          <MultiFilterSelect
            values={statuses}
            onChange={resetPageAfter(setStatuses)}
            ariaLabel="Filter by suggested venue status"
            options={[
              { value: "ALL", label: "All statuses" },
              { value: "WAITING_APPROVAL", label: "Waiting approval" },
              {
                value: "PENDING_JOURNAL_ADDING",
                label: "Pending journal adding",
              },
              {
                value: "PENDING_PUBLISHER_ADDING",
                label: "Pending publisher adding",
              },
              { value: "APPROVED", label: "Approved" },
              { value: "DECLINED", label: "Declined" },
            ]}
          />
          <MultiFilterSelect
            values={suggestedUsers}
            onChange={resetPageAfter(setSuggestedUsers)}
            ariaLabel="Filter by suggested user"
            options={suggestedByOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All users" : item,
            }))}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[23%] px-3 py-3">Research</th>
              <th className="w-[24%] px-3 py-3">Suggested venue</th>
              <th className="w-[8%] px-3 py-3">Type</th>
              <th className="w-[11%] px-3 py-3">Status</th>
              <th className="w-[16%] px-3 py-3">Scope</th>
              <th className="w-[11%] px-3 py-3">Suggested by</th>
              <th className="w-[5%] px-3 py-3">Date</th>
              <th
                className="w-[2%] px-3 py-3 text-center"
                aria-label="Delete"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((suggestion) => {
              const TypeIcon =
                suggestion.kind === "Journal" ? BookOpen : CalendarDays;
              const status = statusPresentation(suggestion.status);
              const StatusIcon = status.icon;

              return (
                <tr
                  key={suggestion.id}
                  className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/projects/${suggestion.projectId}`}
                      className={cx(
                        researchLinkClass,
                        "research-allow-transform block line-clamp-2 text-sm leading-5 focus-visible:ring-0",
                      )}
                    >
                      {suggestion.projectTitle}
                    </Link>
                    <p className="mt-1 text-xs text-[#B0B0B0]">
                      {suggestion.projectCode || "No research code"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={suggestion.venueHref}
                      className={cx(
                        researchLinkClass,
                        "research-allow-transform block line-clamp-2 text-sm leading-5 focus-visible:ring-0",
                      )}
                    >
                      {suggestion.venueName}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                      {suggestion.venueMeta || "-"}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <IconHint label={suggestion.kind}>
                      <span
                        className={`inline-flex cursor-help items-center transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] ${typeClass(suggestion.kind)}`}
                      >
                        <TypeIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{suggestion.kind}</span>
                      </span>
                    </IconHint>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={`inline-flex items-start gap-1.5 text-xs leading-5 ${status.className}`}
                    >
                      <StatusIcon
                        className="mt-0.5 h-3.5 w-3.5 flex-none"
                        aria-hidden="true"
                      />
                      <span>{status.label}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs leading-5 text-[#B0B0B0]">
                    <span className="line-clamp-3">
                      {suggestion.scope || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs leading-5 text-[#B0B0B0]">
                    <span className="block text-[#E4E4E4]">
                      {suggestion.suggestedBy}
                    </span>
                    <span>{suggestion.suggestedByMeta}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-[#B0B0B0]">
                    {suggestion.createdAt}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-start justify-center">
                      <DeleteSuggestionButton
                        suggestion={suggestion}
                        deleteJournalAction={deleteJournalAction}
                        deleteConferenceAction={deleteConferenceAction}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {pagination.total === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No suggestions match the current search."
                    detail="Try another venue status, title, user, type, or scope."
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
