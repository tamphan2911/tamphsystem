import { auth } from "../../../../auth";
import { prisma, Role } from "@repo/db";
import { deleteConference } from "../actions";
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

export default async function ConferencesPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const conferences = await prisma.conference.findMany({
    orderBy: [{ startDate: "desc" }, { name: "asc" }],
  });

  const rows: ConferenceRow[] = conferences.map((conference) => ({
    id: conference.id,
    name: conference.name,
    type: conference.type ?? "",
    time: dateText(conference.startDate, conference.endDate),
    location: conference.location ?? "",
    organizer: conference.organizer ?? "",
    theme: conference.targetTheme || conference.themes || "",
    isbn: conference.isbn ?? "",
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Conference List
        </p>
      </div>
      <ConferencesTable
        rows={rows}
        isAdmin={isAdmin}
        deleteAction={deleteConference}
      />
    </div>
  );
}
