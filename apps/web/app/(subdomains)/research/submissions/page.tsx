import { redirect } from "next/navigation";
import { prisma, ResearchTaskStatus, ResearchTaskType, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  SubmissionsTable,
  type SubmissionRow,
} from "../projects/[id]/SubmissionsTable";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

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
      orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
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
            submissionFee: true,
            submissionFeeCurrency: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
    }),
  ]);

  const completedSubmitTasks = await prisma.researchTask.findMany({
    where: {
      status: ResearchTaskStatus.COMPLETED,
      taskType: {
        in: [
          ResearchTaskType.SUBMIT_RESEARCH,
          ResearchTaskType.SUBMIT_CONFERENCE,
        ],
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
      name: displayResearchPersonName(submitter),
      email: displayResearchEmail(submitter.email),
    };

    if (
      task.taskType === ResearchTaskType.SUBMIT_RESEARCH &&
      task.projectId &&
      task.journalId
    ) {
      submitterByVenue.set(
        `journal:${task.projectId}:${task.journalId}`,
        value,
      );
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
      withdrawnAt: isoDate(submission.withdrawnAt),
      publishedAt: isoDate(submission.publishedAt),
      articleUrl: submission.articleUrl ?? "",
      articleFileName: submission.articleFileName ?? "",
      articleFileSize: submission.articleFileSize,
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
      apc: "",
      apcCurrency: submission.conference.submissionFeeCurrency,
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
      withdrawnAt: isoDate(submission.withdrawnAt),
      publishedAt: isoDate(submission.publishedAt),
    })),
  ].sort((left, right) =>
    (right.submittedAt || "").localeCompare(left.submittedAt || ""),
  );

  const publishedRows = rows.filter((row) => row.status === "PUBLISHED");
  const stats = [
    {
      label: "Submit",
      value: rows.length,
    },
    {
      label: "Journals",
      value: journalSubmissions.length,
    },
    {
      label: "Conferences",
      value: conferenceSubmissions.length,
    },
    {
      label: "Published",
      value: publishedRows.length,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-4">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4] ${
                  index > 0 ? "border-l border-[#444444]" : ""
                }`}
              >
                <span className="font-normal text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <SubmissionsTable
        rows={rows}
        isAdmin
        actionMode="delete"
        linkVenue={false}
        showSubmitter
        flushControls
      />
    </div>
  );
}
