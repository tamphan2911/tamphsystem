import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Ban,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Database,
  Globe2,
  Hash,
  Mail,
  MessageSquareText,
  PencilLine,
  SearchCheck,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { countryName } from "@/sites/research/lib/countries";
import {
  accessibleResearchReviewWhere,
  canAccessAllResearchReviews,
} from "@/sites/research/lib/reviewAccess";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function reviewStatusMeta(status: string): {
  icon: LucideIcon;
  className: string;
} {
  if (status === "ACCEPTED") {
    return {
      icon: CheckCircle2,
      className:
        "text-rose-700 hover:text-rose-800 dark:text-[#FFC1CC] dark:hover:text-rose-200",
    };
  }
  if (status === "IN_PROGRESS") {
    return {
      icon: PencilLine,
      className:
        "text-violet-700 hover:text-violet-800 dark:text-[#B39CD0] dark:hover:text-violet-200",
    };
  }
  if (status === "SUBMITTED") {
    return {
      icon: Send,
      className:
        "text-cyan-700 hover:text-cyan-800 dark:text-[#A8DADC] dark:hover:text-cyan-200",
    };
  }
  if (status === "CANCELLED") {
    return {
      icon: XCircle,
      className:
        "text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200",
    };
  }
  return {
    icon: Mail,
    className:
      "text-slate-500 hover:text-slate-700 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]",
  };
}

function taskStatusMeta(status: string): {
  icon: LucideIcon;
  className: string;
} {
  if (status === "COMPLETED") {
    return {
      icon: CheckCircle2,
      className:
        "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200",
    };
  }
  if (status === "CHECKING") {
    return {
      icon: SearchCheck,
      className:
        "text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
    };
  }
  if (status === "NEED_CLARIFY") {
    return {
      icon: CircleHelp,
      className:
        "text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200",
    };
  }
  if (status === "REVOKED") {
    return {
      icon: Ban,
      className:
        "text-slate-500 hover:text-slate-700 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]",
    };
  }
  return {
    icon: Clock3,
    className:
      "text-sky-700 hover:text-sky-800 dark:text-[#A8DADC] dark:hover:text-cyan-200",
  };
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
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

function HoverIcon({
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
        className={`inline-flex h-5 w-5 cursor-help items-center justify-center border-0 bg-transparent transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] active:scale-95 ${className}`}
      >
        {children}
      </span>
    </IconHint>
  );
}

const sectionDividerClass = "border-t border-[#D8D0C2] dark:border-[#4A4A4A]";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!userId) redirect("/login");
  const isAdmin = canAccessAllResearchReviews(roles);
  const review = await prisma.academicReview.findFirst({
    where: { id, ...accessibleResearchReviewWhere(roles, userId) },
    include: {
      journal: true,
      account: true,
      tasks: {
        where: isAdmin
          ? {}
          : {
              assignments: { some: { userId } },
            },
        include: {
          createdBy: { select: { name: true, email: true } },
          assignments: {
            include: { user: { select: { name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!review) {
    if (!isAdmin) redirect("/401");
    notFound();
  }

  const status = reviewStatusMeta(review.status);
  const StatusIcon = status.icon;
  const externalLinks = [
    {
      href: review.journal.homepageLink,
      label: "Open journal homepage",
      icon: Globe2,
      className:
        "text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200",
    },
    {
      href: review.journal.submissionLink,
      label: "Open submission portal",
      icon: Send,
      className:
        "text-cyan-700 hover:text-cyan-800 dark:text-[#A8DADC] dark:hover:text-cyan-200",
    },
    {
      href: review.journal.scimagoLink,
      label: "Open Scimago profile",
      icon: BarChart3,
      className:
        "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200",
    },
    {
      href: review.journal.scopusLink,
      label: "Open Scopus profile",
      icon: Database,
      className:
        "text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
    },
  ].filter((item) => Boolean(item.href));

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate text-[16px] font-normal leading-6 text-[#252525] dark:text-[#E4E4E4]">
                {review.manuscriptTitle}
              </h1>
              <HoverIcon
                label={statusLabel(review.status)}
                className={status.className}
              >
                <StatusIcon className="h-4 w-4" aria-hidden="true" />
              </HoverIcon>
            </div>
            <p className="mt-1 min-w-0 truncate text-xs font-normal text-[#667085] dark:text-[#B0B0B0]">
              {review.manuscriptId || review.id.slice(0, 8).toUpperCase()} -{" "}
              {review.journal.name}
              {review.reviewRound ? ` - ${review.reviewRound}` : ""}
            </p>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        <section className="border border-[#D8D0C2] bg-[#FFFDF8] shadow-none dark:border-[#444444] dark:bg-[#2C2C2C]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-5 py-3 text-xs text-[#667085] dark:text-[#B0B0B0]">
            <span>
              Review ID:{" "}
              <span className="font-mono text-[#344054] dark:text-[#E4E4E4]">
                {review.id}
              </span>
            </span>
            <span className="text-[#A0A8B5] dark:text-[#777777]">|</span>
            <span>Status: {statusLabel(review.status)}</span>
            <span className="text-[#A0A8B5] dark:text-[#777777]">|</span>
            <span>Due: {shortDate(review.dueDate)}</span>
          </div>

          <div className={`${sectionDividerClass} p-5`}>
            <h2 className="text-sm font-normal text-[#252525] dark:text-[#E4E4E4]">
              Review information
            </h2>
            <dl className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <DetailItem
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Requested date"
                value={shortDate(review.requestedAt)}
              />
              <DetailItem
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Due date"
                value={shortDate(review.dueDate)}
              />
              <DetailItem
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Completed date"
                value={shortDate(review.completedAt)}
              />
              <DetailItem
                icon={<PencilLine className="h-3.5 w-3.5" />}
                label="Review round"
                value={review.reviewRound || "-"}
              />
              <DetailItem
                icon={<MessageSquareText className="h-3.5 w-3.5" />}
                label="Recommendation"
                value={review.recommendation || "-"}
              />
              <DetailItem
                icon={<UserRound className="h-3.5 w-3.5" />}
                label="Editor"
                value={review.editorName || "-"}
              />
            </dl>
          </div>

          <div className={`${sectionDividerClass} p-5`}>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Link
                  href={`/journals/${review.journal.id}`}
                  className="research-allow-transform inline-flex max-w-full text-sm font-normal text-[#1F7180] outline-none transition-[color,text-shadow,transform] duration-180 ease-out hover:bg-transparent hover:text-[#155864] hover:[text-shadow:0_0_0.55rem_rgba(31,113,128,0.16)] active:scale-[0.985] focus-visible:bg-transparent focus-visible:ring-0 dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
                >
                  {review.journal.name}
                </Link>
                {externalLinks.length > 0 && (
                  <div className="flex flex-none items-center gap-2">
                    {externalLinks.map((item) => (
                      <IconHint
                        key={item.label}
                        label={item.label}
                        position="bottom"
                      >
                        <a
                          href={item.href as string}
                          target="_blank"
                          rel="noreferrer"
                          className={`research-clickable-icon research-allow-transform inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:bg-transparent hover:shadow-none active:scale-95 focus-visible:ring-0 ${item.className}`}
                          aria-label={item.label}
                        >
                          <item.icon className="h-4 w-4" aria-hidden="true" />
                        </a>
                      </IconHint>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
                <span>ISSN: {review.journal.issn || "-"}</span>
                <span aria-hidden="true">|</span>
                <span>{review.journal.publisher || "No publisher"}</span>
                <span aria-hidden="true">|</span>
                <span>{review.journal.rank || "No rank"}</span>
                <span aria-hidden="true">|</span>
                <span>
                  {review.journal.country
                    ? countryName(review.journal.country)
                    : "No country"}
                </span>
              </p>
              {review.account ? (
                <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4B5565] dark:text-[#B0B0B0]">
                  <span>ID: {review.account.username}</span>
                  <span aria-hidden="true">|</span>
                  <span>Pass: {review.account.password}</span>
                  {review.account.email ? (
                    <>
                      <span aria-hidden="true">|</span>
                      <span>Email: {review.account.email}</span>
                    </>
                  ) : null}
                  <span aria-hidden="true">|</span>
                  <span>Note: {review.account.note || "-"}</span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-[#667085] dark:text-[#B0B0B0]">
                  No account associated with this review.
                </p>
              )}
            </div>
          </div>

          <div className={`${sectionDividerClass} p-5`}>
            <h2 className="flex items-center gap-2 text-sm font-normal text-[#252525] dark:text-[#E4E4E4]">
              <Hash className="h-4 w-4 text-amber-600 dark:text-amber-300" />
              Private note
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4B5565] dark:text-[#B0B0B0]">
              {review.note || "No private note recorded."}
            </p>
          </div>
        </section>

        <section className="overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] shadow-none dark:border-[#444444] dark:bg-[#2C2C2C]">
          <div className="flex items-center justify-between gap-3 border-b border-[#D8D0C2] px-5 py-4 dark:border-[#444444]">
            <div>
              <h2 className="text-sm font-normal text-[#252525] dark:text-[#E4E4E4]">
                Tasks for this review
              </h2>
              <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
                Work assigned for this review record.
              </p>
            </div>
            <span className="text-xs font-normal text-[#667085] dark:text-[#B0B0B0]">
              {review.tasks.length}{" "}
              {review.tasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed text-left">
              <thead className="border-b border-[#D8D0C2] bg-[#F6F3EC] text-xs uppercase tracking-wide text-[#667085] dark:border-[#444444] dark:bg-[#383838] dark:text-[#B0B0B0]">
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="w-36 px-4 py-3">Status</th>
                  <th className="w-24 px-4 py-3">Due</th>
                  <th className="w-44 px-4 py-3">Assignees</th>
                  <th className="w-36 px-4 py-3">Assigner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DDD1] dark:divide-[#444444]">
                {review.tasks.map((task) => {
                  const taskStatus = taskStatusMeta(task.status);
                  const TaskStatusIcon = taskStatus.icon;
                  return (
                    <tr
                      key={task.id}
                      className="align-top transition-colors duration-150 hover:bg-[#F7F4ED] dark:hover:bg-[#333333]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="research-allow-transform text-sm font-normal text-[#1F7180] outline-none transition-[color,text-shadow,transform] duration-180 ease-out hover:bg-transparent hover:text-[#155864] hover:[text-shadow:0_0_0.55rem_rgba(31,113,128,0.16)] active:scale-[0.985] focus-visible:bg-transparent focus-visible:ring-0 dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
                        >
                          {task.title}
                        </Link>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                          {task.description || task.category || "No task note."}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-[#E4E4E4]">
                          <HoverIcon
                            label={statusLabel(task.status)}
                            className={taskStatus.className}
                          >
                            <TaskStatusIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </HoverIcon>
                          <span>{statusLabel(task.status)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                        {shortDate(task.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-sm leading-5 text-[#667085] dark:text-[#B0B0B0]">
                        {task.assignments.length > 0
                          ? task.assignments
                              .map((assignment) =>
                                displayResearchPersonName(assignment.user),
                              )
                              .join(", ")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#667085] dark:text-[#B0B0B0]">
                        {displayResearchPersonName(task.createdBy) ||
                          displayResearchEmail(task.createdBy.email)}
                      </td>
                    </tr>
                  );
                })}
                {review.tasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-[#667085] dark:text-[#B0B0B0]"
                    >
                      No task is linked to this review yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
