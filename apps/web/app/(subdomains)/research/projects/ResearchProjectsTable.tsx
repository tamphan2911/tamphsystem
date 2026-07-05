"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  Ban,
  BookMarked,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  CircleOff,
  FileCheck2,
  FileClock,
  FileSearch,
  FolderClock,
  FlaskConical,
  Hourglass,
  ListOrdered,
  Send,
  SendHorizontal,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  IconHint,
  MultiFilterSelect,
  ResearchSortHeaderButton,
  TablePagination,
  TableSearchInput,
  useTablePagination,
  usePersistentTableValue,
} from "@/sites/research/components/TableControls";
import { ResearchConfirmDialog } from "@/sites/research/components/ResearchConfirmDialog";
import {
  ResearchIconButton,
  researchLinkClass,
  researchMutedLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchEmptyState } from "@/sites/research/components/ResearchState";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import type { AuthorOption, SelectedAuthor } from "./[id]/AuthorsPicker";
import {
  ResearchBasicEditDialog,
  type AutoCreatedTask,
  type ResearchBasicValues,
} from "./[id]/ResearchDetailEditDialogs";
import type {
  AssistantTeamOption,
  FundingInstitutionOption,
} from "../organized-projects/ProjectFormControls";

export type ResearchProjectRow = {
  id: string;
  researchCode: string;
  title: string;
  abstract: string;
  isPriority: boolean;
  productionPriorityQueuedAt: string;
  productionQueuePosition: number | null;
  stage: string;
  claimStatus: string;
  registerStatus: string;
  canViewRegistrationClaim?: boolean;
  coAuthors: string;
  universityRegistration: string;
  registerName: string;
  leadResearcher: string;
  submissions: number;
  publications: number;
  activeTasks: number;
  overdueTasks: number;
  canViewTaskCounts?: boolean;
  pendingFolderAccessRequests: number;
  updatedAt: string;
  notSubmittedAnywhere: boolean;
  hasSubmittedSubmission: boolean;
  hasAcceptedSubmission: boolean;
  editValues?: ResearchBasicValues;
  editAuthors?: SelectedAuthor[];
  completedProductionSteps?: string[];
};

type SortColumn = "stage" | "claim" | "registration" | "submit";
type SortDirection = "asc" | "desc";
type SortState = {
  column: SortColumn;
  direction: SortDirection;
} | null;
type ServerTableState = {
  query: string;
  stageValue: string;
  claimValue: string;
  registrationValue: string;
  sortValue: string;
  folderRequestValue: string;
  priorityValue: string;
  productionQueueValue: string;
  page: number;
  pageSize: number;
  total: number;
  pendingFolderRequestCount: number;
};

const stages = [
  "ALL",
  "PENDING",
  "PRODUCTION",
  "NEED_SUBMIT",
  "SUBMITTED",
  "REVIEW",
  "ACCEPTED",
  "PUBLISHED",
];
const claims = [
  "ALL",
  "CANNOT_CLAIM",
  "WAITING_PUBLISH",
  "MAKING_DOCUMENT",
  "WAITING",
  "CLAIMED",
];
const registrations = [
  "ALL",
  "NOT_REGISTERED",
  "PREPARING",
  "SUBMITTED",
  "APPROVED",
];

function selectedFilterValues(value: string, options: string[]) {
  if (!value || value === "ALL") return [];
  const valid = new Set(options.filter((option) => option !== "ALL"));
  return value.split(",").filter((option) => valid.has(option));
}

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    PRODUCTION: "Production",
    PENDING: "Pending",
    NEED_SUBMIT: "Need submit",
    SUBMITTED: "Submitted",
    SUBMITTING: "Submitted",
    REVIEW: "Review",
    ACCEPTED: "Accepted",
    PUBLISHED: "Published",
  };
  if (labels[stage]) return labels[stage];
  if (stage === "NEED_SUBMIT") return "Need submit";
  if (stage === "SUBMITTED" || stage === "SUBMITTING") return "Submitted";
  const normalized = stage.replaceAll("_", " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function stageFilterKey(row: ResearchProjectRow) {
  if (row.stage === "SUBMITTING") {
    return row.hasSubmittedSubmission ? "SUBMITTED" : "NEED_SUBMIT";
  }
  return row.stage;
}

function statusClass(stage: string) {
  if (stage === "PUBLISHED" || stage === "ACCEPTED") return "text-[#A8DADC]";
  if (stage === "PENDING") return "text-amber-700 dark:text-amber-300";
  if (stage === "REVIEW" || stage === "SUBMITTING" || stage === "SUBMITTED")
    return "text-[#B39CD0]";
  return "text-[#FFC1CC]";
}

function stageStatusClass(row: ResearchProjectRow) {
  if (stageFilterKey(row) === "NEED_SUBMIT") {
    return "text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200";
  }
  return statusClass(stageFilterKey(row));
}

function stageTooltip(row: ResearchProjectRow) {
  if (stageFilterKey(row) === "NEED_SUBMIT") {
    return "Not submit anywhere";
  }
  return stageLabel(stageFilterKey(row));
}

function stageIcon(stage: string) {
  if (stage === "PUBLISHED") return BookOpenCheck;
  if (stage === "PENDING") return Hourglass;
  if (stage === "ACCEPTED") return BadgeCheck;
  if (stage === "REVIEW") return FileSearch;
  if (
    stage === "SUBMITTING" ||
    stage === "SUBMITTED" ||
    stage === "NEED_SUBMIT"
  )
    return Send;
  return FlaskConical;
}

function claimLabel(claim: string) {
  if (claim === "CANNOT_CLAIM") return "Cannot claim";
  if (claim === "WAITING_PUBLISH") return "Waiting publish";
  if (claim === "MAKING_DOCUMENT") return "Making document";
  if (claim === "WAITING") return "Waiting";
  if (claim === "CLAIMED") return "Claimed";
  return claim.replace("_", " ");
}

function claimClass(claim: string) {
  if (claim === "CLAIMED") return "text-[#A8DADC]";
  if (claim === "WAITING") return "text-amber-700 dark:text-amber-300";
  if (claim === "WAITING_PUBLISH")
    return "text-violet-700 dark:text-violet-300";
  if (claim === "MAKING_DOCUMENT") return "text-[#B39CD0]";
  if (claim === "CANNOT_CLAIM") return "text-rose-300";
  return "text-[#FFC1CC]";
}

function claimIcon(claim: string) {
  if (claim === "CLAIMED") return CheckCircle2;
  if (claim === "WAITING") return FileClock;
  if (claim === "WAITING_PUBLISH") return BookMarked;
  if (claim === "MAKING_DOCUMENT") return FileCheck2;
  if (claim === "CANNOT_CLAIM") return Ban;
  return CircleDollarSign;
}

function registrationLabel(status: string) {
  if (status === "APPROVED") return "Approved";
  if (status === "SUBMITTED") return "Submitted";
  if (status === "PREPARING") return "Plan";
  return "Not registered";
}

function registrationSortLabel(row: ResearchProjectRow) {
  const label = registrationLabel(row.registerStatus);
  const registerName = row.registerName.trim();
  return row.registerStatus !== "NOT_REGISTERED" && registerName
    ? `${label} - ${registerName}`
    : label;
}

function parseSortValue(value: string): SortState {
  const [column, direction] = value.split(":");
  if (
    (column === "stage" ||
      column === "claim" ||
      column === "registration" ||
      column === "submit") &&
    (direction === "asc" || direction === "desc")
  ) {
    return { column, direction };
  }
  return null;
}

function stringifySortValue(sort: SortState) {
  return sort ? `${sort.column}:${sort.direction}` : "NONE";
}

function nextSortState(current: SortState, column: SortColumn): SortState {
  if (column === "claim" || column === "registration") {
    if (current?.column === column) return null;
    return { column, direction: "asc" };
  }

  if (current?.column !== column) return { column, direction: "desc" };
  if (current.direction === "desc") return { column, direction: "asc" };
  return null;
}

function sortHint(column: SortColumn, current: SortState) {
  const next = nextSortState(current, column);
  if (!next) return "Clear sorting";
  if (column === "claim") return "Sort claims alphabetically";
  if (column === "registration") return "Sort registrations alphabetically";
  if (column === "stage") {
    return next.direction === "desc"
      ? "Sort by unfinished tasks: high to low"
      : "Sort by unfinished tasks: low to high";
  }
  return next.direction === "desc"
    ? "Sort submissions: high to low"
    : "Sort submissions: low to high";
}

function SortHeaderButton({
  column,
  sort,
  onChange,
}: {
  column: SortColumn;
  sort: SortState;
  onChange: (column: SortColumn) => void;
}) {
  const active = sort?.column === column;
  return (
    <ResearchSortHeaderButton
      column={column}
      activeColumn={sort?.column ?? null}
      direction={active ? (sort?.direction ?? null) : null}
      onChange={onChange}
      hint={sortHint(column, sort)}
      alphabetical={column === "claim" || column === "registration"}
    />
  );
}

function registrationClass(status: string) {
  if (status === "APPROVED" || status === "SUBMITTED")
    return status === "APPROVED" ? "text-[#A8DADC]" : "text-[#B39CD0]";
  if (status === "PREPARING") return "text-[#FFC1CC]";
  return "text-rose-300";
}

function registrationIcon(status: string) {
  if (status === "APPROVED") return ShieldCheck;
  if (status === "SUBMITTED") return SendHorizontal;
  if (status === "PREPARING") return CalendarCheck2;
  return CircleOff;
}

function StatusIconChip({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  return (
    <IconHint label={label}>
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-none transition-colors duration-150 ${className}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function ActiveTaskCount({
  projectId,
  count,
  overdueCount,
}: {
  projectId: string;
  count: number;
  overdueCount: number;
}) {
  const label = `${overdueCount} overdue and ${count} unfinished related ${count === 1 ? "task" : "tasks"}. Open related tasks.`;
  const colorClass =
    overdueCount > 0
      ? "text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200"
      : count > 0
        ? "text-violet-700 hover:text-violet-900 dark:text-[#B39CD0] dark:hover:text-[#D8C8EC]"
        : "text-[#667085] hover:text-[#344054] dark:text-[#777777] dark:hover:text-[#B0B0B0]";

  return (
    <IconHint label={label}>
      <Link
        href={`/projects/${projectId}#related-tasks`}
        aria-label={label}
        className={`research-allow-transform inline-flex min-h-5 min-w-8 items-center justify-center px-1 font-mono text-[11px] font-normal transition-[color,transform] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${colorClass}`}
      >
        {overdueCount}/{count}
      </Link>
    </IconHint>
  );
}

export function ResearchStageIndicator({
  row,
  showTaskCounts = true,
}: {
  row: Pick<
    ResearchProjectRow,
    "id" | "stage" | "hasSubmittedSubmission" | "activeTasks" | "overdueTasks"
  >;
  showTaskCounts?: boolean;
}) {
  return (
    <div className="inline-flex flex-col items-center">
      <StatusIconChip
        icon={stageIcon(row.stage)}
        label={stageTooltip(row as ResearchProjectRow)}
        className={stageStatusClass(row as ResearchProjectRow)}
      />
      {showTaskCounts ? (
        <ActiveTaskCount
          projectId={row.id}
          count={row.activeTasks}
          overdueCount={row.overdueTasks}
        />
      ) : null}
    </div>
  );
}

function FolderAccessRequestCount({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = `${count} ongoing shared folder access ${count === 1 ? "request" : "requests"}`;

  return (
    <IconHint label={label}>
      <span className="research-allow-transform inline-flex min-h-5 min-w-8 items-center justify-center px-1 text-amber-700 transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:text-amber-800 hover:drop-shadow-[0_0_0.45rem_rgba(217,119,6,0.22)] dark:text-amber-300 dark:hover:text-amber-200">
        <FolderClock className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function ClaimStatusChip({ status }: { status: string }) {
  const Icon = claimIcon(status);
  const label = claimLabel(status);

  return (
    <IconHint label={label}>
      <span className="inline-flex min-w-16 flex-col items-center justify-start gap-1">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-none transition-colors duration-150 ${claimClass(status)}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="max-w-20 text-center text-[10px] font-normal uppercase leading-3 tracking-wide text-[#B0B0B0]">
          {label}
        </span>
      </span>
    </IconHint>
  );
}

function RegistrationCell({
  status,
  registration,
  registerName,
}: {
  status: string;
  registration: string;
  registerName: string;
}) {
  const Icon = registrationIcon(status);
  const label = registrationLabel(status);
  const detail = registration.trim();
  const showDetail = detail.length > 0;
  const registerLine =
    status !== "NOT_REGISTERED" && registerName.trim()
      ? `${label} - ${registerName.trim()}`
      : label;

  return (
    <div className="grid max-w-56 grid-cols-[2rem_minmax(0,1fr)] items-start gap-2">
      <IconHint label={registerLine}>
        <span
          className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-none transition-colors duration-150 ${registrationClass(status)}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </IconHint>
      <div
        className={`min-w-0 ${showDetail ? "" : "flex min-h-8 items-center"}`}
      >
        {showDetail && (
          <p className="truncate text-sm font-normal text-[#E4E4E4]">
            {detail}
          </p>
        )}
        <p
          className={`${showDetail ? "mt-0.5" : ""} text-[11px] font-normal uppercase tracking-wide text-[#B0B0B0]`}
        >
          {registerLine}
        </p>
      </div>
    </div>
  );
}

function SubmitCount({ count }: { count: number }) {
  const isZero = count === 0;
  const isHigh = count > 10;
  const label = isZero
    ? "No submissions yet"
    : isHigh
      ? `${count} submissions, high submission count`
      : `${count} submissions`;
  const className = isZero
    ? "text-[#1F7180] dark:text-[#A8DADC]"
    : isHigh
      ? "text-[#1F2937] dark:text-[#E4E4E4]"
      : "text-[#667085] dark:text-[#B0B0B0]";

  return (
    <IconHint label={label}>
      <span
        className={`inline-flex h-8 min-w-8 items-center justify-center px-2 text-sm font-normal transition-colors duration-150 ${className}`}
      >
        {count}
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function PriorityResearchIcon({ compact = false }: { compact?: boolean }) {
  return (
    <IconHint label="Priority research">
      <span
        className={`research-allow-transform inline-flex items-center justify-center text-amber-700 transition duration-180 ease-out hover:-translate-y-0.5 hover:drop-shadow-[0_0_0.45rem_rgba(217,119,6,0.24)] dark:text-amber-300 ${
          compact ? "h-4 w-4" : "h-5 w-5"
        }`}
        aria-label="Priority research"
      >
        <Star
          className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
          fill="currentColor"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </span>
    </IconHint>
  );
}

function DeleteResearchButton({
  row,
  deleteAction,
}: {
  row: ResearchProjectRow;
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
        label={`Delete ${row.title}`}
        tone="rose"
        className="h-8 w-8"
      >
        <Trash2 className="h-4 w-4" />
      </ResearchIconButton>

      <ResearchConfirmDialog
        open={open}
        title="Delete this research?"
        description="This will remove the research record, authors, submissions, suggested venues, publications, and related history."
        confirmLabel={isDeleting ? "Deleting..." : "Delete research"}
        isConfirming={isDeleting}
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteAction(row.id);
            setOpen(false);
            router.refresh();
            toast.showSuccess({
              title: "Research deleted",
              detail: "The research record has been removed from the list.",
            });
          } catch (error) {
            toast.showError({
              title: "Could not delete research",
              detail:
                error instanceof Error
                  ? error.message
                  : "The research was not removed. Please refresh the page and try again.",
            });
          } finally {
            setIsDeleting(false);
          }
        }}
      >
        <p>
          Research:{" "}
          <span className="font-semibold text-[#E4E4E4]">{row.title}</span>
        </p>
        <p className="text-[#B0B0B0]">
          Research ID: {row.researchCode || row.id.slice(0, 8)}
        </p>
        <p className="font-semibold text-rose-700 dark:text-rose-300">
          This action cannot be undone from this screen.
        </p>
      </ResearchConfirmDialog>
    </>
  );
}

function QuickEditResearchButton({
  row,
  action,
  users,
  fundingInstitutions,
  assistantTeams,
  registerOptions,
  claimOptions,
}: {
  row: ResearchProjectRow;
  action: (
    projectId: string,
    formData: FormData,
  ) => Promise<{ initialProductionTask?: AutoCreatedTask | null } | void>;
  users: AuthorOption[];
  fundingInstitutions: FundingInstitutionOption[];
  assistantTeams: AssistantTeamOption[];
  registerOptions: { value: string; label: string }[];
  claimOptions: { value: string; label: string }[];
}) {
  if (!row.editValues || !row.editAuthors || !row.completedProductionSteps) {
    return null;
  }

  return (
    <span
      className="inline-flex flex-none align-middle"
      onClick={(event) => event.stopPropagation()}
    >
      <ResearchBasicEditDialog
        action={(formData) => action(row.id, formData)}
        values={row.editValues}
        authors={row.editAuthors}
        completedProductionSteps={row.completedProductionSteps}
        users={users}
        fundingInstitutions={fundingInstitutions}
        assistantTeams={assistantTeams}
        registerOptions={registerOptions}
        claimOptions={claimOptions}
        canEditRegistrationClaim
      />
    </span>
  );
}

export function ResearchProjectsTable({
  rows,
  isAdmin = false,
  deleteAction,
  quickEditAction,
  users = [],
  fundingInstitutions = [],
  assistantTeams = [],
  registerOptions = [],
  claimOptions = [],
  showClaimRegistration = true,
  emptyMessage = "No research matches the current search.",
  serverState,
}: {
  rows: ResearchProjectRow[];
  isAdmin?: boolean;
  deleteAction?: (projectId: string) => Promise<void>;
  quickEditAction?: (
    projectId: string,
    formData: FormData,
  ) => Promise<{ initialProductionTask?: AutoCreatedTask | null } | void>;
  users?: AuthorOption[];
  fundingInstitutions?: FundingInstitutionOption[];
  assistantTeams?: AssistantTeamOption[];
  registerOptions?: { value: string; label: string }[];
  claimOptions?: { value: string; label: string }[];
  showClaimRegistration?: boolean;
  emptyMessage?: string;
  serverState?: ServerTableState;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [storedQuery, setStoredQuery] = usePersistentTableValue(
    "projects:q",
    "",
  );
  const [storedStageValue, setStoredStageValue] = usePersistentTableValue(
    "projects:stage",
    "ALL",
  );
  const [storedClaimValue, setStoredClaimValue] = usePersistentTableValue(
    "projects:claim",
    "ALL",
  );
  const [storedRegistrationValue, setStoredRegistrationValue] =
    usePersistentTableValue("projects:registration", "ALL");
  const [storedSortValue, setStoredSortValue] = usePersistentTableValue(
    "projects:sort",
    "NONE",
  );
  const [storedFolderRequestValue, setStoredFolderRequestValue] =
    usePersistentTableValue("projects:folder-requests", "0");
  const [storedPriorityValue, setStoredPriorityValue] = usePersistentTableValue(
    "projects:priority",
    "0",
  );
  const [storedProductionQueueValue, setStoredProductionQueueValue] =
    usePersistentTableValue("projects:production-queue", "0");
  const hasServerState = Boolean(serverState);
  const query = serverState?.query ?? storedQuery;
  const [serverQueryDraft, setServerQueryDraft] = useState(query);
  const [, startServerQueryTransition] = useTransition();
  const stageValue = serverState?.stageValue ?? storedStageValue;
  const claimValue = serverState?.claimValue ?? storedClaimValue;
  const registrationValue =
    serverState?.registrationValue ?? storedRegistrationValue;
  const sortValue = serverState?.sortValue ?? storedSortValue;
  const folderRequestValue =
    serverState?.folderRequestValue ?? storedFolderRequestValue;
  const priorityValue = serverState?.priorityValue ?? storedPriorityValue;
  const productionQueueValue =
    serverState?.productionQueueValue ?? storedProductionQueueValue;
  const pendingFolderRequestCount = useMemo(
    () =>
      serverState?.pendingFolderRequestCount ??
      rows.reduce((total, row) => total + row.pendingFolderAccessRequests, 0),
    [rows, serverState?.pendingFolderRequestCount],
  );
  const hasPendingFolderRequests = pendingFolderRequestCount > 0;
  const showFolderRequestsOnly = isAdmin && folderRequestValue === "1";
  const showPriorityOnly = priorityValue === "1";
  const showProductionQueueOnly = isAdmin && productionQueueValue === "1";
  const sort = useMemo(() => parseSortValue(sortValue), [sortValue]);
  const selectedStages = useMemo(
    () => selectedFilterValues(stageValue, stages),
    [stageValue],
  );
  const selectedClaims = useMemo(
    () => selectedFilterValues(claimValue, claims),
    [claimValue],
  );
  const selectedRegistrations = useMemo(
    () => selectedFilterValues(registrationValue, registrations),
    [registrationValue],
  );
  const showRegistrationClaim = serverState
    ? showClaimRegistration
    : rows.some((row) => showClaimRegistration && row.canViewRegistrationClaim);
  const hasActiveFilters =
    (serverState ? serverQueryDraft : query).trim().length > 0 ||
    selectedStages.length > 0 ||
    selectedClaims.length > 0 ||
    selectedRegistrations.length > 0 ||
    showFolderRequestsOnly ||
    showPriorityOnly ||
    showProductionQueueOnly;

  const updateServerParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "ALL" || value === "NONE" || value === "0") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!hasServerState) return;
    setServerQueryDraft(query);
  }, [hasServerState, query]);

  useEffect(() => {
    if (!hasServerState) return;
    const nextQuery = serverQueryDraft.trim();
    if (nextQuery === query.trim()) return;

    const timeout = window.setTimeout(() => {
      startServerQueryTransition(() => {
        updateServerParams({ q: nextQuery, page: null });
      });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [hasServerState, query, serverQueryDraft, updateServerParams]);

  const filtered = useMemo(() => {
    if (serverState) return rows;
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStage =
        selectedStages.length === 0 ||
        selectedStages.includes(stageFilterKey(row));
      const matchesClaim =
        !showRegistrationClaim ||
        selectedClaims.length === 0 ||
        selectedClaims.includes(row.claimStatus);
      const matchesRegistration =
        !showRegistrationClaim ||
        selectedRegistrations.length === 0 ||
        selectedRegistrations.includes(row.registerStatus);
      const matchesFolderRequest =
        !showFolderRequestsOnly || row.pendingFolderAccessRequests > 0;
      const matchesPriority = !showPriorityOnly || row.isPriority;
      const matchesProductionQueue =
        !showProductionQueueOnly || Boolean(row.productionPriorityQueuedAt);
      const haystack = [
        row.title,
        row.researchCode,
        row.abstract,
        row.isPriority ? "priority" : "",
        row.productionPriorityQueuedAt ? "production queue" : "",
        row.coAuthors,
        row.leadResearcher,
        row.stage,
        row.canViewRegistrationClaim ? row.universityRegistration : "",
        row.canViewRegistrationClaim ? row.registerName : "",
        row.canViewRegistrationClaim ? row.registerStatus : "",
        row.canViewRegistrationClaim ? row.claimStatus : "",
      ]
        .join(" ")
        .toLowerCase();
      return (
        matchesStage &&
        matchesClaim &&
        matchesRegistration &&
        matchesFolderRequest &&
        matchesPriority &&
        matchesProductionQueue &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [
    query,
    rows,
    selectedClaims,
    selectedRegistrations,
    selectedStages,
    showFolderRequestsOnly,
    showProductionQueueOnly,
    showPriorityOnly,
    showRegistrationClaim,
    serverState,
  ]);

  const sortedRows = useMemo(() => {
    if (serverState) return filtered;
    if (showProductionQueueOnly) {
      return filtered
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          const leftTime = new Date(
            left.row.productionPriorityQueuedAt,
          ).getTime();
          const rightTime = new Date(
            right.row.productionPriorityQueuedAt,
          ).getTime();
          if (leftTime === rightTime) return left.index - right.index;
          return leftTime - rightTime;
        })
        .map(({ row }) => row);
    }
    if (!sort) return filtered;

    return filtered
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        let comparison = 0;

        if (sort.column === "stage") {
          comparison = left.row.activeTasks - right.row.activeTasks;
        } else if (sort.column === "submit") {
          comparison = left.row.submissions - right.row.submissions;
        } else if (sort.column === "claim") {
          comparison = claimLabel(left.row.claimStatus).localeCompare(
            claimLabel(right.row.claimStatus),
            undefined,
            { sensitivity: "base" },
          );
        } else {
          comparison = registrationSortLabel(left.row).localeCompare(
            registrationSortLabel(right.row),
            undefined,
            { sensitivity: "base" },
          );
        }

        if (comparison === 0) return left.index - right.index;
        return sort.direction === "desc" ? -comparison : comparison;
      })
      .map(({ row }) => row);
  }, [filtered, serverState, showProductionQueueOnly, sort]);

  const pagination = useTablePagination(sortedRows, 10, 1, "projects");
  const page = serverState?.page ?? pagination.page;
  const pageCount = serverState
    ? Math.max(1, Math.ceil(serverState.total / serverState.pageSize))
    : pagination.pageCount;
  const total = serverState?.total ?? pagination.total;
  const pageSize = serverState?.pageSize ?? pagination.pageSize;
  const pagedRows = serverState ? sortedRows : pagination.pagedRows;

  function setPage(pageNumber: number) {
    if (serverState) {
      updateServerParams({ page: pageNumber <= 1 ? null : String(pageNumber) });
      return;
    }
    pagination.setPage(pageNumber);
  }

  function updateSort(column: SortColumn) {
    const next = nextSortState(sort, column);
    const nextValue = stringifySortValue(next);
    if (serverState) {
      updateServerParams({ sort: nextValue, page: null });
      return;
    }
    setStoredSortValue(nextValue);
    setPage(1);
  }

  function updateQuery(value: string) {
    if (serverState) {
      setServerQueryDraft(value);
      return;
    }
    setStoredQuery(value);
    setPage(1);
  }

  function updateStages(values: string[]) {
    const next = values.length > 0 ? values.join(",") : "ALL";
    if (serverState) {
      updateServerParams({ stage: next, page: null });
      return;
    }
    setStoredStageValue(next);
    setPage(1);
  }

  function updateClaims(values: string[]) {
    const next = values.length > 0 ? values.join(",") : "ALL";
    if (serverState) {
      updateServerParams({ claim: next, page: null });
      return;
    }
    setStoredClaimValue(next);
    setPage(1);
  }

  function updateRegistrations(values: string[]) {
    const next = values.length > 0 ? values.join(",") : "ALL";
    if (serverState) {
      updateServerParams({ registration: next, page: null });
      return;
    }
    setStoredRegistrationValue(next);
    setPage(1);
  }

  function updateFolderRequestFilter(checked: boolean) {
    const next = checked ? "1" : "0";
    if (serverState) {
      updateServerParams({ folderRequests: next, page: null });
      return;
    }
    setStoredFolderRequestValue(next);
    setPage(1);
  }

  function updatePriorityFilter(checked: boolean) {
    const next = checked ? "1" : "0";
    if (serverState) {
      updateServerParams({ priority: next, page: null });
      return;
    }
    setStoredPriorityValue(next);
    setPage(1);
  }

  function updateProductionQueueFilter(checked: boolean) {
    const next = checked ? "1" : "0";
    if (serverState) {
      updateServerParams({ productionQueue: next, page: null });
      return;
    }
    setStoredProductionQueueValue(next);
    setPage(1);
  }

  return (
    <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C]">
      <div className="flex flex-col gap-3 border-b border-[#444444] bg-[#2C2C2C] py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <TableSearchInput
          value={serverState ? serverQueryDraft : query}
          onChange={updateQuery}
          placeholder={
            showRegistrationClaim
              ? "Search research, authors, registration..."
              : "Search research, authors..."
          }
        />
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:flex-nowrap lg:justify-end">
          <MultiFilterSelect
            values={selectedStages}
            onChange={updateStages}
            ariaLabel="Filter by stage"
            options={stages.map((item) => ({
              value: item,
              label: item === "ALL" ? "All stages" : stageLabel(item),
            }))}
          />
          {showRegistrationClaim && (
            <>
              <MultiFilterSelect
                values={selectedRegistrations}
                onChange={updateRegistrations}
                ariaLabel="Filter by registration"
                options={registrations.map((item) => ({
                  value: item,
                  label:
                    item === "ALL"
                      ? "All registrations"
                      : registrationLabel(item),
                }))}
              />
              <MultiFilterSelect
                values={selectedClaims}
                onChange={updateClaims}
                ariaLabel="Filter by claim"
                options={claims.map((item) => ({
                  value: item,
                  label: item === "ALL" ? "All claims" : claimLabel(item),
                }))}
              />
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
            <tr>
              <th className="w-[5.75rem] px-3 py-3">
                <span className="inline-flex items-center gap-1.5">
                  ID
                  {isAdmin ? (
                    <IconHint
                      label={
                        showProductionQueueOnly
                          ? "Show all research"
                          : "Show production priority queue"
                      }
                    >
                      <button
                        type="button"
                        aria-pressed={showProductionQueueOnly}
                        aria-label={
                          showProductionQueueOnly
                            ? "Show all research"
                            : "Show production priority queue"
                        }
                        onClick={() =>
                          updateProductionQueueFilter(!showProductionQueueOnly)
                        }
                        className={`research-allow-transform inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-0 active:translate-y-0 active:scale-95 ${
                          showProductionQueueOnly
                            ? "text-[#1F7180] drop-shadow-[0_0_0.45rem_rgba(31,113,128,0.22)] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-cyan-200"
                            : "text-[#667085] hover:text-[#1F7180] dark:text-[#B0B0B0] dark:hover:text-[#A8DADC]"
                        }`}
                      >
                        <ListOrdered className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </IconHint>
                  ) : null}
                </span>
              </th>
              <th className="px-3 py-3">
                <span className="inline-flex items-center gap-1.5">
                  Research
                  <IconHint
                    label={
                      showPriorityOnly
                        ? "Show all research"
                        : "Show priority research"
                    }
                  >
                    <button
                      type="button"
                      aria-pressed={showPriorityOnly}
                      aria-label={
                        showPriorityOnly
                          ? "Show all research"
                          : "Show priority research"
                      }
                      onClick={() => updatePriorityFilter(!showPriorityOnly)}
                      className={`research-allow-transform inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-0 active:translate-y-0 active:scale-95 ${
                        showPriorityOnly
                          ? "text-amber-700 drop-shadow-[0_0_0.45rem_rgba(217,119,6,0.22)] hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                          : "text-[#667085] hover:text-amber-700 dark:text-[#B0B0B0] dark:hover:text-amber-300"
                      }`}
                    >
                      <Star
                        className="h-4 w-4"
                        fill={showPriorityOnly ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                    </button>
                  </IconHint>
                  {isAdmin && (
                    <IconHint
                      label={
                        showFolderRequestsOnly
                          ? "Show all research"
                          : hasPendingFolderRequests
                            ? `${pendingFolderRequestCount} ongoing shared folder access ${pendingFolderRequestCount === 1 ? "request" : "requests"}`
                            : "Show research with ongoing shared folder requests"
                      }
                    >
                      <button
                        type="button"
                        aria-pressed={showFolderRequestsOnly}
                        aria-label={
                          showFolderRequestsOnly
                            ? "Show all research"
                            : "Show research with ongoing shared folder requests"
                        }
                        onClick={() =>
                          updateFolderRequestFilter(!showFolderRequestsOnly)
                        }
                        className={`research-allow-transform inline-flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-0 active:translate-y-0 active:scale-95 ${
                          showFolderRequestsOnly
                            ? "text-amber-700 drop-shadow-[0_0_0.45rem_rgba(217,119,6,0.22)] hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                            : hasPendingFolderRequests
                              ? "research-folder-request-alert text-amber-700 drop-shadow-[0_0_0.45rem_rgba(217,119,6,0.26)] hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                              : "text-[#667085] hover:text-amber-700 dark:text-[#B0B0B0] dark:hover:text-amber-300"
                        }`}
                      >
                        <FolderClock className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </IconHint>
                  )}
                </span>
              </th>
              <th className="w-[5.75rem] px-3 py-3">
                <span className="inline-flex items-center gap-1.5">
                  Stage
                  <SortHeaderButton
                    column="stage"
                    sort={sort}
                    onChange={updateSort}
                  />
                </span>
              </th>
              {showRegistrationClaim && (
                <>
                  <th className="w-[5.75rem] px-3 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      Claim
                      <SortHeaderButton
                        column="claim"
                        sort={sort}
                        onChange={updateSort}
                      />
                    </span>
                  </th>
                  <th className="w-[12rem] px-3 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      Registration
                      <SortHeaderButton
                        column="registration"
                        sort={sort}
                        onChange={updateSort}
                      />
                    </span>
                  </th>
                </>
              )}
              <th className="w-[5.75rem] px-3 py-3 text-center">
                <span className="inline-flex items-center justify-center gap-1.5">
                  Submit
                  <SortHeaderButton
                    column="submit"
                    sort={sort}
                    onChange={updateSort}
                  />
                </span>
              </th>
              {isAdmin && deleteAction && (
                <th className="w-14 px-3 py-3 text-center">
                  <span className="sr-only">Delete</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody
            key={sortValue}
            className="research-sortable-table-body divide-y divide-[#444444]"
          >
            {pagedRows.map((row) => (
              <tr
                key={row.id}
                className="group align-top transition-colors duration-150 hover:bg-[#383838]"
              >
                <td className="px-3 py-3 align-top">
                  <Link href={`/projects/${row.id}`}>
                    <span
                      className={`font-mono text-xs ${researchMutedLinkClass}`}
                    >
                      {row.researchCode || "-"}
                    </span>
                  </Link>
                  {row.isPriority ? (
                    <div className="mt-1">
                      <PriorityResearchIcon compact />
                    </div>
                  ) : null}
                  {isAdmin && row.productionQueuePosition ? (
                    <IconHint
                      label={`Production queue position ${row.productionQueuePosition}`}
                    >
                      <div className="mt-1 inline-flex items-center gap-1 border border-[#D8D0C2] bg-[#F5F2EC] px-1.5 py-0.5 font-mono text-[10px] font-normal text-[#1F7180] dark:border-[#444444] dark:bg-[#202020] dark:text-[#A8DADC]">
                        <ListOrdered className="h-3 w-3" aria-hidden="true" />
                        {row.productionQueuePosition}
                      </div>
                    </IconHint>
                  ) : null}
                </td>
                <td className="min-w-0 px-3 py-3 align-top">
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${row.id}`}
                      className="group inline"
                    >
                      <p
                        className={`inline text-base leading-6 group-hover:text-[#A8DADC] ${researchLinkClass}`}
                      >
                        {row.title}
                      </p>
                    </Link>
                    {isAdmin && quickEditAction ? (
                      <span className="ml-1.5 inline-flex translate-y-0.5 align-baseline">
                        <QuickEditResearchButton
                          row={row}
                          action={quickEditAction}
                          users={users}
                          fundingInstitutions={fundingInstitutions}
                          assistantTeams={assistantTeams}
                          registerOptions={registerOptions}
                          claimOptions={claimOptions}
                        />
                      </span>
                    ) : null}
                  </div>
                  <Link href={`/projects/${row.id}`} className="group">
                    <p className="mt-1 line-clamp-1 text-xs text-[#B0B0B0]">
                      {row.coAuthors || "No authors recorded"}
                    </p>
                    {row.abstract.trim() ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8F98A8] dark:text-[#8F98A8]">
                        {row.abstract}
                      </p>
                    ) : null}
                  </Link>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="inline-flex flex-col items-center">
                    <ResearchStageIndicator
                      row={row}
                      showTaskCounts={row.canViewTaskCounts}
                    />
                    <FolderAccessRequestCount
                      count={row.pendingFolderAccessRequests}
                    />
                  </div>
                </td>
                {showRegistrationClaim && (
                  <>
                    <td className="px-3 py-3 align-top">
                      {row.canViewRegistrationClaim ? (
                        <ClaimStatusChip status={row.claimStatus} />
                      ) : (
                        <span className="text-sm text-[#8b8392]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.canViewRegistrationClaim ? (
                        <RegistrationCell
                          status={row.registerStatus}
                          registration={row.universityRegistration}
                          registerName={row.registerName}
                        />
                      ) : (
                        <span className="text-sm text-[#8b8392]">-</span>
                      )}
                    </td>
                  </>
                )}
                <td className="px-3 py-3 text-center align-top">
                  <SubmitCount count={row.submissions} />
                </td>
                {isAdmin && deleteAction && (
                  <td className="px-3 py-3 text-center align-top">
                    <DeleteResearchButton
                      row={row}
                      deleteAction={deleteAction}
                    />
                  </td>
                )}
              </tr>
            ))}
            {total === 0 && (
              <tr>
                <td
                  colSpan={
                    (showRegistrationClaim ? 6 : 4) +
                    (isAdmin && deleteAction ? 1 : 0)
                  }
                  className="px-4 py-2"
                >
                  <ResearchEmptyState
                    title={
                      rows.length === 0
                        ? serverState && hasActiveFilters
                          ? "No research matches the current search."
                          : emptyMessage
                        : "No research matches the current search."
                    }
                    detail={
                      rows.length === 0
                        ? serverState && hasActiveFilters
                          ? "Try another keyword, stage, registration, or claim filter."
                          : "Create a new research record or adjust access filters when relevant."
                        : "Try another keyword, stage, registration, or claim filter."
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </div>
  );
}
