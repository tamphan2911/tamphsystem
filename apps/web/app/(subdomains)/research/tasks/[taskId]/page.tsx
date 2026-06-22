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
  CheckCircle2,
  ClipboardList,
  Clock3,
  CircleHelp,
  ExternalLink,
  FileDown,
  FileText,
  Globe2,
  KeyRound,
  SearchCheck,
  Send,
  UserRound,
} from "lucide-react";
import { prisma, JournalApprovalStatus, ResearchTaskStatus, Role } from "@repo/db";
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
    <span className="px-1 text-[#A0A8B5] dark:text-[#777777]" aria-hidden>
      |
    </span>
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
      revokedAt: true,
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
      reportFileName: true,
      reportFileSize: true,
      reportUploadedAt: true,
      reportUploadedById: true,
      createdBy: { select: { name: true, email: true } },
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
  const journalAccount = associatedJournalSubmission
    ? associatedJournalSubmission.account
    : task.account;

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
  const canMarkReady =
    !isClosed &&
    isAssignee &&
    !selfAssigned &&
    task.status !== ResearchTaskStatus.CHECKING &&
    task.status !== ResearchTaskStatus.NEED_CLARIFY;
  const canApprove =
    !isClosed &&
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
  const canEdit = !isClosed && !isAssignee && isAdmin;
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
            rank: true,
            localRank: true,
            issn: true,
          },
        }),
        prisma.publisherAccount.findMany({
          where: { journalId: { not: null } },
          orderBy: [{ updatedAt: "desc" }, { username: "asc" }],
          select: { id: true, journalId: true, username: true, email: true },
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
      ])
    : [[], [], [], [], [], [], [], []];
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
  const accountOptions = accounts
    .filter((account) => Boolean(account.journalId))
    .map((account) => ({
      id: account.id,
      journalId: account.journalId ?? "",
      username: account.username,
      email: account.email ?? "",
    }));
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
                          title: task.title,
                          description: task.description ?? "",
                          dueDate: dateInputValue(task.dueDate),
                          taskType: task.taskType ?? "OTHER",
                          projectId: task.projectId ?? "",
                          journalId: task.journalId ?? "",
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
                        }}
                        assignees={assignees}
                        researchOptions={researchOptions}
                        venueOptions={venueOptions}
                        accountOptions={accountOptions}
                        reviewOptions={reviewOptions}
                        organizedProjectOptions={organizedProjectOptions}
                        submissionOptions={submissionOptions}
                        checkerOptions={checkerOptions}
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
            <div className="grid gap-5 p-5 md:grid-cols-2">
              {task.project && (
                <div className="min-w-0 md:col-span-2">
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
                  <div className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                    Journal
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
          )}

          <div className="grid items-start gap-5 border-t border-[#444444] p-5 md:grid-cols-2">
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                Task content
              </h2>
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

          <section className="grid gap-3 border-t border-[#444444] p-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
              Assignees
            </h2>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              {task.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border-t border-[#444444] pt-3"
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <UserRound className="research-task-icon-motion mt-0.5 h-4 w-4 flex-none text-amber-700 dark:text-amber-300" />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-sm font-normal text-[#E4E4E4]">
                        {displayResearchPersonName(assignment.user)}
                      </span>
                      <span className="block truncate text-xs text-[#B0B0B0]">
                        {displayResearchEmail(assignment.user.email)}
                      </span>
                    </span>
                  </span>
                </div>
              ))}
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
