import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  FolderGit2,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  prisma,
  ProposalStatus,
  ProposalType,
  ResearchTaskStatus,
  Role,
} from "@repo/db";
import { auth } from "../../../../../auth";
import { ProposalFeedbackButton } from "./ProposalFeedbackButton";
import { ProposalEditButton } from "./ProposalEditButton";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import {
  canAccessAllResearchProposals,
  proposalIsOpenForEditing,
} from "@/sites/research/lib/proposalAccess";

export const dynamic = "force-dynamic";

function longDate(value: Date | null) {
  if (!value) return "-";
  return researchDateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function shortDate(value: Date | null | undefined) {
  if (!value) return "";
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

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function typeMeta(type: ProposalType) {
  if (type === ProposalType.CONFERENCE) {
    return {
      icon: CalendarDays,
      label: "Conference proposal",
      className: "text-blue-700 dark:text-blue-300",
    };
  }
  if (type === ProposalType.JOURNAL) {
    return {
      icon: BookOpen,
      label: "Journal proposal",
      className: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (type === ProposalType.PROJECT) {
    return {
      icon: Building2,
      label: "Project proposal",
      className: "text-violet-700 dark:text-violet-300",
    };
  }
  return {
    icon: FolderGit2,
    label: "Research proposal",
    className: "text-amber-700 dark:text-amber-300",
  };
}

function statusMeta(status: ProposalStatus) {
  if (status === ProposalStatus.ACCEPTED) {
    return {
      icon: CheckCircle2,
      className: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (status === ProposalStatus.DECLINED) {
    return {
      icon: XCircle,
      className: "text-rose-700 dark:text-rose-300",
    };
  }
  if (status === ProposalStatus.REVIEWING) {
    return {
      icon: FileSearch,
      className: "text-sky-700 dark:text-sky-300",
    };
  }
  return {
    icon: FolderGit2,
    className: "text-amber-700 dark:text-amber-300",
  };
}

function displayStatus(status: ProposalStatus) {
  return status;
}

function taskStatusMeta(status: ResearchTaskStatus) {
  if (status === ResearchTaskStatus.COMPLETED) {
    return {
      label: "Completed",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  }
  if (status === ResearchTaskStatus.REVOKED) {
    return {
      label: "Revoked",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    };
  }
  if (status === ResearchTaskStatus.CHECKING) {
    return {
      label: "Ready for check",
      className:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    };
  }
  if (status === ResearchTaskStatus.NEED_CLARIFY) {
    return {
      label: "Need clarify",
      className:
        "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-300",
    };
  }
  if (status === ResearchTaskStatus.REVISION_REQUESTED) {
    return {
      label: "Revision requested",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    };
  }
  return {
    label: "In progress",
    className:
      "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300",
  };
}

function researchAuthorNames(project: {
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

function correspondingAuthorEmails(project: {
  leadResearcher: { email: string };
  authors: { email: string }[];
  authorEntries: {
    isCorresponding: boolean;
    user: { email: string };
  }[];
}) {
  const emails =
    project.authorEntries.length > 0
      ? project.authorEntries
          .filter((entry) => entry.isCorresponding)
          .map((entry) => displayResearchEmail(entry.user.email))
      : project.authors.length > 0
        ? project.authors[0]?.email
          ? [displayResearchEmail(project.authors[0].email)]
          : []
        : [displayResearchEmail(project.leadResearcher.email)];

  return emails.filter(Boolean).join("; ");
}

function journalRankLabel(journal: {
  type?: string | null;
  rank?: string | null;
  localRank?: string | null;
}) {
  return journal.type === "LOCAL"
    ? journal.localRank || "No local rank"
    : journal.rank || "No rank";
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6 text-slate-700 dark:text-[#E4E4E4]">
        {value === null || value === undefined || value === "" ? "-" : value}
      </dd>
    </div>
  );
}

function AssociatedRecordCard({
  proposal,
}: {
  proposal: {
    status: ProposalStatus;
    createdResearchProject: {
      id: string;
      title: string;
      researchCode: string | null;
      stage: string;
      updatedAt: Date;
      coAuthors: string | null;
      leadResearcher: { name: string | null; email: string };
      authors: { name: string | null; email: string }[];
      authorEntries: {
        isCorresponding: boolean;
        user: { name: string | null; email: string };
      }[];
      submissions: {
        status: string;
        submittedAt: Date | null;
        acceptedAt: Date | null;
        publishedAt: Date | null;
        journal: {
          name: string;
          publisher: string | null;
          rank: string | null;
          localRank: string | null;
          type: string | null;
        };
      }[];
      conferenceSubmissions: {
        status: string;
        submittedAt: Date | null;
        acceptedAt: Date | null;
        publishedAt: Date | null;
        conference: {
          name: string;
          organizer: string | null;
          type: string | null;
          location: string | null;
        };
      }[];
    } | null;
    createdOrganizedProject: {
      id: string;
      title: string;
      referenceCode: string | null;
      status: string;
      projectType: string;
      updatedAt: Date;
      createdBy: { name: string | null; email: string } | null;
    } | null;
  };
}) {
  if (proposal.status !== ProposalStatus.ACCEPTED) return null;

  if (proposal.createdResearchProject) {
    const research = proposal.createdResearchProject;
    const highlightedJournalSubmission =
      research.submissions.find(
        (submission) => submission.status === "PUBLISHED",
      ) ??
      research.submissions.find(
        (submission) => submission.status === "ACCEPTED",
      );
    const highlightedConferenceSubmission = highlightedJournalSubmission
      ? null
      : research.conferenceSubmissions.find(
          (submission) =>
            submission.status === "PUBLISHED" ||
            submission.status === "ACCEPTED",
        );
    const acceptedAt =
      highlightedJournalSubmission?.acceptedAt ??
      highlightedConferenceSubmission?.acceptedAt ??
      null;
    const publishedAt =
      highlightedJournalSubmission?.publishedAt ??
      highlightedConferenceSubmission?.publishedAt ??
      null;
    const isAccepted =
      research.stage === "ACCEPTED" ||
      highlightedJournalSubmission?.status === "ACCEPTED" ||
      highlightedConferenceSubmission?.status === "ACCEPTED" ||
      Boolean(acceptedAt);
    const isPublished =
      research.stage === "PUBLISHED" ||
      highlightedJournalSubmission?.status === "PUBLISHED" ||
      highlightedConferenceSubmission?.status === "PUBLISHED" ||
      Boolean(publishedAt);
    const venueLine = highlightedJournalSubmission
      ? [
          highlightedJournalSubmission.journal.name,
          highlightedJournalSubmission.journal.publisher || "No publisher",
          journalRankLabel(highlightedJournalSubmission.journal),
        ].join(" - ")
      : highlightedConferenceSubmission
        ? [
            highlightedConferenceSubmission.conference.name,
            highlightedConferenceSubmission.conference.organizer ||
              "No organizer",
            highlightedConferenceSubmission.conference.type || "No type",
            highlightedConferenceSubmission.conference.location ||
              "No location",
          ].join(" - ")
        : "";
    const authors = researchAuthorNames(research);
    const correspondingEmails = correspondingAuthorEmails(research);

    return (
      <aside className="min-w-0 border border-[#D8D0C2] bg-[#F7F4ED] p-4 dark:border-[#444444] dark:bg-[#242424]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              <FolderGit2 className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
              Associated research
            </div>
            <a
              href={`/projects/${research.id}`}
              className="research-clickable-icon mt-2 block min-w-0 text-sm font-normal leading-6 text-[#1F2937] transition-[color,text-shadow,transform] duration-180 ease-out hover:text-[#1F7180] hover:[text-shadow:0_0_0.55rem_rgba(31,113,128,0.16)] active:scale-[0.99] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
            >
              {research.title}
            </a>
          </div>
          <IconHint label="Open associated research" position="bottom">
            <a
              href={`/projects/${research.id}`}
              className="research-clickable-icon research-allow-transform inline-flex h-5 w-5 flex-none items-center justify-center border-0 bg-transparent text-[#1F7180] shadow-none outline-none transition-[color,transform,filter] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
              aria-label="Open associated research"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </IconHint>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-y-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
          <span>{research.researchCode || "No research ID"}</span>
          {isAccepted ? (
            <>
              <span className="px-2 text-[#A0A8B5] dark:text-[#777777]">|</span>
              <span className="text-emerald-700 dark:text-emerald-300">
                {acceptedAt ? `Accepted: ${shortDate(acceptedAt)}` : "Accepted"}
              </span>
            </>
          ) : null}
          {isPublished ? (
            <>
              <span className="px-2 text-[#A0A8B5] dark:text-[#777777]">|</span>
              <span className="text-blue-700 dark:text-blue-300">
                {publishedAt
                  ? `Published: ${shortDate(publishedAt)}`
                  : "Published"}
              </span>
            </>
          ) : null}
          {!isAccepted && !isPublished ? (
            <>
              <span className="px-2 text-[#A0A8B5] dark:text-[#777777]">|</span>
              <span>{label(research.stage)}</span>
            </>
          ) : null}
        </div>
        {venueLine ? (
          <p className="mt-1 break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
            {venueLine}
          </p>
        ) : null}
        <div className="mt-3 border-t border-[#D8D0C2] pt-3 text-xs leading-5 text-[#667085] dark:border-[#444444] dark:text-[#B0B0B0]">
          <span className="block uppercase tracking-wide">Authors</span>
          <span className="mt-1 block whitespace-normal break-words text-sm text-[#1F2937] dark:text-[#E4E4E4]">
            {authors || "Not set"}
          </span>
          <span className="mt-2 block break-all">
            Corresponding author email: {correspondingEmails || "-"}
          </span>
        </div>
      </aside>
    );
  }

  const record = proposal.createdOrganizedProject
    ? {
        label: "Associated project",
        href: `/organized-projects/${proposal.createdOrganizedProject.id}`,
        title: proposal.createdOrganizedProject.title,
        code: proposal.createdOrganizedProject.referenceCode || "No project ID",
        state: `${label(proposal.createdOrganizedProject.status)} | ${label(
          proposal.createdOrganizedProject.projectType,
        )}`,
        ownerLabel: "Owner",
        owner: proposal.createdOrganizedProject.createdBy,
        meta: `Updated ${longDate(proposal.createdOrganizedProject.updatedAt)}`,
        icon: Building2,
        iconClass: "text-violet-700 dark:text-violet-300",
      }
    : null;

  if (!record) return null;
  const Icon = record.icon;

  return (
    <aside className="min-w-0 border border-[#D8D0C2] bg-[#F7F4ED] p-4 dark:border-[#444444] dark:bg-[#242424]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            <Icon className={`h-3.5 w-3.5 ${record.iconClass}`} />
            {record.label}
          </div>
          <a
            href={record.href}
            className="research-clickable-icon mt-2 block min-w-0 text-sm font-normal leading-6 text-[#1F2937] transition-[color,text-shadow,transform] duration-180 ease-out hover:text-[#1F7180] hover:[text-shadow:0_0_0.55rem_rgba(31,113,128,0.16)] active:scale-[0.99] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
          >
            {record.title}
          </a>
        </div>
        <IconHint
          label={`Open ${record.label.toLowerCase()}`}
          position="bottom"
        >
          <a
            href={record.href}
            className="research-clickable-icon research-allow-transform inline-flex h-5 w-5 flex-none items-center justify-center border-0 bg-transparent text-[#1F7180] shadow-none outline-none transition-[color,transform,filter] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
            aria-label={`Open ${record.label.toLowerCase()}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </IconHint>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-y-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
        <span>{record.code}</span>
        <span className="px-2 text-[#A0A8B5] dark:text-[#777777]">|</span>
        <span>{record.state}</span>
      </div>
      <div className="mt-3 border-t border-[#D8D0C2] pt-3 text-xs leading-5 text-[#667085] dark:border-[#444444] dark:text-[#B0B0B0]">
        <span className="block uppercase tracking-wide">
          {record.ownerLabel}
        </span>
        <span className="mt-1 block text-sm text-[#1F2937] dark:text-[#E4E4E4]">
          {record.owner ? displayResearchPersonName(record.owner) : "Not set"}
        </span>
        {record.owner?.email ? (
          <span className="block break-all">
            {displayResearchEmail(record.owner.email)}
          </span>
        ) : null}
        <span className="mt-2 block">{record.meta}</span>
      </div>
    </aside>
  );
}

function AssociatedTaskCard({
  task,
}: {
  task: {
    id: string;
    title: string;
    taskCode: string | null;
    taskType: string | null;
    status: ResearchTaskStatus;
    dueDate?: Date | null;
    createdAt?: Date | null;
    createdBy: { name: string | null; email?: string | null };
    checker?: { name: string | null; email?: string | null } | null;
    assignments: {
      user?: { name: string | null; email?: string | null } | null;
    }[];
  } | null;
}) {
  if (!task) return null;

  const status = taskStatusMeta(task.status);
  const assignees = task.assignments
    .map((assignment) =>
      assignment.user ? displayResearchPersonName(assignment.user) : "",
    )
    .filter(Boolean)
    .join(", ");

  return (
    <aside className="min-w-0 border border-[#D8D0C2] bg-[#F7F4ED] p-4 dark:border-[#444444] dark:bg-[#242424]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            <ClipboardList className="h-3.5 w-3.5 text-[#1F7180] dark:text-[#A8DADC]" />
            Associated task
          </div>
          <a
            href={`/tasks/${task.id}`}
            className="research-clickable-icon mt-2 block min-w-0 text-sm font-normal leading-6 text-[#1F2937] transition-[color,text-shadow,transform] duration-180 ease-out hover:text-[#1F7180] hover:[text-shadow:0_0_0.55rem_rgba(31,113,128,0.16)] active:scale-[0.99] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
          >
            {task.title}
          </a>
        </div>
        <IconHint label="Open associated task" position="bottom">
          <a
            href={`/tasks/${task.id}`}
            className="research-clickable-icon research-allow-transform inline-flex h-5 w-5 flex-none items-center justify-center border-0 bg-transparent text-[#1F7180] shadow-none outline-none transition-[color,transform,filter] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
            aria-label="Open associated task"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </IconHint>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-y-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
        <span>{task.taskCode || "No task ID"}</span>
        <span className="px-2 text-[#A0A8B5] dark:text-[#777777]">|</span>
        <span>{task.taskType ? label(task.taskType) : "Task"}</span>
        <span className="px-2 text-[#A0A8B5] dark:text-[#777777]">|</span>
        <span
          className={`inline-flex items-center border px-2 py-0.5 text-[11px] leading-4 ${status.className}`}
        >
          {status.label}
        </span>
      </div>
      <div className="mt-3 grid gap-3 border-t border-[#D8D0C2] pt-3 text-xs leading-5 text-[#667085] dark:border-[#444444] dark:text-[#B0B0B0] sm:grid-cols-2">
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 uppercase tracking-wide">
            <Clock3 className="h-3.5 w-3.5 text-[#667085] dark:text-[#B0B0B0]" />
            Time
          </span>
          <span className="mt-1 block text-[#1F2937] dark:text-[#E4E4E4]">
            Created: {shortDate(task.createdAt)}
          </span>
          <span className="block">
            Due: {task.dueDate ? shortDate(task.dueDate) : "Not set"}
          </span>
        </div>
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 uppercase tracking-wide">
            <ShieldCheck className="h-3.5 w-3.5 text-[#667085] dark:text-[#B0B0B0]" />
            People
          </span>
          <span className="mt-1 block whitespace-normal break-words text-[#1F2937] dark:text-[#E4E4E4]">
            Assignee: {assignees || "Not assigned"}
          </span>
          <span className="block whitespace-normal break-words">
            Assigner: {displayResearchPersonName(task.createdBy)}
          </span>
          {task.checker ? (
            <span className="block whitespace-normal break-words">
              Checker: {displayResearchPersonName(task.checker)}
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function HeaderIcon({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <IconHint label={label} position="bottom">
      <span
        className={`inline-flex h-5 w-5 cursor-help items-center justify-center border border-transparent bg-transparent transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] active:scale-95 ${className}`}
      >
        {children}
      </span>
    </IconHint>
  );
}

const sectionDividerClass = "border-t border-[#D8D0C2] dark:border-[#4A4A4A]";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const canAccessAll = canAccessAllResearchProposals(roles);

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          roles: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          taskCode: true,
          taskType: true,
          status: true,
          dueDate: true,
          createdAt: true,
          createdById: true,
          createdBy: { select: { name: true, email: true } },
          checkerId: true,
          checker: { select: { name: true, email: true } },
          assignments: {
            select: {
              userId: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
      createdResearchProject: {
        select: {
          id: true,
          title: true,
          researchCode: true,
          stage: true,
          updatedAt: true,
          coAuthors: true,
          leadResearcher: { select: { name: true, email: true } },
          authors: {
            select: { name: true, email: true },
            orderBy: [{ name: "asc" }, { email: "asc" }],
          },
          authorEntries: {
            select: {
              isCorresponding: true,
              user: { select: { name: true, email: true } },
            },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
          submissions: {
            where: { status: { in: ["ACCEPTED", "PUBLISHED"] } },
            select: {
              status: true,
              submittedAt: true,
              acceptedAt: true,
              publishedAt: true,
              journal: {
                select: {
                  name: true,
                  publisher: true,
                  rank: true,
                  localRank: true,
                  type: true,
                },
              },
            },
            orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
          },
          conferenceSubmissions: {
            where: { status: { in: ["ACCEPTED", "PUBLISHED"] } },
            select: {
              status: true,
              submittedAt: true,
              acceptedAt: true,
              publishedAt: true,
              conference: {
                select: {
                  name: true,
                  organizer: true,
                  type: true,
                  location: true,
                },
              },
            },
            orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
          },
        },
      },
      createdOrganizedProject: {
        select: {
          id: true,
          title: true,
          referenceCode: true,
          status: true,
          projectType: true,
          updatedAt: true,
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!proposal) notFound();
  const canAccessProposal =
    canAccessAll ||
    proposal.submittedById === userId ||
    proposal.task?.createdById === userId ||
    proposal.task?.checkerId === userId ||
    Boolean(
      proposal.task?.assignments.some(
        (assignment) => assignment.userId === userId,
      ),
    );
  if (!canAccessProposal) redirect("/401");

  if (canAccessAll && proposal.status === ProposalStatus.NEW) {
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: ProposalStatus.REVIEWING },
    });
  }

  const type = typeMeta(proposal.type);
  const TypeIcon = type.icon;
  const effectiveStatus =
    proposal.status === ProposalStatus.NEW
      ? ProposalStatus.REVIEWING
      : proposal.status;
  const visibleStatus = displayStatus(effectiveStatus);
  const status = statusMeta(visibleStatus);
  const StatusIcon = status.icon;
  const hasFile = Boolean(proposal.supportFileName);
  const hasAssociatedAcceptedRecord =
    proposal.status === ProposalStatus.ACCEPTED &&
    Boolean(
      proposal.createdResearchProject || proposal.createdOrganizedProject,
    );
  const hasDescriptionSideContent =
    Boolean(proposal.task) || hasAssociatedAcceptedRecord;
  const canEditProposal = proposalIsOpenForEditing(effectiveStatus);

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="min-w-0 text-[14px] font-normal leading-6 text-[#252525] dark:text-[#E4E4E4]">
              <h1 className="inline whitespace-normal break-words font-normal">
                {proposal.title}
              </h1>
              <span className="ml-2 inline-flex items-center gap-2 align-middle">
                <HeaderIcon label={type.label} className={type.className}>
                  <TypeIcon className="h-4 w-4" aria-hidden="true" />
                </HeaderIcon>
                <HeaderIcon
                  label={label(visibleStatus)}
                  className={status.className}
                >
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                </HeaderIcon>
                {canEditProposal ? (
                  <ProposalEditButton
                    proposal={{
                      id: proposal.id,
                      type: proposal.type,
                      title: proposal.title,
                      description: proposal.description,
                      contactInfo: proposal.contactInfo ?? "",
                      notes: proposal.notes ?? "",
                      identifier: proposal.identifier ?? "",
                      organization: proposal.organization ?? "",
                      location: proposal.location ?? "",
                      website: proposal.website ?? "",
                      venueType: proposal.venueType ?? "",
                      supportFileName: proposal.supportFileName ?? "",
                      supportFileSize: fileSizeLabel(proposal.supportFileSize),
                    }}
                  />
                ) : (
                  <HeaderIcon
                    label="Proposal can no longer be edited"
                    className="text-[#667085] dark:text-[#B0B0B0]"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </HeaderIcon>
                )}
                {canAccessAll ? (
                  <ProposalFeedbackButton
                    proposalId={proposal.id}
                    proposalTitle={proposal.title}
                    disabled={
                      effectiveStatus === ProposalStatus.ACCEPTED ||
                      effectiveStatus === ProposalStatus.DECLINED
                    }
                  />
                ) : null}
              </span>
            </div>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        <section className="border border-[#D8D0C2] bg-[#FFFDF8] shadow-none dark:border-[#444444] dark:bg-[#2C2C2C]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-5 py-3 text-xs text-[#667085] dark:text-[#B0B0B0]">
            <span>
              Proposal ID:{" "}
              <span className="font-mono text-[#344054] dark:text-[#E4E4E4]">
                {proposal.id}
              </span>
            </span>
            <span className="text-[#A0A8B5] dark:text-[#777777]">|</span>
            <span>Submitted {longDate(proposal.createdAt)}</span>
          </div>

          <div
            className={`${sectionDividerClass} grid items-start gap-5 p-5 ${
              hasDescriptionSideContent ? "lg:grid-cols-2" : ""
            }`}
          >
            <div className="min-w-0">
              <h2 className="text-sm font-normal text-[#252525] dark:text-[#E4E4E4]">
                Proposal description
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4B5565] dark:text-[#B0B0B0]">
                {proposal.description}
              </p>
            </div>
            {hasDescriptionSideContent ? (
              <div className="min-w-0 space-y-4">
                <AssociatedTaskCard task={proposal.task} />
                <AssociatedRecordCard proposal={proposal} />
              </div>
            ) : null}
          </div>

          <div
            className={`${sectionDividerClass} grid gap-5 p-5 lg:grid-cols-2`}
          >
            <DetailItem
              icon={<UserRound className="h-3.5 w-3.5" />}
              label="Submitted by"
              value={
                <span>
                  <span className="block text-[#252525] dark:text-[#E4E4E4]">
                    {displayResearchPersonName(proposal.submittedBy)}
                  </span>
                  <span className="block text-xs text-[#667085] dark:text-[#B0B0B0]">
                    {displayResearchEmail(proposal.submittedBy.email)}
                  </span>
                  <span className="mt-1 block text-xs text-[#667085] dark:text-[#B0B0B0]">
                    {proposal.submittedBy.roles.map(label).join(", ") ||
                      "No roles"}
                  </span>
                </span>
              }
            />
            <DetailItem
              icon={<Phone className="h-3.5 w-3.5" />}
              label="Contact"
              value={proposal.contactInfo || "-"}
            />
          </div>

          {(proposal.identifier ||
            proposal.organization ||
            proposal.location ||
            proposal.website) && (
            <div className={`${sectionDividerClass} p-5`}>
              <dl>
                <DetailItem
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Venue details"
                  value={
                    <span>
                      {proposal.identifier && (
                        <span className="block">
                          {proposal.type === ProposalType.CONFERENCE
                            ? "ISBN"
                            : "ISSN"}
                          : {proposal.identifier}
                        </span>
                      )}
                      {proposal.organization && (
                        <span className="block">{proposal.organization}</span>
                      )}
                      {proposal.location && (
                        <span className="block">{proposal.location}</span>
                      )}
                      {proposal.website && (
                        <span className="block break-all">
                          {proposal.website}
                        </span>
                      )}
                    </span>
                  }
                />
              </dl>
            </div>
          )}

          <div
            className={`${sectionDividerClass} grid gap-5 p-5 lg:grid-cols-2`}
          >
            <DetailItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Support file"
              value={
                hasFile ? (
                  <span>
                    <span className="block">{proposal.supportFileName}</span>
                    <span className="block text-xs text-[#667085] dark:text-[#B0B0B0]">
                      {proposal.supportFileType || "Unknown type"}
                      {proposal.supportFileSize
                        ? ` - ${fileSizeLabel(proposal.supportFileSize)}`
                        : ""}
                    </span>
                    <a
                      href={`/api/research/proposals/${proposal.id}/file`}
                      className="mt-2 inline-flex origin-left items-center gap-2 text-sm font-normal text-emerald-700 outline-none transition-[color,text-shadow,transform] duration-180 ease-out hover:text-emerald-800 hover:[text-shadow:0_0_0.55rem_rgba(16,185,129,0.18)] active:scale-[0.985] dark:text-emerald-300 dark:hover:text-emerald-200"
                    >
                      <Download className="h-4 w-4" />
                      Download file
                    </a>
                  </span>
                ) : (
                  "No support file"
                )
              }
            />
            {proposal.decisionComment && (
              <DetailItem
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Admin comment"
                value={proposal.decisionComment}
              />
            )}
          </div>

          <div className={`${sectionDividerClass} p-5`}>
            <h2 className="text-sm font-normal text-[#252525] dark:text-[#E4E4E4]">
              Notes
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4B5565] dark:text-[#B0B0B0]">
              {proposal.notes || "No notes."}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
