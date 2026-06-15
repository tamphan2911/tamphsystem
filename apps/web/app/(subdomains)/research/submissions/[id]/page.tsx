import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Landmark,
  LinkIcon,
  UserRound,
} from "lucide-react";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import {
  researchLinkClass,
  researchMutedLinkClass,
} from "@/sites/research/components/ResearchPrimitives";

export const dynamic = "force-dynamic";

function shortDate(value?: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function statusLabel(value: string) {
  if (value === "PENDING" || value === "SUBMITTED") return "Submitted";
  if (value === "UNDER_REVIEW" || value === "REVIEWING") return "Reviewing";
  if (value === "WITHDRAWN") return "Withdrawn";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function canAccessProject({
  project,
  userId,
  isAdmin,
  registrationIdentityValues,
}: {
  project: {
    leadResearcherId: string;
    registrationUserId: string | null;
    registrationName: string | null;
    authors: { id: string }[];
    authorEntries: { userId: string }[];
    tasks: {
      status: ResearchTaskStatus;
      assignments: { userId: string }[];
    }[];
  };
  userId: string;
  isAdmin: boolean;
  registrationIdentityValues: string[];
}) {
  if (isAdmin) return true;
  const isAuthor =
    project.leadResearcherId === userId ||
    project.authors.some((author) => author.id === userId) ||
    project.authorEntries.some((entry) => entry.userId === userId);
  const isRegistrationUser =
    project.registrationUserId === userId ||
    Boolean(
      project.registrationName &&
        registrationIdentityValues.includes(
          project.registrationName.trim().toLowerCase(),
        ),
    );
  const hasAssignedTask = project.tasks.some((task) =>
    task.assignments.some((assignment) => assignment.userId === userId),
  );

  return isAuthor || isRegistrationUser || hasAssignedTask;
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#444444] py-3 first:border-t-0">
      <dt className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[#E4E4E4]">{value}</dd>
    </div>
  );
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) redirect("/login");

  const roles = ((session.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin =
    roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
  const registrationIdentityValues = [session.user?.name, session.user?.email]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());

  const [journalSubmission, conferenceSubmission] = await Promise.all([
    prisma.researchSubmission.findUnique({
      where: { id },
      include: {
        journal: true,
        account: true,
        project: {
          include: {
            leadResearcher: { select: { name: true, email: true } },
            authors: { select: { id: true, name: true, email: true } },
            authorEntries: { select: { userId: true } },
            tasks: {
              select: {
                status: true,
                assignments: { select: { userId: true } },
              },
            },
          },
        },
      },
    }),
    prisma.conferenceSubmission.findUnique({
      where: { id },
      include: {
        conference: true,
        project: {
          include: {
            leadResearcher: { select: { name: true, email: true } },
            authors: { select: { id: true, name: true, email: true } },
            authorEntries: { select: { userId: true } },
            tasks: {
              select: {
                status: true,
                assignments: { select: { userId: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const submission = journalSubmission ?? conferenceSubmission;
  if (!submission) notFound();

  const project = submission.project;
  if (
    !canAccessProject({
      project,
      userId,
      isAdmin,
      registrationIdentityValues,
    })
  ) {
    notFound();
  }

  const isJournal = Boolean(journalSubmission);
  const code =
    submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase();
  const venue = isJournal
    ? journalSubmission?.journal.name
    : conferenceSubmission?.conference.name;
  const venueHref = isJournal
    ? `/journals/${journalSubmission?.journalId}`
    : `/conferences/${conferenceSubmission?.conferenceId}`;
  const venueMeta = isJournal
    ? [
        journalSubmission?.journal.publisher,
        journalSubmission?.journal.issn
          ? `ISSN ${journalSubmission.journal.issn}`
          : "",
        journalSubmission?.journal.rank,
      ]
    : [
        conferenceSubmission?.conference.organizer,
        conferenceSubmission?.conference.location,
      ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href={`/projects/${project.id}`}
        className={`inline-flex items-center gap-2 text-sm ${researchMutedLinkClass}`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to research
      </Link>

      <section className="border border-[#444444] bg-[#2C2C2C] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wide text-[#B0B0B0]">
              Submission {code}
            </p>
            <h1 className="mt-2 text-xl font-normal leading-8 text-[#E4E4E4]">
              {project.title}
            </h1>
            <p className="mt-2 text-sm text-[#B0B0B0]">
              {displayResearchPersonName(project.leadResearcher)}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 border border-[#444444] bg-[#202020] px-3 py-2 text-sm text-[#A8DADC]">
            <CheckCircle2 className="h-4 w-4" />
            {statusLabel(submission.status)}
          </span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="border border-[#444444] bg-[#2C2C2C] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
            {isJournal ? (
              <BookOpen className="h-4 w-4 text-[#A8DADC]" />
            ) : (
              <Landmark className="h-4 w-4 text-[#A8DADC]" />
            )}
            Venue
          </h2>
          <dl>
            <DetailItem
              label={isJournal ? "Journal" : "Conference"}
              value={
                <Link href={venueHref} className={researchLinkClass}>
                  {venue}
                </Link>
              }
            />
            <DetailItem
              label="Details"
              value={venueMeta.filter(Boolean).join(" - ") || "-"}
            />
            {isJournal && journalSubmission?.account ? (
              <DetailItem
                label="Account"
                value={
                  <Link
                    href={`/accounts/${journalSubmission.account.id}`}
                    className={researchLinkClass}
                  >
                    {journalSubmission.account.username}
                    {journalSubmission.account.email
                      ? ` - ${journalSubmission.account.email}`
                      : ""}
                  </Link>
                }
              />
            ) : null}
          </dl>
        </div>

        <div className="border border-[#444444] bg-[#2C2C2C] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
            <CalendarCheck2 className="h-4 w-4 text-[#A8DADC]" />
            Timeline
          </h2>
          <dl>
            <DetailItem label="Submitted" value={shortDate(submission.submittedAt)} />
            <DetailItem label="Accepted" value={shortDate(submission.acceptedAt)} />
            <DetailItem label="Published" value={shortDate(submission.publishedAt)} />
            <DetailItem label="Rejected" value={shortDate(submission.rejectedAt)} />
            <DetailItem label="Withdrawn" value={shortDate(submission.withdrawnAt)} />
          </dl>
        </div>
      </section>

      {isJournal && journalSubmission?.articleUrl ? (
        <section className="border border-[#444444] bg-[#2C2C2C] p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
            <LinkIcon className="h-4 w-4 text-[#A8DADC]" />
            Published article
          </h2>
          <Link
            href={journalSubmission.articleUrl}
            target="_blank"
            rel="noreferrer"
            className={researchLinkClass}
          >
            {journalSubmission.articleUrl}
          </Link>
          {journalSubmission.articleFileName ? (
            <p className="mt-2 text-sm text-[#B0B0B0]">
              File: {journalSubmission.articleFileName}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="border border-[#444444] bg-[#2C2C2C] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
          <UserRound className="h-4 w-4 text-[#A8DADC]" />
          Research
        </h2>
        <Link href={`/projects/${project.id}`} className={researchLinkClass}>
          {project.title}
        </Link>
      </section>
    </div>
  );
}
