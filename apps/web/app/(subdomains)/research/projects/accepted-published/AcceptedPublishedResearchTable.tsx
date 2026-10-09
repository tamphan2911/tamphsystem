"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, Download, ExternalLink } from "lucide-react";
import {
  FilterSelect,
  MultiFilterSelect,
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
  issn: string;
  venueTypeLabel: "Journal" | "Conference";
  journalType: "INTERNATIONAL" | "LOCAL" | "CONFERENCE";
  journalTypeLabel: string;
  publisher: string;
  rank: string;
  authors: string;
  role: string;
  status: "ACCEPTED" | "PUBLISHED";
  dateLabel: string;
  dateValue: string;
  dateMs: number;
  fullCitation: string;
  articleDownloadHref: string;
  articleUrl: string;
  isRankedScopusJournal: boolean;
};

type SortDirection = "asc" | "desc";
type JournalTypeFilter = "ALL" | "INTERNATIONAL" | "LOCAL";
const internationalRankOptions = ["Q1", "Q2", "Q3", "Q4"];
const noRankLabel = "No rank";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function xlsxRows(rows: AcceptedPublishedResearchRow[]) {
  return [
    [
      "No.",
      "Title",
      "Journal",
      "ISSN / ISBN",
      "Venue type",
      "Publisher",
      "Journal type",
      "Rank",
      "Article",
      "Paper link",
      "Authors",
      "Role",
      "Published date / accepted date",
      "Full citation",
      "Status",
    ],
    ...rows.map((row, index) => [
      index + 1,
      row.title,
      row.venue,
      row.issn,
      row.venueTypeLabel,
      row.publisher,
      row.journalTypeLabel,
      row.rank,
      [row.articleDownloadHref ? "File" : "", row.articleUrl ? "Link" : ""]
        .filter(Boolean)
        .join(" / "),
      row.articleUrl,
      row.authors,
      row.role,
      row.dateLabel,
      row.fullCitation,
      row.status === "PUBLISHED" ? "Published" : "Accepted",
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
  const [journalType, setJournalType] = useState<JournalTypeFilter>("ALL");
  const [selectedRanks, setSelectedRanks] = useState<string[]>([]);
  const [dateSort, setDateSort] = useState<SortDirection>("desc");
  const tableTopRef = useRef<HTMLDivElement | null>(null);
  const [tableViewportWidth, setTableViewportWidth] = useState<number | null>(
    null,
  );

  const localRankOptions = useMemo(() => {
    const ranks = Array.from(
      new Set(
        rows
          .filter((row) => row.journalType === "LOCAL")
          .map((row) => row.rank.trim() || noRankLabel),
      ),
    ).sort((left, right) => left.localeCompare(right));
    return ranks.length > 0 ? ranks : [noRankLabel];
  }, [rows]);

  const otherInternationalRankOptions = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .filter((row) => row.journalType === "INTERNATIONAL")
          .map((row) => row.rank.trim() || noRankLabel)
          .filter(
            (rank) =>
              !internationalRankOptions.includes(rank) && rank !== noRankLabel,
          ),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [rows]);

  const rankOptions =
    journalType === "LOCAL"
      ? localRankOptions
      : journalType === "INTERNATIONAL"
        ? [
            ...internationalRankOptions,
            noRankLabel,
            ...otherInternationalRankOptions,
          ]
        : Array.from(
            new Set([
              ...internationalRankOptions,
              noRankLabel,
              ...otherInternationalRankOptions,
              ...localRankOptions,
            ]),
          );
  const rankFilterOptions = [
    { value: "ALL", label: "All ranks" },
    ...rankOptions.map((rank) => ({ value: rank, label: rank })),
  ];

  function changeJournalType(nextType: JournalTypeFilter) {
    setJournalType(nextType);
    setSelectedRanks([]);
  }

  const filteredRows = useMemo(() => {
    const needle = normalize(query);
    return rows
      .filter((row) => includeAccepted || row.status === "PUBLISHED")
      .filter((row) => includeConferences || row.venueKind === "journal")
      .filter((row) => {
        if (row.venueKind === "conference") return includeConferences;
        const typeMatches =
          journalType === "ALL" || row.journalType === journalType;
        const rankMatches =
          selectedRanks.length === 0 || selectedRanks.includes(row.rank);
        return typeMatches && rankMatches;
      })
      .filter((row) => {
        if (!needle) return true;
        return [
          row.title,
          row.venue,
          row.issn,
          row.venueTypeLabel,
          row.publisher,
          row.journalTypeLabel,
          row.rank,
          row.authors,
          row.role,
          row.status,
          row.dateLabel,
          row.articleUrl,
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
    includeConferences,
    journalType,
    query,
    rows,
    selectedRanks,
  ]);

  const pagination = useTablePagination(
    filteredRows,
    10,
    1,
    "accepted-published-research",
  );

  useEffect(() => {
    function updateTableViewportWidth() {
      const element = tableTopRef.current;
      const main = element?.closest("main");
      if (!main) return;
      const style = window.getComputedStyle(main);
      const horizontalPadding =
        Number.parseFloat(style.paddingLeft || "0") +
        Number.parseFloat(style.paddingRight || "0");
      const nextWidth = Math.max(
        320,
        Math.floor(main.clientWidth - horizontalPadding),
      );
      setTableViewportWidth(nextWidth);
    }

    updateTableViewportWidth();
    const resizeObserver = new ResizeObserver(updateTableViewportWidth);
    const main = tableTopRef.current?.closest("main");
    if (main) resizeObserver.observe(main);
    window.addEventListener("resize", updateTableViewportWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateTableViewportWidth);
    };
  }, []);

  const tableViewportStyle: CSSProperties | undefined = tableViewportWidth
    ? {
        maxWidth: `${tableViewportWidth}px`,
        width: `${tableViewportWidth}px`,
      }
    : undefined;

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
            className="research-new-button research-report-link-button research-allow-transform inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-none border border-[#B39CD0] bg-[#B39CD0] text-[#2C2C2C] shadow-sm outline-none transition duration-150 ease-out hover:border-[#C8B6E2] hover:bg-[#C8B6E2] hover:shadow-md focus:ring-2 focus:ring-[#B39CD0]/30 active:translate-y-0"
            aria-label="Download current report view as Excel"
            title="Download current view as Excel"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </ResearchPageHeaderPortal>

      <div className="w-full min-w-0 max-w-full space-y-4">
        <div className="border border-[#D8D0C2] bg-[#F8F6EF] p-3 dark:border-[#333333] dark:bg-[#242424]">
          <div className="flex flex-col gap-3">
            <TableSearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search title, journal, ISSN, ISBN, publisher, rank, author, citation..."
            />
            <div className="flex flex-wrap items-center gap-2">
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
              <FilterSelect
                value={journalType}
                onChange={(value) =>
                  changeJournalType(value as JournalTypeFilter)
                }
                options={[
                  { value: "ALL", label: "All type" },
                  { value: "INTERNATIONAL", label: "International" },
                  { value: "LOCAL", label: "Local" },
                ]}
                ariaLabel="Filter journal type"
              />
              <MultiFilterSelect
                values={selectedRanks}
                onChange={setSelectedRanks}
                options={rankFilterOptions}
                ariaLabel="Filter rank"
              />
            </div>
          </div>
        </div>

        <div
          ref={tableTopRef}
          style={tableViewportStyle}
          className="research-report-table-shell scroll-mt-28 min-w-0 overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] dark:border-[#333333] dark:bg-[#242424]"
        >
          {filteredRows.length === 0 ? (
            <ResearchEmptyState
              title="No matching research"
              detail="Adjust the search text or filters to see accepted and published research."
            />
          ) : (
            <>
              <div
                style={tableViewportStyle}
                className="research-report-table-scroll w-full max-w-full overflow-x-auto overflow-y-visible pb-2 [scrollbar-gutter:stable]"
              >
                <table className="min-w-[202rem] table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-16" />
                    <col className="w-[22rem]" />
                    <col className="w-[20rem]" />
                    <col className="w-[10rem]" />
                    <col className="w-[10rem]" />
                    <col className="w-[14rem]" />
                    <col className="w-[10rem]" />
                    <col className="w-[7rem]" />
                    <col className="w-[8rem]" />
                    <col className="w-[22rem]" />
                    <col className="w-[18rem]" />
                    <col className="w-[10rem]" />
                    <col className="w-[13rem]" />
                    <col className="w-[24rem]" />
                    <col className="w-[10rem]" />
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
                      <th className="px-3 py-3 font-normal">ISSN / ISBN</th>
                      <th className="px-3 py-3 font-normal">Venue type</th>
                      <th className="px-3 py-3 font-normal">Publisher</th>
                      <th className="px-3 py-3 font-normal">Journal type</th>
                      <th className="px-3 py-3 font-normal">Rank</th>
                      <th className="px-3 py-3 font-normal">Article</th>
                      <th className="px-3 py-3 font-normal">Paper link</th>
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
                      <th className="px-3 py-3 font-normal">Status</th>
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
                            {row.issn || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words text-[#5B6D87] dark:text-[#B0B0B0]">
                            {row.venueTypeLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words">
                            {row.publisher}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words text-[#5B6D87] dark:text-[#B0B0B0]">
                            {row.journalTypeLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-words">
                            {row.rank}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-2">
                            {row.articleDownloadHref ? (
                              <IconHint
                                label="Download published article file"
                                position="bottom"
                              >
                                <a
                                  href={row.articleDownloadHref}
                                  className="research-allow-transform research-download-button"
                                  aria-label="Download published article file"
                                >
                                  <Download
                                    className="svgIcon h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  <span className="icon2" aria-hidden="true" />
                                </a>
                              </IconHint>
                            ) : null}
                            {row.articleUrl ? (
                              <IconHint
                                label="Open published article link"
                                position="bottom"
                              >
                                <a
                                  href={row.articleUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="research-allow-transform research-title-icon-button"
                                  aria-label="Open published article link"
                                >
                                  <ExternalLink
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </a>
                              </IconHint>
                            ) : null}
                            {!row.articleDownloadHref && !row.articleUrl ? (
                              <span className="text-xs text-[#98A2B3] dark:text-[#777777]">
                                -
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="line-clamp-2 break-all text-[#5B6D87] dark:text-[#B0B0B0]">
                            {row.articleUrl || "-"}
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
                        <td className="px-3 py-3 align-top">
                          <span
                            className={`line-clamp-2 break-words ${
                              row.status === "PUBLISHED"
                                ? "text-sky-700 dark:text-sky-300"
                                : "text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {row.status === "PUBLISHED"
                              ? "Published"
                              : "Accepted"}
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
