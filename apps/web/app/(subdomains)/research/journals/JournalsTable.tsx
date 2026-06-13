"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  BookmarkCheck,
  ClipboardCheck,
  CircleOff,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { researchLinkClass } from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  currencySymbol,
  formatResearchNumber,
} from "@/sites/research/lib/currency";
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
  isFavorite: boolean;
  isInterest: boolean;
  publisher: string;
  country: string;
  apc: string;
  apcCurrency: string;
  hasApcOption: boolean;
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
      <IconHint label={`Delete ${journal.name}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={`Delete ${journal.name}`}
          className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-start justify-center border-0 bg-transparent p-0 text-rose-700 shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-rose-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-rose-300 dark:hover:text-rose-200"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

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

function isFreeAmount(amount: string) {
  const normalized = amount.trim().replaceAll(",", "").replaceAll(" ", "");
  return !normalized || Number(normalized) === 0;
}

function MoneyIndicator({
  amount,
  currency,
  label,
  showIcon = true,
  option = false,
}: {
  amount: string;
  currency: string;
  label: string;
  showIcon?: boolean;
  option?: boolean;
}) {
  const isFree = isFreeAmount(amount);
  const detail = isFree
    ? `${label}: free or not provided`
    : `${label}: ${currencySymbol(currency)} ${formatResearchNumber(amount)}`;

  return (
    <IconHint label={detail}>
      <span className="inline-flex cursor-help items-center gap-1.5 text-[#B0B0B0] transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-105 hover:text-[#E4E4E4] hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.16)]">
        {showIcon && isFree ? (
          <CircleOff
            className="h-4 w-4 flex-none text-[#8FCFD1]"
            aria-hidden="true"
          />
        ) : null}
        <span className="min-w-0 text-sm">
          <span className="block">
            {isFree
              ? "Free"
              : `${currencySymbol(currency)} ${formatResearchNumber(amount)}`}
          </span>
          {option && !isFree ? (
            <span className="mt-0.5 block text-xs text-[#A8DADC]">Option</span>
          ) : null}
        </span>
      </span>
    </IconHint>
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
  const [favorite, setFavorite] = useState(
    () => searchParams.get("favorite") ?? "ALL",
  );
  const [interest, setInterest] = useState(
    () => searchParams.get("interest") ?? "ALL",
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
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesField = field === "ALL" || row.fields.includes(field);
      const matchesFavorite =
        favorite === "ALL" ||
        (favorite === "YES" ? row.isFavorite : !row.isFavorite);
      const matchesInterest =
        interest === "ALL" ||
        (interest === "YES" ? row.isInterest : !row.isInterest);
      const haystack = [
        row.name,
        row.issn,
        row.fields.join(" "),
        row.type,
        rankLabel(row),
        row.issuesPerYear ? `${row.issuesPerYear} issues per year` : "",
        row.isFavorite ? "favorite" : "not favorite",
        row.isInterest ? "interest interested" : "not interest",
        row.publisher,
        countryName(row.country),
        row.apc,
        row.hasApcOption ? "option paid free route" : "",
        row.submissionFee,
        row.note,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesField &&
        matchesFavorite &&
        matchesInterest &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [favorite, field, interest, query, rows]);

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
    if (favorite !== "ALL") params.set("favorite", favorite);
    if (interest !== "ALL") params.set("interest", interest);
    if (pagination.page > 1) params.set("page", String(pagination.page));
    return params.toString() ? `${pathname}?${params.toString()}` : pathname;
  }, [favorite, field, interest, pagination.page, pathname, query]);

  useEffect(() => {
    router.replace(currentListPath, { scroll: false });
  }, [currentListPath, router]);

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
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
            value={favorite}
            onChange={setFavorite}
            ariaLabel="Filter by favorite"
            options={[
              { value: "ALL", label: "All favorite status" },
              { value: "YES", label: "Favorite" },
              { value: "NO", label: "Not favorite" },
            ]}
          />
          <FilterSelect
            value={interest}
            onChange={setInterest}
            ariaLabel="Filter by interest"
            options={[
              { value: "ALL", label: "All interest status" },
              { value: "YES", label: "Interested" },
              { value: "NO", label: "Not interested" },
            ]}
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
                  <ClipboardCheck
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
                    className={`text-base ${researchLinkClass}`}
                  >
                    {journal.name}
                  </Link>
                  <span className="ml-2 inline-flex translate-y-0.5 items-center gap-1">
                    <IconHint
                      label={
                        journal.isFavorite ? "Favorite journal" : "Not favorite"
                      }
                    >
                      <Star
                        className={`h-3.5 w-3.5 transition duration-150 ease-out ${
                          journal.isFavorite
                            ? "text-amber-400"
                            : "text-[#666666] group-hover:text-[#B0B0B0]"
                        }`}
                        aria-hidden="true"
                      />
                    </IconHint>
                    <IconHint
                      label={
                        journal.isInterest
                          ? "Journal of interest"
                          : "Not marked as interest"
                      }
                    >
                      <BookmarkCheck
                        className={`h-3.5 w-3.5 transition duration-150 ease-out ${
                          journal.isInterest
                            ? "text-sky-400"
                            : "text-[#666666] group-hover:text-[#B0B0B0]"
                        }`}
                        aria-hidden="true"
                      />
                    </IconHint>
                  </span>
                  <p className="mt-1 whitespace-normal break-words text-xs font-normal leading-5 text-[#B0B0B0]">
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
                  <MoneyIndicator
                    amount={journal.apc}
                    currency={journal.apcCurrency}
                    label="APC"
                    showIcon={false}
                    option={journal.hasApcOption}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-[#B0B0B0]">
                  <MoneyIndicator
                    amount={journal.submissionFee}
                    currency={journal.submissionFeeCurrency}
                    label="Submission fee"
                  />
                </td>
                <td className="px-2 py-3 text-center text-sm font-normal text-[#E4E4E4]">
                  {journal.ongoingSubmissions}
                </td>
                <td className="px-2 py-3 text-center text-sm font-normal text-emerald-700 dark:text-emerald-300">
                  {journal.publishedSubmissions}
                </td>
                <td className="px-2 py-3 text-center text-sm font-normal text-[#E4E4E4]">
                  {journal.reviews}
                </td>
                <td className="px-2 py-3 text-center">
                  {journal.country ? (
                    <IconHint label={countryName(journal.country)}>
                      <span className="inline-flex cursor-help items-center text-lg leading-none transition-[filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)]">
                        {countryFlag(journal.country)}
                        <span className="sr-only">
                          {countryName(journal.country)}
                        </span>
                      </span>
                    </IconHint>
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
                    detail="Try another journal name, ISSN, favorite status, interest status, field, or country."
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
