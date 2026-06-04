"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AtSign,
  CalendarClock,
  ClipboardCheck,
  KeyRound,
  LockKeyhole,
  Send,
  StickyNote,
} from "lucide-react";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import {
  SubmissionsTable,
  type SubmissionRow,
} from "../../projects/[id]/SubmissionsTable";

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

function statusClass(status: string) {
  if (status === "ACCEPTED" || status === "SUBMITTED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (status === "REVISION" || status === "IN_PROGRESS")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (status === "REJECTED" || status === "WITHDRAWN" || status === "DECLINED")
    return "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

export function JournalDetailTabs({
  submissions,
  accounts,
  reviews,
}: {
  submissions: JournalSubmissionRow[];
  accounts: JournalAccountRow[];
  reviews: JournalReviewRow[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("submissions");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

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
  const accountPagination = useTablePagination(filteredAccounts, 10);
  const reviewPagination = useTablePagination(filteredReviews, 10);

  const tabs = [
    {
      key: "submissions" as const,
      label: "Submissions",
      value: submissions.length,
      icon: Send,
    },
    {
      key: "accounts" as const,
      label: "Accounts",
      value: accounts.length,
      icon: KeyRound,
    },
    {
      key: "reviews" as const,
      label: "Reviews",
      value: reviews.length,
      icon: ClipboardCheck,
    },
  ];

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setStatus("ALL");
              setQuery("");
            }}
            className={`cursor-pointer rounded-lg border px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
              activeTab === tab.key
                ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
              <span className="text-base font-black">{tab.value}</span>
            </span>
          </button>
        ))}
      </div>

      {activeTab === "submissions" && (
        <SubmissionsTable rows={submissions} isAdmin={false} view="research" />
      )}

      {activeTab !== "submissions" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <TableSearchInput
              value={query}
              onChange={setQuery}
              placeholder={`Search ${activeTab}...`}
            />
            {activeTab !== "accounts" && (
              <FilterSelect
                value={status}
                onChange={setStatus}
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
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
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
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {accountPagination.pagedRows.map((account) => (
                      <tr
                        key={account.id}
                        className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 text-sm font-normal text-slate-700 dark:text-slate-200">
                          <Link
                            href={`/accounts/${account.id}`}
                            className="font-semibold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300"
                          >
                            {account.username}
                          </Link>
                          <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {account.id.slice(0, 8)}
                          </p>
                        </td>
                        <td className="px-3 py-3 font-mono text-sm text-slate-600 dark:text-slate-300">
                          <span className="block truncate">
                            {account.password || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                          <span className="block truncate">
                            {account.email || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {account.submissions}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
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
                          className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
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
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
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
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reviewPagination.pagedRows.map((review) => (
                      <tr
                        key={review.id}
                        className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3">
                          <p className="line-clamp-2 text-sm font-normal text-slate-700 dark:text-slate-200">
                            {review.manuscriptTitle}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {review.manuscriptId ||
                              review.reviewRound ||
                              "No tracking code"}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${statusClass(review.status)}`}
                          >
                            {review.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                          {review.dueDate || "-"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                          <span className="line-clamp-2">
                            {review.recommendation || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                          <span className="block truncate">
                            {review.editorName || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
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
                          className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
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
