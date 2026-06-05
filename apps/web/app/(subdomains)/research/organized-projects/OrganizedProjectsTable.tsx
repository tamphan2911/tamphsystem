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
import { formatCurrencyCodeMoney } from "@/sites/research/lib/currency";
import {
  FilterSelect,
  IconHint,
  TablePagination,
  TableSearchInput,
  useTablePagination,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchIconButton } from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";

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
      className: "text-[#A8DADC]",
    };
  }
  if (status === "ACTIVE") {
    return {
      label: "Active",
      icon: Clock3,
      className: "text-[#B39CD0]",
    };
  }
  return {
    label: "Planned",
    icon: CalendarClock,
    className: "text-[#FFC1CC]",
  };
}

function financialClaimMeta(status: string) {
  if (status === "NONE") {
    return {
      label: "None",
      icon: CircleOff,
      className: "text-rose-300",
    };
  }
  if (status === "ADVANCED") {
    return {
      label: "Advanced",
      icon: Banknote,
      className: "text-[#B39CD0]",
    };
  }
  if (status === "SETTLED") {
    return {
      label: "Settled",
      icon: ShieldCheck,
      className: "text-[#A8DADC]",
    };
  }
  if (status === "REFUND_ADVANCE") {
    return {
      label: "Refund advance",
      icon: RotateCcw,
      className: "text-[#FFC1CC]",
    };
  }
  return {
    label: "Not advanced",
    icon: CircleDollarSign,
    className: "text-[#FFC1CC]",
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
      <ResearchIconButton
        type="button"
        onClick={() => setOpen(true)}
        label={`Delete ${project.title}`}
        tone="rose"
        className="h-8 w-8"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

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
          <span className="font-semibold text-[#E4E4E4]">{project.title}</span>
        </p>
        <p className="text-[#B0B0B0]">
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
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] p-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
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
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[7.5rem] px-3 py-3">Project ID</th>
              <th className="px-3 py-3">Project</th>
              <th className="w-16 px-2 py-3 text-center">Status</th>
              <th className="w-16 px-2 py-3 text-center">Financial</th>
              <th className="w-[11rem] px-3 py-3">Funding</th>
              <th className="w-[8.5rem] px-3 py-3">Dates</th>
              <th className="w-[6rem] px-2 py-3 text-center">Results</th>
              {isAdmin && deleteAction && (
                <th className="w-12 px-2 py-3 text-center">
                  <span className="sr-only">Delete</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#444444]">
            {pagination.pagedRows.map((project) => {
              const status = statusMeta(project.status);
              const StatusIcon = status.icon;
              const claim = financialClaimMeta(project.financialClaimStatus);
              const ClaimIcon = claim.icon;

              return (
                <tr
                  key={project.id}
                  className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                >
                  <td className="px-3 py-3 align-top">
                    <span className="font-mono text-xs font-bold text-[#B0B0B0]">
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
                        <span className="text-xs font-semibold text-[#777777]">
                          ({project.durationLabel})
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#B0B0B0]">
                      {project.members.length > 0
                        ? project.members.map(memberName).join(", ")
                        : "No members"}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-[#777777]">
                      {project.description || project.note || "No description"}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <IconHint label={status.label}>
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center ${status.className}`}
                      >
                        <StatusIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{status.label}</span>
                      </span>
                    </IconHint>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <IconHint label={claim.label}>
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center ${claim.className}`}
                      >
                        <ClaimIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{claim.label}</span>
                      </span>
                    </IconHint>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-[#B0B0B0]">
                    <span className="line-clamp-2">
                      {project.organizer || "No funding institution"}
                    </span>
                    {project.fundingAmount && (
                      <span className="mt-1 block text-xs font-semibold text-[#777777]">
                        {formatCurrencyCodeMoney(
                          project.fundingAmount,
                          project.fundingCurrency,
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="whitespace-nowrap text-xs font-medium text-[#B0B0B0]">
                      start: {project.startDate || "-"}
                    </p>
                    <p className="whitespace-nowrap text-xs font-medium text-[#B0B0B0]">
                      end: {project.endDate || "-"}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <div className="inline-flex min-w-10 items-center justify-center rounded-none bg-slate-50 px-2 py-1 text-sm font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
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
                  className="px-4 py-2"
                >
                  <ResearchEmptyState
                    title={
                      rows.length === 0
                        ? emptyMessage
                        : "No organized projects match the current filters."
                    }
                    detail={
                      rows.length === 0
                        ? "Create a project to track members, funding, results, and dates."
                        : "Try another keyword or project status."
                    }
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
