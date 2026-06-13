"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";

export type SuggestionKind = "Journal" | "Conference";

export type SuggestionRow = {
  id: string;
  kind: SuggestionKind;
  projectId: string;
  projectTitle: string;
  projectCode: string;
  venueId: string;
  venueName: string;
  venueHref: string;
  venueMeta: string;
  scope: string;
  suggestedBy: string;
  suggestedByMeta: string;
  createdAt: string;
  createdAtSort: number;
};

function typeClass(kind: SuggestionKind) {
  if (kind === "Journal") {
    return "text-[#1F7180] hover:text-[#155864] dark:text-[#8FCFD1] dark:hover:text-[#C9F0F2]";
  }
  return "text-[#6F5AA8] hover:text-[#513E86] dark:text-[#CDB6E8] dark:hover:text-[#E7D8F7]";
}

function DeleteSuggestionButton({
  suggestion,
  deleteJournalAction,
  deleteConferenceAction,
}: {
  suggestion: SuggestionRow;
  deleteJournalAction: (projectId: string, journalId: string) => Promise<void>;
  deleteConferenceAction: (
    projectId: string,
    conferenceId: string,
  ) => Promise<void>;
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
            if (suggestion.kind === "Journal") {
              await deleteJournalAction(
                suggestion.projectId,
                suggestion.venueId,
              );
            } else {
              await deleteConferenceAction(
                suggestion.projectId,
                suggestion.venueId,
              );
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
  deleteJournalAction: (projectId: string, journalId: string) => Promise<void>;
  deleteConferenceAction: (
    projectId: string,
    conferenceId: string,
  ) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("ALL");
  const [project, setProject] = useState("ALL");
  const [suggestedBy, setSuggestedBy] = useState("ALL");

  const projectOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(
          rows
            .map((row) =>
              row.projectCode
                ? `${row.projectCode} - ${row.projectTitle}`
                : row.projectTitle,
            )
            .filter(Boolean),
        ),
      ).sort(),
    ],
    [rows],
  );
  const suggestedByOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(rows.map((row) => row.suggestedBy))).sort(),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const projectLabel = row.projectCode
        ? `${row.projectCode} - ${row.projectTitle}`
        : row.projectTitle;
      const matchesKind = kind === "ALL" || row.kind === kind;
      const matchesProject = project === "ALL" || projectLabel === project;
      const matchesSuggestedBy =
        suggestedBy === "ALL" || row.suggestedBy === suggestedBy;
      const haystack = [
        row.kind,
        row.projectCode,
        row.projectTitle,
        row.venueName,
        row.venueMeta,
        row.scope,
        row.suggestedBy,
        row.suggestedByMeta,
        row.createdAt,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesKind &&
        matchesProject &&
        matchesSuggestedBy &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [kind, project, query, rows, suggestedBy]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#333333] bg-[#242424] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search suggestion, research, venue, user..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={kind}
            onChange={setKind}
            ariaLabel="Filter by suggestion type"
            options={[
              { value: "ALL", label: "All types" },
              { value: "Journal", label: "Journals" },
              { value: "Conference", label: "Conferences" },
            ]}
          />
          <FilterSelect
            value={project}
            onChange={setProject}
            ariaLabel="Filter by research"
            options={projectOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All research" : item,
            }))}
          />
          <FilterSelect
            value={suggestedBy}
            onChange={setSuggestedBy}
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
              <th className="w-[25%] px-3 py-3">Research</th>
              <th className="w-[27%] px-3 py-3">Suggested venue</th>
              <th className="w-[10%] px-3 py-3">Type</th>
              <th className="w-[18%] px-3 py-3">Scope</th>
              <th className="w-[12%] px-3 py-3">Suggested by</th>
              <th className="w-[5%] px-3 py-3">Date</th>
              <th
                className="w-[3%] px-3 py-3 text-center"
                aria-label="Delete"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((suggestion) => {
              const TypeIcon =
                suggestion.kind === "Journal" ? BookOpen : CalendarDays;

              return (
                <tr
                  key={suggestion.id}
                  className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-3 py-3">
                    <Link
                      href={`/projects/${suggestion.projectId}`}
                      className="line-clamp-2 origin-left text-sm font-normal leading-5 text-[#E4E4E4] outline-none transition-[color,text-shadow,transform] duration-180 ease-out hover:bg-transparent hover:text-[#A8DADC] hover:[text-shadow:0_0_0.55rem_rgba(168,218,220,0.18)] active:scale-[0.985] focus-visible:bg-transparent focus-visible:ring-0 motion-reduce:transform-none motion-reduce:transition-none"
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
                      className="line-clamp-2 origin-left text-sm font-normal leading-5 text-[#E4E4E4] outline-none transition-[color,text-shadow,transform] duration-180 ease-out hover:bg-transparent hover:text-[#A8DADC] hover:[text-shadow:0_0_0.55rem_rgba(168,218,220,0.18)] active:scale-[0.985] focus-visible:bg-transparent focus-visible:ring-0 motion-reduce:transform-none motion-reduce:transition-none"
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
                <td colSpan={7} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No suggestions match the current search."
                    detail="Try another research title, venue name, user, type, or scope."
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
