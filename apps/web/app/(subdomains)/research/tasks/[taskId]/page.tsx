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
} from "../../actions";
import { FinishTaskForm } from "./FinishTaskForm";
import { RevokeTaskForm } from "./RevokeTaskForm";
import { ClarificationRequestForm, RedoTaskForm } from "./TaskWorkflowForms";
import { EditTaskDialog } from "./EditTaskDialog";
import {
  TaskClarificationPanel,
  type TaskClarificationItem,
} from "./TaskClarificationPanel";

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
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (tone === "rose")
    return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  if (tone === "blue")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (tone === "violet")
    return "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
  if (tone === "amber")
    return "bg-amber-50 text-amber-800 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
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
    include: {
      createdBy: { select: { name: true, email: true } },
      project: { select: { id: true, title: true } },
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
          question:
            "Could you confirm whether the submission should use the journal template or the university template?",
          answer:
            "Use the journal template for the main manuscript and keep the university format only for the internal archive copy.",
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 28),
          answeredAt: new Date(now.getTime() - 1000 * 60 * 60 * 25),
        },
        {
          taskId: task.id,
          requestedById: demoRequester.userId,
          answeredById: task.createdById,
          question:
            "The author list has two affiliations missing. Should I pause submission until they are updated?",
          answer:
            "Please continue preparing the submission package, but do not submit until the affiliations are added.",
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
  const canAnswerClarification = !isClosed && (isAdmin || isAssigner);
  const journalSubmissionLink =
    task.journal?.submissionLink || firstUrl(task.journal?.note);
  const conferenceSubmissionLink = firstUrl(task.conference?.note);
  const [
    assigneeUsers,
    projects,
    journals,
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
        prisma.conference.findMany({
          orderBy: [{ startDate: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            organizer: true,
            type: true,
            location: true,
          },
        }),
        prisma.academicReview.findMany({
          orderBy: [{ dueDate: "asc" }, { requestedAt: "desc" }],
          include: { journal: { select: { name: true } } },
        }),
        prisma.organizedProject.findMany({
          orderBy: [{ updatedAt: "desc" }],
          select: { id: true, title: true, referenceCode: true, status: true },
        }),
      ])
    : [[], [], [], [], [], []];
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
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
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

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ClipboardList className="h-4 w-4" />
              {task.category || "Task"}
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="text-lg font-normal tracking-tight text-slate-950 dark:text-white">
                {task.title}
              </h1>
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
                    assigneeIds: task.assignments.map(
                      (assignment) => assignment.userId,
                    ),
                  }}
                  assignees={assignees}
                  researchOptions={researchOptions}
                  venueOptions={venueOptions}
                  reviewOptions={reviewOptions}
                  organizedProjectOptions={organizedProjectOptions}
                />
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Created by {task.createdBy.name || task.createdBy.email}
            </p>
          </div>
          <div className="min-w-44 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ring-1 ${toneClass(meta.tone)}`}
            >
              {meta.label}
            </span>
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {meta.detail}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Due {formatDate(task.dueDate)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {task.project && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                <FileText className="h-4 w-4" /> Research
              </div>
              <Link
                href={`/projects/${task.project.id}`}
                className="mt-2 inline-flex text-sm font-normal text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
              >
                {task.project.title}
              </Link>
            </div>
          )}
          {task.journal && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <Send className="h-4 w-4" /> Journal
                </div>
                <VenueLinks
                  homepage={task.journal.homepageLink}
                  submission={journalSubmissionLink}
                />
              </div>
              <Link
                href={`/journals/${task.journal.id}`}
                className="mt-2 inline-flex text-sm font-normal text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
              >
                {task.journal.name}
              </Link>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {task.journal.publisher || "No publisher"} -{" "}
                {task.journal.rank || "No rank"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                {accountLine(task.account)}
              </p>
            </div>
          )}
          {task.conference && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  <Send className="h-4 w-4" /> Conference
                </div>
                <VenueLinks
                  homepage={task.conference.website}
                  submission={conferenceSubmissionLink}
                />
              </div>
              <Link
                href={`/conferences/${task.conference.id}`}
                className="mt-2 inline-flex text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
              >
                {task.conference.name}
              </Link>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {task.conference.type || "No type"} -{" "}
                {task.conference.location || "No location"} -{" "}
                {conferenceTime(
                  task.conference.startDate,
                  task.conference.endDate,
                )}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                {accountLine(task.account)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">
            Task content
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
            {task.description || "No task note."}
          </p>
        </div>

        <TaskClarificationPanel
          clarifications={clarificationItems}
          canAnswer={canAnswerClarification}
          answerAction={clarificationAnswerAction}
        />

        <div className="mt-6 grid gap-3">
          <h2 className="text-sm font-bold text-slate-950 dark:text-white">
            Assignees
          </h2>
          <div className="grid max-w-2xl gap-2 sm:grid-cols-2">
            {task.assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <UserRound className="mt-0.5 h-4 w-4 flex-none text-slate-400" />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {assignment.user.name || assignment.user.email}
                    </span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {assignment.user.email}
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-800 sm:grid-cols-3">
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
        className="border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
      >
        <Globe2 className="h-4 w-4" />
      </ExternalVenueLink>
      <ExternalVenueLink
        href={submission}
        label="Open submission site"
        className="border-emerald-100 bg-emerald-50 text-emerald-600 hover:border-emerald-200 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
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
  const baseClass = `group/link relative inline-flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`;

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
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 opacity-0 shadow-lg shadow-slate-900/10 transition duration-200 ease-out group-hover/link:translate-y-0 group-hover/link:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
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
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}
