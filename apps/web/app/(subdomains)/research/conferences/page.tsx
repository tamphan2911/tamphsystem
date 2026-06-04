import { auth } from "../../../../auth";
import { prisma, Role } from "@repo/db";
import { createConference, deleteConference } from "../actions";
import { ProposalDialog } from "@/sites/research/components/ProposalDialog";
import { ConferenceDialog } from "./ConferenceDialog";
import { ConferencesTable, type ConferenceRow } from "./ConferencesTable";

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

export default async function ConferencesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const [conferences, currentUser] = await Promise.all([
    prisma.conference.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
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
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Conference List
          </p>
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
      <ConferencesTable
        rows={rows}
        isAdmin={isAdmin}
        deleteAction={deleteConference}
      />
    </div>
  );
}
