import {
  researchDateTimeFormat,
  researchDateValue,
} from "@/sites/research/lib/date-time";
import { auth } from "../../../../auth";
import { prisma, Role } from "@repo/db";
import { createConference, deleteConference } from "../actions";
import { ProposalDialog } from "@/sites/research/components/ProposalDialog";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { ConferenceDialog } from "./ConferenceDialog";
import { ConferencesTable, type ConferenceRow } from "./ConferencesTable";
import {
  accessibleConferenceWhere,
  hasUnrestrictedVenueAccess,
} from "@/sites/research/lib/venueAccess";

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

export default async function ConferencesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin =
    roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
  const canDelete = roles.includes(Role.ADMIN);
  const unrestrictedAccess = hasUnrestrictedVenueAccess(roles);
  const conferenceWhere = unrestrictedAccess
    ? {}
    : userId
      ? accessibleConferenceWhere(userId)
      : { id: "__no_access__" };
  const [conferences, currentUser] = await Promise.all([
    prisma.conference.findMany({
      where: conferenceWhere,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            submissions: true,
            suggestions: true,
          },
        },
      },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { emailVerified: true },
        })
      : Promise.resolve(null),
  ]);

  const rows: ConferenceRow[] = conferences.map((conference) => ({
    id: conference.id,
    name: conference.name,
    type: conferenceTypeLabel(conference.type),
    time: dateText(conference.startDate, conference.endDate),
    startDate: dateValue(conference.startDate),
    endDate: dateValue(conference.endDate),
    submissionDeadline: dateValue(conference.submissionDeadline),
    acceptanceNotification: dateValue(conference.acceptanceNotification),
    closeDate: dateValue(conference.closeDate),
    location: conference.location ?? "",
    organizer: conference.organizer ?? "",
    theme: conference.targetTheme || conference.themes || "",
    isbn: conference.isbn ?? "",
    submissionCount: conference._count.submissions,
    suggestionCount: conference._count.suggestions,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <p className="min-w-0 truncate text-sm font-normal text-[#B0B0B0]">
            CONFERENCE LIST
          </p>
          <div className="flex flex-none items-center">
            {isAdmin ? (
              <ConferenceDialog mode="create" action={createConference} />
            ) : (
              <ProposalDialog
                type="CONFERENCE"
                isLoggedIn={Boolean(session)}
                hasVerifiedEmail={Boolean(currentUser?.emailVerified)}
              />
            )}
          </div>
        </div>
      </ResearchPageHeaderPortal>
      <ConferencesTable
        rows={rows}
        isAdmin={canDelete}
        deleteAction={deleteConference}
      />
    </div>
  );
}
