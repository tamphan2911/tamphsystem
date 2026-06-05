import { BookOpen, CalendarDays, FolderGit2, Lightbulb } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deleteSuggestedConference, deleteSuggestedJournal } from "../actions";
import { SuggestionsTable, type SuggestionRow } from "./SuggestionsTable";

export const dynamic = "force-dynamic";

function shortDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

export default async function SuggestionsPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");

  const [journalSuggestions, conferenceSuggestions] = await Promise.all([
    prisma.suggestedJournal.findMany({
      include: {
        project: { select: { id: true, title: true, researchCode: true } },
        journal: {
          select: {
            id: true,
            name: true,
            issn: true,
            publisher: true,
            rank: true,
            fields: true,
            field: true,
          },
        },
        createdBy: { select: { name: true, email: true, roles: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.suggestedConference.findMany({
      include: {
        project: { select: { id: true, title: true, researchCode: true } },
        conference: {
          select: {
            id: true,
            name: true,
            type: true,
            organizer: true,
            location: true,
            targetTheme: true,
            themes: true,
            isbn: true,
          },
        },
        createdBy: { select: { name: true, email: true, roles: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
  ]);

  const journalRows: SuggestionRow[] = journalSuggestions.map((suggestion) => {
    const fields =
      suggestion.journal.fields.length > 0
        ? suggestion.journal.fields
        : suggestion.journal.field
          ? suggestion.journal.field
              .split(";")
              .map((field) => field.trim())
              .filter(Boolean)
          : [];

    return {
      id: suggestion.id,
      kind: "Journal",
      projectId: suggestion.projectId,
      projectTitle: suggestion.project.title,
      projectCode: suggestion.project.researchCode ?? "",
      venueId: suggestion.journalId,
      venueName: suggestion.journal.name,
      venueHref: `/journals/${suggestion.journalId}`,
      venueMeta: [
        suggestion.journal.publisher || "No publisher",
        suggestion.journal.rank || "No rank",
        suggestion.journal.issn ? `ISSN ${suggestion.journal.issn}` : "",
      ]
        .filter(Boolean)
        .join(" - "),
      scope: fields.join("; "),
      suggestedBy:
        suggestion.createdBy?.name || suggestion.createdBy?.email || "Unknown",
      suggestedByMeta:
        suggestion.createdBy?.roles.join(", ") ||
        suggestion.createdBy?.email ||
        "",
      createdAt: shortDate(suggestion.createdAt),
      createdAtSort: suggestion.createdAt.getTime(),
    };
  });

  const conferenceRows: SuggestionRow[] = conferenceSuggestions.map(
    (suggestion) => ({
      id: suggestion.id,
      kind: "Conference",
      projectId: suggestion.projectId,
      projectTitle: suggestion.project.title,
      projectCode: suggestion.project.researchCode ?? "",
      venueId: suggestion.conferenceId,
      venueName: suggestion.conference.name,
      venueHref: `/conferences/${suggestion.conferenceId}`,
      venueMeta: [
        suggestion.conference.organizer || "No organizer",
        suggestion.conference.type || "No type",
        suggestion.conference.location || "No location",
      ]
        .filter(Boolean)
        .join(" - "),
      scope:
        suggestion.conference.targetTheme ||
        suggestion.conference.themes ||
        suggestion.conference.isbn ||
        "",
      suggestedBy:
        suggestion.createdBy?.name || suggestion.createdBy?.email || "Unknown",
      suggestedByMeta:
        suggestion.createdBy?.roles.join(", ") ||
        suggestion.createdBy?.email ||
        "",
      createdAt: shortDate(suggestion.createdAt),
      createdAtSort: suggestion.createdAt.getTime(),
    }),
  );

  const rows = [...journalRows, ...conferenceRows].sort(
    (a, b) => b.createdAtSort - a.createdAtSort,
  );
  const stats = [
    {
      label: "Suggestions",
      value: rows.length,
      icon: Lightbulb,
      color: "text-amber-600",
    },
    {
      label: "Journals",
      value: journalRows.length,
      icon: BookOpen,
      color: "text-blue-600",
    },
    {
      label: "Conferences",
      value: conferenceRows.length,
      icon: CalendarDays,
      color: "text-violet-600",
    },
    {
      label: "Research",
      value: new Set(rows.map((row) => row.projectId)).size,
      icon: FolderGit2,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
        {stats.map((item) => (
          <div
            key={item.label}
            className="flex min-w-32 items-center gap-3 border border-[#444444] bg-[#2C2C2C] px-3 py-2 shadow-none"
          >
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </p>
              <p className="text-base font-black text-[#E4E4E4]">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <SuggestionsTable
        rows={rows}
        deleteJournalAction={deleteSuggestedJournal}
        deleteConferenceAction={deleteSuggestedConference}
      />
    </div>
  );
}
