"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleOff,
  Clock3,
  Hourglass,
  RotateCcw,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";
import { formatCurrencyCodeMoney } from "@/sites/research/lib/currency";
import {
  FilterSelect,
  IconHint,
  ResearchSortHeaderButton,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import { displayResearchPersonName } from "@/sites/research/lib/display";

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

type SortDirection = "asc" | "desc";
type OrganizedProjectSortKey =
  | "project"
  | "status"
  | "financial"
  | "funding"
  | "dates"
  | "results";

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function statusMeta(status: string) {
  if (status === "PENDING") {
    return {
      label: "Pending",
      icon: Hourglass,
      className: "text-amber-700 dark:text-amber-300",
    };
  }
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
    icon: WalletCards,
    className: "text-[#FFC1CC]",
  };
}

function memberName(member: OrganizedProjectMemberRow) {
  return displayResearchPersonName(member);
}

function compareProjectText(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function compareProjectDate(left: string, right: string) {
  const leftTime = parseProjectDate(left);
  const rightTime = parseProjectDate(right);
  return leftTime - rightTime;
}

function parseProjectDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year < 100 ? 2000 + year : year, month - 1, day).getTime();
}

function projectFundingValue(project: OrganizedProjectRow) {
  const amount = Number.parseFloat(project.fundingAmount || "0");
  return Number.isFinite(amount) ? amount : 0;
}

function nextProjectSortValue(
  currentKey: OrganizedProjectSortKey,
  currentDirection: SortDirection,
  key: OrganizedProjectSortKey,
) {
  if (currentKey !== key) return `${key}:asc`;
  if (currentDirection === "asc") return `${key}:desc`;
  return "NONE";
}

function parseProjectSortValue(value: string) {
  const [key, direction] = value.split(":");
  const validKeys: OrganizedProjectSortKey[] = [
    "project",
    "status",
    "financial",
    "funding",
    "dates",
    "results",
  ];
  if (
    validKeys.includes(key as OrganizedProjectSortKey) &&
    (direction === "asc" || direction === "desc")
  ) {
    return {
      key: key as OrganizedProjectSortKey,
      direction: direction as SortDirection,
    };
  }
  return null;
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
      <IconHint label={`Delete ${project.title}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Delete ${project.title}`}
          className="research-allow-transform inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-transparent bg-transparent text-[#FFC1CC] shadow-none outline-none transition-[color,transform] duration-150 ease-out hover:border-transparent hover:bg-transparent hover:text-rose-300 hover:shadow-none active:scale-95 focus-visible:ring-0"
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
  const [query, setQuery] = usePersistentTableValue("organized-projects:q", "");
  const [status, setStatus] = usePersistentTableValue(
    "organized-projects:status",
    "ALL",
  );
  const [sortValue, setSortValue] = usePersistentTableValue(
    "organized-projects:sort",
    "NONE",
  );
  const sort = useMemo(() => parseProjectSortValue(sortValue), [sortValue]);

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
    const filteredRows = rows
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
    return filteredRows.sort((left, right) => {
      if (!sort) return 0;
      let result = 0;
      if (sort.key === "project") {
        result = compareProjectText(left.title, right.title);
      } else if (sort.key === "status") {
        result = compareProjectText(
          statusMeta(left.status).label,
          statusMeta(right.status).label,
        );
      } else if (sort.key === "financial") {
        result = compareProjectText(
          financialClaimMeta(left.financialClaimStatus).label,
          financialClaimMeta(right.financialClaimStatus).label,
        );
      } else if (sort.key === "funding") {
        result =
          projectFundingValue(left) - projectFundingValue(right) ||
          compareProjectText(left.organizer, right.organizer);
      } else if (sort.key === "dates") {
        result =
          compareProjectDate(left.startDate, right.startDate) ||
          compareProjectDate(left.endDate, right.endDate);
      } else {
        result = left.researchCount - right.researchCount;
      }
      return sort.direction === "asc" ? result : -result;
    });
  }, [query, rows, sort, status]);

  const pagination = useTablePagination(filtered, 10, 1, "organized-projects");

  function updateQuery(value: string) {
    setQuery(value);
    pagination.setPage(1);
  }

  function updateStatus(value: string) {
    setStatus(value);
    pagination.setPage(1);
  }

  function updateSort(key: OrganizedProjectSortKey) {
    setSortValue(
      sort ? nextProjectSortValue(sort.key, sort.direction, key) : `${key}:asc`,
    );
    pagination.setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={query}
          onChange={updateQuery}
          placeholder="Search project, funding institution, member, research..."
        />
        <FilterSelect
          value={status}
          onChange={updateStatus}
          ariaLabel="Filter by project status"
          options={statusOptions.map((item) => ({
            value: item,
            label: item === "ALL" ? "All status" : statusLabel(item),
          }))}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[64rem] table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[10%] px-3 py-3">Project ID</th>
              <th className="px-3 py-3">
                <ProjectSortHeader
                  label="Project"
                  column="project"
                  sort={sort}
                  onChange={updateSort}
                  alphabetical
                />
              </th>
              <th className="w-[7%] px-2 py-3 text-center">
                <ProjectSortHeader
                  label="Status"
                  column="status"
                  sort={sort}
                  onChange={updateSort}
                  alphabetical
                  centered
                />
              </th>
              <th className="w-[7%] px-2 py-3 text-center">
                <ProjectSortHeader
                  label="Financial"
                  column="financial"
                  sort={sort}
                  onChange={updateSort}
                  alphabetical
                  centered
                />
              </th>
              <th className="w-[15%] px-3 py-3">
                <ProjectSortHeader
                  label="Funding"
                  column="funding"
                  sort={sort}
                  onChange={updateSort}
                />
              </th>
              <th className="w-[12%] px-3 py-3">
                <ProjectSortHeader
                  label="Dates"
                  column="dates"
                  sort={sort}
                  onChange={updateSort}
                />
              </th>
              <th className="w-[7%] px-2 py-3 text-center">
                <ProjectSortHeader
                  label="Results"
                  column="results"
                  sort={sort}
                  onChange={updateSort}
                  centered
                />
              </th>
              {isAdmin && deleteAction && (
                <th className="w-[5%] px-2 py-3 text-center">
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
                    <Link
                      href={`/organized-projects/${project.id}`}
                      className="research-allow-transform block w-full origin-left whitespace-normal break-words text-base font-normal leading-6 text-[#E4E4E4] outline-none transition-[color,text-shadow,transform] duration-180 ease-out hover:bg-transparent hover:text-[#A8DADC] hover:[text-shadow:0_0_0.55rem_rgba(168,218,220,0.18)] active:scale-[0.985] focus-visible:bg-transparent focus-visible:ring-0 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      {project.title}
                    </Link>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#B0B0B0]">
                      {project.members.length > 0
                        ? project.members.map(memberName).join(", ")
                        : "No members"}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <IconHint label={status.label}>
                      <span
                        className={`research-task-icon-motion inline-flex h-9 w-9 items-center justify-center ${status.className}`}
                      >
                        <StatusIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{status.label}</span>
                      </span>
                    </IconHint>
                    {project.durationLabel && (
                      <span className="mt-1 block text-[11px] font-normal leading-4 text-[#777777]">
                        {project.durationLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center align-top">
                    <IconHint label={claim.label}>
                      <span
                        className={`research-task-icon-motion inline-flex h-9 w-9 items-center justify-center ${claim.className}`}
                      >
                        <ClaimIcon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{claim.label}</span>
                      </span>
                    </IconHint>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-[#B0B0B0]">
                    <span className="block whitespace-normal break-words leading-5">
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
                    <div className="inline-flex min-w-10 items-center justify-center px-2 py-1 text-sm font-normal text-[#B0B0B0]">
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

function ProjectSortHeader({
  label,
  column,
  sort,
  onChange,
  alphabetical = false,
  centered = false,
}: {
  label: string;
  column: OrganizedProjectSortKey;
  sort: ReturnType<typeof parseProjectSortValue>;
  onChange: (column: OrganizedProjectSortKey) => void;
  alphabetical?: boolean;
  centered?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        centered ? "justify-center" : ""
      }`}
    >
      <span>{label}</span>
      <ResearchSortHeaderButton
        column={column}
        activeColumn={sort?.key ?? null}
        direction={sort?.key === column ? sort.direction : null}
        onChange={onChange}
        hint={
          sort?.key === column && sort.direction === "desc"
            ? "Clear sorting"
            : `Sort by ${label.toLowerCase()}`
        }
        alphabetical={alphabetical}
      />
    </span>
  );
}
