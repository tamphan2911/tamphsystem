"use client";

import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

import { useMemo } from "react";
import Link from "next/link";
import {
  AtSign,
  Ban,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileSearch,
  KeyRound,
  LockKeyhole,
  Send,
  StickyNote,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PublisherPickerItem } from "@/sites/research/components/PublisherPicker";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import type { SubmissionRow } from "../../projects/[id]/SubmissionsTable";
import { NewAccountDialog } from "../../accounts/NewAccountDialog";
import type { AccountJournalOption } from "../../accounts/AccountScopeFields";

export type JournalSubmissionRow = SubmissionRow;

export type JournalAccountRow = {
  id: string;
  username: string;
  password: string;
  email: string;
  note: string;
  submissions: number;
};

export type JournalReviewRow = {
  id: string;
  manuscriptTitle: string;
  manuscriptId: string;
  status: string;
  recommendation: string;
  requestedAt: string;
  dueDate: string;
  completedAt: string;
  editorName: string;
  reviewRound: string;
  note: string;
};

type TabKey = "submissions" | "accounts" | "reviews";

const journalDetailPlainLinkClass =
  "research-allow-transform border-0 bg-transparent p-0 shadow-none outline-none transition-[color,transform] duration-180 ease-out hover:border-0 hover:bg-transparent hover:shadow-none hover:[text-shadow:none] focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent active:shadow-none active:[transform:scale(0.985)]";

function statusClass(status: string) {
  if (status === "ACCEPTED" || status === "SUBMITTED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (status === "REVISION" || status === "IN_PROGRESS")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (status === "REJECTED" || status === "WITHDRAWN" || status === "DECLINED")
    return "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function normalizedSubmissionStatus(value: string) {
  if (value === "PENDING" || value === "SUBMITTED") return "SUBMITTED";
  if (value === "UNDER_REVIEW" || value === "REVISION") return "REVIEWING";
  return value;
}

function submissionStatusMeta(value: string): {
  label: string;
  icon: LucideIcon;
  className: string;
} {
  const status = normalizedSubmissionStatus(value);
  if (status === "PUBLISHED") {
    return {
      label: "Published",
      icon: BookOpen,
      className: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (status === "ACCEPTED") {
    return {
      label: "Accepted",
      icon: CheckCircle2,
      className: "text-cyan-700 dark:text-[#A8DADC]",
    };
  }
  if (status === "REVIEWING") {
    return {
      label: "Reviewing",
      icon: FileSearch,
      className: "text-violet-700 dark:text-violet-300",
    };
  }
  if (status === "REJECTED") {
    return {
      label: "Rejected",
      icon: Ban,
      className: "text-rose-700 dark:text-rose-300",
    };
  }
  if (status === "WITHDRAWN") {
    return {
      label: "Withdrawn",
      icon: TriangleAlert,
      className: "text-amber-700 dark:text-amber-300",
    };
  }
  return {
    label: "Submitted",
    icon: Send,
    className: "text-sky-700 dark:text-sky-300",
  };
}

function shortDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}

function JournalSubmissionsTable({
  rows,
  linkSubmissions,
}: {
  rows: JournalSubmissionRow[];
  linkSubmissions: boolean;
}) {
  const [query, setQuery] = usePersistentTableValue(
    "journal-detail-submissions:q",
    "",
  );
  const [status, setStatus] = usePersistentTableValue(
    "journal-detail-submissions:status",
    "ALL",
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const normalized = normalizedSubmissionStatus(row.status);
      const matchesStatus = status === "ALL" || normalized === status;
      const haystack = [
        row.code,
        row.projectTitle,
        row.projectAuthors,
        normalized,
        row.account,
        row.accountEmail,
        row.articleUrl,
        row.articleFileName,
        row.submittedAt,
        row.acceptedAt,
        row.rejectedAt,
        row.withdrawnAt,
        row.publishedAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [query, rows, status]);
  const pagination = useTablePagination(
    filtered,
    10,
    1,
    "journal-detail-submissions",
  );

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value);
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search submission ID, manuscript, account..."
        />
        <FilterSelect
          value={status}
          onChange={updateStatus}
          ariaLabel="Filter journal submissions by status"
          options={[
            { value: "ALL", label: "All status" },
            { value: "SUBMITTED", label: "Submitted" },
            { value: "REVIEWING", label: "Reviewing" },
            { value: "ACCEPTED", label: "Accepted" },
            { value: "REJECTED", label: "Rejected" },
            { value: "WITHDRAWN", label: "Withdrawn" },
            { value: "PUBLISHED", label: "Published" },
          ]}
        />
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[7rem] px-3 py-3">ID</th>
              <th className="px-3 py-3">Submission</th>
              <th className="w-[7rem] px-3 py-3">Status</th>
              <th className="w-[13rem] px-3 py-3">Timeline</th>
              <th className="w-[11rem] px-3 py-3">Account</th>
              <th className="w-[5rem] px-3 py-3 text-center">Article</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((row) => {
              const statusMeta = submissionStatusMeta(row.status);
              const StatusIcon = statusMeta.icon;
              const timeline = [
                row.submittedAt
                  ? `Submitted: ${shortDate(row.submittedAt)}`
                  : "",
                row.acceptedAt ? `Accepted: ${shortDate(row.acceptedAt)}` : "",
                row.rejectedAt ? `Rejected: ${shortDate(row.rejectedAt)}` : "",
                row.withdrawnAt
                  ? `Withdrawn: ${shortDate(row.withdrawnAt)}`
                  : "",
                row.publishedAt
                  ? `Published: ${shortDate(row.publishedAt)}`
                  : "",
              ].filter(Boolean);
              return (
                <tr
                  key={row.id}
                  className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-3 py-3 align-top">
                    {linkSubmissions ? (
                      <Link
                        href={`/submissions/${row.id}`}
                        className={`${journalDetailPlainLinkClass} font-mono text-xs uppercase tracking-wide text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]`}
                      >
                        {row.code}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
                        {row.code}
                      </span>
                    )}
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    {linkSubmissions ? (
                      <Link
                        href={`/submissions/${row.id}`}
                        className={`${journalDetailPlainLinkClass} block whitespace-normal break-words text-[15px] font-normal leading-6 text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]`}
                      >
                        {row.projectTitle || "Untitled submission"}
                      </Link>
                    ) : (
                      <span className="block whitespace-normal break-words text-[15px] font-normal leading-6 text-[#252525] dark:text-[#E4E4E4]">
                        {row.projectTitle || "Untitled submission"}
                      </span>
                    )}
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#B0B0B0]">
                      {row.projectAuthors || "No author information"}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <IconHint label={statusMeta.label}>
                      <span
                        className={`research-task-icon-motion inline-flex h-5 w-5 items-start justify-center border-0 bg-transparent p-0 shadow-none ${statusMeta.className}`}
                      >
                        <StatusIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{statusMeta.label}</span>
                      </span>
                    </IconHint>
                  </td>
                  <td className="px-3 py-3 align-top text-xs leading-5 text-[#B0B0B0]">
                    {timeline.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </td>
                  <td className="px-3 py-3 align-top text-xs leading-5 text-[#B0B0B0]">
                    {row.accountId ? (
                      <Link
                        href={`/accounts/${row.accountId}`}
                        className={`${journalDetailPlainLinkClass} group/account grid min-w-0 gap-0.5 text-[#1F7180] dark:text-[#A8DADC]`}
                      >
                        <span className="whitespace-normal break-all text-[#1F7180] transition group-hover/account:text-[#155864] dark:text-[#A8DADC] dark:group-hover/account:text-[#C9F0F2]">
                          ID: {row.account || "Not recorded"}
                        </span>
                        <span className="whitespace-normal break-all text-[#B0B0B0]">
                          Pass: {row.accountPassword || "Not recorded"}
                        </span>
                      </Link>
                    ) : (
                      "Not recorded"
                    )}
                  </td>
                  <td className="px-3 py-3 text-center align-top">
                    <span className="inline-flex items-center justify-center gap-2">
                      {row.articleFileName ? (
                        <IconHint label="Download published article">
                          <a
                            href={`/api/research/submissions/${row.id}/article`}
                            className="research-task-icon-motion inline-flex h-5 w-5 items-start justify-center border-0 bg-transparent p-0 text-violet-700 shadow-none hover:bg-transparent hover:shadow-none dark:text-violet-300"
                            aria-label="Download published article"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </IconHint>
                      ) : null}
                      {row.articleUrl ? (
                        <IconHint label="Open published article">
                          <a
                            href={row.articleUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="research-task-icon-motion inline-flex h-5 w-5 items-start justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none hover:bg-transparent hover:shadow-none dark:text-[#A8DADC]"
                            aria-label="Open published article"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </IconHint>
                      ) : null}
                      {!row.articleFileName && !row.articleUrl ? (
                        <span className="text-xs text-[#777777]">-</span>
                      ) : null}
                    </span>
                  </td>
                </tr>
              );
            })}
            {pagination.total === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-14 text-center text-sm text-[#B0B0B0]"
                >
                  {rows.length === 0
                    ? "No submissions have been recorded for this journal."
                    : "No submissions match the current filters."}
                </td>
              </tr>
            ) : null}
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

export function JournalDetailTabs({
  submissions,
  accounts,
  reviews,
  journalOption,
  publisherOptions,
  submissionCount,
  accountCount,
  reviewCount,
  showManagementTabs,
  linkSubmissions,
  canAddAccount,
}: {
  submissions: JournalSubmissionRow[];
  accounts: JournalAccountRow[];
  reviews: JournalReviewRow[];
  journalOption: AccountJournalOption;
  publisherOptions: PublisherPickerItem[];
  submissionCount: number;
  accountCount: number;
  reviewCount: number;
  showManagementTabs: boolean;
  linkSubmissions: boolean;
  canAddAccount: boolean;
}) {
  const [activeTab, setActiveTab] = usePersistentTableValue<TabKey>(
    "journal-detail:tab",
    "submissions",
  );
  const [query, setQuery] = usePersistentTableValue("journal-detail:q", "");
  const [status, setStatus] = usePersistentTableValue(
    "journal-detail:status",
    "ALL",
  );

  const statusOptions = useMemo(() => {
    const rows =
      activeTab === "submissions"
        ? submissions
        : activeTab === "reviews"
          ? reviews
          : [];
    return [
      "ALL",
      ...Array.from(
        new Set(rows.map((row) => row.status).filter(Boolean)),
      ).sort(),
    ];
  }, [activeTab, reviews, submissions]);

  const filteredAccounts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accounts.filter((row) => {
      const haystack = [row.username, row.password, row.email, row.note]
        .join(" ")
        .toLowerCase();
      return !needle || haystack.includes(needle);
    });
  }, [accounts, query]);

  const filteredReviews = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reviews.filter((row) => {
      const matchesStatus = status === "ALL" || row.status === status;
      const haystack = [
        row.manuscriptTitle,
        row.manuscriptId,
        row.status,
        row.recommendation,
        row.editorName,
        row.reviewRound,
        row.note,
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [query, reviews, status]);
  const accountPagination = useTablePagination(
    filteredAccounts,
    10,
    1,
    "journal-detail-accounts",
  );
  const reviewPagination = useTablePagination(
    filteredReviews,
    10,
    1,
    "journal-detail-reviews",
  );

  function updateTab(value: TabKey) {
    setActiveTab(value);
    setStatus("ALL");
    setQuery("");
    accountPagination.setPage(1);
    reviewPagination.setPage(1);
  }

  function updateQuery(value: string) {
    setQuery(value);
    accountPagination.setPage(1);
    reviewPagination.setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value);
    reviewPagination.setPage(1);
  }

  const tabs = [
    {
      key: "submissions" as const,
      label: "Submissions",
      value: submissionCount,
      icon: Send,
    },
    {
      key: "accounts" as const,
      label: "Accounts",
      value: accountCount,
      icon: KeyRound,
    },
    {
      key: "reviews" as const,
      label: "Reviews",
      value: reviewCount,
      icon: ClipboardCheck,
    },
  ];

  if (!showManagementTabs) {
    return (
      <section className="space-y-3 border-t border-[#D8D0C2] pt-5 dark:border-[#444444]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
            <Send className="research-task-icon-motion h-5 w-5 text-[#A8DADC]" />
            Submissions
          </h2>
          <span className="text-xs font-normal text-[#777777]">
            {submissions.length}
          </span>
        </div>
        <JournalSubmissionsTable rows={submissions} linkSubmissions={false} />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="journal-detail-tabs grid w-full grid-cols-3 border border-[#444444] bg-[#242424] p-1 text-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-active={activeTab === tab.key}
            aria-pressed={activeTab === tab.key}
            onClick={() => updateTab(tab.key)}
            className="journal-detail-tab-button cursor-pointer rounded-none px-4 py-3 text-left"
          >
            <span className="relative z-10 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-normal uppercase tracking-wide">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
              <span className="text-base font-normal">{tab.value}</span>
            </span>
          </button>
        ))}
      </div>

      {activeTab === "submissions" && (
        <JournalSubmissionsTable
          rows={submissions}
          linkSubmissions={linkSubmissions}
        />
      )}

      {activeTab !== "submissions" && (
        <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
          <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <TableSearchInput
              value={query}
              onChange={updateQuery}
              placeholder={`Search ${activeTab}...`}
            />
            {activeTab === "accounts" ? (
              canAddAccount ? (
                <div className="flex flex-none justify-end">
                  <NewAccountDialog
                    journals={[journalOption]}
                    publishers={publisherOptions}
                    initialJournal={journalOption}
                    triggerLabel="Add Account"
                  />
                </div>
              ) : null
            ) : (
              <FilterSelect
                value={status}
                onChange={updateStatus}
                ariaLabel="Filter by status"
                options={statusOptions.map((item) => ({
                  value: item,
                  label: item === "ALL" ? "All status" : item.replace("_", " "),
                }))}
              />
            )}
          </div>

          {activeTab === "accounts" && (
            <>
              <div className="overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
                    <tr>
                      <th className="w-[30%] px-4 py-3">
                        <IconHint label="Account login ID">
                          <KeyRound className="h-4 w-4" aria-hidden="true" />
                        </IconHint>
                      </th>
                      <th className="w-[18%] px-3 py-3">
                        <IconHint label="Password">
                          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                        </IconHint>
                      </th>
                      <th className="w-[22%] px-3 py-3">
                        <IconHint label="Email">
                          <AtSign className="h-4 w-4" aria-hidden="true" />
                        </IconHint>
                      </th>
                      <th className="w-[8%] px-2 py-3 text-center">
                        <IconHint label="Submissions">
                          <Send className="h-4 w-4" aria-hidden="true" />
                        </IconHint>
                      </th>
                      <th className="w-[22%] px-3 py-3">
                        <IconHint label="Note">
                          <StickyNote className="h-4 w-4" aria-hidden="true" />
                        </IconHint>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#444444]">
                    {accountPagination.pagedRows.map((account) => (
                      <tr
                        key={account.id}
                        className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                      >
                        <td className="px-4 py-3 text-sm font-normal text-[#E4E4E4]">
                          <Link
                            href={`/accounts/${account.id}`}
                            className={`${journalDetailPlainLinkClass} text-[#1F7180] hover:text-[#155864] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]`}
                          >
                            {account.username}
                          </Link>
                          <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {account.id.slice(0, 8)}
                          </p>
                        </td>
                        <td className="px-3 py-3 font-mono text-sm text-[#B0B0B0]">
                          <span className="block truncate">
                            {account.password || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                          <span className="block truncate">
                            {account.email || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center text-sm font-semibold text-[#B0B0B0]">
                          {account.submissions}
                        </td>
                        <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                          <span className="line-clamp-2">
                            {account.note || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {accountPagination.total === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-14 text-center text-sm text-[#B0B0B0]"
                        >
                          No accounts match the current search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={accountPagination.page}
                pageCount={accountPagination.pageCount}
                total={accountPagination.total}
                pageSize={accountPagination.pageSize}
                onPageChange={accountPagination.setPage}
              />
            </>
          )}

          {activeTab === "reviews" && (
            <>
              <div className="overflow-hidden">
                <table className="w-full table-fixed text-left">
                  <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
                    <tr>
                      <th className="w-[34%] px-4 py-3">Manuscript</th>
                      <th className="w-[13%] px-3 py-3">Status</th>
                      <th className="w-[10%] px-3 py-3">
                        <IconHint label="Due date">
                          <CalendarClock
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </IconHint>
                      </th>
                      <th className="w-[15%] px-3 py-3">Recommendation</th>
                      <th className="w-[12%] px-3 py-3">Editor</th>
                      <th className="w-[16%] px-3 py-3">
                        <IconHint label="Note">
                          <StickyNote className="h-4 w-4" aria-hidden="true" />
                        </IconHint>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#444444]">
                    {reviewPagination.pagedRows.map((review) => (
                      <tr
                        key={review.id}
                        className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                      >
                        <td className="px-4 py-3">
                          <p className="line-clamp-2 text-sm font-normal text-[#E4E4E4]">
                            {review.manuscriptTitle}
                          </p>
                          <p className="mt-1 text-xs text-[#B0B0B0]">
                            {review.manuscriptId ||
                              review.reviewRound ||
                              "No tracking code"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`border px-2 py-1 text-xs font-normal ${statusClass(review.status)}`}
                          >
                            {review.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                          {review.dueDate || "-"}
                        </td>
                        <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                          <span className="line-clamp-2">
                            {review.recommendation || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                          <span className="block truncate">
                            {review.editorName || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                          <span className="line-clamp-2">
                            {review.note || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {reviewPagination.total === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-14 text-center text-sm text-[#B0B0B0]"
                        >
                          No reviews match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={reviewPagination.page}
                pageCount={reviewPagination.pageCount}
                total={reviewPagination.total}
                pageSize={reviewPagination.pageSize}
                onPageChange={reviewPagination.setPage}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}
