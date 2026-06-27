import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  Database,
  Globe2,
  Mail,
  PencilLine,
  Send,
  XCircle,
} from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { ResearchDetailSection } from "@/sites/research/components/ResearchDetailSection";
import {
  IconHint,
  researchLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import {
  accessibleResearchReviewWhere,
  canAccessAllResearchReviews,
} from "@/sites/research/lib/reviewAccess";
import { NewReviewTaskDialog } from "./NewReviewTaskDialog";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  if (!value) return "-";
  return researchDateTimeFormat("en-GB", {
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

function reviewStatusMeta(status: string) {
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

function taskStatusLabel(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "REVISION_REQUESTED") return "Revision requested";
  if (status === "NEED_CLARIFY") return "Need clarify";
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function taskStatusClass(status: string) {
  if (status === "COMPLETED")
    return "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20";
  if (status === "CHECKING")
    return "bg-violet-500/10 text-violet-200 ring-violet-500/20";
  if (status === "REVISION_REQUESTED")
    return "bg-orange-500/10 text-orange-200 ring-orange-500/20";
  if (status === "NEED_CLARIFY")
    return "bg-amber-500/10 text-amber-200 ring-amber-500/20";
  if (status === "REVOKED") return "bg-[#383838] text-[#E4E4E4] ring-[#555555]";
  return "bg-sky-500/10 text-sky-200 ring-sky-500/20";
}

function taskCode(task: { id: string; taskCode: string | null }) {
  return (
    task.taskCode || task.id.replaceAll("-", "").slice(0, 10).toUpperCase()
  );
}

function taskTypeLabel(value: string | null, category: string | null) {
  if (category) return category;
  if (!value) return "General";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function journalRankLabel(journal: {
  type: string | null;
  localRank: string | null;
  rank: string | null;
}) {
  return journal.type === "LOCAL"
    ? journal.localRank || "No local rank"
    : journal.rank || "No rank";
}

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

  const canAccessAll = canAccessAllResearchReviews(roles);
  const canManageTasks =
    roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
  const assigneeWhere = roles.includes(Role.ADMIN)
    ? { activeSites: { has: "research" } }
    : {
        activeSites: { has: "research" },
        roles: { has: Role.ASSISTANT },
        NOT: { id: userId },
      };

  const [review, assigneeUsers, checkerUsers, taskGuides] = await Promise.all([
    prisma.academicReview.findFirst({
      where: { id, ...accessibleResearchReviewWhere(roles, userId) },
      include: {
        journal: true,
        tasks: {
          where: canAccessAll
            ? {}
            : {
                assignments: { some: { userId } },
              },
          include: {
            createdBy: { select: { name: true, email: true } },
            assignments: {
              include: {
                user: { select: { name: true, email: true, roles: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    }),
    canManageTasks
      ? prisma.user.findMany({
          where: assigneeWhere,
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        })
      : Promise.resolve([]),
    canManageTasks
      ? prisma.user.findMany({
          where: {
            activeSites: { has: "research" },
            roles: { has: Role.CHIEF_ASSISTANT },
          },
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        })
      : Promise.resolve([]),
    canManageTasks
      ? prisma.taskGuide.findMany({
          orderBy: [{ updatedAt: "desc" }, { guideCode: "asc" }],
          select: {
            id: true,
            guideCode: true,
            title: true,
            content: true,
            importantNote: true,
            supportFileName: true,
            supportFileSize: true,
          },
        })
      : Promise.resolve([]),
  ]);

  if (!review) {
    if (!canAccessAll) redirect("/401");
    notFound();
  }

  const reviewStatus = reviewStatusMeta(review.status);
  const ReviewStatusIcon = reviewStatus.icon;
  const externalLinks = [
    {
      href: review.journal.homepageLink,
      label: "Open homepage",
      icon: Globe2,
      className:
        "text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200",
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
  const assignees = assigneeUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: displayResearchEmail(user.email),
    roles: user.roles,
  }));
  const checkers = checkerUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: displayResearchEmail(user.email),
    roles: user.roles,
  }));

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <h1 className="min-w-0 text-[15px] font-normal leading-6 text-[#252525] dark:text-[#E4E4E4]">
                <span>{review.manuscriptTitle}</span>
                <IconHint label={statusLabel(review.status)} position="bottom">
                  <span
                    className={`research-allow-transform ml-2 inline-flex align-middle transition-[color,filter,transform] duration-180 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] active:scale-95 ${reviewStatus.className}`}
                  >
                    <ReviewStatusIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </IconHint>
              </h1>
              <span className="inline-flex border border-[#D8D0C2] px-2.5 py-1 text-[11px] font-normal uppercase tracking-wide text-[#667085] dark:border-[#555555] dark:text-[#B0B0B0]">
                {review.reviewRound || "Review"}
              </span>
            </div>
            <p className="mt-1 min-w-0 truncate text-xs font-normal text-[#667085] dark:text-[#B0B0B0]">
              {review.manuscriptId || review.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        <ResearchDetailSection>
          <div className="space-y-3 text-sm leading-6 text-[#667085] dark:text-[#B0B0B0]">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                <span className="text-[#252525] dark:text-[#E4E4E4]">
                  Requested date:
                </span>{" "}
                {shortDate(review.requestedAt)}
              </span>
              <span aria-hidden="true">|</span>
              <span>
                <span className="text-[#252525] dark:text-[#E4E4E4]">
                  Due date:
                </span>{" "}
                {shortDate(review.dueDate)}
              </span>
              <span aria-hidden="true">|</span>
              <span>
                <span className="text-[#252525] dark:text-[#E4E4E4]">
                  Completed date:
                </span>{" "}
                {shortDate(review.completedAt)}
              </span>
              <span aria-hidden="true">|</span>
              <span>
                <span className="text-[#252525] dark:text-[#E4E4E4]">
                  Recommendation:
                </span>{" "}
                {review.recommendation || "-"}
              </span>
            </p>
            <p>
              <span className="text-[#252525] dark:text-[#E4E4E4]">Note:</span>{" "}
              {review.note || "-"}
            </p>
          </div>

          <div className="mt-5 border-t border-[#D8D0C2] pt-5 dark:border-[#4A4A4A]">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <Link
                href={`/journals/${review.journal.id}`}
                className={`min-w-0 text-sm ${researchLinkClass}`}
              >
                {review.journal.name}
              </Link>
              {externalLinks.length > 0 ? (
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
              ) : null}
            </div>
            <p className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
              <span>ISSN: {review.journal.issn || "-"}</span>
              <span aria-hidden="true">|</span>
              <span>{review.journal.publisher || "No publisher"}</span>
              <span aria-hidden="true">|</span>
              <span>{journalRankLabel(review.journal)}</span>
            </p>
          </div>
        </ResearchDetailSection>

        <ResearchDetailSection
          title="Tasks for this review"
          action={
            canManageTasks ? (
              <NewReviewTaskDialog
                reviewId={review.id}
                manuscriptTitle={review.manuscriptTitle}
                journalName={review.journal.name}
                assignees={assignees}
                checkers={checkers}
                taskGuideOptions={taskGuides}
                canChooseChecker={roles.includes(Role.ADMIN)}
              />
            ) : null
          }
        >
          <div className="-mx-5 mt-4 overflow-hidden border-t border-[#D8D0C2] dark:border-[#4A4A4A]">
            <table className="w-full table-fixed text-left">
              <thead className="border-b border-[#D8D0C2] bg-[#F6F3EC] text-xs uppercase tracking-wide text-[#667085] dark:border-[#444444] dark:bg-[#383838] dark:text-[#B0B0B0]">
                <tr>
                  <th className="w-[6rem] px-3 py-3">Task ID</th>
                  <th className="px-3 py-3">Task</th>
                  <th className="w-[7rem] px-3 py-3">Status</th>
                  <th className="w-[9.5rem] px-3 py-3">Assignees</th>
                  <th className="w-[11rem] px-3 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4DDD1] dark:divide-[#444444]">
                {review.tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="group align-top transition-colors duration-150 hover:bg-[#F7F4ED] dark:hover:bg-[#333333]"
                  >
                    <td className="px-3 py-3 align-top">
                      <span className="font-mono text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
                        {taskCode(task)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Link
                        href={`/tasks/${task.id}`}
                        className={`text-sm ${researchLinkClass}`}
                      >
                        {task.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                        {taskTypeLabel(task.taskType, task.category)}
                        {task.description ? ` - ${task.description}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span
                        className={`inline-flex border border-current/20 px-2.5 py-1 text-xs font-normal ring-1 ${taskStatusClass(task.status)}`}
                      >
                        {taskStatusLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top text-sm leading-5 text-[#667085] dark:text-[#B0B0B0]">
                      {task.assignments.length > 0
                        ? task.assignments
                            .map((assignment) =>
                              displayResearchPersonName(assignment.user),
                            )
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="px-3 py-3 align-top text-sm text-[#667085] dark:text-[#B0B0B0]">
                      <p>due: {shortDate(task.dueDate)}</p>
                      <p className="mt-1 text-xs">
                        updated: {shortDate(task.updatedAt)}
                      </p>
                      <p className="mt-1 text-xs">
                        assigner:{" "}
                        {displayResearchPersonName(task.createdBy) ||
                          displayResearchEmail(task.createdBy.email)}
                      </p>
                    </td>
                  </tr>
                ))}
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
        </ResearchDetailSection>
      </div>
    </>
  );
}
