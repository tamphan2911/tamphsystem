"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Download } from "lucide-react";
import {
  researchStartOfDay,
  researchStartOfMonth,
  researchWeekday,
} from "@/sites/research/lib/date-time";
import {
  ResearchSortHeaderButton,
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { AssistantsTable, type AssistantRow } from "./AssistantsTable";

type AssistantTab = "assistants" | "performance" | "checker";
type PerformancePeriod =
  | "all"
  | "currentWeek"
  | "lastWeek"
  | "currentMonth"
  | "lastMonth";

export type AssistantPerformanceTask = {
  id: string;
  status: string;
  taskType: string;
  category: string;
  dueDate: string | null;
  completedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssistantPerformanceRow = {
  id: string;
  name: string;
  email: string;
  assistantRole: string;
  canManageResearchVenues: boolean;
  tasks: AssistantPerformanceTask[];
  associatedResearchTotal: number;
  associatedResearchAcceptedOrPublished: number;
};

type AssistantPerformanceStats = {
  row: AssistantPerformanceRow;
  assigned: number;
  active: number;
  completed: number;
  overdue: number;
  revoked: number;
  completionRate: number;
  acceptanceRate: number;
};
type AssistantPerformanceSortKey =
  | "assistant"
  | "role"
  | "assigned"
  | "active"
  | "completed"
  | "overdue"
  | "revoked"
  | "completion"
  | "acceptance";
type AssistantPerformanceSortDirection = "asc" | "desc";
type AssistantPerformanceSort = {
  key: AssistantPerformanceSortKey;
  direction: AssistantPerformanceSortDirection;
};

const assistantPerformanceSortKeys: AssistantPerformanceSortKey[] = [
  "assistant",
  "role",
  "assigned",
  "active",
  "completed",
  "overdue",
  "revoked",
  "completion",
  "acceptance",
];
const assistantPerformanceSortLabels: Record<
  AssistantPerformanceSortKey,
  string
> = {
  assistant: "Assistant",
  role: "Role",
  assigned: "Assigned",
  active: "Active",
  completed: "Completed",
  overdue: "Overdue",
  revoked: "Revoked",
  completion: "Completion",
  acceptance: "Acceptance",
};

function periodLabel(period: PerformancePeriod) {
  if (period === "currentWeek") return "This week";
  if (period === "lastWeek") return "Last week";
  if (period === "currentMonth") return "This month";
  if (period === "lastMonth") return "Last month";
  return "All time";
}

function periodStart(period: PerformancePeriod) {
  const currentDay = researchWeekday();
  const weekOffset = currentDay === 0 ? 6 : currentDay - 1;
  const startOfCurrentWeek = researchStartOfDay(new Date(), -weekOffset);

  if (period === "currentWeek") return startOfCurrentWeek;
  if (period === "lastWeek")
    return researchStartOfDay(new Date(), -weekOffset - 7);
  if (period === "currentMonth") return researchStartOfMonth();
  if (period === "lastMonth") return researchStartOfMonth(new Date(), -1);
  return null;
}

function periodEnd(period: PerformancePeriod) {
  const currentDay = researchWeekday();
  const weekOffset = currentDay === 0 ? 6 : currentDay - 1;
  const startOfCurrentWeek = researchStartOfDay(new Date(), -weekOffset);

  if (period === "lastWeek") return startOfCurrentWeek;
  if (period === "currentWeek")
    return researchStartOfDay(new Date(), 7 - weekOffset);
  if (period === "lastMonth") return researchStartOfMonth();
  if (period === "currentMonth") return researchStartOfMonth(new Date(), 1);
  return null;
}

function isClosedTask(task: AssistantPerformanceTask) {
  return task.status === "COMPLETED" || task.status === "REVOKED";
}

function isOverdueTask(task: AssistantPerformanceTask) {
  if (!task.dueDate || isClosedTask(task)) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

function taskPeriodDate(task: AssistantPerformanceTask) {
  return new Date(task.completedAt ?? task.revokedAt ?? task.updatedAt);
}

function isTaskInPeriod(
  task: AssistantPerformanceTask,
  period: PerformancePeriod,
) {
  const start = periodStart(period);
  const end = periodEnd(period);
  if (!start) return true;
  const date = taskPeriodDate(task);
  if (date < start) return false;
  if (end && date >= end) return false;
  return true;
}

function roleLabel(role: string) {
  return role === "CHIEF_ASSISTANT" ? "Chief assistant" : "Assistant";
}

function compareAssistantPerformanceText(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function parseAssistantPerformanceSort(value: string) {
  const [key, direction] = value.split(":");
  if (
    assistantPerformanceSortKeys.includes(key as AssistantPerformanceSortKey) &&
    (direction === "asc" || direction === "desc")
  ) {
    return {
      key: key as AssistantPerformanceSortKey,
      direction: direction as AssistantPerformanceSortDirection,
    };
  }
  return null;
}

function nextAssistantPerformanceSortValue(
  current: AssistantPerformanceSort | null,
  key: AssistantPerformanceSortKey,
) {
  if (!current || current.key !== key) return `${key}:asc`;
  if (current.direction === "asc") return `${key}:desc`;
  return "NONE";
}

function assistantPerformanceSortHint(
  key: AssistantPerformanceSortKey,
  current: AssistantPerformanceSort | null,
) {
  const label = assistantPerformanceSortLabels[key];
  if (!current || current.key !== key) return `Sort ${label} ascending`;
  if (current.direction === "asc") return `Sort ${label} descending`;
  return `Clear ${label} sorting`;
}

function assistantPerformanceSortValue(
  item: AssistantPerformanceStats,
  key: AssistantPerformanceSortKey,
) {
  if (key === "assistant") {
    return `${displayResearchPersonName(item.row) || ""} ${displayResearchEmail(item.row.email)}`;
  }
  if (key === "role") return roleLabel(item.row.assistantRole);
  if (key === "assigned") return item.assigned;
  if (key === "active") return item.active;
  if (key === "completed") return item.completed;
  if (key === "overdue") return item.overdue;
  if (key === "revoked") return item.revoked;
  if (key === "completion") return item.completionRate;
  return item.acceptanceRate;
}

function sortAssistantPerformanceStats(
  stats: AssistantPerformanceStats[],
  sort: AssistantPerformanceSort | null,
) {
  if (!sort) return stats;
  return stats
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftValue = assistantPerformanceSortValue(left.item, sort.key);
      const rightValue = assistantPerformanceSortValue(right.item, sort.key);
      const result =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : compareAssistantPerformanceText(
              String(leftValue),
              String(rightValue),
            );
      if (result !== 0) return sort.direction === "asc" ? result : -result;
      return left.index - right.index;
    })
    .map(({ item }) => item);
}

function calculateStats(
  rows: AssistantPerformanceRow[],
  period: PerformancePeriod,
) {
  return rows.map((row) => {
    const periodTasks = row.tasks.filter((task) =>
      isTaskInPeriod(task, period),
    );
    const completed = periodTasks.filter(
      (task) => task.status === "COMPLETED",
    ).length;
    const assigned = periodTasks.length;
    return {
      row,
      assigned,
      active: periodTasks.filter((task) => !isClosedTask(task)).length,
      completed,
      overdue: periodTasks.filter(isOverdueTask).length,
      revoked: periodTasks.filter((task) => task.status === "REVOKED").length,
      completionRate:
        assigned === 0 ? 0 : Math.round((completed / assigned) * 100),
      acceptanceRate:
        row.associatedResearchTotal === 0
          ? 0
          : Math.round(
              (row.associatedResearchAcceptedOrPublished /
                row.associatedResearchTotal) *
                100,
            ),
    };
  });
}

function escapeXml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function worksheetXml(rows: Array<Array<string | number>>) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => {
          const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
          if (typeof cell === "number") {
            return `<c r="${ref}"><v>${cell}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function uint32(value: number) {
  return [
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ];
}

function createZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array([
      ...uint32(0x04034b50),
      ...uint16(20),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(checksum),
      ...uint32(contentBytes.length),
      ...uint32(contentBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
      ...nameBytes,
    ]);
    chunks.push(localHeader, contentBytes);

    centralDirectory.push(
      new Uint8Array([
        ...uint32(0x02014b50),
        ...uint16(20),
        ...uint16(20),
        ...uint16(0),
        ...uint16(0),
        ...uint16(0),
        ...uint16(0),
        ...uint32(checksum),
        ...uint32(contentBytes.length),
        ...uint32(contentBytes.length),
        ...uint16(nameBytes.length),
        ...uint16(0),
        ...uint16(0),
        ...uint16(0),
        ...uint16(0),
        ...uint32(0),
        ...uint32(offset),
        ...nameBytes,
      ]),
    );
    offset += localHeader.length + contentBytes.length;
  });

  const centralDirectorySize = centralDirectory.reduce(
    (total, chunk) => total + chunk.length,
    0,
  );
  const endRecord = new Uint8Array([
    ...uint32(0x06054b50),
    ...uint16(0),
    ...uint16(0),
    ...uint16(files.length),
    ...uint16(files.length),
    ...uint32(centralDirectorySize),
    ...uint32(offset),
    ...uint16(0),
  ]);
  const allChunks = [...chunks, ...centralDirectory, endRecord];
  const totalLength = allChunks.reduce(
    (total, chunk) => total + chunk.length,
    0,
  );
  const zip = new Uint8Array(totalLength);
  let cursor = 0;
  allChunks.forEach((chunk) => {
    zip.set(chunk, cursor);
    cursor += chunk.length;
  });
  return zip;
}

function createAssistantPerformanceWorkbook(
  rows: Array<Array<string | number>>,
  sheetName = "Assistant Performance",
) {
  return createZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: worksheetXml(rows),
    },
  ]);
}

function downloadAssistantPerformance(
  stats: AssistantPerformanceStats[],
  period: PerformancePeriod,
  reportKind: "assistant" | "checker",
) {
  const headers = [
    "Assistant",
    "Email",
    "Role",
    reportKind === "checker" ? "Checked" : "Assigned",
    "Active",
    "Completed",
    "Overdue",
    "Revoked",
    "Completion rate",
    ...(reportKind === "assistant" ? ["Acceptance rate"] : []),
  ];
  const bodyRows: Array<Array<string | number>> = stats.map((item) => {
    const baseRow: Array<string | number> = [
      displayResearchPersonName(item.row) || "Unnamed assistant",
      displayResearchEmail(item.row.email),
      roleLabel(item.row.assistantRole),
      item.assigned,
      item.active,
      item.completed,
      item.overdue,
      item.revoked,
      item.completionRate,
    ];
    if (reportKind === "assistant") baseRow.push(item.acceptanceRate);
    return baseRow;
  });
  const workbook = createAssistantPerformanceWorkbook(
    [headers, ...bodyRows],
    reportKind === "checker" ? "Checker Performance" : "Assistant Performance",
  );
  const blob = new Blob([workbook], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${reportKind}-performance-${period}.xlsx`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function AssistantsHeader({
  assistantCount,
  performanceCount,
  checkerCount,
  action,
  activeTab,
  onTabChange,
}: {
  assistantCount: number;
  performanceCount: number;
  checkerCount: number;
  action: ReactNode;
  activeTab: AssistantTab;
  onTabChange: (tab: AssistantTab) => void;
}) {
  const tabs = [
    { key: "assistants" as const, label: "Assistants", value: assistantCount },
    {
      key: "performance" as const,
      label: "Performance",
      value: performanceCount,
    },
    { key: "checker" as const, label: "Checker", value: checkerCount },
  ];

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-4">
      <div className="journal-detail-tabs grid min-w-0 flex-1 grid-cols-3 border border-[#444444] bg-[#242424] p-1 text-center lg:max-w-3xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            data-active={activeTab === tab.key}
            aria-pressed={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
            className="journal-detail-tab-button cursor-pointer rounded-none px-4 py-3 text-left"
          >
            <span className="relative z-10 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-normal uppercase tracking-wide">
                {tab.label}
              </span>
              <span className="text-base font-normal">{tab.value}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-none items-center">{action}</div>
    </div>
  );
}

function AssistantsClientBase({
  rows,
  performanceRows,
  checkerRows,
  canManage,
  action,
}: {
  rows: AssistantRow[];
  performanceRows: AssistantPerformanceRow[];
  checkerRows: AssistantPerformanceRow[];
  canManage: boolean;
  action: ReactNode;
}) {
  const [activeTab, setActiveTab] = usePersistentTableValue<AssistantTab>(
    "assistants:tab",
    "assistants",
  );

  return (
    <>
      <ResearchPageHeaderPortal>
        <AssistantsHeader
          assistantCount={rows.length}
          performanceCount={performanceRows.length}
          checkerCount={checkerRows.length}
          action={action}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </ResearchPageHeaderPortal>
      {activeTab === "performance" || activeTab === "checker" ? (
        <AssistantPerformanceTable
          rows={activeTab === "checker" ? checkerRows : performanceRows}
          reportKind={activeTab === "checker" ? "checker" : "assistant"}
        />
      ) : (
        <AssistantsTable rows={rows} canManage={canManage} />
      )}
    </>
  );
}

function AssistantPerformanceSortHeader({
  label,
  column,
  sort,
  onChange,
  align = "left",
}: {
  label: string;
  column: AssistantPerformanceSortKey;
  sort: AssistantPerformanceSort | null;
  onChange: (column: AssistantPerformanceSortKey) => void;
  align?: "left" | "center";
}) {
  return (
    <span
      className={`flex items-center gap-1.5 ${
        align === "center" ? "justify-center" : "justify-start"
      }`}
    >
      <span>{label}</span>
      <ResearchSortHeaderButton
        column={column}
        activeColumn={sort?.key ?? null}
        direction={sort?.key === column ? sort.direction : null}
        onChange={onChange}
        hint={assistantPerformanceSortHint(column, sort)}
        alphabetical={column === "assistant" || column === "role"}
      />
    </span>
  );
}

function AssistantPerformanceTable({
  rows,
  reportKind,
}: {
  rows: AssistantPerformanceRow[];
  reportKind: "assistant" | "checker";
}) {
  const [period, setPeriod] = usePersistentTableValue<PerformancePeriod>(
    `assistants:${reportKind}-performance-period`,
    "all",
  );
  const [sortValue, setSortValue] = usePersistentTableValue(
    `assistants:${reportKind}-performance-sort`,
    "NONE",
  );
  const sort = useMemo(
    () => parseAssistantPerformanceSort(sortValue),
    [sortValue],
  );
  const showAcceptanceRate = reportKind === "assistant";
  const effectiveSort =
    !showAcceptanceRate && sort?.key === "acceptance" ? null : sort;
  const stats = useMemo(() => calculateStats(rows, period), [period, rows]);
  const sortedStats = useMemo(
    () => sortAssistantPerformanceStats(stats, effectiveSort),
    [effectiveSort, stats],
  );

  function updateSort(key: AssistantPerformanceSortKey) {
    setSortValue(nextAssistantPerformanceSortValue(sort, key));
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <p className="px-0 text-sm font-normal text-[#B0B0B0]">
          {reportKind === "checker" ? "Checker" : "Assistant"} performance
          report for {periodLabel(period).toLowerCase()}.
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() =>
              downloadAssistantPerformance(sortedStats, period, reportKind)
            }
            className="research-allow-transform inline-flex h-9 w-9 cursor-pointer items-center justify-center border border-[#444444] bg-[#242424] text-[#A8DADC] transition duration-180 ease-out hover:-translate-y-0.5 hover:border-[#666666] hover:bg-[#2C2C2C] hover:text-[#C9F0F2] active:scale-95"
            aria-label={`Download current ${reportKind} performance report`}
            title="Download current view as Excel"
          >
            <Download className="h-4 w-4" />
          </button>
          <div className="journal-detail-tabs grid min-w-0 grid-cols-2 border border-[#444444] bg-[#242424] p-1 text-center md:grid-cols-5">
            {(
              [
                "all",
                "currentWeek",
                "lastWeek",
                "currentMonth",
                "lastMonth",
              ] as PerformancePeriod[]
            ).map((item) => (
              <button
                key={item}
                type="button"
                data-active={period === item}
                aria-pressed={period === item}
                onClick={() => setPeriod(item)}
                className="journal-detail-tab-button min-w-[7.5rem] cursor-pointer rounded-none px-3 py-2 text-left"
              >
                <span className="relative z-10 text-[11px] font-normal uppercase tracking-wide">
                  {periodLabel(item)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th
                className={`${showAcceptanceRate ? "w-[20%]" : "w-[24%]"} px-4 py-3`}
              >
                <AssistantPerformanceSortHeader
                  label="Assistant"
                  column="assistant"
                  sort={sort}
                  onChange={updateSort}
                />
              </th>
              <th
                className={`${showAcceptanceRate ? "w-[10%]" : "w-[13%]"} px-3 py-3`}
              >
                <AssistantPerformanceSortHeader
                  label="Role"
                  column="role"
                  sort={sort}
                  onChange={updateSort}
                />
              </th>
              <th className="w-[10%] px-3 py-3">
                <AssistantPerformanceSortHeader
                  label={reportKind === "checker" ? "Checked" : "Assigned"}
                  column="assigned"
                  sort={sort}
                  onChange={updateSort}
                  align="center"
                />
              </th>
              <th className="w-[10%] px-3 py-3">
                <AssistantPerformanceSortHeader
                  label="Active"
                  column="active"
                  sort={sort}
                  onChange={updateSort}
                  align="center"
                />
              </th>
              <th className="w-[10%] px-3 py-3">
                <AssistantPerformanceSortHeader
                  label="Completed"
                  column="completed"
                  sort={sort}
                  onChange={updateSort}
                  align="center"
                />
              </th>
              <th className="w-[10%] px-3 py-3">
                <AssistantPerformanceSortHeader
                  label="Overdue"
                  column="overdue"
                  sort={sort}
                  onChange={updateSort}
                  align="center"
                />
              </th>
              <th className="w-[10%] px-3 py-3">
                <AssistantPerformanceSortHeader
                  label="Revoked"
                  column="revoked"
                  sort={sort}
                  onChange={updateSort}
                  align="center"
                />
              </th>
              <th
                className={`${showAcceptanceRate ? "w-[10%]" : "w-[13%]"} px-3 py-3`}
              >
                <AssistantPerformanceSortHeader
                  label="Completion"
                  column="completion"
                  sort={sort}
                  onChange={updateSort}
                  align="center"
                />
              </th>
              {showAcceptanceRate ? (
                <th className="w-[10%] px-3 py-3">
                  <AssistantPerformanceSortHeader
                    label="Acceptance"
                    column="acceptance"
                    sort={sort}
                    onChange={updateSort}
                    align="center"
                  />
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {sortedStats.map((item) => (
              <tr
                key={item.row.id}
                className="group align-top transition-colors duration-150 hover:bg-[#383838]"
              >
                <td className="px-4 py-3">
                  <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-100">
                    {displayResearchPersonName(item.row) || "Unnamed assistant"}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#6C778D] dark:text-[#B0B0B0]">
                    {displayResearchEmail(item.row.email)}
                  </p>
                </td>
                <td className="px-3 py-3 text-sm text-[#B0B0B0]">
                  {roleLabel(item.row.assistantRole)}
                </td>
                <td className="px-3 py-3 text-center text-sm text-[#E4E4E4]">
                  {item.assigned}
                </td>
                <td className="px-3 py-3 text-center text-sm text-[#B39CD0]">
                  {item.active}
                </td>
                <td className="px-3 py-3 text-center text-sm text-emerald-700 dark:text-emerald-300">
                  {item.completed}
                </td>
                <td className="px-3 py-3 text-center text-sm text-rose-700 dark:text-rose-300">
                  {item.overdue}
                </td>
                <td className="px-3 py-3 text-center text-sm text-slate-600 dark:text-[#B0B0B0]">
                  {item.revoked}
                </td>
                <td className="px-3 py-3 text-center text-sm text-[#A8DADC]">
                  {item.completionRate}%
                </td>
                {showAcceptanceRate ? (
                  <td className="px-3 py-3 text-center text-sm text-emerald-700 dark:text-emerald-300">
                    {item.acceptanceRate}%
                    <p className="mt-1 text-[11px] leading-4 text-[#6C778D] dark:text-[#B0B0B0]">
                      {item.row.associatedResearchAcceptedOrPublished}/
                      {item.row.associatedResearchTotal}
                    </p>
                  </td>
                ) : null}
              </tr>
            ))}
            {sortedStats.length === 0 && (
              <tr>
                <td
                  colSpan={showAcceptanceRate ? 9 : 8}
                  className="px-4 py-8 text-center text-sm text-[#B0B0B0]"
                >
                  No assistant performance data is available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const AssistantsClient = AssistantsClientBase;
