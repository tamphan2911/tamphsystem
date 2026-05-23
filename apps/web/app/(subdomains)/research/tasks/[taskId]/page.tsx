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
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { finishResearchTask, revokeResearchTask } from "../../actions";
import { FinishTaskForm } from "./FinishTaskForm";
import { RevokeTaskForm } from "./RevokeTaskForm";

export const dynamic = "force-dynamic";

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

  if (task.dueDate && now > task.dueDate) {
    return {
      label: "Overdue",
      detail: `${durationText(now.getTime() - task.dueDate.getTime())} overdue`,
      tone: "rose" as const,
    };
  }

  return {
    label: task.status === "IN_PROGRESS" ? "In progress" : "Open",
    detail: task.dueDate
      ? `${durationText(task.dueDate.getTime() - now.getTime())} left`
      : "No due date",
    tone:
      task.status === "IN_PROGRESS" ? ("blue" as const) : ("slate" as const),
  };
}

function toneClass(tone: "emerald" | "rose" | "blue" | "slate") {
  if (tone === "emerald")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (tone === "rose")
    return "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  if (tone === "blue")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function accountLine(
  account: { username: string; password: string; email: string | null } | null,
) {
  if (!account) return "No account assigned";
  return [
    account.username || "No account id",
    account.password || "No pass",
    account.email || "No email",
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
  const isAssistant =
    roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT);
  if (!isAdmin && !isAssistant) redirect("/401");

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
    },
  });

  if (!task) notFound();
  const myAssignment = task.assignments.find(
    (assignment) => assignment.userId === userId,
  );
  if (!isAdmin && !myAssignment) notFound();

  const meta = statusMeta(task);
  const finishAction = finishResearchTask.bind(null, task.id);
  const revokeAction = revokeResearchTask.bind(null, task.id);
  const canFinish =
    task.status !== "COMPLETED" &&
    task.status !== "REVOKED" &&
    (isAdmin || Boolean(myAssignment));
  const canRevoke =
    isAdmin && task.status !== "COMPLETED" && task.status !== "REVOKED";
  const journalSubmissionLink = firstUrl(task.journal?.note);
  const conferenceSubmissionLink = firstUrl(task.conference?.note);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <ClipboardList className="h-4 w-4" />
              {task.category || "Task"}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {task.title}
            </h1>
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
                className="mt-2 inline-flex text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
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
                className="mt-2 inline-flex text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
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

        {(canFinish || canRevoke) && (
          <div className="mt-6 flex flex-col justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row">
            {canRevoke && <RevokeTaskForm action={revokeAction} />}
            {canFinish && (
              <FinishTaskForm
                action={finishAction}
                accountId={task.account?.id}
                requiresSubmissionDate={
                  task.taskType === "SUBMIT_RESEARCH" ||
                  task.taskType === "SUBMIT_CONFERENCE"
                }
              />
            )}
          </div>
        )}

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
