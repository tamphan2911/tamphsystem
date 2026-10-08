"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { ArrowDownUp, Download } from "lucide-react";
import {
  ResearchSortHeaderButton,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { downloadXlsx } from "@/sites/research/lib/xlsx";

export type AcceptedPublishedResearchRow = {
  id: string;
  projectId: string;
  title: string;
  venue: string;
  venueKind: "journal" | "conference";
  publisher: string;
  rank: string;
  authors: string;
  role: string;
  status: "ACCEPTED" | "PUBLISHED";
  dateLabel: string;
  dateValue: string;
  dateMs: number;
  fullCitation: string;
  isRankedScopusJournal: boolean;
};

type SortDirection = "asc" | "desc";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function xlsxRows(rows: AcceptedPublishedResearchRow[]) {
  return [
    [
      "No.",
      "Title",
      "Journal",
      "Publisher",
      "Rank",
      "Authors",
      "Role",
      "Published date / accepted date",
      "Full citation",
    ],
    ...rows.map((row, index) => [
      index + 1,
      row.title,
      row.venue,
      row.publisher,
      row.rank,
      row.authors,
      row.role,
      row.dateLabel,
      row.fullCitation,
    ]),
  ];
}

function CheckboxFilter({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:hover:border-[#5A5A5A] dark:hover:bg-[#383838]">
      <span
        className={`inline-flex h-4 w-4 flex-none items-center justify-center border transition ${
          checked
            ? "border-[#1F7180] bg-[#1F7180] dark:border-[#A8DADC] dark:bg-[#A8DADC]"
            : "border-slate-300 bg-white dark:border-[#666666] dark:bg-[#202020]"
        }`}
        aria-hidden="true"
      >
        {checked ? (
          <span className="h-1.5 w-1.5 bg-white dark:bg-[#202020]" />
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <IconHint label={hint} position="bottom">
        <span>{label}</span>
      </IconHint>
    </label>
  );
}

function StickyCell({
  children,
  className = "",
  as = "td",
}: {
  children: ReactNode;
  className?: string;
  as?: "td" | "th";
}) {
  const Component = as;
  return (
    <Component
      className={`sticky z-10 border-r border-[#D8D0C2] bg-[#FFFDF8] align-top dark:border-[#333333] dark:bg-[#242424] ${className}`}
    >
      {children}
    </Component>
  );
}

export function AcceptedPublishedResearchTable({
  rows,
}: {
  rows: AcceptedPublishedResearchRow[];
}) {
  const [query, setQuery] = useState("");
  const [includeAccepted, setIncludeAccepted] = useState(false);
  const [includeConferences, setIncludeConferences] = useState(false);
  const [includeAllRanks, setIncludeAllRanks] = useState(false);
  const [dateSort, setDateSort] = useState<SortDirection>("desc");
  const tableTopRef = useRef<HTMLDivElement | null>(null);

  const filteredRows = useMemo(() => {
    const needle = normalize(query);
    return rows
      .filter((row) => includeAccepted || row.status === "PUBLISHED")
      .filter((row) => includeConferences || row.venueKind === "journal")
      .filter((row) => includeAllRanks || row.isRankedScopusJournal)
      .filter((row) => {
        if (!needle) return true;
        return [
          row.title,
          row.venue,
          row.publisher,
          row.rank,
          row.authors,
          row.role,
          row.dateLabel,
          row.fullCitation,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((left, right) =>
        dateSort === "desc"
          ? right.dateMs - left.dateMs
          : left.dateMs - right.dateMs,
      );
  }, [
    dateSort,
    includeAccepted,
    includeAllRanks,
    includeConferences,
    query,
    rows,
  ]);

  const pagination = useTablePagination(
    filteredRows,
    20,
    1,
    "accepted-published-research",
  );

  function downloadCurrentView() {
    downloadXlsx({
      rows: xlsxRows(filteredRows),
      sheetName: "Accepted Published",
      filename: `accepted-published-research-${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
  }

  function changePage(nextPage: number) {
    pagination.setPage(nextPage);
    window.requestAnimationFrame(() => {
      tableTopRef.current?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-3">
            <div className="whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4]">
              <span className="font-normal text-[#B0B0B0]">Rows: </span>
              <span>{filteredRows.length}</span>
            </div>
            <div className="border-l border-[#444444] px-3 py-2 text-sm text-[#E4E4E4]">
              <span className="font-normal text-[#B0B0B0]">Published: </span>
              <span>
                {
                  filteredRows.filter((row) => row.status === "PUBLISHED")
                    .length
                }
              </span>
            </div>
            <div className="border-l border-[#444444] px-3 py-2 text-sm text-[#E4E4E4]">
              <span className="font-normal text-[#B0B0B0]">Accepted: </span>
              <span>
                {filteredRows.filter((row) => row.status === "ACCEPTED").length}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadCurrentView}
            className="research-new-button research-allow-transform inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-none border border-[#B39CD0] bg-[#B39CD0] text-[#2C2C2C] shadow-sm outline-none transition duration-150 ease-out hover:border-[#C8B6E2] hover:bg-[#C8B6E2] hover:shadow-md focus:ring-2 focus:ring-[#B39CD0]/30 active:translate-y-0 active:scale-95"
            aria-label="Download current report view as Excel"
            title="Download current view as Excel"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </ResearchPageHeaderPortal>

      <div className="w-full max-w-none space-y-4">
        <div className="border border-[#D8D0C2] bg-[#F8F6EF] p-3 dark:border-[#333333] dark:bg-[#242424]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <TableSearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search title, journal, publisher, rank, author, citation..."
            />
            <div className="flex flex-wrap gap-2">
              <CheckboxFilter
                checked={includeAccepted}
                onChange={setIncludeAccepted}
                label="Include accepted"
                hint="Unchecked shows published research only. Checked also includes accepted research."
              />
              <CheckboxFilter
                checked={includeConferences}
                onChange={setIncludeConferences}
                label="Include conferences"
                hint="Unchecked shows journal results only. Checked also includes conference results."
              />
              <CheckboxFilter
                checked={includeAllRanks}
                onChange={setIncludeAllRanks}
                label="All ranks"
                hint="Unchecked shows only ranked Scopus journals. Checked includes all ranks and conferences."
              />
            </div>
          </div>
        </div>

        <div
          ref={tableTopRef}
          className="scroll-mt-28 overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] dark:border-[#333333] dark:bg-[#242424]"
        >
          {filteredRows.length === 0 ? (
            <ResearchEmptyState
              title="No matching research"
              detail="Adjust the search text or filters to see accepted and published research."
            />
          ) : (
            <>
              <div className="research-report-table-scroll w-full max-w-full overflow-x-scroll overflow-y-visible pb-2 [scrollbar-gutter:stable]">
                <table className="min-w-[128rem] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-16" />
                    <col className="w-[22rem]" />
                    <col className="w-[18rem]" />
                    <col className="w-[14rem]" />
                    <col className="w-[7rem]" />
                    <col className="w-[18rem]" />
                    <col className="w-[10rem]" />
                    <col className="w-[13rem]" />
                    <col className="w-[24rem]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#D8D0C2] text-xs uppercase tracking-wide text-[#667085] dark:border-[#333333] dark:text-[#B0B0B0]">
                      <StickyCell
                        as="th"
                        className="left-0 z-30 px-3 py-3 font-normal"
                      >
                        No.
                      </StickyCell>
                      <StickyCell
                        as="th"
                        className="left-16 z-30 px-3 py-3 font-normal"
                      >
                        Title
                      </StickyCell>
                      <StickyCell
                        as="th"
                        className="left-[26rem] z-30 px-3 py-3 font-normal"
                      >
                        Journal
                      </StickyCell>
                      <th className="px-3 py-3 font-normal">Publisher</th>
                      <th className="px-3 py-3 font-normal">Rank</th>
                      <th className="px-3 py-3 font-normal">Authors</th>
                      <th className="px-3 py-3 font-normal">Role</th>
                      <th className="px-3 py-3 font-normal">
                        <span className="inline-flex items-center gap-1.5">
                          Published / accepted
                          <ResearchSortHeaderButton
                            column="date"
                            activeColumn="date"
                            direction={dateSort}
                            onChange={() =>
                              setDateSort((current) =>
                                current === "desc" ? "asc" : "desc",
                              )
                            }
                            hint="Sort by published or accepted date"
                          />
                        </span>
                      </th>
                      <th className="px-3 py-3 font-normal">Full citation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.pagedRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#E4DED1] text-[#253047] transition hover:bg-[#F2EEE6] dark:border-[#333333] dark:text-[#E4E4E4] dark:hover:bg-[#2C2C2C]"
                      >
                        <StickyCell className="left-0 px-3 py-3">
                          {index +
                            1 +
                            (pagination.page - 1) * pagination.pageSize}
                        </StickyCell>
                        <StickyCell className="left-16 px-3 py-3">
                          <Link
                            href={`/projects/${row.projectId}`}
                            className="line-clamp-2 break-words border-0 bg-transparent text-[#1F7180] shadow-none transition hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
                          >
                            {row.title}
                          </Link>
                        </StickyCell>
                        <StickyCell className="left-[26rem] px-3 py-3">
                          <span className="line-clamp-2 break-words">
                            {row.venue}
                          </span>
                        </StickyCell>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words">
                            {row.publisher}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words">
                            {row.rank}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words">
                            {row.authors}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words text-[#5B6D87] dark:text-[#B0B0B0]">
                            {row.role}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span
                            className={`line-clamp-2 break-words ${
                              row.status === "PUBLISHED"
                                ? "text-sky-700 dark:text-sky-300"
                                : "text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {row.dateLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words">
                            {row.fullCitation}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={pagination.page}
                pageCount={pagination.pageCount}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onPageChange={changePage}
              />
            </>
          )}
        </div>

        <p className="flex items-center gap-2 text-xs text-[#667085] dark:text-[#8F8F8F]">
          <ArrowDownUp className="h-3.5 w-3.5" />
          The first three columns are locked while the table scrolls
          horizontally.
        </p>
      </div>
    </>
  );
}
