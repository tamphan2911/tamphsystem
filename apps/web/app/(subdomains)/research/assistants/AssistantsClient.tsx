"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Download } from "lucide-react";
import {
  researchStartOfDay,
  researchStartOfMonth,
  researchWeekday,
} from "@/sites/research/lib/date-time";
import { usePersistentTableValue } from "@/sites/research/components/TableControls";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { AssistantsTable, type AssistantRow } from "./AssistantsTable";

type AssistantTab = "assistants" | "performance";
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
};

type AssistantPerformanceStats = {
  row: AssistantPerformanceRow;
  assigned: number;
  active: number;
  completed: number;
  overdue: number;
  revoked: number;
  completionRate: number;
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
    };
  });
}

function escapeSpreadsheetCell(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function downloadAssistantPerformance(
  stats: AssistantPerformanceStats[],
  period: PerformancePeriod,
) {
  const headers = [
    "Assistant",
    "Email",
    "Role",
    "Assigned",
    "Active",
    "Completed",
    "Overdue",
    "Revoked",
    "Completion rate",
  ];
  const bodyRows = stats.map((item) => [
    displayResearchPersonName(item.row) || "Unnamed assistant",
    displayResearchEmail(item.row.email),
    roleLabel(item.row.assistantRole),
    item.assigned,
    item.active,
    item.completed,
    item.overdue,
    item.revoked,
    `${item.completionRate}%`,
  ]);
  const table = [
    `<tr>${headers.map((header) => `<th>${escapeSpreadsheetCell(header)}</th>`).join("")}</tr>`,
    ...bodyRows.map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeSpreadsheetCell(cell)}</td>`).join("")}</tr>`,
    ),
  ].join("");
  const html = `<html><head><meta charset="utf-8" /></head><body><table>${table}</table></body></html>`;
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `assistant-performance-${period}.xls`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function AssistantsHeader({
  assistantCount,
  reportCount,
  action,
  activeTab,
  onTabChange,
}: {
  assistantCount: number;
  reportCount: number;
  action: ReactNode;
  activeTab: AssistantTab;
  onTabChange: (tab: AssistantTab) => void;
}) {
  const tabs = [
    { key: "assistants" as const, label: "Assistants", value: assistantCount },
    { key: "performance" as const, label: "Performance", value: reportCount },
  ];

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-4">
      <div className="journal-detail-tabs grid min-w-0 flex-1 grid-cols-2 border border-[#444444] bg-[#242424] p-1 text-center lg:max-w-2xl">
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
  canManage,
  action,
}: {
  rows: AssistantRow[];
  performanceRows: AssistantPerformanceRow[];
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
          reportCount={performanceRows.length}
          action={action}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </ResearchPageHeaderPortal>
      {activeTab === "performance" ? (
        <AssistantPerformanceTable rows={performanceRows} />
      ) : (
        <AssistantsTable rows={rows} canManage={canManage} />
      )}
    </>
  );
}

function AssistantPerformanceTable({
  rows,
}: {
  rows: AssistantPerformanceRow[];
}) {
  const [period, setPeriod] = usePersistentTableValue<PerformancePeriod>(
    "assistants:performance-period",
    "all",
  );
  const stats = useMemo(() => calculateStats(rows, period), [period, rows]);

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <p className="px-0 text-sm font-normal text-[#B0B0B0]">
          Assistant performance report for {periodLabel(period).toLowerCase()}.
        </p>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => downloadAssistantPerformance(stats, period)}
            className="research-allow-transform inline-flex h-9 w-9 cursor-pointer items-center justify-center border border-[#444444] bg-[#242424] text-[#A8DADC] transition duration-180 ease-out hover:-translate-y-0.5 hover:border-[#666666] hover:bg-[#2C2C2C] hover:text-[#C9F0F2] active:scale-95"
            aria-label="Download current assistant performance report"
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
              <th className="w-[24%] px-4 py-3">Assistant</th>
              <th className="w-[13%] px-3 py-3">Role</th>
              <th className="w-[10%] px-3 py-3 text-center">Assigned</th>
              <th className="w-[10%] px-3 py-3 text-center">Active</th>
              <th className="w-[10%] px-3 py-3 text-center">Completed</th>
              <th className="w-[10%] px-3 py-3 text-center">Overdue</th>
              <th className="w-[10%] px-3 py-3 text-center">Revoked</th>
              <th className="w-[13%] px-3 py-3 text-center">Completion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {stats.map((item) => (
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
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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
