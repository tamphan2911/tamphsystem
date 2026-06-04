"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchIconButton } from "@/sites/research/components/ResearchPrimitives";
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
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }
  return "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
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
      <ResearchIconButton
        type="button"
        onClick={() => setIsOpen(true)}
        label={`Delete suggestion for ${suggestion.venueName}`}
        tone="rose"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[74rem] text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="sticky left-0 z-20 w-[25rem] bg-slate-50 px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800 dark:shadow-[1px_0_0_0_rgb(30,41,59)]">
                Research
              </th>
              <th className="w-[22rem] px-4 py-3">Suggested venue</th>
              <th className="w-[8rem] px-3 py-3">Type</th>
              <th className="w-[18rem] px-3 py-3">Scope</th>
              <th className="w-[12rem] px-3 py-3">Suggested by</th>
              <th className="w-[7rem] px-3 py-3">Date</th>
              <th className="w-[4rem] px-2 py-3 text-center">
                <IconHint label="Delete suggestion">
                  <Trash2
                    className="mx-auto h-4 w-4 text-rose-500 dark:text-rose-300"
                    aria-hidden="true"
                  />
                </IconHint>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((suggestion) => {
              const TypeIcon =
                suggestion.kind === "Journal" ? BookOpen : CalendarDays;

              return (
                <tr
                  key={suggestion.id}
                  className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:shadow-[1px_0_0_0_rgb(30,41,59)] dark:group-hover:bg-slate-800">
                    <Link
                      href={`/projects/${suggestion.projectId}`}
                      className="line-clamp-2 text-sm font-normal leading-5 text-slate-800 transition hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-300"
                    >
                      {suggestion.projectTitle}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {suggestion.projectCode || "No research code"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={suggestion.venueHref}
                      className="line-clamp-2 text-sm font-normal leading-5 text-slate-800 transition hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-300"
                    >
                      {suggestion.venueName}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {suggestion.venueMeta || "-"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${typeClass(suggestion.kind)}`}
                    >
                      <TypeIcon className="h-3.5 w-3.5" />
                      {suggestion.kind}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    <span className="line-clamp-3">
                      {suggestion.scope || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    <span className="block text-slate-700 dark:text-slate-200">
                      {suggestion.suggestedBy}
                    </span>
                    <span>{suggestion.suggestedByMeta}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {suggestion.createdAt}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <DeleteSuggestionButton
                      suggestion={suggestion}
                      deleteJournalAction={deleteJournalAction}
                      deleteConferenceAction={deleteConferenceAction}
                    />
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
