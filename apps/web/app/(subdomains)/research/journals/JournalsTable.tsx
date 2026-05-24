"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, BadgeCheck, Send, Star, Trash2, X } from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { useResearchToast } from "../components/ResearchToast";
import { formatMoney } from "../lib/currency";
import { countryFlag, countryName } from "../lib/countries";

export type JournalRow = {
  id: string;
  name: string;
  issn: string;
  fields: string[];
  rank: string;
  publisher: string;
  country: string;
  apc: string;
  apcCurrency: string;
  submissionFee: string;
  submissionFeeCurrency: string;
  note: string;
  ongoingSubmissions: number;
  publishedSubmissions: number;
  reviews: number;
};

function DeleteJournalButton({
  journal,
  deleteAction,
}: {
  journal: JournalRow;
  deleteAction: (journalId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <IconHint label="Delete journal">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete ${journal.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex animate-[modalOverlayIn_180ms_ease-out] items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg animate-[modalPanelIn_220ms_ease-out] overflow-hidden rounded-xl border border-rose-200 bg-white shadow-2xl dark:border-rose-900/70 dark:bg-slate-900">
            <div className="border-b border-rose-100 bg-rose-50/80 px-6 py-5 dark:border-rose-900/60 dark:bg-rose-950/25">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-800">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                      Delete this journal?
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      This will remove {journal.name} from the journal list.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-3 px-6 py-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>
                Submission records, reviews, and suggested venue links for this
                journal will be deleted. Publisher accounts and tasks will stay
                in the system, but they will no longer be linked to this journal.
              </p>
              <p className="font-semibold text-rose-700 dark:text-rose-300">
                This action cannot be undone from this screen.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteAction(journal.id);
                    setIsOpen(false);
                    router.refresh();
                    toast.showSuccess({
                      title: "Journal deleted",
                      detail: `${journal.name} has been removed from the journal list.`,
                    });
                  } catch (error) {
                    toast.showError({
                      title: "Could not delete journal",
                      detail:
                        error instanceof Error
                          ? error.message
                          : "The journal was not removed. Please refresh the page and try again.",
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-rose-600"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete journal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function JournalsTable({
  rows,
  isAdmin,
  deleteAction,
}: {
  rows: JournalRow[];
  isAdmin: boolean;
  deleteAction: (journalId: string) => Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [field, setField] = useState(() => searchParams.get("field") ?? "ALL");
  const [publisher, setPublisher] = useState(
    () => searchParams.get("publisher") ?? "ALL",
  );

  const fieldOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(rows.flatMap((row) => row.fields).filter(Boolean)),
      ).sort(),
    ],
    [rows],
  );
  const publisherOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(rows.map((row) => row.publisher).filter(Boolean)),
      ).sort(),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesField = field === "ALL" || row.fields.includes(field);
      const matchesPublisher =
        publisher === "ALL" || row.publisher === publisher;
      const haystack = [
        row.name,
        row.issn,
        row.fields.join(" "),
        row.rank,
        row.publisher,
        countryName(row.country),
        row.apc,
        row.submissionFee,
        row.note,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesField &&
        matchesPublisher &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [field, publisher, query, rows]);

  const initialPage = Number(searchParams.get("page") ?? "1");
  const pagination = useTablePagination(
    filtered,
    10,
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1,
  );
  const currentListPath = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (field !== "ALL") params.set("field", field);
    if (publisher !== "ALL") params.set("publisher", publisher);
    if (pagination.page > 1) params.set("page", String(pagination.page));
    return params.toString() ? `${pathname}?${params.toString()}` : pathname;
  }, [field, pagination.page, pathname, publisher, query]);

  useEffect(() => {
    router.replace(currentListPath, { scroll: false });
  }, [currentListPath, router]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search journals, ISSN, publisher..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <FilterSelect
            value={field}
            onChange={setField}
            ariaLabel="Filter by field"
            options={fieldOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All fields" : item,
            }))}
          />
          <FilterSelect
            value={publisher}
            onChange={setPublisher}
            ariaLabel="Filter by publisher"
            options={publisherOptions.map((item) => ({
              value: item,
              label: item === "ALL" ? "All publishers" : item,
            }))}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th
                className={
                  isAdmin ? "w-[31%] px-4 py-3" : "w-[34%] px-4 py-3"
                }
              >
                Journal
              </th>
              <th
                className={
                  isAdmin ? "w-[18%] px-4 py-3" : "w-[20%] px-4 py-3"
                }
              >
                Field
              </th>
              <th className="w-[10%] px-4 py-3">APC</th>
              <th className="w-[10%] px-4 py-3">Fee</th>
              <th
                className={
                  isAdmin
                    ? "w-[5%] px-2 py-3 text-center"
                    : "w-[6%] px-2 py-3 text-center"
                }
              >
                <IconHint label="Ongoing submissions">
                  <Send className="mx-auto h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                </IconHint>
              </th>
              <th
                className={
                  isAdmin
                    ? "w-[5%] px-2 py-3 text-center"
                    : "w-[6%] px-2 py-3 text-center"
                }
              >
                <IconHint label="Accepted and published submissions">
                  <BadgeCheck className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
                </IconHint>
              </th>
              <th
                className={
                  isAdmin
                    ? "w-[5%] px-2 py-3 text-center"
                    : "w-[6%] px-2 py-3 text-center"
                }
              >
                <IconHint label="Reviews">
                  <Star className="mx-auto h-4 w-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                </IconHint>
              </th>
              <th
                className={isAdmin ? "w-[9%] px-2 py-3" : "w-[8%] px-2 py-3"}
              >
                Country
              </th>
              {isAdmin && (
                <th className="w-[5%] px-2 py-3 text-center">
                  <IconHint label="Delete journal">
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
            {pagination.pagedRows.map((journal) => (
              <tr
                key={journal.id}
                className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/journals/${journal.id}?back=${encodeURIComponent(currentListPath)}`}
                    className="text-base font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                  >
                    {journal.name}
                  </Link>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {[
                      journal.publisher || "No publisher",
                      journal.issn ? `ISSN ${journal.issn}` : "No ISSN",
                      journal.rank || "No rank",
                    ].join(" - ")}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {journal.fields.length > 0 ? journal.fields.join("; ") : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {formatMoney(journal.apc, journal.apcCurrency)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {formatMoney(
                    journal.submissionFee,
                    journal.submissionFeeCurrency,
                  )}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {journal.ongoingSubmissions}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {journal.publishedSubmissions}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {journal.reviews}
                </td>
                <td className="px-2 py-3">
                  {journal.country ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span aria-hidden="true">
                        {countryFlag(journal.country)}
                      </span>
                      <span className="truncate">
                        {countryName(journal.country)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      -
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-2 py-3 text-center">
                    <DeleteJournalButton
                      journal={journal}
                      deleteAction={deleteAction}
                    />
                  </td>
                )}
              </tr>
            ))}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 9 : 8}
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No journals match the current search.
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
