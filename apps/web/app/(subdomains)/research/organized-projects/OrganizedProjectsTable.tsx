"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CircleOff,
  Clock3,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { formatCurrencyCodeMoney } from "../lib/currency";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "../components/TableControls";
import { ResearchConfirmDialog } from "../components/ResearchConfirmDialog";
import { useResearchToast } from "../components/ResearchToast";

export type OrganizedProjectResearchRow = {
  id: string;
  title: string;
  stage: string;
  submissions: number;
  publications: number;
};

export type OrganizedProjectMemberRow = {
  id: string;
  name: string;
  email: string;
  isTeamLead: boolean;
  isInstructor: boolean;
};

export type OrganizedProjectRow = {
  id: string;
  title: string;
  organizer: string;
  referenceCode: string;
  description: string;
  status: string;
  financialClaimStatus: string;
  fundingAmount: string;
  fundingCurrency: string;
  durationLabel: string;
  startDate: string;
  endDate: string;
  note: string;
  members: OrganizedProjectMemberRow[];
  researchCount: number;
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
  return {
    label: "Planned",
    icon: CalendarClock,
    className:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  };
}

function financialClaimMeta(status: string) {
  if (status === "NONE") {
    return {
      label: "None",
      icon: CircleOff,
      className:
        "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    };
  }
  if (status === "ADVANCED") {
    return {
      label: "Advanced",
      icon: Banknote,
      className:
        "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
    };
  }
  if (status === "SETTLED") {
    return {
      label: "Settled",
      icon: ShieldCheck,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    };
  }
  if (status === "REFUND_ADVANCE") {
    return {
      label: "Refund advance",
      icon: RotateCcw,
      className:
        "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
    };
  }
  return {
    label: "Not advanced",
    icon: CircleDollarSign,
    className:
      "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  };
}

function memberName(member: OrganizedProjectMemberRow) {
  return member.name || member.email;
}

function DeleteProjectButton({
  project,
  deleteAction,
}: {
  project: OrganizedProjectRow;
  deleteAction: (projectId: string) => Promise<void>;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <IconHint label="Delete project">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/70 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:border-rose-700 dark:hover:bg-rose-900/50"
          aria-label={`Delete ${project.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </IconHint>

      <ResearchConfirmDialog
        open={open}
        title="Delete this project?"
        description="This will remove the project record, members, associated research links, product tracking, and project notes."
        confirmLabel={isDeleting ? "Deleting..." : "Delete project"}
        isConfirming={isDeleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteAction(project.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Project deleted",
              detail: "The project has been removed from the list.",
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete project",
              detail:
                error instanceof Error
                  ? error.message
                  : "The project was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          Project:{" "}
          <span className="font-semibold text-slate-950 dark:text-white">
            {project.title}
          </span>
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          Project ID: {project.referenceCode || project.id.slice(0, 8)}
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

export function OrganizedProjectsTable({
  rows,
  isAdmin = false,
  deleteAction,
  emptyMessage = "No organized projects match the current filters.",
}: {
  rows: OrganizedProjectRow[];
  isAdmin?: boolean;
  deleteAction?: (projectId: string) => Promise<void>;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const statusOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(
          rows
            .map((row) => row.status)
            .filter((item) => item && item !== "ARCHIVED"),
        ),
      ).sort(),
    ],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter((row) => row.status !== "ARCHIVED")
      .filter((row) => {
        const matchesStatus = status === "ALL" || row.status === status;
        const haystack = [
          row.title,
          row.organizer,
          row.referenceCode,
          row.description,
          row.status,
          row.financialClaimStatus,
          row.note,
          ...row.members.flatMap((member) => [
            member.name,
            member.email,
            member.isTeamLead ? "team lead" : "",
            member.isInstructor ? "instructor" : "",
          ]),
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
          placeholder="Search project, funding institution, member, research..."
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
              <th className="w-[7.5rem] px-3 py-3">Project ID</th>
              <th className="px-3 py-3">Project</th>
              <th className="w-16 px-2 py-3 text-center">Status</th>
              <th className="w-16 px-2 py-3 text-center">Financial</th>
              <th className="w-[11rem] px-3 py-3">Funding</th>
              <th className="w-[8.5rem] px-3 py-3">Dates</th>
              <th className="w-[6rem] px-2 py-3 text-center">Results</th>
              {isAdmin && deleteAction && (
                <th className="w-12 px-2 py-3 text-center">Delete</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagination.pagedRows.map((project) => {
              const status = statusMeta(project.status);
              const StatusIcon = status.icon;
              const claim = financialClaimMeta(project.financialClaimStatus);
              const ClaimIcon = claim.icon;

              return (
                <tr
                  key={project.id}
                  className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-3 align-top">
                    <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                      {project.referenceCode ||
                        project.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="min-w-0 px-3 py-3 align-top">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Link
                        href={`/organized-projects/${project.id}`}
                        className="line-clamp-2 text-base font-normal text-slate-800 transition hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-300"
                      >
                        {project.title}
                      </Link>
                      {project.durationLabel && (
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                          ({project.durationLabel})
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {project.members.length > 0
                        ? project.members.map(memberName).join(", ")
                        : "No members"}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
                      {project.description || project.note || "No description"}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <span
                      className={`group/tooltip relative inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ${status.className}`}
                    >
                      <StatusIcon className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{status.label}</span>
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-lg shadow-slate-900/10 group-hover/tooltip:block dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
                        {status.label}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <span
                      className={`group/tooltip relative inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ${claim.className}`}
                    >
                      <ClaimIcon className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{claim.label}</span>
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-lg shadow-slate-900/10 group-hover/tooltip:block dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
                        {claim.label}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-slate-600 dark:text-slate-300">
                    <span className="line-clamp-2">
                      {project.organizer || "No funding institution"}
                    </span>
                    {project.fundingAmount && (
                      <span className="mt-1 block text-xs font-semibold text-slate-400 dark:text-slate-500">
                        {formatCurrencyCodeMoney(
                          project.fundingAmount,
                          project.fundingCurrency,
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                      start: {project.startDate || "-"}
                    </p>
                    <p className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                      end: {project.endDate || "-"}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <div className="inline-flex min-w-10 items-center justify-center rounded-lg bg-slate-50 px-2 py-1 text-sm font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      {project.researchCount}
                    </div>
                  </td>
                  {isAdmin && deleteAction && (
                    <td className="px-2 py-3 text-center align-top">
                      <DeleteProjectButton
                        project={project}
                        deleteAction={deleteAction}
                      />
                    </td>
                  )}
                </tr>
              );
            })}
            {pagination.total === 0 && (
              <tr>
                <td
                  colSpan={7 + (isAdmin && deleteAction ? 1 : 0)}
                  className="px-4 py-14 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  {rows.length === 0
                    ? emptyMessage
                    : "No organized projects match the current filters."}
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
