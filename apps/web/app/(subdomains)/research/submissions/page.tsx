import { redirect } from "next/navigation";
import { FileCheck2 } from "lucide-react";
import { prisma, Role } from "@repo/db";
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
        account: { select: { username: true } },
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
      account: submission.account?.username ?? "",
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
      status: submission.status,
      submittedAt: isoDate(submission.submittedAt ?? submission.createdAt),
      acceptedAt: isoDate(submission.acceptedAt),
      rejectedAt: isoDate(submission.rejectedAt),
      publishedAt: isoDate(submission.publishedAt),
    })),
  ].sort((left, right) =>
    (right.submittedAt || "").localeCompare(left.submittedAt || ""),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
            <FileCheck2 className="h-3.5 w-3.5" />
            Admin
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            Submissions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Review all journal and conference submissions in one table.
          </p>
        </div>
      </section>

      <SubmissionsTable rows={rows} isAdmin actionMode="delete" />
    </div>
  );
}
