"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, History } from "lucide-react";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

export type ResearchChangeLogRow = {
  id: string;
  changedAt: string;
  area: string;
  action: string;
  actor: string;
  detail: string;
};

type SortKey = "changedAt" | "area" | "action" | "actor";
type SortDirection = "asc" | "desc";

const dateFormatter = researchDateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function sortValue(row: ResearchChangeLogRow, key: SortKey) {
  if (key === "changedAt") return new Date(row.changedAt).getTime();
  return (row[key] ?? "").toLowerCase();
}

function displayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

function SortButton({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`research-allow-transform inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-left shadow-none outline-none transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 ${
        active
          ? "text-[#1F7180] dark:text-[#A8DADC]"
          : "text-[#667085] hover:text-[#243047] dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]"
      }`}
    >
      <span>{label}</span>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

export function ResearchChangeLogTable({
  rows,
}: {
  rows: ResearchChangeLogRow[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("changedAt");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      const leftValue = sortValue(left, sortKey);
      const rightValue = sortValue(right, sortKey);
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return direction === "asc"
          ? leftValue - rightValue
          : rightValue - leftValue;
      }
      const result = String(leftValue).localeCompare(
        String(rightValue),
        undefined,
        {
          sensitivity: "base",
        },
      );
      return direction === "asc" ? result : -result;
    });
  }, [direction, rows, sortKey]);

  function updateSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setDirection(nextKey === "changedAt" ? "desc" : "asc");
  }

  return (
    <section className="border-t border-[#D8D0C2] pt-5 dark:border-[#444444]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
          <History className="h-4 w-4 text-[#1F7180] dark:text-[#A8DADC]" />
          Change log
        </h2>
        <p className="text-xs text-[#667085] dark:text-[#8F98A8]">
          {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </p>
      </div>
      <div className="overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] dark:border-[#444444] dark:bg-[#2C2C2C]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] table-fixed text-left">
            <thead className="border-b border-[#D8D0C2] bg-[#F7F3EA] text-xs uppercase tracking-wide dark:border-[#444444] dark:bg-[#383838]">
              <tr>
                <th className="w-[11rem] px-4 py-3">
                  <SortButton
                    label="Updated"
                    sortKey="changedAt"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={updateSort}
                  />
                </th>
                <th className="w-[10rem] px-3 py-3">
                  <SortButton
                    label="Area"
                    sortKey="area"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={updateSort}
                  />
                </th>
                <th className="w-[10rem] px-3 py-3">
                  <SortButton
                    label="Action"
                    sortKey="action"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={updateSort}
                  />
                </th>
                <th className="w-[11rem] px-3 py-3">
                  <SortButton
                    label="Actor"
                    sortKey="actor"
                    activeKey={sortKey}
                    direction={direction}
                    onSort={updateSort}
                  />
                </th>
                <th className="px-3 py-3 text-[#667085] dark:text-[#B0B0B0]">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D9CC] dark:divide-[#444444]">
              {sortedRows.length > 0 ? (
                sortedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="align-top transition-colors duration-150 hover:bg-[#F7F3EA] dark:hover:bg-[#383838]"
                  >
                    <td className="px-4 py-3 text-xs text-[#667085] dark:text-[#B0B0B0]">
                      {displayDate(row.changedAt)}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#243047] dark:text-[#E4E4E4]">
                      {row.area}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#1F7180] dark:text-[#A8DADC]">
                      {row.action}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#667085] dark:text-[#B0B0B0]">
                      {row.actor || "-"}
                    </td>
                    <td className="whitespace-pre-wrap break-words px-3 py-3 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                      {row.detail || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-[#667085] dark:text-[#B0B0B0]"
                  >
                    No tracked changes for this entry yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
