"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Send, Star, Trash2 } from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchIconButton } from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { formatMoney } from "@/sites/research/lib/currency";
import { countryFlag, countryName } from "@/sites/research/lib/countries";

export type JournalRow = {
  id: string;
  name: string;
  issn: string;
  fields: string[];
  type: string;
  rank: string;
  localRank: string;
  issuesPerYear: number | null;
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
      <ResearchIconButton
        type="button"
        onClick={() => setIsOpen(true)}
        label={`Delete ${journal.name}`}
        tone="rose"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

      <ResearchConfirmDialog
        open={isOpen}
        title="Delete this journal?"
        description={`This will remove ${journal.name} from the journal list.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete journal"}
        isConfirming={isDeleting}
        onCancel={() => setIsOpen(false)}
        onConfirm={async () => {
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
      >
        <p>
          This is only allowed when the journal has no submissions, reviews, or
          suggested research links. Publisher accounts and tasks will stay in
          the system, but they will no longer be linked to this journal.
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

function rankLabel(journal: JournalRow) {
  return journal.type === "LOCAL"
    ? journal.localRank || "No local rank"
    : journal.rank || "No rank";
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
        row.type,
        rankLabel(row),
        row.issuesPerYear ? `${row.issuesPerYear} issues per year` : "",
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
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] p-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
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
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th
                className={isAdmin ? "w-[31%] px-4 py-3" : "w-[34%] px-4 py-3"}
              >
                Journal
              </th>
              <th
                className={isAdmin ? "w-[18%] px-4 py-3" : "w-[20%] px-4 py-3"}
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
                  <Send
                    className="mx-auto h-4 w-4 text-blue-600 dark:text-blue-300"
                    aria-hidden="true"
                  />
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
                  <BadgeCheck
                    className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-300"
                    aria-hidden="true"
                  />
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
                  <Star
                    className="mx-auto h-4 w-4 text-amber-500 dark:text-amber-300"
                    aria-hidden="true"
                  />
                </IconHint>
              </th>
              <th className={isAdmin ? "w-[9%] px-2 py-3" : "w-[8%] px-2 py-3"}>
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
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((journal) => (
              <tr
                key={journal.id}
                className="group align-top transition-colors duration-150 hover:bg-[#383838]"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/journals/${journal.id}?back=${encodeURIComponent(currentListPath)}`}
                    className="text-base font-normal text-[#E4E4E4] transition hover:text-[#A8DADC]"
                  >
                    {journal.name}
                  </Link>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-[#B0B0B0]">
                    {[
                      journal.publisher || "No publisher",
                      journal.issn ? `ISSN ${journal.issn}` : "No ISSN",
                      journal.type === "LOCAL" ? "Local" : "International",
                      rankLabel(journal),
                      journal.issuesPerYear
                        ? `${journal.issuesPerYear} issues/year`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs leading-5 text-[#B0B0B0]">
                  {journal.fields.length > 0 ? journal.fields.join("; ") : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-[#B0B0B0]">
                  {formatMoney(journal.apc, journal.apcCurrency)}
                </td>
                <td className="px-4 py-3 text-sm text-[#B0B0B0]">
                  {formatMoney(
                    journal.submissionFee,
                    journal.submissionFeeCurrency,
                  )}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-[#E4E4E4]">
                  {journal.ongoingSubmissions}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {journal.publishedSubmissions}
                </td>
                <td className="px-2 py-3 text-center text-sm font-semibold text-[#E4E4E4]">
                  {journal.reviews}
                </td>
                <td className="px-2 py-3">
                  {journal.country ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-[#B0B0B0]">
                      <span aria-hidden="true">
                        {countryFlag(journal.country)}
                      </span>
                      <span className="truncate">
                        {countryName(journal.country)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#777777]">-</span>
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
                <td colSpan={isAdmin ? 9 : 8} className="px-4 py-2">
                  <ResearchEmptyState
                    title="No journals match the current search."
                    detail="Try another journal name, ISSN, publisher, field, or country."
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
