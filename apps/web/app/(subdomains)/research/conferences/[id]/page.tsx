import {
  researchDateTimeFormat,
  researchDateValue,
} from "@/sites/research/lib/date-time";
import { notFound } from "next/navigation";
import { Globe2, Landmark } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { unlockConference, updateConference } from "../../actions";
import { ConferenceDialog } from "../ConferenceDialog";
import { ConferenceUnlockButton } from "./ConferenceUnlockButton";
import { formatMoney } from "@/sites/research/lib/currency";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { displayResearchPersonName } from "@/sites/research/lib/display";
import {
  accessibleConferenceWhere,
  hasUnrestrictedVenueAccess,
} from "@/sites/research/lib/venueAccess";
import {
  ConferenceSubmissionsTable,
  type ConferenceSubmissionRow,
} from "./ConferenceSubmissionsTable";

export const dynamic = "force-dynamic";

function dateText(start: Date | null, end: Date | null) {
  if (!start && !end) return "";
  const formatter = researchDateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  if (start && end)
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  return formatter.format((start ?? end) as Date);
}

function dateValue(value: Date | null) {
  return value ? researchDateValue(value) : "";
}

function conferenceTypeLabel(value: string | null) {
  if (value === "INTERNATIONAL") return "International";
  if (value === "NATIONAL") return "National";
  return "";
}

function dateHasPassed(value: Date | null) {
  if (!value) return false;
  return researchDateValue(value) < researchDateValue();
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
  const canEditVenue = roles.includes(Role.ADMIN);
  const unrestrictedAccess = hasUnrestrictedVenueAccess(roles);
  const conferenceAccessWhere = unrestrictedAccess
    ? {}
    : userId
      ? accessibleConferenceWhere(userId)
      : { id: "__no_access__" };
  const conference = await prisma.conference.findFirst({
    where: { AND: [{ id }, conferenceAccessWhere] },
    include: {
      submissions: {
        include: {
          project: {
            include: {
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
        },
        orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
      },
    },
  });

  if (!conference) notFound();

  const submissionRows: ConferenceSubmissionRow[] = conference.submissions.map(
    (submission) => ({
      id: submission.id,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      projectId: submission.project.id,
      projectTitle: submission.project.title,
      projectAuthors:
        submission.project.authorEntries.length > 0
          ? submission.project.authorEntries
              .map(
                (entry) =>
                  `${displayResearchPersonName(entry.user)}${entry.isCorresponding ? "*" : ""}`,
              )
              .join(", ")
          : submission.project.authors.length > 0
            ? submission.project.authors
                .map(
                  (author, index) =>
                    `${displayResearchPersonName(author)}${index === 0 ? "*" : ""}`,
                )
                .join(", ")
            : (submission.project.coAuthors ?? ""),
      status: submission.status,
      submittedAt: submission.submittedAt?.toISOString() ?? "",
      acceptedAt: submission.acceptedAt?.toISOString() ?? "",
      rejectedAt: submission.rejectedAt?.toISOString() ?? "",
      withdrawnAt: submission.withdrawnAt?.toISOString() ?? "",
      publishedAt: submission.publishedAt?.toISOString() ?? "",
    }),
  );

  const schedule = dateText(conference.startDate, conference.endDate);
  const theme = conference.targetTheme || conference.themes || "";
  const isClosed = dateHasPassed(conference.closeDate);
  const canEdit = canEditVenue && (!isClosed || conference.editUnlocked);
  const canUnlock =
    canEditVenue && Boolean(isClosed) && !conference.editUnlocked;
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
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate text-[16px] font-normal leading-6 text-[#E4E4E4] xl:text-[16px]">
                {conference.name}
              </h1>
              <IconHint
                label={`${conferenceTypeLabel(conference.type) || "Unspecified"} conference`}
                position="bottom"
              >
                <Landmark className="research-task-icon-motion h-4 w-4 flex-none text-violet-700 dark:text-violet-300" />
              </IconHint>
              <div className="flex flex-none items-center gap-1">
                {conference.website && (
                  <IconHint label="Open conference website" position="bottom">
                    <a
                      href={conference.website}
                      target="_blank"
                      rel="noreferrer"
                      className="research-clickable-icon research-allow-transform inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent text-[#1F7180] shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
                      aria-label="Open conference website"
                    >
                      <Globe2 className="h-[15px] w-[15px]" />
                    </a>
                  </IconHint>
                )}
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
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs font-normal text-[#B0B0B0]">
              <span>ISBN: {conference.isbn || "-"}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              <span>{conference.organizer || "No organizer"}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              <span>{conferenceTypeLabel(conference.type) || "No type"}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              <span>{conference.location || "No location"}</span>
            </p>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        <section className="space-y-5 px-1">
          <dl className="grid gap-4 border-t border-[#3A3A3A] pt-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">
                Theme
              </dt>
              <dd className="mt-1 text-sm leading-5 text-[#B0B0B0]">
                {theme || "No theme recorded."}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">
                Time
              </dt>
              <dd className="mt-1 text-sm leading-5 text-[#B0B0B0]">
                {schedule || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">
                Submission fee
              </dt>
              <dd className="mt-1 text-base font-normal text-[#A8DADC]">
                {formatMoney(
                  conference.submissionFee,
                  conference.submissionFeeCurrency,
                )}
              </dd>
            </div>

            <div className="grid gap-4 border-t border-[#3A3A3A] pt-4 md:col-span-3 md:grid-cols-3">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">
                  Submission deadline
                </dt>
                <dd className="mt-1 text-sm leading-5 text-[#B0B0B0]">
                  {dateText(conference.submissionDeadline, null) || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">
                  Acceptance notification
                </dt>
                <dd className="mt-1 text-sm leading-5 text-[#B0B0B0]">
                  {dateText(conference.acceptanceNotification, null) || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">
                  Close date
                </dt>
                <dd className="mt-1 text-sm leading-5 text-[#B0B0B0]">
                  {dateText(conference.closeDate, null) || "-"}
                </dd>
              </div>
            </div>

            <div className="border-t border-[#3A3A3A] pt-4 md:col-span-3">
              <dt className="text-xs font-bold uppercase text-slate-400">
                Note
              </dt>
              <dd className="mt-1 max-w-4xl text-sm leading-5 text-[#B0B0B0]">
                {conference.note || "No note recorded."}
              </dd>
            </div>
          </dl>
        </section>

        <ConferenceSubmissionsTable rows={submissionRows} />
      </div>
    </>
  );
}
