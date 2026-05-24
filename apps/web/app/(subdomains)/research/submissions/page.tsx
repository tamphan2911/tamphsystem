import { redirect } from "next/navigation";
import { BookOpen, FileCheck2, Landmark, Send, Trophy } from "lucide-react";
import { prisma, ResearchTaskStatus, ResearchTaskType, Role } from "@repo/db";
import { auth } from "../../../../auth";
import {
  SubmissionsTable,
  type SubmissionRow,
} from "../projects/[id]/SubmissionsTable";

export const dynamic = "force-dynamic";

function isoDate(value?: Date | null) {
  return value?.toISOString() ?? "";
}

function shortDate(value?: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

export default async function SubmissionsPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];

  if (!roles.includes(Role.ADMIN)) redirect("/401");

  const [journalSubmissions, conferenceSubmissions] = await Promise.all([
    prisma.researchSubmission.findMany({
      include: {
        project: { select: { title: true } },
        journal: {
          select: {
            id: true,
            name: true,
            publisher: true,
            rank: true,
            apc: true,
            apcCurrency: true,
            submissionFee: true,
            submissionFeeCurrency: true,
          },
        },
        account: { select: { id: true, username: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.conferenceSubmission.findMany({
      include: {
        project: { select: { title: true } },
        conference: {
          select: {
            id: true,
            name: true,
            organizer: true,
            type: true,
            location: true,
            startDate: true,
            endDate: true,
            apc: true,
            apcCurrency: true,
            submissionFee: true,
            submissionFeeCurrency: true,
          },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const completedSubmitTasks = await prisma.researchTask.findMany({
    where: {
      status: ResearchTaskStatus.COMPLETED,
      taskType: {
        in: [ResearchTaskType.SUBMIT_RESEARCH, ResearchTaskType.SUBMIT_CONFERENCE],
      },
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ finishedAt: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  const submitterByVenue = new Map<
    string,
    { id: string; name: string; email: string }
  >();

  for (const task of completedSubmitTasks) {
    const submitter =
      task.assignments.find((assignment) => assignment.finishedAt)?.user ??
      task.assignments[0]?.user ??
      task.createdBy;
    const value = {
      id: submitter.id,
      name: submitter.name || submitter.email,
      email: submitter.email,
    };

    if (
      task.taskType === ResearchTaskType.SUBMIT_RESEARCH &&
      task.projectId &&
      task.journalId
    ) {
      submitterByVenue.set(`journal:${task.projectId}:${task.journalId}`, value);
    }
    if (
      task.taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
      task.projectId &&
      task.conferenceId
    ) {
      submitterByVenue.set(
        `conference:${task.projectId}:${task.conferenceId}`,
        value,
      );
    }
  }

  const rows: SubmissionRow[] = [
    ...journalSubmissions.map((submission) => ({
      id: submission.id,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      kind: "journal" as const,
      venueId: submission.journal.id,
      venueName: submission.journal.name,
      metaLine: [
        submission.project.title,
        submission.journal.publisher || "No publisher",
        submission.journal.rank || "No rank",
      ].join(" - "),
      apc: submission.journal.apc ?? "",
      apcCurrency: submission.journal.apcCurrency,
      submissionFee: submission.journal.submissionFee ?? "",
      submissionFeeCurrency: submission.journal.submissionFeeCurrency,
      accountId: submission.account?.id ?? "",
      account: submission.account?.username ?? "",
      accountEmail: submission.account?.email ?? "",
      submittedByName:
        submitterByVenue.get(
          `journal:${submission.researchProjectId}:${submission.journalId}`,
        )?.name ?? "",
      submittedById:
        submitterByVenue.get(
          `journal:${submission.researchProjectId}:${submission.journalId}`,
        )?.id ?? "",
      submittedByEmail:
        submitterByVenue.get(
          `journal:${submission.researchProjectId}:${submission.journalId}`,
        )?.email ?? "",
      status: submission.status,
      submittedAt: isoDate(submission.submittedAt),
      acceptedAt: isoDate(submission.acceptedAt),
      rejectedAt: isoDate(submission.rejectedAt),
      publishedAt: isoDate(submission.publishedAt),
    })),
    ...conferenceSubmissions.map((submission) => ({
      id: submission.id,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      kind: "conference" as const,
      venueId: submission.conference.id,
      venueName: submission.conference.name,
      metaLine: [
        submission.project.title,
        submission.conference.organizer || "No organizer",
        submission.conference.type || "No type",
        submission.conference.location || "No location",
        [
          shortDate(submission.conference.startDate),
          shortDate(submission.conference.endDate),
        ]
          .filter(Boolean)
          .join(" - "),
      ]
        .filter(Boolean)
        .join(" - "),
      apc: submission.conference.apc ?? "",
      apcCurrency: submission.conference.apcCurrency,
      submissionFee: submission.conference.submissionFee ?? "",
      submissionFeeCurrency: submission.conference.submissionFeeCurrency,
      account: "",
      submittedByName:
        submitterByVenue.get(
          `conference:${submission.researchProjectId}:${submission.conferenceId}`,
        )?.name ?? "",
      submittedById:
        submitterByVenue.get(
          `conference:${submission.researchProjectId}:${submission.conferenceId}`,
        )?.id ?? "",
      submittedByEmail:
        submitterByVenue.get(
          `conference:${submission.researchProjectId}:${submission.conferenceId}`,
        )?.email ?? "",
      status: submission.status,
      submittedAt: isoDate(submission.submittedAt ?? submission.createdAt),
      acceptedAt: isoDate(submission.acceptedAt),
      rejectedAt: isoDate(submission.rejectedAt),
      publishedAt: isoDate(submission.publishedAt),
    })),
  ].sort((left, right) =>
    (right.submittedAt || "").localeCompare(left.submittedAt || ""),
  );

  const publishedRows = rows.filter((row) => row.status === "PUBLISHED");
  const stats = [
    {
      label: "Submits",
      value: rows.length,
      icon: Send,
      color: "text-slate-600 dark:text-slate-300",
    },
    {
      label: "Journals",
      value: journalSubmissions.length,
      icon: BookOpen,
      color: "text-blue-600",
    },
    {
      label: "Conferences",
      value: conferenceSubmissions.length,
      icon: Landmark,
      color: "text-violet-600",
    },
    {
      label: "Published",
      value: publishedRows.length,
      icon: Trophy,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
          {stats.map((item) => (
            <div
              key={item.label}
              className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className="text-base font-black text-slate-950 dark:text-white">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
          <FileCheck2 className="h-3.5 w-3.5" />
          Admin
        </div>
      </div>

      <SubmissionsTable
        rows={rows}
        isAdmin
        actionMode="delete"
        linkVenue={false}
        showSubmitter
      />
    </div>
  );
}
