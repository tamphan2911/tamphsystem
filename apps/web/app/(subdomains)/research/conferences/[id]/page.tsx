import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Globe2,
  MapPin,
  ReceiptText,
  Send,
  Users,
} from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { unlockConference, updateConference } from "../../actions";
import { ConferenceDialog } from "../ConferenceDialog";
import { ConferenceUnlockButton } from "./ConferenceUnlockButton";
import { formatMoney } from "@/sites/research/lib/currency";
import { researchMutedLinkClass } from "@/sites/research/components/ResearchPrimitives";
import {
  ResearchProjectsTable,
  type ResearchProjectRow,
} from "../../projects/ResearchProjectsTable";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

export const dynamic = "force-dynamic";

function dateText(start: Date | null, end: Date | null) {
  if (!start && !end) return "";
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  if (start && end)
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  return formatter.format((start ?? end) as Date);
}

function dateValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function conferenceTypeLabel(value: string | null) {
  if (value === "INTERNATIONAL") return "International";
  if (value === "NATIONAL") return "National";
  return "";
}

function dateHasPassed(value: Date | null) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export default async function ConferenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const conference = await prisma.conference.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          project: {
            include: {
              leadResearcher: true,
              registrationUser: true,
              authors: {
                select: { name: true, email: true },
                orderBy: [{ name: "asc" }, { email: "asc" }],
              },
              authorEntries: {
                include: { user: { select: { name: true, email: true } } },
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
              },
              submissions: {
                select: { status: true },
              },
              conferenceSubmissions: {
                select: { status: true },
              },
              _count: { select: { submissions: true, publications: true } },
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
      },
    },
  });

  if (!conference) notFound();

  const submittedResearch: ResearchProjectRow[] = conference.submissions.map(
    ({ project }) => {
      const submissionStatuses = [
        ...project.submissions.map((s) => s.status),
        ...project.conferenceSubmissions.map((s) => s.status),
      ];
      const hasSubmissions = submissionStatuses.length > 0;
      const hasSubmittedSubmission = submissionStatuses.some(
        (status) => status === "PENDING" || status === "SUBMITTED",
      );

      return {
        id: project.id,
        researchCode: project.researchCode ?? "",
        title: project.title,
        abstract: project.abstract ?? "",
        stage: project.stage,
        claimStatus: project.claimStatus,
        registerStatus: project.registerStatus,
        coAuthors:
          project.authorEntries.length > 0
            ? project.authorEntries
                .map(
                  (entry) =>
                    `${displayResearchPersonName(entry.user)}${entry.isCorresponding ? "*" : ""}`,
                )
                .join(", ")
            : project.authors.length > 0
              ? project.authors
                  .map(
                    (author, index) =>
                      `${displayResearchPersonName(author)}${index === 0 ? "*" : ""}`,
                  )
                  .join(", ")
              : (project.coAuthors ?? ""),
        universityRegistration: project.universityRegistration ?? "",
        registerName:
          project.registrationUser?.name ||
          displayResearchEmail(project.registrationUser?.email) ||
          project.registrationName ||
          "",
        canViewRegistrationClaim:
          isAdmin || Boolean(userId && project.registrationUserId === userId),
        leadResearcher: displayResearchPersonName(project.leadResearcher),
        submissions: project._count.submissions,
        publications: project._count.publications,
        updatedAt: project.updatedAt.toLocaleDateString(),
        notSubmittedAnywhere:
          !hasSubmissions ||
          submissionStatuses.every(
            (status) => status === "REJECTED" || status === "WITHDRAWN",
          ),
        hasSubmittedSubmission,
      };
    },
  );

  const schedule = dateText(conference.startDate, conference.endDate);
  const theme = conference.targetTheme || conference.themes || "";
  const isClosed = dateHasPassed(conference.closeDate);
  const canEdit = isAdmin && (!isClosed || conference.editUnlocked);
  const canUnlock = isAdmin && Boolean(isClosed) && !conference.editUnlocked;
  const editConference = updateConference.bind(null, conference.id);
  const unlock = unlockConference.bind(null, conference.id);
  const initialValues = {
    name: conference.name,
    type: conference.type ?? "INTERNATIONAL",
    themes: conference.themes,
    targetTheme: conference.targetTheme,
    isbn: conference.isbn,
    organizer: conference.organizer,
    location: conference.location,
    startDate: dateValue(conference.startDate),
    endDate: dateValue(conference.endDate),
    submissionDeadline: dateValue(conference.submissionDeadline),
    acceptanceNotification: dateValue(conference.acceptanceNotification),
    closeDate: dateValue(conference.closeDate),
    submissionFee: conference.submissionFee,
    submissionFeeCurrency: conference.submissionFeeCurrency,
    website: conference.website,
    note: conference.note,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link
        href="/conferences"
        className={`inline-flex items-center gap-2 text-sm ${researchMutedLinkClass}`}
      >
        <ArrowLeft className="h-4 w-4" />
        Conferences
      </Link>

      <section className="overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-none">
        <div className="border-b border-[#444444] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-normal tracking-tight text-[#E4E4E4]">
                  {conference.name}
                </h1>
                <span className="border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-bold text-violet-200 ring-1 ring-violet-500/20">
                  {conferenceTypeLabel(conference.type) || "Type not set"}
                </span>
              </div>
              {theme && (
                <p className="mt-3 max-w-4xl text-sm text-[#B0B0B0]">{theme}</p>
              )}
            </div>
            {conference.website && (
              <a
                href={conference.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:-translate-y-0.5 hover:border-sky-400/50 hover:bg-sky-500/15 hover:shadow-md hover:shadow-black/20"
              >
                <Globe2 className="h-4 w-4" />
                Website
              </a>
            )}
            <div className="flex items-center gap-2">
              {canEdit && (
                <ConferenceDialog
                  mode="edit"
                  action={editConference}
                  initialValues={initialValues}
                />
              )}
              {canUnlock && (
                <ConferenceUnlockButton
                  conferenceName={conference.name}
                  action={unlock}
                />
              )}
            </div>
          </div>
        </div>

        <dl className="grid gap-3 p-5 text-sm md:grid-cols-4">
          <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase text-[#B0B0B0]">
              <CalendarDays className="h-3.5 w-3.5 text-sky-300" />
              Time
            </dt>
            <dd className="mt-2 text-[#E4E4E4]">{schedule || "-"}</dd>
          </div>
          <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
            <dt className="text-xs font-bold uppercase text-[#B0B0B0]">
              Submission deadline
            </dt>
            <dd className="mt-2 text-[#E4E4E4]">
              {dateText(conference.submissionDeadline, null) || "-"}
            </dd>
          </div>
          <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
            <dt className="text-xs font-bold uppercase text-[#B0B0B0]">
              Acceptance notification
            </dt>
            <dd className="mt-2 text-[#E4E4E4]">
              {dateText(conference.acceptanceNotification, null) || "-"}
            </dd>
          </div>
          <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
            <dt className="text-xs font-bold uppercase text-[#B0B0B0]">
              Close date
            </dt>
            <dd className="mt-2 text-[#E4E4E4]">
              {dateText(conference.closeDate, null) || "-"}
            </dd>
          </div>
          <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase text-[#B0B0B0]">
              <MapPin className="h-3.5 w-3.5 text-rose-300" />
              Location
            </dt>
            <dd className="mt-2 text-[#E4E4E4]">
              {conference.location || "-"}
            </dd>
          </div>
          <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase text-[#B0B0B0]">
              <Users className="h-3.5 w-3.5 text-emerald-300" />
              Organizer
            </dt>
            <dd className="mt-2 text-[#E4E4E4]">
              {conference.organizer || "-"}
            </dd>
          </div>
          <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
            <dt className="text-xs font-bold uppercase text-[#B0B0B0]">ISBN</dt>
            <dd className="mt-2 text-[#E4E4E4]">{conference.isbn || "-"}</dd>
          </div>
          <div className="border border-[#444444] bg-[#242424] p-3 transition hover:border-[#5a5a5a] hover:bg-[#292929]">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase text-[#B0B0B0]">
              <ReceiptText className="h-3.5 w-3.5 text-amber-300" />
              Submission fee
            </dt>
            <dd className="mt-2 text-[#E4E4E4]">
              {formatMoney(
                conference.submissionFee,
                conference.submissionFeeCurrency,
              )}
            </dd>
          </div>
          {conference.note && (
            <div className="border-t border-[#444444] pt-4 md:col-span-4">
              <dd className="text-sm leading-6 text-[#B0B0B0]">
                {conference.note}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#E4E4E4]">
            <Send className="h-5 w-5 text-blue-500" />
            Research submitted to this conference
          </h2>
        </div>
        <ResearchProjectsTable
          rows={submittedResearch}
          showClaimRegistration={false}
        />
      </section>
    </div>
  );
}
