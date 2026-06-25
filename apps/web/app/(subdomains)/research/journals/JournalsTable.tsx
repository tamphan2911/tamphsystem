"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownNarrowWide,
  ArrowDownUp,
  ArrowUpNarrowWide,
  BadgeCheck,
  BookmarkCheck,
  ClipboardCheck,
  CircleOff,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import {
  IconHint,
  TablePagination,
  TableSearchInput,
  usePersistentTableValue,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { CountryFlag } from "@/sites/research/components/CountryFlag";
import {
  currencySymbol,
  formatResearchNumber,
} from "@/sites/research/lib/currency";
import { countryName } from "@/sites/research/lib/countries";

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
  approvalStatus: string;
  submissionFee: string;
  submissionFeeCurrency: string;
  note: string;
  hasAssociatedAccount: boolean;
  usesPublisherAccount: boolean;
  ongoingSubmissions: number;
  publishedSubmissions: number;
  reviews: number;
};

type ApcSortDirection = "desc" | "asc";

function parseApcSort(value: string | null): ApcSortDirection | null {
  return value === "desc" || value === "asc" ? value : null;
}

function nextApcSort(current: ApcSortDirection | null) {
  if (!current) return "desc";
  if (current === "desc") return "asc";
  return null;
}

function apcSortHint(current: ApcSortDirection | null) {
  const next = nextApcSort(current);
  if (!next) return "Clear APC sorting";
  return next === "desc" ? "Sort APC high to low" : "Sort APC low to high";
}

function apcSortValue(amount: string) {
  const trimmed = amount.trim();
  if (!trimmed) return 0;
  const normalized = trimmed
    .replaceAll(",", "")
    .replaceAll(" ", "")
    .replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function ApcSortButton({
  sort,
  onChange,
}: {
  sort: ApcSortDirection | null;
  onChange: () => void;
}) {
  const Icon =
    sort === "desc"
      ? ArrowDownNarrowWide
      : sort === "asc"
        ? ArrowUpNarrowWide
        : ArrowDownUp;

  return (
    <IconHint label={apcSortHint(sort)}>
      <button
        type="button"
        aria-label={apcSortHint(sort)}
        aria-pressed={Boolean(sort)}
        onClick={onChange}
        className={`research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 shadow-none outline-none transition-[color,filter,transform] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 ${
          sort
            ? "text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
            : "text-slate-500 hover:text-slate-900 dark:text-[#8F98A8] dark:hover:text-[#E4E4E4]"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </IconHint>
  );
}

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
          <Trash2 className="research-task-icon-motion h-4 w-4" />
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
            className="research-task-icon-motion h-4 w-4 flex-none text-[#8FCFD1]"
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
  const [favoriteOnly, setFavoriteOnly] = useState(
    () => searchParams.get("favorite") === "1",
  );
  const [interestOnly, setInterestOnly] = useState(
    () => searchParams.get("interest") === "1",
  );
  const [noAccountOnly, setNoAccountOnly] = useState(
    () => isAdmin && searchParams.get("noAccount") === "1",
  );
  const initialApcSortValue = parseApcSort(searchParams.get("apcSort"));
  const [apcSortSetting, setApcSortSetting] = usePersistentTableValue(
    "journals:apcSort",
    initialApcSortValue ?? "NONE",
  );
  const apcSort = parseApcSort(apcSortSetting);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFavorite = !favoriteOnly || row.isFavorite;
      const matchesInterest = !interestOnly || row.isInterest;
      const matchesAccount =
        !isAdmin || !noAccountOnly || !row.hasAssociatedAccount;
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
        row.approvalStatus === "PENDING_APPROVAL"
          ? "need approval pending approval waiting approve"
          : "approved",
        row.hasApcOption ? "option paid free route" : "",
        row.submissionFee,
        row.hasAssociatedAccount
          ? row.usesPublisherAccount
            ? "publisher account"
            : "journal account"
          : "no account without account missing account",
        row.note,
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesFavorite &&
        matchesInterest &&
        matchesAccount &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [favoriteOnly, interestOnly, isAdmin, noAccountOnly, query, rows]);

  const sortedRows = useMemo(() => {
    if (!apcSort) return filtered;
    return filtered
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const leftValue = apcSortValue(left.row.apc);
        const rightValue = apcSortValue(right.row.apc);
        if (leftValue === null && rightValue === null) {
          return left.index - right.index;
        }
        if (leftValue === null) return 1;
        if (rightValue === null) return -1;
        const comparison =
          apcSort === "desc" ? rightValue - leftValue : leftValue - rightValue;
        return comparison || left.index - right.index;
      })
      .map((item) => item.row);
  }, [apcSort, filtered]);

  const initialPage = Number(searchParams.get("page") ?? "1");
  const pagination = useTablePagination(
    sortedRows,
    10,
    Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1,
  );
  const currentListPath = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (favoriteOnly) params.set("favorite", "1");
    if (interestOnly) params.set("interest", "1");
    if (isAdmin && noAccountOnly) params.set("noAccount", "1");
    if (apcSort) params.set("apcSort", apcSort);
    if (pagination.page > 1) params.set("page", String(pagination.page));
    return params.toString() ? `${pathname}?${params.toString()}` : pathname;
  }, [
    apcSort,
    favoriteOnly,
    interestOnly,
    isAdmin,
    noAccountOnly,
    pagination.page,
    pathname,
    query,
  ]);

  function updateFavoriteOnly(checked: boolean) {
    setFavoriteOnly(checked);
    pagination.setPage(1);
  }

  function updateInterestOnly(checked: boolean) {
    setInterestOnly(checked);
    pagination.setPage(1);
  }

  function updateNoAccountOnly(checked: boolean) {
    setNoAccountOnly(checked);
    pagination.setPage(1);
  }

  function toggleApcSort() {
    setApcSortSetting(nextApcSort(apcSort) ?? "NONE");
    pagination.setPage(1);
  }

  useEffect(() => {
    router.replace(currentListPath, { scroll: false });
  }, [currentListPath, router]);

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search journals, ISSN, field, publisher..."
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <label className="inline-flex h-10 w-full cursor-pointer items-center gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm font-normal text-[#243047] transition-colors duration-150 hover:border-[#C7BFAF] hover:bg-[#F7F4ED] hover:text-[#111827] sm:w-auto dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:hover:text-white">
            <input
              type="checkbox"
              checked={favoriteOnly}
              onChange={(event) =>
                updateFavoriteOnly(event.currentTarget.checked)
              }
              className="h-4 w-4 cursor-pointer rounded-none border-[#D8D0C2] accent-[#1F7180] dark:border-[#666666] dark:accent-[#A8DADC]"
            />
            <IconHint label="Show favorite journals only">
              <span className="whitespace-nowrap text-left">Fav</span>
            </IconHint>
          </label>
          <label className="inline-flex h-10 w-full cursor-pointer items-center gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm font-normal text-[#243047] transition-colors duration-150 hover:border-[#C7BFAF] hover:bg-[#F7F4ED] hover:text-[#111827] sm:w-auto dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:hover:text-white">
            <input
              type="checkbox"
              checked={interestOnly}
              onChange={(event) =>
                updateInterestOnly(event.currentTarget.checked)
              }
              className="h-4 w-4 cursor-pointer rounded-none border-[#D8D0C2] accent-[#1F7180] dark:border-[#666666] dark:accent-[#A8DADC]"
            />
            <IconHint label="Show journals of interest only">
              <span className="whitespace-nowrap text-left">Interest</span>
            </IconHint>
          </label>
          {isAdmin ? (
            <label className="inline-flex h-10 w-full cursor-pointer items-center gap-2 border border-[#D8D0C2] bg-[#FFFDF8] px-3 text-sm font-normal text-[#243047] transition-colors duration-150 hover:border-[#C7BFAF] hover:bg-[#F7F4ED] hover:text-[#111827] sm:w-auto dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838] dark:hover:text-white">
              <input
                type="checkbox"
                checked={noAccountOnly}
                onChange={(event) =>
                  updateNoAccountOnly(event.currentTarget.checked)
                }
                className="h-4 w-4 cursor-pointer rounded-none border-[#D8D0C2] accent-[#1F7180] dark:border-[#666666] dark:accent-[#A8DADC]"
              />
              <IconHint label="Show journals without a journal account. If the publisher uses one shared account, journals are shown here when that publisher has no account.">
                <span className="whitespace-nowrap text-left">No account</span>
              </IconHint>
            </label>
          ) : null}
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
              <th className="w-[10%] px-4 py-3">
                <span className="inline-flex items-center gap-1.5">
                  <span>APC</span>
                  <ApcSortButton sort={apcSort} onChange={toggleApcSort} />
                </span>
              </th>
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
                    className="research-task-icon-motion mx-auto h-4 w-4 text-blue-600 dark:text-blue-300"
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
                    className="research-task-icon-motion mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-300"
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
                    className="research-task-icon-motion mx-auto h-4 w-4 text-amber-500 dark:text-amber-300"
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
                      className="research-task-icon-motion mx-auto h-4 w-4 text-rose-500 dark:text-rose-300"
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
                    data-allow-transform="true"
                    className="research-journal-name-link inline-block text-base font-normal text-[#E4E4E4]"
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
                        className={`research-task-icon-motion h-3.5 w-3.5 transition duration-150 ease-out ${
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
                        className={`research-task-icon-motion h-3.5 w-3.5 transition duration-150 ease-out ${
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
                  {journal.approvalStatus === "PENDING_APPROVAL" ? (
                    <span className="mt-2 inline-flex border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      Need approval
                    </span>
                  ) : null}
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
                        <CountryFlag value={journal.country} />
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
