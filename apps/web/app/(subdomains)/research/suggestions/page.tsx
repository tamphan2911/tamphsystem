import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { deleteSuggestedConference, deleteSuggestedJournal } from "../actions";
import { SuggestionsTable, type SuggestionRow } from "./SuggestionsTable";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

export const dynamic = "force-dynamic";

function shortDate(value: Date) {
  return researchDateTimeFormat("en-GB", {
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
    const fields = suggestion.journal?.fields.length
      ? suggestion.journal.fields
      : suggestion.journal?.field
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
      venueId: suggestion.id,
      venueName:
        suggestion.journal?.name ?? suggestion.venueName ?? "Unlinked journal",
      venueHref: suggestion.journalId
        ? `/journals/${suggestion.journalId}`
        : suggestion.venueLink || "",
      venueMeta: [
        suggestion.status === "PENDING" ? "Waiting approval" : "",
        suggestion.journal?.publisher || "No publisher",
        suggestion.journal?.rank || "No rank",
        suggestion.journal?.issn ? `ISSN ${suggestion.journal.issn}` : "",
      ]
        .filter(Boolean)
        .join(" - "),
      scope: fields.join("; "),
      suggestedBy: suggestion.createdBy
        ? displayResearchPersonName(suggestion.createdBy) || "Unknown"
        : "Unknown",
      suggestedByMeta:
        suggestion.createdBy?.roles.join(", ") ||
        displayResearchEmail(suggestion.createdBy?.email) ||
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
      venueId: suggestion.id,
      venueName:
        suggestion.conference?.name ??
        suggestion.venueName ??
        "Unlinked conference",
      venueHref: suggestion.conferenceId
        ? `/conferences/${suggestion.conferenceId}`
        : suggestion.venueLink || "",
      venueMeta: [
        suggestion.status === "PENDING" ? "Waiting approval" : "",
        suggestion.conference?.organizer || "No organizer",
        suggestion.conference?.type || "No type",
        suggestion.conference?.location || "No location",
      ]
        .filter(Boolean)
        .join(" - "),
      scope:
        suggestion.conference?.targetTheme ||
        suggestion.conference?.themes ||
        suggestion.conference?.isbn ||
        "",
      suggestedBy: suggestion.createdBy
        ? displayResearchPersonName(suggestion.createdBy) || "Unknown"
        : "Unknown",
      suggestedByMeta:
        suggestion.createdBy?.roles.join(", ") ||
        displayResearchEmail(suggestion.createdBy?.email) ||
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
    },
    {
      label: "Journals",
      value: journalRows.length,
    },
    {
      label: "Conferences",
      value: conferenceRows.length,
    },
    {
      label: "Research",
      value: new Set(rows.map((row) => row.projectId)).size,
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

      <SuggestionsTable
        rows={rows}
        deleteJournalAction={deleteSuggestedJournal}
        deleteConferenceAction={deleteSuggestedConference}
      />
    </div>
  );
}
