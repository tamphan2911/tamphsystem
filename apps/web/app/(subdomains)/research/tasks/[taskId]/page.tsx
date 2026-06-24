import {
  researchDateTimeFormat,
  researchDateValue,
} from "@/sites/research/lib/date-time";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  BookOpenText,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CircleHelp,
  ExternalLink,
  FileDown,
  FileText,
  Globe2,
  KeyRound,
  MapPinned,
  RotateCcw,
  SearchCheck,
  Send,
  UserRound,
} from "lucide-react";
import {
  prisma,
  JournalApprovalStatus,
  ResearchTaskStatus,
  ResearchTaskType,
  Role,
} from "@repo/db";
import { auth } from "../../../../../auth";
import { accessibleResearchReviewWhere } from "@/sites/research/lib/reviewAccess";
import {
  answerTaskClarification,
  finishResearchTask,
  markResearchTaskReadyForCheck,
  requestTaskClarification,
  requestTaskRedo,
  revokeResearchTask,
  sendTaskReminderEmail,
  updateTaskSuggestedReviewers,
} from "../../actions";
import {
  IconHint,
  researchLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import {
  currencySymbol,
  formatResearchNumber,
  normalizeResearchNumberInput,
} from "@/sites/research/lib/currency";
import { FinishTaskForm } from "./FinishTaskForm";
import { RevokeTaskForm } from "./RevokeTaskForm";
import { ClarificationRequestForm, RedoTaskForm } from "./TaskWorkflowForms";
import { EditTaskDialog } from "./EditTaskDialog";
import {
  TaskClarificationPanel,
  type TaskClarificationItem,
} from "./TaskClarificationPanel";
import { TaskReportPanel } from "./TaskReportPanel";
import { TaskReminderButton } from "./TaskReminderButton";
import {
  TaskJournalResults,
  type LinkableTaskJournal,
  type TaskJournalResult,
} from "./TaskJournalResults";
import {
  TaskProposalResult,
  type TaskProposalResultItem,
} from "./TaskProposalResult";
import { TaskGuideIcons, type TaskGuideOption } from "../TaskGuidePicker";
import {
  TaskSuggestedReviewerButton,
  TaskSuggestedReviewersTable,
  type SuggestedReviewerOption,
} from "./TaskSuggestedReviewers";

export const dynamic = "force-dynamic";

function dateInputValue(value: Date | null) {
  if (!value) return "";
  return researchDateValue(value);
}

function formatDate(value: Date | null) {
  if (!value) return "-";
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function fileSizeLabel(value: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function conferenceTime(start: Date | null, end: Date | null) {
  if (!start && !end) return "No time";
  if (start && end) return `${formatDate(start)} - ${formatDate(end)}`;
  return formatDate((start ?? end) as Date);
}

function firstUrl(value: string | null | undefined) {
  if (!value) return "";
  return value.match(/https?:\/\/[^\s,;]+/i)?.[0] ?? "";
}

function durationText(ms: number) {
  const absolute = Math.abs(ms);
  const hours = Math.max(1, Math.round(absolute / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`;
}

function statusMeta(task: {
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
  revokedAt?: Date | null;
}) {
  const now = new Date();

  if (task.status === "REVOKED") {
    return {
      label: "Revoked",
      detail: task.revokedAt
        ? `Revoked ${formatDate(task.revokedAt)}`
        : "Revoked",
      tone: "slate" as const,
      timeTone: "slate" as const,
    };
  }

  if (task.status === "COMPLETED") {
    if (!task.dueDate || !task.completedAt) {
      return {
        label: "Complete",
        detail: "Finished",
        tone: "emerald" as const,
        timeTone: "emerald" as const,
      };
    }
    if (task.completedAt <= task.dueDate) {
      return {
        label: "Complete",
        detail: `${durationText(task.dueDate.getTime() - task.completedAt.getTime())} early`,
        tone: "emerald" as const,
        timeTone: "emerald" as const,
      };
    }
    return {
      label: "Overdue",
      detail: `${durationText(task.completedAt.getTime() - task.dueDate.getTime())} late`,
      tone: "rose" as const,
      timeTone: "rose" as const,
    };
  }

  if (task.status === "CHECKING") {
    return {
      label: "Checking",
      detail: "Waiting for assigner review",
      tone: "violet" as const,
      timeTone: "violet" as const,
    };
  }

  if (task.status === "REVISION_REQUESTED") {
    return {
      label: "Revision requested",
      detail: "Waiting assignee revision",
      tone: "amber" as const,
      timeTone: "amber" as const,
    };
  }

  if (task.status === "NEED_CLARIFY") {
    return {
      label: "Need clarify",
      detail: "Waiting for assigner answer",
      tone: "amber" as const,
      timeTone: "amber" as const,
    };
  }

  if (task.dueDate && now > task.dueDate) {
    return {
      label: "Overdue",
      detail: `${durationText(now.getTime() - task.dueDate.getTime())} overdue`,
      tone: "rose" as const,
      timeTone: "rose" as const,
    };
  }

  return {
    label: "In progress",
    detail: task.dueDate
      ? `${durationText(task.dueDate.getTime() - now.getTime())} left`
      : "No due date",
    tone: "blue" as const,
    timeTone: task.dueDate ? ("blue" as const) : ("slate" as const),
  };
}

function statusIconMeta(
  task: {
    status: string;
    dueDate: Date | null;
    completedAt: Date | null;
    revokedAt?: Date | null;
  },
  label: string,
): {
  icon: LucideIcon;
  className: string;
} {
  if (task.status === "REVOKED") {
    return {
      icon: Ban,
      className:
        "text-slate-500 hover:text-slate-700 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]",
    };
  }

  if (task.status === "COMPLETED") {
    return {
      icon: CheckCircle2,
      className:
        "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200",
    };
  }

  if (task.status === "CHECKING") {
    return {
      icon: SearchCheck,
      className:
        "text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
    };
  }

  if (task.status === "REVISION_REQUESTED") {
    return {
      icon: RotateCcw,
      className: "text-orange-700 dark:text-orange-300",
    };
  }

  if (task.status === "NEED_CLARIFY") {
    return {
      icon: CircleHelp,
      className:
        "text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200",
    };
  }

  if (label === "Overdue") {
    return {
      icon: AlertTriangle,
      className:
        "text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200",
    };
  }

  return {
    icon: Clock3,
    className:
      "text-sky-700 hover:text-sky-800 dark:text-[#A8DADC] dark:hover:text-cyan-200",
  };
}

function timeTextClass(
  tone: "emerald" | "rose" | "blue" | "slate" | "violet" | "amber",
) {
  if (tone === "emerald") return "research-task-time-emerald";
  if (tone === "rose") return "research-task-time-rose";
  if (tone === "blue") return "research-task-time-blue";
  if (tone === "violet") return "research-task-time-violet";
  if (tone === "amber") return "research-task-time-amber";
  return "research-task-time-slate";
}

function taskTypeMeta(taskType: string | null, category: string | null) {
  if (taskType === "SUBMIT_RESEARCH" || taskType === "SUBMIT_CONFERENCE") {
    return {
      label:
        taskType === "SUBMIT_CONFERENCE"
          ? "Submit conference"
          : "Submit journal",
      icon: Send,
      className: "text-[#A8DADC]",
    };
  }
  if (taskType === "PRODUCTION") {
    return {
      label: "Production",
      icon: FileText,
      className: "text-[#FFC1CC]",
    };
  }
  if (taskType === "SUGGEST_VENUE") {
    return {
      label: "Suggest venue",
      icon: MapPinned,
      className:
        "text-[#A06716] hover:text-[#7A4D10] dark:text-[#F4D47A] dark:hover:text-amber-200",
    };
  }
  if (taskType === "ADD_JOURNAL") {
    return {
      label: "Add journal",
      icon: BookOpenText,
      className:
        "text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-cyan-200",
    };
  }
  if (taskType === "PROPOSAL") {
    return {
      label: "Proposal",
      icon: ClipboardList,
      className:
        "text-[#70549B] hover:text-[#563B7E] dark:text-[#B39CD0] dark:hover:text-[#D0BCE5]",
    };
  }
  if (taskType === "REVIEW") {
    return {
      label: "Review",
      icon: SearchCheck,
      className: "text-[#B39CD0]",
    };
  }
  if (
    taskType === "PROJECT_PRODUCTION" ||
    taskType === "PROJECT_RESEARCH_ASSOCIATED"
  ) {
    return {
      label: "Project",
      icon: ClipboardList,
      className: "text-[#F4D47A]",
    };
  }
  return {
    label: category || "Task",
    icon: ClipboardList,
    className: "text-[#B0B0B0]",
  };
}

function DetailSeparator() {
  return (
    <span className="px-2 text-[#A0A8B5] dark:text-[#777777]" aria-hidden>
      |
    </span>
  );
}

function displayRole(roles: Role[]) {
  if (roles.includes(Role.ADMIN)) return "Admin";
  if (roles.includes(Role.CHIEF_ASSISTANT)) return "Chief assistant";
  if (roles.includes(Role.ASSISTANT)) return "Assistant";
  if (roles.includes(Role.RESEARCHER)) return "Researcher";
  if (roles.includes(Role.LECTURER)) return "Lecturer";
  return (
    roles[0]
      ?.replace("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "User"
  );
}

function TaskPersonLine({
  person,
}: {
  person: { name: string | null; email: string; roles: Role[] };
}) {
  return (
    <span className="flex min-w-0 items-start gap-3">
      <UserRound className="research-task-icon-motion mt-0.5 h-4 w-4 flex-none text-amber-700 dark:text-amber-300" />
      <span className="min-w-0 leading-tight">
        <span className="flex min-w-0 flex-wrap items-center text-sm font-normal text-[#1F2937] dark:text-[#E4E4E4]">
          <span className="min-w-0 truncate">
            {displayResearchPersonName(person)}
          </span>
          <DetailSeparator />
          <span className="text-xs text-[#667085] dark:text-[#B0B0B0]">
            {displayRole(person.roles)}
          </span>
        </span>
      </span>
    </span>
  );
}

function TaskResultBlock({
  result,
}: {
  result: {
    kind: "approved" | "revoked";
    date: Date | null;
    note: string | null;
    actor: { name: string | null; email: string; roles: Role[] } | null;
  };
}) {
  const Icon = result.kind === "approved" ? CheckCircle2 : Ban;
  const title = result.kind === "approved" ? "Approved as complete" : "Revoked";
  const noteFallback =
    result.kind === "approved"
      ? "No approval note recorded."
      : "No revoke reason recorded.";

  return (
    <div className="mt-3 border-t border-[#D8D0C2] pt-3 text-xs leading-5 text-[#667085] dark:border-[#444444] dark:text-[#B0B0B0]">
      <div className="flex items-center gap-2 font-semibold text-[#1F2937] dark:text-[#E4E4E4]">
        <Icon
          className={`h-3.5 w-3.5 ${
            result.kind === "approved"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-rose-700 dark:text-rose-300"
          }`}
        />
        <span>{title}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center">
        {result.actor ? (
          <>
            <span>{displayResearchPersonName(result.actor)}</span>
            <DetailSeparator />
            <span>{displayRole(result.actor.roles)}</span>
          </>
        ) : (
          <span>Updater not recorded</span>
        )}
        <DetailSeparator />
        <span>{formatDate(result.date)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap">{result.note || noteFallback}</p>
    </div>
  );
}

function TaskRedoBlock({
  redo,
}: {
  redo: {
    date: Date | null;
    note: string | null;
    actor: { name: string | null; email: string; roles: Role[] } | null;
  };
}) {
  return (
    <div className="mt-3 border-t border-[#D8D0C2] pt-3 text-xs leading-5 text-[#7A4B00] dark:border-[#444444] dark:text-orange-200">
      <div className="flex items-center gap-2 font-semibold text-orange-700 dark:text-orange-300">
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Revision requested</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center text-[#667085] dark:text-[#B0B0B0]">
        {redo.actor ? (
          <>
            <span>{displayResearchPersonName(redo.actor)}</span>
            <DetailSeparator />
            <span>{displayRole(redo.actor.roles)}</span>
          </>
        ) : (
          <span>Requester not recorded</span>
        )}
        <DetailSeparator />
        <span>{formatDate(redo.date)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap">
        {redo.note || "No revision note recorded."}
      </p>
    </div>
  );
}

function AccountLine({
  account,
}: {
  account: { username: string; password: string; email: string | null } | null;
}) {
  if (!account) return <span>No account assigned</span>;
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-y-1">
      <span>ID: {account.username || "No account id"}</span>
      <DetailSeparator />
      <span>pass: {account.password || "No pass"}</span>
      <DetailSeparator />
      <span>email: {account.email || "No email"}</span>
    </span>
  );
}

type TaskSubmissionInfo = {
  kind: "journal" | "conference";
  code: string;
  status: string;
  submittedAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  withdrawnAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date | null;
  articleUrl?: string | null;
  note?: string | null;
};

function SubmissionInfoPanel({
  submission,
}: {
  submission: TaskSubmissionInfo;
}) {
  const dateItems = [
    ["Submitted", submission.submittedAt],
    ["Accepted", submission.acceptedAt],
    ["Rejected", submission.rejectedAt],
    ["Withdrawn", submission.withdrawnAt],
    ["Published", submission.publishedAt],
    ["Updated", submission.updatedAt],
  ].filter((row): row is [string, Date] => Boolean(row[1]));

  return (
    <aside className="min-w-0 self-start border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-300/35 dark:bg-emerald-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Submission result
          </div>
          <p className="mt-2 min-w-0 text-sm font-normal leading-6 text-[#1F2937] dark:text-[#E4E4E4]">
            Completed submission record
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          {submission.articleUrl ? (
            <ExternalVenueLink
              href={submission.articleUrl}
              label="Open article"
              className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              <ExternalLink className="h-4 w-4" />
            </ExternalVenueLink>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-y-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
        <span className="text-emerald-700 dark:text-emerald-300">
          ID: {submission.code}
        </span>
        <DetailSeparator />
        <span>Status: {submission.status.replaceAll("_", " ")}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-y-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
        {dateItems.length > 0 ? (
          dateItems.map(([label, value], index) => (
            <span key={label} className="inline-flex items-center">
              {index > 0 ? <DetailSeparator /> : null}
              <span>
                {label}: {formatDate(value)}
              </span>
            </span>
          ))
        ) : (
          <span>No submission date recorded</span>
        )}
      </div>
      {submission.note ? (
        <div className="mt-3 border-t border-emerald-200 pt-3 text-xs leading-5 text-[#667085] dark:border-emerald-300/25 dark:text-[#B0B0B0]">
          {submission.note}
        </div>
      ) : null}
    </aside>
  );
}

type TaskSuggestedVenueInfo = {
  id: string;
  kind: "journal" | "conference";
  name: string;
  status: string;
  meta: string;
  apc: string | null;
  apcCurrency: string;
  submissionFee: string | null;
  submissionFeeCurrency: string;
  journalNote: string | null;
  venueNote: string | null;
  declineReason: string | null;
  venueLink: string | null;
  createdAt: Date;
};

function taskVenueMoney(amount: string | null, currency: string) {
  const normalized = normalizeResearchNumberInput(amount);
  if (!normalized || Number(normalized) === 0) return "Free";
  return `${currencySymbol(currency)}${formatResearchNumber(normalized)}`;
}

function taskVenueMoneyClass(amount: string | null) {
  const normalized = normalizeResearchNumberInput(amount);
  const value = Number(normalized || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return "text-emerald-700 dark:text-emerald-300";
  }
  if (value > 1000) return "text-rose-700 dark:text-rose-300";
  return "text-[#344054] dark:text-[#E4E4E4]";
}

function suggestedVenueStatusClass(status: string) {
  if (status === "APPROVED") {
    return "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-300/35 dark:bg-emerald-950/35 dark:text-emerald-200";
  }
  if (status === "DECLINED") {
    return "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-300/35 dark:bg-rose-950/35 dark:text-rose-200";
  }
  return "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-300/35 dark:bg-amber-950/35 dark:text-amber-200";
}

function SuggestedVenueResultsPanel({
  venues,
}: {
  venues: TaskSuggestedVenueInfo[];
}) {
  return (
    <aside className="min-w-0 self-start border border-[#D8D0C2] bg-[#FFFDF8] dark:border-[#444444] dark:bg-[#262626]">
      <div className="flex items-center justify-between gap-3 border-b border-[#D8D0C2] px-4 py-3 dark:border-[#444444]">
        <div className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#1F7180] dark:text-[#A8DADC]">
          <CircleHelp className="h-3.5 w-3.5" />
          Suggested venue results
        </div>
        <span className="text-xs text-[#667085] dark:text-[#B0B0B0]">
          {venues.length}
        </span>
      </div>
      <div className="grid md:grid-cols-2">
        {venues.map((venue) => (
          <article
            key={`${venue.kind}-${venue.id}`}
            className="min-w-0 border-b border-[#E5DED2] p-4 last:border-b-0 dark:border-[#444444] md:odd:border-r md:even:last:border-b-0"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase text-[#667085] dark:text-[#8F8F8F]">
                  {venue.kind}
                </p>
                <p className="mt-1 break-words text-sm leading-5 text-[#1F2937] dark:text-[#E4E4E4]">
                  {venue.name}
                </p>
              </div>
              <span
                className={`flex-none border px-2 py-1 text-[10px] uppercase ${suggestedVenueStatusClass(venue.status)}`}
              >
                {venue.status.replaceAll("_", " ")}
              </span>
            </div>
            {venue.meta ? (
              <p className="mt-2 break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                {venue.meta}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-y-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
              <span>
                APC:{" "}
                <span className={taskVenueMoneyClass(venue.apc)}>
                  {taskVenueMoney(venue.apc, venue.apcCurrency)}
                </span>
              </span>
              <DetailSeparator />
              <span>
                Fee:{" "}
                <span className={taskVenueMoneyClass(venue.submissionFee)}>
                  {taskVenueMoney(
                    venue.submissionFee,
                    venue.submissionFeeCurrency,
                  )}
                </span>
              </span>
              <DetailSeparator />
              <span>Suggested: {formatDate(venue.createdAt)}</span>
              {venue.venueLink ? (
                <>
                  <DetailSeparator />
                  <ExternalVenueLink
                    href={venue.venueLink}
                    label={`Open ${venue.name}`}
                    className="text-[#1F7180] hover:text-[#155967] dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </ExternalVenueLink>
                </>
              ) : null}
            </div>
            {venue.journalNote ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                {venue.kind === "journal" ? "Journal note" : "Conference note"}:{" "}
                {venue.journalNote}
              </p>
            ) : null}
            {venue.venueNote ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                Venue note: {venue.venueNote}
              </p>
            ) : null}
            {venue.declineReason ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-rose-700 dark:text-rose-300">
                Decline reason: {venue.declineReason}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </aside>
  );
}

function journalMetaLine(journal: {
  publisher: string | null;
  rank: string | null;
  localRank?: string | null;
  type?: string | null;
}) {
  const rankLabel =
    journal.type === "LOCAL"
      ? journal.localRank || "No local rank"
      : journal.rank || "No rank";
  return `${journal.publisher || "No publisher"} - ${rankLabel}`;
}

function researchAuthors(project: {
  leadResearcher: { name: string | null; email: string };
  authors: { name: string | null; email: string }[];
  authorEntries: {
    isCorresponding: boolean;
    user: { name: string | null; email: string };
  }[];
  coAuthors: string | null;
}) {
  const names =
    project.authorEntries.length > 0
      ? project.authorEntries.map(
          (entry) =>
            `${displayResearchPersonName(entry.user)}${entry.isCorresponding ? "*" : ""}`,
        )
      : project.authors.length > 0
        ? project.authors.map(
            (author, index) =>
              `${displayResearchPersonName(author)}${index === 0 ? "*" : ""}`,
          )
        : [
            `${displayResearchPersonName(project.leadResearcher)}*`,
            project.coAuthors,
          ].filter(Boolean);
  return names.join("; ");
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  const roles =
    currentUser?.roles ??
    (((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[]);

  const isAdmin =
    roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
  const isRootAdmin = roles.includes(Role.ADMIN);
  const isChiefAssistant = roles.includes(Role.CHIEF_ASSISTANT);
  await prisma.researchTask.updateMany({
    where: { status: ResearchTaskStatus.OPEN },
    data: { status: ResearchTaskStatus.IN_PROGRESS },
  });

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      status: true,
      dueDate: true,
      completedAt: true,
      completedById: true,
      completionMessage: true,
      redoRequestedAt: true,
      redoRequestedById: true,
      redoReason: true,
      revokedAt: true,
      revokedById: true,
      revokeReason: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      checkerId: true,
      projectId: true,
      organizedProjectId: true,
      journalId: true,
      conferenceId: true,
      reviewId: true,
      accountId: true,
      taskType: true,
      taskFileName: true,
      taskFileSize: true,
      allowAssigneeReportUpload: true,
      journalTargetCount: true,
      journalCreationSuggestion: { select: { id: true } },
      journalSubmissionSuggestion: {
        select: {
          id: true,
          venueName: true,
          venueLink: true,
          note: true,
          status: true,
          declineReason: true,
          createdAt: true,
          journal: {
            select: {
              name: true,
              issn: true,
              publisher: true,
              rank: true,
              localRank: true,
              apc: true,
              apcCurrency: true,
              submissionFee: true,
              submissionFeeCurrency: true,
              note: true,
              homepageLink: true,
            },
          },
        },
      },
      conferenceSubmissionSuggestion: {
        select: {
          id: true,
          venueName: true,
          venueLink: true,
          note: true,
          status: true,
          declineReason: true,
          createdAt: true,
          conference: {
            select: {
              name: true,
              type: true,
              organizer: true,
              location: true,
              startDate: true,
              endDate: true,
              apc: true,
              apcCurrency: true,
              submissionFee: true,
              submissionFeeCurrency: true,
              note: true,
              website: true,
            },
          },
        },
      },
      reportFileName: true,
      reportFileSize: true,
      reportUploadedAt: true,
      guides: {
        select: {
          id: true,
          guideCode: true,
          title: true,
          content: true,
          importantNote: true,
        },
        orderBy: [{ updatedAt: "desc" }, { guideCode: "asc" }],
      },
      suggestedReviewers: {
        select: {
          id: true,
          name: true,
          email: true,
          institution: true,
          bio: true,
        },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      },
      suggestedJournals: {
        select: {
          id: true,
          venueName: true,
          venueLink: true,
          note: true,
          status: true,
          declineReason: true,
          createdAt: true,
          journal: {
            select: {
              name: true,
              issn: true,
              publisher: true,
              rank: true,
              localRank: true,
              apc: true,
              apcCurrency: true,
              submissionFee: true,
              submissionFeeCurrency: true,
              note: true,
              homepageLink: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      suggestedConferences: {
        select: {
          id: true,
          venueName: true,
          venueLink: true,
          note: true,
          status: true,
          declineReason: true,
          createdAt: true,
          conference: {
            select: {
              name: true,
              type: true,
              organizer: true,
              location: true,
              startDate: true,
              endDate: true,
              apc: true,
              apcCurrency: true,
              submissionFee: true,
              submissionFeeCurrency: true,
              note: true,
              website: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      addedJournals: {
        select: {
          id: true,
          resultPosition: true,
          name: true,
          issn: true,
          publisher: true,
          rank: true,
          localRank: true,
          type: true,
          issuesPerYear: true,
          isFavorite: true,
          isInterest: true,
          publisherId: true,
          fields: true,
          field: true,
          country: true,
          apc: true,
          apcCurrency: true,
          hasApcOption: true,
          submissionFee: true,
          submissionFeeCurrency: true,
          homepageLink: true,
          submissionLink: true,
          scimagoLink: true,
          scopusLink: true,
          note: true,
          approvalStatus: true,
          publisherRecord: { select: { approvalStatus: true } },
          createdBy: { select: { name: true, email: true } },
        },
        orderBy: { resultPosition: "asc" },
      },
      proposalResult: {
        select: {
          id: true,
          type: true,
          status: true,
          title: true,
          description: true,
          contactInfo: true,
          notes: true,
          supportFileName: true,
          supportFileSize: true,
          decisionComment: true,
          createdAt: true,
          submittedBy: { select: { name: true, email: true } },
        },
      },
      reportUploadedById: true,
      createdBy: { select: { name: true, email: true, roles: true } },
      checker: { select: { name: true, email: true, roles: true } },
      completedBy: { select: { name: true, email: true, roles: true } },
      redoRequestedBy: { select: { name: true, email: true, roles: true } },
      revokedBy: { select: { name: true, email: true, roles: true } },
      project: {
        select: {
          id: true,
          title: true,
          coAuthors: true,
          leadResearcherId: true,
          leadResearcher: { select: { name: true, email: true } },
          authors: {
            select: { id: true, name: true, email: true },
            orderBy: [{ name: "asc" }, { email: "asc" }],
          },
          authorEntries: {
            select: {
              userId: true,
              isCorresponding: true,
              user: { select: { name: true, email: true } },
            },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
          organizedProjectLinks: {
            select: {
              organizedProject: {
                select: {
                  createdById: true,
                  members: { select: { userId: true } },
                },
              },
            },
          },
        },
      },
      organizedProject: {
        select: {
          id: true,
          title: true,
          referenceCode: true,
          createdById: true,
          members: { select: { userId: true } },
        },
      },
      review: {
        select: {
          id: true,
          manuscriptTitle: true,
          status: true,
          journal: { select: { name: true } },
        },
      },
      journal: {
        select: {
          id: true,
          name: true,
          type: true,
          rank: true,
          localRank: true,
          publisher: true,
          homepageLink: true,
          submissionLink: true,
          note: true,
        },
      },
      conference: {
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          startDate: true,
          endDate: true,
          website: true,
          note: true,
        },
      },
      account: {
        select: { id: true, username: true, password: true, email: true },
      },
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true, roles: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      clarifications: {
        include: {
          requestedBy: { select: { name: true, email: true } },
          answeredBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!task) notFound();
  const linkedJournalSubmissionSuggestion =
    task.journalSubmissionSuggestion ??
    (task.taskType === ResearchTaskType.SUBMIT_RESEARCH &&
    task.projectId &&
    task.journalId
      ? await prisma.suggestedJournal.findFirst({
          where: { projectId: task.projectId, journalId: task.journalId },
          select: {
            id: true,
            venueName: true,
            venueLink: true,
            note: true,
            status: true,
            declineReason: true,
            createdAt: true,
            journal: {
              select: {
                name: true,
                issn: true,
                publisher: true,
                rank: true,
                localRank: true,
                apc: true,
                apcCurrency: true,
                submissionFee: true,
                submissionFeeCurrency: true,
                note: true,
                homepageLink: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : null);
  const linkedConferenceSubmissionSuggestion =
    task.conferenceSubmissionSuggestion ??
    (task.taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
    task.projectId &&
    task.conferenceId
      ? await prisma.suggestedConference.findFirst({
          where: {
            projectId: task.projectId,
            conferenceId: task.conferenceId,
          },
          select: {
            id: true,
            venueName: true,
            venueLink: true,
            note: true,
            status: true,
            declineReason: true,
            createdAt: true,
            conference: {
              select: {
                name: true,
                type: true,
                organizer: true,
                location: true,
                startDate: true,
                endDate: true,
                apc: true,
                apcCurrency: true,
                submissionFee: true,
                submissionFeeCurrency: true,
                note: true,
                website: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : null);
  const myAssignment = task.assignments.find(
    (assignment) => assignment.userId === userId,
  );
  const isAssigner = task.createdById === userId;
  const isChecker = task.checkerId === userId;
  const isAssignee = Boolean(myAssignment);
  const selfAssigned = isAssigner && isAssignee;
  const isRelatedResearchTask =
    task.project?.leadResearcherId === userId ||
    task.project?.authors.some((author) => author.id === userId) ||
    task.project?.authorEntries.some((entry) => entry.userId === userId) ||
    task.project?.organizedProjectLinks.some(
      ({ organizedProject }) =>
        organizedProject.createdById === userId ||
        organizedProject.members.some((member) => member.userId === userId),
    );
  const isRelatedOrganizedProjectTask =
    task.organizedProject?.createdById === userId ||
    task.organizedProject?.members.some((member) => member.userId === userId);
  const canAccessAsChiefAssistant =
    isChiefAssistant &&
    (isAssigner ||
      isChecker ||
      isAssignee ||
      Boolean(isRelatedResearchTask) ||
      Boolean(isRelatedOrganizedProjectTask));
  const canManageThisTask = isRootAdmin || canAccessAsChiefAssistant;
  if (!canManageThisTask && !isAssigner && !isAssignee) notFound();

  const taskJournalPublishers =
    task.taskType === "ADD_JOURNAL"
      ? await prisma.publisher.findMany({
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            publisherCode: true,
            name: true,
            alias: true,
            country: true,
            usesSingleAccount: true,
          },
        })
      : [];
  const linkableTaskJournals: LinkableTaskJournal[] =
    task.taskType === "ADD_JOURNAL" && isRootAdmin
      ? (
          await prisma.journal.findMany({
            where: { resultTaskId: null },
            orderBy: [{ name: "asc" }],
            select: {
              id: true,
              name: true,
              issn: true,
              publisher: true,
              rank: true,
              localRank: true,
              fields: true,
              field: true,
              country: true,
              approvalStatus: true,
            },
          })
        ).map((journal) => ({
          id: journal.id,
          name: journal.name,
          issn: journal.issn ?? "",
          publisher: journal.publisher ?? "",
          rank: journal.rank ?? journal.localRank ?? "",
          fields: journal.fields.length
            ? journal.fields
            : journal.field
              ? journal.field
                  .split(";")
                  .map((field) => field.trim())
                  .filter(Boolean)
              : [],
          country: journal.country ?? "",
          approvalStatus: journal.approvalStatus,
        }))
      : [];
  const taskDuplicateJournals =
    task.taskType === "ADD_JOURNAL"
      ? await prisma.journal.findMany({
          orderBy: [{ name: "asc" }],
          select: { id: true, name: true, issn: true },
        })
      : [];

  const associatedJournalSubmission =
    task.projectId && task.journalId
      ? await prisma.researchSubmission.findUnique({
          where: {
            researchProjectId_journalId: {
              researchProjectId: task.projectId,
              journalId: task.journalId,
            },
          },
          select: {
            id: true,
            submissionCode: true,
            status: true,
            submittedAt: true,
            acceptedAt: true,
            rejectedAt: true,
            withdrawnAt: true,
            publishedAt: true,
            articleUrl: true,
            updatedAt: true,
            account: {
              select: {
                id: true,
                username: true,
                password: true,
                email: true,
              },
            },
          },
        })
      : null;
  const associatedConferenceSubmission =
    task.projectId && task.conferenceId
      ? await prisma.conferenceSubmission.findUnique({
          where: {
            conferenceId_researchProjectId: {
              conferenceId: task.conferenceId,
              researchProjectId: task.projectId,
            },
          },
          select: {
            id: true,
            submissionCode: true,
            status: true,
            submittedAt: true,
            acceptedAt: true,
            rejectedAt: true,
            withdrawnAt: true,
            publishedAt: true,
            note: true,
            updatedAt: true,
          },
        })
      : null;
  const journalAccount = associatedJournalSubmission
    ? associatedJournalSubmission.account
    : task.account;
  const submissionInfo: TaskSubmissionInfo | null =
    task.status === ResearchTaskStatus.COMPLETED &&
    task.taskType === "SUBMIT_RESEARCH" &&
    associatedJournalSubmission
      ? {
          kind: "journal",
          code:
            associatedJournalSubmission.submissionCode ??
            associatedJournalSubmission.id.slice(0, 8).toUpperCase(),
          status: associatedJournalSubmission.status,
          submittedAt: associatedJournalSubmission.submittedAt,
          acceptedAt: associatedJournalSubmission.acceptedAt,
          rejectedAt: associatedJournalSubmission.rejectedAt,
          withdrawnAt: associatedJournalSubmission.withdrawnAt,
          publishedAt: associatedJournalSubmission.publishedAt,
          updatedAt: associatedJournalSubmission.updatedAt,
          articleUrl: associatedJournalSubmission.articleUrl,
        }
      : task.status === ResearchTaskStatus.COMPLETED &&
          task.taskType === "SUBMIT_CONFERENCE" &&
          associatedConferenceSubmission
        ? {
            kind: "conference",
            code:
              associatedConferenceSubmission.submissionCode ??
              associatedConferenceSubmission.id.slice(0, 8).toUpperCase(),
            status: associatedConferenceSubmission.status,
            submittedAt: associatedConferenceSubmission.submittedAt,
            acceptedAt: associatedConferenceSubmission.acceptedAt,
            rejectedAt: associatedConferenceSubmission.rejectedAt,
            withdrawnAt: associatedConferenceSubmission.withdrawnAt,
            publishedAt: associatedConferenceSubmission.publishedAt,
            updatedAt: associatedConferenceSubmission.updatedAt,
            note: associatedConferenceSubmission.note,
          }
        : null;

  let taskClarifications = task.clarifications;
  const demoRequester = task.assignments.find(
    (assignment) => assignment.userId !== task.createdById,
  );
  const hasDemoParticipant = [
    task.title,
    task.createdBy.name,
    task.createdBy.email,
    ...task.assignments.flatMap((assignment) => [
      assignment.user.name,
      assignment.user.email,
    ]),
  ].some((value) => value?.toLowerCase().includes("demo"));

  if (taskClarifications.length === 0 && demoRequester && hasDemoParticipant) {
    const now = new Date();
    await prisma.researchTaskClarification.createMany({
      data: [
        {
          taskId: task.id,
          requestedById: demoRequester.userId,
          answeredById: task.createdById,
          question: `For "${task.title}", should I use the journal template or the university template?`,
          answer: `For "${task.title}", use the journal template for the main manuscript and keep the university format only for the internal archive copy.`,
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 28),
          answeredAt: new Date(now.getTime() - 1000 * 60 * 60 * 25),
        },
        {
          taskId: task.id,
          requestedById: demoRequester.userId,
          answeredById: task.createdById,
          question: `For "${task.title}", two affiliations are missing. Should I pause until they are updated?`,
          answer:
            "Please continue preparing the package, but do not submit until the affiliations are added.",
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 8),
          answeredAt: new Date(now.getTime() - 1000 * 60 * 60 * 6),
        },
      ],
    });
    taskClarifications = await prisma.researchTaskClarification.findMany({
      where: { taskId: task.id },
      include: {
        requestedBy: { select: { name: true, email: true } },
        answeredBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const meta = statusMeta(task);
  const taskResult =
    task.status === ResearchTaskStatus.COMPLETED
      ? {
          kind: "approved" as const,
          date: task.completedAt,
          note: task.completionMessage,
          actorId: task.completedById,
          actor: task.completedBy,
        }
      : task.status === ResearchTaskStatus.REVOKED
        ? {
            kind: "revoked" as const,
            date: task.revokedAt,
            note: task.revokeReason,
            actorId: task.revokedById,
            actor: task.revokedBy,
          }
        : null;
  const checkerPerson = task.checker ?? task.createdBy;
  const resultUnderChecker = Boolean(
    taskResult &&
    (taskResult.actorId === task.checkerId ||
      task.checkerId === task.createdById ||
      (!task.checkerId && taskResult.actorId === task.createdById) ||
      (!taskResult.actorId && !task.checkerId)),
  );
  const redoInfo =
    task.status !== ResearchTaskStatus.COMPLETED &&
    task.status !== ResearchTaskStatus.REVOKED &&
    task.redoRequestedAt
      ? {
          date: task.redoRequestedAt,
          note: task.redoReason,
          actorId: task.redoRequestedById,
          actor: task.redoRequestedBy,
        }
      : null;
  const redoUnderChecker = Boolean(
    redoInfo &&
    (redoInfo.actorId === task.checkerId ||
      task.checkerId === task.createdById ||
      (!task.checkerId && redoInfo.actorId === task.createdById) ||
      (!redoInfo.actorId && !task.checkerId)),
  );
  const taskType = taskTypeMeta(task.taskType, task.category);
  const TaskTypeIcon = taskType.icon;
  const statusIcon = statusIconMeta(task, meta.label);
  const StatusIcon = statusIcon.icon;
  const finishAction = finishResearchTask.bind(null, task.id);
  const readyAction = markResearchTaskReadyForCheck.bind(null, task.id);
  const redoAction = requestTaskRedo.bind(null, task.id);
  const reminderAction = sendTaskReminderEmail.bind(null, task.id);
  const clarificationAction = requestTaskClarification.bind(null, task.id);
  const clarificationAnswerAction = answerTaskClarification.bind(null, task.id);
  const revokeAction = revokeResearchTask.bind(null, task.id);
  const hasOpenMyClarification = taskClarifications.some(
    (clarification) =>
      clarification.requestedById === userId && !clarification.answer,
  );
  const isClosed =
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED;
  const isAutomatedJournalTask = Boolean(task.journalCreationSuggestion);
  const canMarkReady =
    !isClosed &&
    !isAutomatedJournalTask &&
    isAssignee &&
    !selfAssigned &&
    task.status !== ResearchTaskStatus.CHECKING &&
    task.status !== ResearchTaskStatus.NEED_CLARIFY;
  const canApprove =
    !isClosed &&
    !isAutomatedJournalTask &&
    !isAssignee &&
    (isAdmin || isAssigner) &&
    (selfAssigned || isAdmin || task.status === ResearchTaskStatus.CHECKING);
  const canRedo =
    !isClosed &&
    !isAssignee &&
    (isAdmin || isAssigner) &&
    task.status === ResearchTaskStatus.CHECKING;
  const canRequestClarification =
    !isClosed &&
    isAssignee &&
    !selfAssigned &&
    task.status !== ResearchTaskStatus.CHECKING &&
    task.status !== ResearchTaskStatus.NEED_CLARIFY &&
    !hasOpenMyClarification;
  const canRevoke = !isClosed && !isAssignee && (isAdmin || isAssigner);
  const canEdit =
    !isAssignee && (isRootAdmin || (!isClosed && isChiefAssistant));
  const canUseReminder = !isAssignee && (isAdmin || isAssigner);
  const reminderBlock =
    task.assignments.length === 0
      ? {
          title: "Reminder not available",
          detail:
            "This task does not have any assignees, so there is no one to receive a finish reminder email.",
        }
      : task.status === ResearchTaskStatus.COMPLETED
        ? {
            title: "Reminder not available",
            detail:
              "This task is already completed. Assignees do not need a finish reminder for closed work.",
          }
        : task.status === ResearchTaskStatus.REVOKED
          ? {
              title: "Reminder not available",
              detail:
                "This task has been revoked. Revoked tasks are no longer active work for assignees.",
            }
          : task.status === ResearchTaskStatus.CHECKING
            ? {
                title: "Reminder not available",
                detail:
                  "This task is waiting for the assigner to check the submitted work. The next action belongs to the assigner, not the assignees.",
              }
            : task.status === ResearchTaskStatus.NEED_CLARIFY
              ? {
                  title: "Reminder not available",
                  detail:
                    "Assignees are waiting for clarification feedback from the assigner. Please answer the clarification request before sending finish reminders.",
                }
              : null;
  const canAnswerClarification = !isClosed && (isAdmin || isAssigner);
  const reportEnabled = task.allowAssigneeReportUpload;
  const isJournalSubmitTask =
    task.taskType === "SUBMIT_RESEARCH" && Boolean(task.journal);
  const canManageSuggestedReviewers =
    isJournalSubmitTask &&
    !isClosed &&
    (isRootAdmin || isAssigner || isChecker);
  const suggestedReviewerAction = updateTaskSuggestedReviewers.bind(
    null,
    task.id,
  );
  const isAddJournalTask = task.taskType === "ADD_JOURNAL";
  const isProposalTask = task.taskType === ResearchTaskType.PROPOSAL;
  const proposalTaskType = task.organizedProjectId ? "PROJECT" : "RESEARCH";
  const canAddTaskJournals = isAddJournalTask && !isClosed && isAssignee;
  const canApproveTaskJournals =
    isAddJournalTask && (isRootAdmin || isAssigner || isChecker);
  const taskJournalResults: TaskJournalResult[] = task.addedJournals.flatMap(
    (journal) =>
      journal.resultPosition === null
        ? []
        : [
            {
              id: journal.id,
              resultPosition: journal.resultPosition,
              name: journal.name,
              issn: journal.issn ?? "",
              publisher: journal.publisher ?? "",
              rank: journal.rank ?? journal.localRank ?? "",
              type: journal.type,
              localRank: journal.localRank ?? "",
              issuesPerYear: journal.issuesPerYear,
              isFavorite: journal.isFavorite,
              isInterest: journal.isInterest,
              publisherId: journal.publisherId ?? "",
              fields: journal.fields.length
                ? journal.fields
                : journal.field
                  ? journal.field
                      .split(";")
                      .map((field) => field.trim())
                      .filter(Boolean)
                  : [],
              country: journal.country ?? "",
              apc: journal.apc ?? "",
              apcCurrency: journal.apcCurrency,
              hasApcOption: journal.hasApcOption,
              submissionFee: journal.submissionFee ?? "",
              submissionFeeCurrency: journal.submissionFeeCurrency,
              homepageLink: journal.homepageLink ?? "",
              submissionLink: journal.submissionLink ?? "",
              scimagoLink: journal.scimagoLink ?? "",
              scopusLink: journal.scopusLink ?? "",
              note: journal.note ?? "",
              approvalStatus: journal.approvalStatus,
              publisherApprovalStatus:
                journal.publisherRecord?.approvalStatus ?? "APPROVED",
              createdBy: journal.createdBy
                ? [
                    displayResearchPersonName(journal.createdBy),
                    displayResearchEmail(journal.createdBy.email),
                  ]
                    .filter(Boolean)
                    .join(" | ")
                : "Unknown user",
            },
          ],
  );
  const taskProposalResult: TaskProposalResultItem | null = task.proposalResult
    ? {
        id: task.proposalResult.id,
        type: task.proposalResult.type === "PROJECT" ? "PROJECT" : "RESEARCH",
        status: task.proposalResult.status,
        title: task.proposalResult.title,
        description: task.proposalResult.description,
        contactInfo: task.proposalResult.contactInfo ?? "",
        notes: task.proposalResult.notes ?? "",
        fileName: task.proposalResult.supportFileName ?? "",
        fileSize: fileSizeLabel(task.proposalResult.supportFileSize),
        decisionComment: task.proposalResult.decisionComment ?? "",
        createdAt: formatDate(task.proposalResult.createdAt),
        submittedBy: displayResearchPersonName(task.proposalResult.submittedBy),
        submittedByEmail: displayResearchEmail(
          task.proposalResult.submittedBy.email,
        ),
      }
    : null;
  const selectedSuggestedReviewers: SuggestedReviewerOption[] =
    task.suggestedReviewers.map((reviewer) => ({
      id: reviewer.id,
      name: reviewer.name,
      email: reviewer.email,
      institution: reviewer.institution ?? "",
      bio: reviewer.bio ?? "",
    }));
  const reviewerOptions: SuggestedReviewerOption[] = canManageSuggestedReviewers
    ? (
        await prisma.suggestedReviewer.findMany({
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            institution: true,
            bio: true,
          },
        })
      ).map((reviewer) => ({
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        institution: reviewer.institution ?? "",
        bio: reviewer.bio ?? "",
      }))
    : selectedSuggestedReviewers;
  const canUploadReport =
    reportEnabled && !isClosed && isAssignee && !isAssigner;
  const canDownloadReport =
    reportEnabled && Boolean(task.reportFileName) && (isAdmin || isAssigner);
  const hasAssociatedItems = Boolean(
    task.project ||
    task.organizedProject ||
    task.review ||
    task.journal ||
    task.conference,
  );
  const suggestedVenueResults: TaskSuggestedVenueInfo[] = [
    ...task.suggestedJournals.map((suggestion) => ({
      id: suggestion.id,
      kind: "journal" as const,
      name:
        suggestion.journal?.name ?? suggestion.venueName ?? "Unnamed journal",
      status: suggestion.status,
      meta: [
        suggestion.journal?.issn ? `ISSN ${suggestion.journal.issn}` : null,
        suggestion.journal?.publisher,
        suggestion.journal?.rank ?? suggestion.journal?.localRank,
      ]
        .filter(Boolean)
        .join(" - "),
      apc: suggestion.journal?.apc ?? null,
      apcCurrency: suggestion.journal?.apcCurrency ?? "USD",
      submissionFee: suggestion.journal?.submissionFee ?? null,
      submissionFeeCurrency: suggestion.journal?.submissionFeeCurrency ?? "USD",
      journalNote: suggestion.journal?.note ?? null,
      venueNote: suggestion.note ?? null,
      declineReason: suggestion.declineReason,
      venueLink:
        suggestion.venueLink ?? suggestion.journal?.homepageLink ?? null,
      createdAt: suggestion.createdAt,
    })),
    ...(linkedJournalSubmissionSuggestion
      ? [
          {
            id: linkedJournalSubmissionSuggestion.id,
            kind: "journal" as const,
            name:
              linkedJournalSubmissionSuggestion.journal?.name ??
              linkedJournalSubmissionSuggestion.venueName ??
              "Unnamed journal",
            status: linkedJournalSubmissionSuggestion.status,
            meta: [
              linkedJournalSubmissionSuggestion.journal?.issn
                ? `ISSN ${linkedJournalSubmissionSuggestion.journal.issn}`
                : null,
              linkedJournalSubmissionSuggestion.journal?.publisher,
              linkedJournalSubmissionSuggestion.journal?.rank ??
                linkedJournalSubmissionSuggestion.journal?.localRank,
            ]
              .filter(Boolean)
              .join(" - "),
            apc: linkedJournalSubmissionSuggestion.journal?.apc ?? null,
            apcCurrency:
              linkedJournalSubmissionSuggestion.journal?.apcCurrency ?? "USD",
            submissionFee:
              linkedJournalSubmissionSuggestion.journal?.submissionFee ?? null,
            submissionFeeCurrency:
              linkedJournalSubmissionSuggestion.journal
                ?.submissionFeeCurrency ?? "USD",
            journalNote:
              linkedJournalSubmissionSuggestion.journal?.note ?? null,
            venueNote: linkedJournalSubmissionSuggestion.note ?? null,
            declineReason: linkedJournalSubmissionSuggestion.declineReason,
            venueLink:
              linkedJournalSubmissionSuggestion.venueLink ??
              linkedJournalSubmissionSuggestion.journal?.homepageLink ??
              null,
            createdAt: linkedJournalSubmissionSuggestion.createdAt,
          },
        ]
      : []),
    ...task.suggestedConferences.map((suggestion) => ({
      id: suggestion.id,
      kind: "conference" as const,
      name:
        suggestion.conference?.name ??
        suggestion.venueName ??
        "Unnamed conference",
      status: suggestion.status,
      meta: [
        suggestion.conference?.organizer,
        suggestion.conference?.type,
        suggestion.conference?.location,
        suggestion.conference
          ? conferenceTime(
              suggestion.conference.startDate,
              suggestion.conference.endDate,
            )
          : null,
      ]
        .filter(Boolean)
        .join(" - "),
      apc: suggestion.conference?.apc ?? null,
      apcCurrency: suggestion.conference?.apcCurrency ?? "USD",
      submissionFee: suggestion.conference?.submissionFee ?? null,
      submissionFeeCurrency:
        suggestion.conference?.submissionFeeCurrency ?? "USD",
      journalNote: suggestion.conference?.note ?? null,
      venueNote: suggestion.note ?? null,
      declineReason: suggestion.declineReason,
      venueLink: suggestion.venueLink ?? suggestion.conference?.website ?? null,
      createdAt: suggestion.createdAt,
    })),
    ...(linkedConferenceSubmissionSuggestion
      ? [
          {
            id: linkedConferenceSubmissionSuggestion.id,
            kind: "conference" as const,
            name:
              linkedConferenceSubmissionSuggestion.conference?.name ??
              linkedConferenceSubmissionSuggestion.venueName ??
              "Unnamed conference",
            status: linkedConferenceSubmissionSuggestion.status,
            meta: [
              linkedConferenceSubmissionSuggestion.conference?.organizer,
              linkedConferenceSubmissionSuggestion.conference?.type,
              linkedConferenceSubmissionSuggestion.conference?.location,
              linkedConferenceSubmissionSuggestion.conference
                ? conferenceTime(
                    linkedConferenceSubmissionSuggestion.conference.startDate,
                    linkedConferenceSubmissionSuggestion.conference.endDate,
                  )
                : null,
            ]
              .filter(Boolean)
              .join(" - "),
            apc: linkedConferenceSubmissionSuggestion.conference?.apc ?? null,
            apcCurrency:
              linkedConferenceSubmissionSuggestion.conference?.apcCurrency ??
              "USD",
            submissionFee:
              linkedConferenceSubmissionSuggestion.conference?.submissionFee ??
              null,
            submissionFeeCurrency:
              linkedConferenceSubmissionSuggestion.conference
                ?.submissionFeeCurrency ?? "USD",
            journalNote:
              linkedConferenceSubmissionSuggestion.conference?.note ?? null,
            venueNote: linkedConferenceSubmissionSuggestion.note ?? null,
            declineReason: linkedConferenceSubmissionSuggestion.declineReason,
            venueLink:
              linkedConferenceSubmissionSuggestion.venueLink ??
              linkedConferenceSubmissionSuggestion.conference?.website ??
              null,
            createdAt: linkedConferenceSubmissionSuggestion.createdAt,
          },
        ]
      : []),
  ].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  const isSuggestVenueTask = task.taskType === "SUGGEST_VENUE";
  const linkedSubmitSuggestedVenue =
    task.taskType === ResearchTaskType.SUBMIT_RESEARCH &&
    linkedJournalSubmissionSuggestion
      ? (linkedJournalSubmissionSuggestion.journal?.name ??
        linkedJournalSubmissionSuggestion.venueName ??
        "suggested journal")
      : task.taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
          linkedConferenceSubmissionSuggestion
        ? (linkedConferenceSubmissionSuggestion.conference?.name ??
          linkedConferenceSubmissionSuggestion.venueName ??
          "suggested conference")
        : null;
  const hasTaskResultPanel =
    Boolean(submissionInfo) ||
    (isSuggestVenueTask && suggestedVenueResults.length > 0);
  const hasSuggestedVenueResultPanel =
    isSuggestVenueTask && !submissionInfo && suggestedVenueResults.length > 0;
  const scopedResearchWhere = isRootAdmin
    ? {}
    : {
        OR: [
          { leadResearcherId: userId },
          { authors: { some: { id: userId } } },
          { authorEntries: { some: { userId } } },
          { registrationUserId: userId },
          {
            organizedProjectLinks: {
              some: {
                organizedProject: {
                  OR: [
                    { createdById: userId },
                    { members: { some: { userId } } },
                  ],
                },
              },
            },
          },
        ],
      };
  const scopedOrganizedProjectWhere = isRootAdmin
    ? {}
    : {
        OR: [{ createdById: userId }, { members: { some: { userId } } }],
      };
  const assigneeWhere = isRootAdmin
    ? { activeSites: { has: "research" } }
    : {
        activeSites: { has: "research" },
        roles: { has: Role.ASSISTANT },
        NOT: { id: userId },
      };
  const journalSubmissionLink =
    task.journal?.submissionLink || firstUrl(task.journal?.note);
  const conferenceSubmissionLink = firstUrl(task.conference?.note);
  const [
    assigneeUsers,
    projects,
    journals,
    accounts,
    conferences,
    reviews,
    organizedProjects,
    checkerUsers,
    taskGuideOptions,
  ] = canEdit
    ? await Promise.all([
        prisma.user.findMany({
          where: assigneeWhere,
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        }),
        prisma.researchProject.findMany({
          where: scopedResearchWhere,
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true, researchCode: true, title: true, stage: true },
        }),
        prisma.journal.findMany({
          where: { approvalStatus: JournalApprovalStatus.APPROVED },
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            name: true,
            type: true,
            publisher: true,
            publisherId: true,
            publisherRecord: { select: { usesSingleAccount: true } },
            rank: true,
            localRank: true,
            issn: true,
          },
        }),
        prisma.publisherAccount.findMany({
          where: {
            OR: [{ journalId: { not: null } }, { publisherId: { not: null } }],
          },
          orderBy: [{ updatedAt: "desc" }, { username: "asc" }],
          select: {
            id: true,
            journalId: true,
            publisherId: true,
            username: true,
            email: true,
          },
        }),
        prisma.conference.findMany({
          orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            organizer: true,
            type: true,
            location: true,
          },
        }),
        prisma.academicReview.findMany({
          where: accessibleResearchReviewWhere(roles, userId),
          orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
          include: { journal: { select: { name: true } } },
        }),
        prisma.organizedProject.findMany({
          where: scopedOrganizedProjectWhere,
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true, title: true, referenceCode: true, status: true },
        }),
        prisma.user.findMany({
          where: {
            activeSites: { has: "research" },
            roles: { has: Role.CHIEF_ASSISTANT },
          },
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        }),
        prisma.taskGuide.findMany({
          orderBy: [{ updatedAt: "desc" }, { guideCode: "asc" }],
          select: {
            id: true,
            guideCode: true,
            title: true,
            content: true,
            importantNote: true,
          },
        }),
      ])
    : [[], [], [], [], [], [], [], [], []];
  const assignees = assigneeUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    roles: user.roles,
  }));
  const checkerOptions = checkerUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    roles: user.roles,
  }));
  const researchOptions = projects.map((project) => ({
    id: project.id,
    title: project.title,
    code: project.researchCode ?? "",
    stage: project.stage,
  }));
  const venueOptions = [
    ...journals.map((journal) => ({
      kind: "journal" as const,
      id: journal.id,
      name: journal.name,
      meta: [journalMetaLine(journal), journal.issn]
        .filter(Boolean)
        .join(" - "),
    })),
    ...conferences.map((conference) => ({
      kind: "conference" as const,
      id: conference.id,
      name: conference.name,
      meta: [conference.organizer, conference.type, conference.location]
        .filter(Boolean)
        .join(" - "),
    })),
  ];
  const accountOptions = accounts.flatMap((account) => {
    if (account.journalId) {
      const journal = journals.find((item) => item.id === account.journalId);
      return journal?.publisherRecord?.usesSingleAccount
        ? []
        : [
            {
              id: account.id,
              journalId: account.journalId,
              username: account.username,
              email: account.email ?? "",
            },
          ];
    }
    return journals
      .filter(
        (journal) =>
          journal.publisherId === account.publisherId &&
          journal.publisherRecord?.usesSingleAccount,
      )
      .map((journal) => ({
        id: account.id,
        journalId: journal.id,
        username: account.username,
        email: account.email ?? "",
      }));
  });
  const reviewOptions = reviews.map((review) => ({
    id: review.id,
    title: review.manuscriptTitle,
    journal: review.journal.name,
    status: review.status,
  }));
  const organizedProjectOptions = organizedProjects.map((project) => ({
    id: project.id,
    title: project.title,
    code: project.referenceCode ?? "",
    status: project.status,
  }));
  const projectIds = projects.map((project) => project.id);
  const [journalSubmissions, conferenceSubmissions] =
    canEdit && projectIds.length > 0
      ? await Promise.all([
          prisma.researchSubmission.findMany({
            where: { researchProjectId: { in: projectIds } },
            orderBy: [{ updatedAt: "desc" }],
            include: {
              project: { select: { title: true } },
              journal: { select: { name: true } },
            },
          }),
          prisma.conferenceSubmission.findMany({
            where: { researchProjectId: { in: projectIds } },
            orderBy: [{ updatedAt: "desc" }],
            include: {
              project: { select: { title: true } },
              conference: { select: { name: true } },
            },
          }),
        ])
      : [[], []];
  const submissionOptions = [
    ...journalSubmissions.map((submission) => ({
      id: submission.id,
      kind: "journal" as const,
      researchId: submission.researchProjectId,
      venueId: submission.journalId,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      researchTitle: submission.project.title,
      venueName: submission.journal.name,
      status: submission.status,
    })),
    ...conferenceSubmissions.map((submission) => ({
      id: submission.id,
      kind: "conference" as const,
      researchId: submission.researchProjectId,
      venueId: submission.conferenceId,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      researchTitle: submission.project.title,
      venueName: submission.conference.name,
      status: submission.status,
    })),
  ];
  const clarificationItems: TaskClarificationItem[] = taskClarifications.map(
    (clarification) => ({
      id: clarification.id,
      question: clarification.question,
      answer: clarification.answer,
      createdAt: clarification.createdAt.toISOString(),
      answeredAt: clarification.answeredAt?.toISOString() ?? null,
      requestedBy: {
        name: clarification.requestedBy.name ?? "",
        email: clarification.requestedBy.email,
      },
      answeredBy: clarification.answeredBy
        ? {
            name: clarification.answeredBy.name ?? "",
            email: clarification.answeredBy.email,
          }
        : null,
    }),
  );

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="min-w-0 text-[15px] font-normal leading-6 text-[#E4E4E4]">
              <h1 className="inline whitespace-normal break-words font-normal">
                {task.title}
              </h1>
              <span className="ml-2 inline-flex items-center gap-2 align-middle">
                <IconHint label={taskType.label} position="bottom">
                  <span
                    className={`research-task-icon-motion inline-flex h-5 w-5 flex-none items-center justify-center ${taskType.className}`}
                    aria-label={taskType.label}
                  >
                    <TaskTypeIcon
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </span>
                </IconHint>
                <IconHint label={meta.label} position="bottom">
                  <span
                    className={`research-task-icon-motion inline-flex h-5 w-5 flex-none cursor-default items-center justify-center border-0 bg-transparent p-0 shadow-none transition duration-180 ease-out hover:bg-transparent hover:shadow-none ${statusIcon.className}`}
                    aria-label={meta.label}
                  >
                    <StatusIcon
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </span>
                </IconHint>
                {task.taskFileName ? (
                  <IconHint
                    label={`Download task file: ${task.taskFileName}`}
                    position="bottom"
                  >
                    <a
                      href={`/api/research/tasks/${task.id}/attachment`}
                      className="research-task-icon-motion inline-flex h-5 w-5 flex-none items-center justify-center text-[#1F7180] dark:text-[#A8DADC]"
                      aria-label={`Download task file: ${task.taskFileName}`}
                    >
                      <FileDown
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </a>
                  </IconHint>
                ) : null}
                {(canEdit || canUseReminder) && (
                  <span className="inline-flex flex-none items-center gap-2">
                    {canEdit && (
                      <EditTaskDialog
                        task={{
                          id: task.id,
                          status: task.status,
                          title: task.title,
                          description: task.description ?? "",
                          dueDate: dateInputValue(task.dueDate),
                          taskType: task.taskType ?? "OTHER",
                          projectId: task.projectId ?? "",
                          journalId: task.journalId ?? "",
                          journalTargetCount: task.journalTargetCount,
                          conferenceId: task.conferenceId ?? "",
                          reviewId: task.reviewId ?? "",
                          organizedProjectId: task.organizedProjectId ?? "",
                          accountId: task.accountId ?? "",
                          checkerId: task.checkerId ?? "",
                          allowAssigneeReportUpload:
                            task.allowAssigneeReportUpload,
                          assigneeIds: task.assignments.map(
                            (assignment) => assignment.userId,
                          ),
                          guideIds: task.guides.map((guide) => guide.id),
                        }}
                        assignees={assignees}
                        researchOptions={researchOptions}
                        venueOptions={venueOptions}
                        accountOptions={accountOptions}
                        reviewOptions={reviewOptions}
                        organizedProjectOptions={organizedProjectOptions}
                        submissionOptions={submissionOptions}
                        checkerOptions={checkerOptions}
                        taskGuideOptions={taskGuideOptions as TaskGuideOption[]}
                        canChooseChecker={isRootAdmin}
                      />
                    )}
                    {canUseReminder && (
                      <TaskReminderButton
                        taskTitle={task.title}
                        action={reminderAction}
                        block={reminderBlock}
                        assignees={task.assignments.map((assignment) => ({
                          id: assignment.userId,
                          name: assignment.user.name ?? "",
                          email: assignment.user.email,
                        }))}
                      />
                    )}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        {(canMarkReady ||
          canApprove ||
          canRedo ||
          canRequestClarification ||
          canRevoke) && (
          <div className="flex flex-col justify-end gap-2 sm:flex-row sm:items-center">
            {canRevoke && <RevokeTaskForm action={revokeAction} />}
            {canRedo && <RedoTaskForm action={redoAction} />}
            {canRequestClarification && (
              <ClarificationRequestForm action={clarificationAction} />
            )}
            {canMarkReady && (
              <FinishTaskForm action={readyAction} mode="ready" />
            )}
            {canApprove && (
              <FinishTaskForm
                action={finishAction}
                accountId={task.account?.id}
                mode="approve"
                requiresSubmissionDate={
                  task.taskType === "SUBMIT_RESEARCH" ||
                  task.taskType === "SUBMIT_CONFERENCE"
                }
              />
            )}
          </div>
        )}

        <div className="overflow-hidden border border-[#444444] bg-[#2C2C2C]">
          <div className="flex min-w-0 flex-wrap items-center gap-y-1 border-b border-[#D8D0C2] px-5 py-3 text-xs text-[#667085] dark:border-[#4A4A4A] dark:text-[#B0B0B0]">
            <span>Created: {formatDate(task.createdAt)}</span>
            <DetailSeparator />
            <span>Due: {formatDate(task.dueDate)}</span>
            {task.completedAt && (
              <>
                <DetailSeparator />
                <span>Completed: {formatDate(task.completedAt)}</span>
              </>
            )}
            {meta.detail && (
              <>
                <DetailSeparator />
                <span className={timeTextClass(meta.timeTone)}>
                  {meta.detail}
                </span>
              </>
            )}
          </div>
          {hasAssociatedItems && (
            <div
              className={`grid gap-5 p-5 ${
                hasSuggestedVenueResultPanel
                  ? "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
                  : "md:grid-cols-2"
              }`}
            >
              <div
                className={
                  hasTaskResultPanel ? "grid min-w-0 gap-5" : "contents"
                }
              >
                {task.project && (
                  <div
                    className={
                      hasTaskResultPanel ? "min-w-0" : "min-w-0 md:col-span-2"
                    }
                  >
                    <div className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                      Research
                    </div>
                    <Link
                      href={`/projects/${task.project.id}`}
                      className="research-journal-name-link mt-2 block w-full border-0 bg-transparent p-0 text-sm font-normal text-[#1F7180] shadow-none outline-none hover:border-0 hover:bg-transparent hover:shadow-none focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0 dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
                    >
                      {task.project.title}
                    </Link>
                    <p className="mt-1 w-full text-xs leading-5 text-[#B0B0B0]">
                      {researchAuthors(task.project)}
                    </p>
                    {linkedSubmitSuggestedVenue ? (
                      <p className="mt-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                        This submit task is linked to suggested venue:{" "}
                        <span className="text-[#1F7180] dark:text-[#A8DADC]">
                          {linkedSubmitSuggestedVenue}
                        </span>
                      </p>
                    ) : null}
                  </div>
                )}
                {task.organizedProject && (
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                      Project
                    </div>
                    <Link
                      href={`/organized-projects/${task.organizedProject.id}`}
                      className={`mt-2 block min-w-0 text-sm ${researchLinkClass}`}
                    >
                      {task.organizedProject.title}
                    </Link>
                    <p className="mt-1 text-xs text-[#B0B0B0]">
                      {task.organizedProject.referenceCode || "No project ID"}
                    </p>
                  </div>
                )}
                {task.review && (
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                      Review
                    </div>
                    <Link
                      href={`/reviews/${task.review.id}`}
                      className={`mt-2 block min-w-0 text-sm ${researchLinkClass}`}
                    >
                      {task.review.manuscriptTitle}
                    </Link>
                    <p className="mt-1 text-xs text-[#B0B0B0]">
                      {task.review.journal.name} - {task.review.status}
                    </p>
                  </div>
                )}
                {task.journal && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                      <span>Journal</span>
                      {canManageSuggestedReviewers ? (
                        <TaskSuggestedReviewerButton
                          reviewers={reviewerOptions}
                          selectedReviewers={selectedSuggestedReviewers}
                          action={suggestedReviewerAction}
                        />
                      ) : null}
                    </div>
                    <div className="mt-2 flex min-w-0 items-center gap-2">
                      <Link
                        href={`/journals/${task.journal.id}`}
                        className={`min-w-0 text-sm ${researchLinkClass}`}
                      >
                        {task.journal.name}
                      </Link>
                      <VenueLinks
                        homepage={task.journal.homepageLink}
                        submission={journalSubmissionLink}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#B0B0B0]">
                      {journalMetaLine(task.journal)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#B0B0B0]">
                      <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                      <AccountLine account={journalAccount} />
                    </p>
                  </div>
                )}
                {task.conference && (
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                      Conference
                    </div>
                    <div className="mt-2 flex min-w-0 items-center gap-2">
                      <Link
                        href={`/conferences/${task.conference.id}`}
                        className={`min-w-0 text-sm ${researchLinkClass}`}
                      >
                        {task.conference.name}
                      </Link>
                      <VenueLinks
                        homepage={task.conference.website}
                        submission={conferenceSubmissionLink}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#B0B0B0]">
                      {task.conference.type || "No type"} -{" "}
                      {task.conference.location || "No location"} -{" "}
                      {conferenceTime(
                        task.conference.startDate,
                        task.conference.endDate,
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#B0B0B0]">
                      <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                      <AccountLine account={task.account} />
                    </p>
                  </div>
                )}
              </div>
              {submissionInfo ? (
                <SubmissionInfoPanel submission={submissionInfo} />
              ) : hasSuggestedVenueResultPanel ? (
                <SuggestedVenueResultsPanel venues={suggestedVenueResults} />
              ) : null}
            </div>
          )}

          {isAddJournalTask ? (
            <TaskJournalResults
              taskId={task.id}
              targetCount={Math.max(1, task.journalTargetCount ?? 1)}
              journals={taskJournalResults}
              publishers={taskJournalPublishers.map((publisher) => ({
                ...publisher,
                alias: publisher.alias ?? "",
                country: publisher.country ?? "",
              }))}
              linkableJournals={linkableTaskJournals}
              duplicateJournals={taskDuplicateJournals}
              canAdd={canAddTaskJournals}
              canApprove={canApproveTaskJournals}
              canLinkExisting={isRootAdmin}
            />
          ) : null}

          {isProposalTask ? (
            <TaskProposalResult
              taskId={task.id}
              proposal={taskProposalResult}
              proposalType={proposalTaskType}
              defaultTitle={task.title}
              canCreate={!isClosed && isAssignee && !taskProposalResult}
            />
          ) : null}

          <div className="grid items-start gap-5 border-t border-[#444444] p-5 md:grid-cols-2">
            <section>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                  Task content
                </h2>
                <TaskGuideIcons guides={task.guides} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#B0B0B0]">
                {task.description || "No task note."}
              </p>
            </section>

            <TaskClarificationPanel
              clarifications={clarificationItems}
              canAnswer={canAnswerClarification}
              answerAction={clarificationAnswerAction}
              className=""
            />
          </div>

          {isJournalSubmitTask && selectedSuggestedReviewers.length > 0 ? (
            <div className="border-t border-[#D8D0C2] p-5 dark:border-[#444444]">
              <TaskSuggestedReviewersTable
                reviewers={selectedSuggestedReviewers}
              />
            </div>
          ) : null}

          {reportEnabled && (
            <div className="border-t border-[#444444] p-5">
              <TaskReportPanel
                taskId={task.id}
                canUpload={canUploadReport}
                canDownload={canDownloadReport}
                fileName={task.reportFileName}
                fileSize={task.reportFileSize}
                uploadedAt={
                  task.reportUploadedAt
                    ? formatDate(task.reportUploadedAt)
                    : null
                }
              />
            </div>
          )}

          <section className="grid items-start gap-5 border-t border-[#444444] p-5 md:grid-cols-3">
            <div className="grid content-start gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Assignees
              </h2>
              <div className="divide-y divide-[#D8D0C2] border-t border-[#D8D0C2] dark:divide-[#444444] dark:border-[#444444]">
                {task.assignments.length > 0 ? (
                  task.assignments.map((assignment) => (
                    <div key={assignment.id} className="py-3">
                      <TaskPersonLine person={assignment.user} />
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                    No assignee
                  </div>
                )}
              </div>
            </div>

            <div className="grid content-start gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Checker
              </h2>
              <div className="border-t border-[#D8D0C2] py-3 dark:border-[#444444]">
                <TaskPersonLine person={checkerPerson} />
                {taskResult && resultUnderChecker ? (
                  <TaskResultBlock result={taskResult} />
                ) : null}
                {redoInfo && redoUnderChecker ? (
                  <TaskRedoBlock redo={redoInfo} />
                ) : null}
              </div>
            </div>

            <div className="grid content-start gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Assigner
              </h2>
              <div className="border-t border-[#D8D0C2] py-3 dark:border-[#444444]">
                <TaskPersonLine person={task.createdBy} />
                {taskResult && !resultUnderChecker ? (
                  <TaskResultBlock result={taskResult} />
                ) : null}
                {redoInfo && !redoUnderChecker ? (
                  <TaskRedoBlock redo={redoInfo} />
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function VenueLinks({
  homepage,
  submission,
}: {
  homepage: string | null | undefined;
  submission: string | null | undefined;
}) {
  return (
    <div className="flex flex-none items-center gap-2">
      <ExternalVenueLink
        href={homepage}
        label="Open homepage"
        className="text-[#B0B0B0] hover:text-[#A8DADC]"
      >
        <Globe2 className="h-4 w-4" />
      </ExternalVenueLink>
      <ExternalVenueLink
        href={submission}
        label="Open submission site"
        className="text-[#B0B0B0] hover:text-[#A8DADC]"
      >
        <ExternalLink className="h-4 w-4" />
      </ExternalVenueLink>
    </div>
  );
}

function ExternalVenueLink({
  href,
  label,
  className,
  children,
}: {
  href: string | null | undefined;
  label: string;
  className: string;
  children: ReactNode;
}) {
  const baseClass = `research-allow-transform inline-flex h-5 w-5 items-center justify-center border-0 bg-transparent shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 ${className}`;

  if (!href) {
    return (
      <span
        className={`${baseClass} cursor-not-allowed text-[#666666] opacity-55 hover:translate-y-0 hover:text-[#666666]`}
        aria-label={`${label} not available`}
      >
        {children}
      </span>
    );
  }

  return (
    <IconHint label={label}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={baseClass}
        aria-label={label}
      >
        {children}
      </a>
    </IconHint>
  );
}
