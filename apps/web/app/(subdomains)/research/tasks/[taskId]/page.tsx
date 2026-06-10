import Link from "next/link";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileText,
  Globe2,
  KeyRound,
  Send,
  UserRound,
} from "lucide-react";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../../auth";
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
  researchLinkClass,
  researchMutedLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
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
  return value.toISOString().slice(0, 10);
}

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
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
    };
  }

  if (task.status === "COMPLETED") {
    if (!task.dueDate || !task.completedAt) {
      return {
        label: "Complete",
        detail: "Finished",
        tone: "emerald" as const,
      };
    }
    if (task.completedAt <= task.dueDate) {
      return {
        label: "Complete",
        detail: `${durationText(task.dueDate.getTime() - task.completedAt.getTime())} early`,
        tone: "emerald" as const,
      };
    }
    return {
      label: "Overdue",
      detail: `${durationText(task.completedAt.getTime() - task.dueDate.getTime())} late`,
      tone: "rose" as const,
    };
  }

  if (task.status === "CHECKING") {
    return {
      label: "Checking",
      detail: "Waiting for assigner review",
      tone: "violet" as const,
    };
  }

  if (task.status === "NEED_CLARIFY") {
    return {
      label: "Need clarify",
      detail: "Waiting for assigner answer",
      tone: "amber" as const,
    };
  }

  if (task.dueDate && now > task.dueDate) {
    return {
      label: "Overdue",
      detail: `${durationText(now.getTime() - task.dueDate.getTime())} overdue`,
      tone: "rose" as const,
    };
  }

  return {
    label: "In progress",
    detail: task.dueDate
      ? `${durationText(task.dueDate.getTime() - now.getTime())} left`
      : "No due date",
    tone: "blue" as const,
  };
}

function toneClass(
  tone: "emerald" | "rose" | "blue" | "slate" | "violet" | "amber",
) {
  if (tone === "emerald")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 ring-emerald-500/20";
  if (tone === "rose")
    return "border-rose-500/30 bg-rose-500/10 text-rose-200 ring-rose-500/20";
  if (tone === "blue")
    return "border-sky-500/30 bg-sky-500/10 text-sky-200 ring-sky-500/20";
  if (tone === "violet")
    return "border-violet-500/30 bg-violet-500/10 text-violet-200 ring-violet-500/20";
  if (tone === "amber")
    return "border-amber-500/30 bg-amber-500/10 text-amber-200 ring-amber-500/20";
  return "border-[#555555] bg-[#383838] text-[#E4E4E4] ring-[#555555]";
}

function accountLine(
  account: { username: string; password: string; email: string | null } | null,
) {
  if (!account) return "No account assigned";
  return [
    account.username || "No account id",
    account.email || "No email",
    account.password || "No pass",
  ].join(" - ");
}

function taskAllowsReport(taskType: string | null) {
  return (
    taskType === "PRODUCTION" ||
    taskType === "PROJECT_PRODUCTION" ||
    taskType === "PROJECT_RESEARCH_ASSOCIATED" ||
    taskType === "OTHER"
  );
}

function researchAuthors(project: {
  leadResearcher: { name: string | null; email: string };
  authors: { name: string | null; email: string }[];
  authorEntries: { user: { name: string | null; email: string } }[];
  coAuthors: string | null;
}) {
  const names =
    project.authorEntries.length > 0
      ? project.authorEntries.map(
          (entry) => entry.user.name || entry.user.email,
        )
      : project.authors.length > 0
        ? project.authors.map((author) => author.name || author.email)
        : [
            project.leadResearcher.name || project.leadResearcher.email,
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
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];

  if (!userId) redirect("/login");

  const isAdmin = roles.includes(Role.ADMIN);
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
      projectId: true,
      organizedProjectId: true,
      journalId: true,
      conferenceId: true,
      reviewId: true,
      accountId: true,
      taskType: true,
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
          leadResearcher: { select: { name: true, email: true } },
          authors: {
            select: { name: true, email: true },
            orderBy: [{ name: "asc" }, { email: "asc" }],
          },
          authorEntries: {
            include: { user: { select: { name: true, email: true } } },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
        },
      },
      journal: {
        select: {
          id: true,
          name: true,
          rank: true,
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
  const isAssignee = Boolean(myAssignment);
  const selfAssigned = isAssigner && isAssignee;
  if (!isAdmin && !isAssigner && !isAssignee) notFound();

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
    (isAdmin || isAssigner) &&
    (selfAssigned || isAdmin || task.status === ResearchTaskStatus.CHECKING);
  const canRedo =
    !isClosed &&
    (isAdmin || isAssigner) &&
    task.status === ResearchTaskStatus.CHECKING;
  const canRequestClarification =
    !isClosed &&
    isAssignee &&
    !selfAssigned &&
    task.status !== ResearchTaskStatus.CHECKING &&
    task.status !== ResearchTaskStatus.NEED_CLARIFY &&
    !hasOpenMyClarification;
  const canRevoke = !isClosed && (isAdmin || isAssigner);
  const canEdit = !isClosed && isAdmin;
  const canUseReminder = isAdmin || isAssigner;
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
  const reportEnabled = taskAllowsReport(task.taskType);
  const canUploadReport =
    reportEnabled && !isClosed && isAssignee && !isAssigner;
  const canDownloadReport =
    reportEnabled && Boolean(task.reportFileName) && (isAdmin || isAssigner);
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
  ] = canEdit
    ? await Promise.all([
        prisma.user.findMany({
          where: { activeSites: { has: "research" } },
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        }),
        prisma.researchProject.findMany({
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true, researchCode: true, title: true, stage: true },
        }),
        prisma.journal.findMany({
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            name: true,
            publisher: true,
            rank: true,
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
          orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
          include: { journal: { select: { name: true } } },
        }),
        prisma.organizedProject.findMany({
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true, title: true, referenceCode: true, status: true },
        }),
      ])
    : [[], [], [], [], [], [], []];
  const assignees = assigneeUsers.map((user) => ({
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
      meta: [journal.publisher, journal.rank, journal.issn]
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
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/tasks"
          className={`inline-flex items-center gap-2 text-sm ${researchMutedLinkClass}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>

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
      </div>

      <section className="border border-[#444444] bg-[#2C2C2C] p-5 shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-sky-200">
              <ClipboardList className="h-4 w-4 text-sky-300" />
              {task.category || "Task"}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="text-lg font-normal tracking-tight text-[#E4E4E4]">
                {task.title}
              </h1>
              {(canEdit || canUseReminder) && (
                <span className="inline-flex items-center gap-2">
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
            </div>
            <p className="mt-2 text-sm text-[#B0B0B0]">
              Created by {task.createdBy.name || task.createdBy.email}
            </p>
          </div>
          <div className="min-w-44 border border-[#444444] bg-[#202020] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.18)]">
            <span
              className={`inline-flex border px-2 py-1 text-xs font-normal ring-1 ${toneClass(meta.tone)}`}
            >
              {meta.label}
            </span>
            <p className="mt-2 text-sm font-semibold text-[#E4E4E4]">
              {meta.detail}
            </p>
            <p className="mt-1 text-xs text-[#B0B0B0]">
              Due {formatDate(task.dueDate)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {task.project && (
            <div className="border border-[#444444] bg-[#242424] p-4 transition hover:-translate-y-0.5 hover:border-[#5a5a5a] hover:bg-[#292929] hover:shadow-lg hover:shadow-black/20">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                <FileText className="h-4 w-4 text-sky-300" /> Research
              </div>
              <Link
                href={`/projects/${task.project.id}`}
                className={`mt-2 inline-flex text-sm ${researchLinkClass}`}
              >
                {task.project.title}
              </Link>
              <p className="mt-1 text-xs leading-5 text-[#B0B0B0]">
                {researchAuthors(task.project)}
              </p>
            </div>
          )}
          {task.journal && (
            <div className="border border-[#444444] bg-[#242424] p-4 transition hover:-translate-y-0.5 hover:border-[#5a5a5a] hover:bg-[#292929] hover:shadow-lg hover:shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                  <Send className="h-4 w-4 text-emerald-300" /> Journal
                </div>
                <VenueLinks
                  homepage={task.journal.homepageLink}
                  submission={journalSubmissionLink}
                />
              </div>
              <Link
                href={`/journals/${task.journal.id}`}
                className={`mt-2 inline-flex text-sm ${researchLinkClass}`}
              >
                {task.journal.name}
              </Link>
              <p className="mt-1 text-xs text-[#B0B0B0]">
                {task.journal.publisher || "No publisher"} -{" "}
                {task.journal.rank || "No rank"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[#B0B0B0]">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                {accountLine(task.account)}
              </p>
            </div>
          )}
          {task.conference && (
            <div className="border border-[#444444] bg-[#242424] p-4 transition hover:-translate-y-0.5 hover:border-[#5a5a5a] hover:bg-[#292929] hover:shadow-lg hover:shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
                  <Send className="h-4 w-4 text-violet-300" /> Conference
                </div>
                <VenueLinks
                  homepage={task.conference.website}
                  submission={conferenceSubmissionLink}
                />
              </div>
              <Link
                href={`/conferences/${task.conference.id}`}
                className={`mt-2 inline-flex text-sm ${researchLinkClass}`}
              >
                {task.conference.name}
              </Link>
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
                {accountLine(task.account)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 min-h-44 border border-[#444444] bg-[#242424] p-5">
          <h2 className="text-sm font-bold text-[#E4E4E4]">Task content</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#B0B0B0]">
            {task.description || "No task note."}
          </p>
        </div>

        {reportEnabled && (
          <TaskReportPanel
            taskId={task.id}
            canUpload={canUploadReport}
            canDownload={canDownloadReport}
            fileName={task.reportFileName}
            fileSize={task.reportFileSize}
            uploadedAt={
              task.reportUploadedAt ? formatDate(task.reportUploadedAt) : null
            }
          />
        )}

        <TaskClarificationPanel
          clarifications={clarificationItems}
          canAnswer={canAnswerClarification}
          answerAction={clarificationAnswerAction}
        />

        <div className="mt-6 grid gap-3">
          <h2 className="text-sm font-bold text-[#E4E4E4]">Assignees</h2>
          <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
            {task.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="border border-[#444444] bg-[#242424] p-3 transition hover:-translate-y-0.5 hover:border-[#5a5a5a] hover:bg-[#292929]"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <UserRound className="mt-0.5 h-4 w-4 flex-none text-amber-300" />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-semibold text-[#E4E4E4]">
                      {assignment.user.name || assignment.user.email}
                    </span>
                    <span className="block truncate text-xs text-[#B0B0B0]">
                      {assignment.user.email}
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-[#444444] pt-5 text-sm sm:grid-cols-3">
          <MetaItem
            icon={<CalendarClock className="h-4 w-4" />}
            label="Created"
            value={formatDate(task.createdAt)}
          />
          <MetaItem
            icon={<CalendarClock className="h-4 w-4" />}
            label="Updated"
            value={formatDate(task.updatedAt)}
          />
          <MetaItem
            icon={<CalendarClock className="h-4 w-4" />}
            label="Completed"
            value={formatDate(task.completedAt)}
          />
        </div>
      </section>
    </div>
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
    <div className="flex items-center gap-2">
      <ExternalVenueLink
        href={homepage}
        label="Open homepage"
        className="border-sky-500/30 bg-sky-500/10 text-sky-200 hover:border-sky-400/50 hover:bg-sky-500/15"
      >
        <Globe2 className="h-4 w-4" />
      </ExternalVenueLink>
      <ExternalVenueLink
        href={submission}
        label="Open submission site"
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/50 hover:bg-emerald-500/15"
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
  const baseClass = `group/link relative inline-flex h-9 w-9 items-center justify-center rounded-none border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`;

  if (!href) {
    return (
      <span
        className={`${baseClass} cursor-not-allowed opacity-45 hover:translate-y-0 hover:shadow-sm`}
        aria-label={`${label} not available`}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={baseClass}
      aria-label={label}
    >
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap border border-[#555555] bg-[#202020] px-2.5 py-1.5 text-[11px] font-semibold text-[#E4E4E4] opacity-0 shadow-lg shadow-black/30 transition duration-200 ease-out group-hover/link:translate-y-0 group-hover/link:opacity-100">
        {label}
      </span>
    </a>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#B0B0B0]">
        <span className="text-sky-300">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-[#E4E4E4]">{value}</p>
    </div>
  );
}
