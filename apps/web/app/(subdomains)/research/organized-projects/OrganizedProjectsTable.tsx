"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Clock3, FileText } from "lucide-react";
import {
  FilterSelect,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";

export type OrganizedProjectResearchRow = {
  id: string;
  title: string;
  stage: string;
  submissions: number;
  publications: number;
};

export type OrganizedProjectRow = {
  id: string;
  title: string;
  organizer: string;
  referenceCode: string;
  description: string;
  status: string;
  requiredResearchCount: number;
  startDate: string;
  endDate: string;
  note: string;
  research: OrganizedProjectResearchRow[];
};

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function statusMeta(status: string) {
  if (status === "COMPLETED") {
    return {
      label: "Completed",
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    };
  }
  if (status === "ACTIVE") {
    return {
      label: "Active",
      icon: Clock3,
      className:
        "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
    };
  }
  if (status === "ARCHIVED") {
    return {
      label: "Archived",
      icon: FileText,
      className:
        "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    };
  }
  return {
    label: "Planned",
    icon: Building2,
    className:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  };
}

function shortDate(value: string) {
  return value || "-";
}

export function OrganizedProjectsTable({
  rows,
}: {
  rows: OrganizedProjectRow[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const statusOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(rows.map((row) => row.status).filter(Boolean))).sort(),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "ALL" || row.status === status;
      const haystack = [
        row.title,
        row.organizer,
        row.referenceCode,
        row.description,
        row.status,
        row.note,
        ...row.research.flatMap((research) => [
          research.title,
          research.stage,
          String(research.submissions),
          String(research.publications),
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [query, rows, status]);

  const pagination = useTablePagination(filtered, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search project, organizer, research..."
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          ariaLabel="Filter by project status"
          options={statusOptions.map((item) => ({
            value: item,
            label: item === "ALL" ? "All status" : statusLabel(item),
          }))}
        />
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="w-[8.5rem] px-3 py-3">Project ID</th>
              <th className="px-3 py-3">Project</th>
              <th className="w-[7.5rem] px-3 py-3">Status</th>
              <th className="w-[12rem] px-3 py-3">Organizer</th>
              <th className="w-[9rem] px-3 py-3">Time</th>
              <th className="w-[18rem] px-3 py-3">Research results</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((project) => {
              const meta = statusMeta(project.status);
              const Icon = meta.icon;
              const required = project.requiredResearchCount;
              const linked = project.research.length;
              const progress =
                required > 0 ? `${linked}/${required}` : String(linked);

              return (
                <tr
                  key={project.id}
                  className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-3 align-top">
                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                      {project.referenceCode || project.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    <p className="line-clamp-2 text-base font-normal text-slate-700 dark:text-slate-200">
                      {project.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {project.description || project.note || "No description"}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold ring-1 ${meta.className}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-slate-600 dark:text-slate-300">
                    <span className="line-clamp-2">
                      {project.organizer || "No organizer"}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                      start: {shortDate(project.startDate)}
                    </p>
                    <p className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                      end: {shortDate(project.endDate)}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="mb-2 inline-flex rounded-lg bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                      {progress} results
                    </div>
                    <div className="grid gap-1.5">
                      {project.research.slice(0, 2).map((research) => (
                        <Link
                          key={research.id}
                          href={`/projects/${research.id}`}
                          className="block rounded-lg border border-slate-200 px-2.5 py-2 transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/30"
                        >
                          <p className="line-clamp-1 text-sm font-normal text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-300">
                            {research.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {research.stage} - {research.submissions} submissions - {research.publications} publications
                          </p>
                        </Link>
                      ))}
                      {project.research.length > 2 && (
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                          +{project.research.length - 2} more linked research
                        </p>
                      )}
                      {project.research.length === 0 && (
                        <p className="rounded-lg border border-dashed border-slate-200 px-2.5 py-3 text-center text-xs text-slate-500 dark:border-slate-800">
                          No linked research
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No organized projects match the current filters.
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
