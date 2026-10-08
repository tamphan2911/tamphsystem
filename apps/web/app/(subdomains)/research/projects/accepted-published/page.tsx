import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { displayResearchPersonName } from "@/sites/research/lib/display";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import {
  AcceptedPublishedResearchTable,
  type AcceptedPublishedResearchRow,
} from "./AcceptedPublishedResearchTable";

export const dynamic = "force-dynamic";

const dateFormatter = researchDateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function dateText(value: Date) {
  return dateFormatter.format(value);
}

function citationYear(value: Date) {
  return String(value.getFullYear());
}

function authorNames(project: {
  coAuthors: string | null;
  authorEntries: Array<{
    user: { name: string | null; email: string };
    isCorresponding: boolean;
  }>;
  authors: Array<{ name: string | null; email: string }>;
}) {
  if (project.authorEntries.length > 0) {
    return project.authorEntries
      .map((entry) => displayResearchPersonName(entry.user))
      .filter(Boolean)
      .join(", ");
  }
  if (project.authors.length > 0) {
    return project.authors
      .map((author) => displayResearchPersonName(author))
      .filter(Boolean)
      .join(", ");
  }
  return project.coAuthors ?? "";
}

function citationParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
}

export default async function AcceptedPublishedResearchPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) redirect("/login");

  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");

  const projects = await prisma.researchProject.findMany({
    where: {
      OR: [
        {
          submissions: { some: { status: { in: ["ACCEPTED", "PUBLISHED"] } } },
        },
        {
          conferenceSubmissions: {
            some: { status: { in: ["ACCEPTED", "PUBLISHED"] } },
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      coAuthors: true,
      authorEntries: {
        select: {
          isCorresponding: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
      authors: {
        select: { name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      },
      submissions: {
        where: { status: { in: ["ACCEPTED", "PUBLISHED"] } },
        select: {
          id: true,
          status: true,
          acceptedAt: true,
          publishedAt: true,
          updatedAt: true,
          journal: {
            select: {
              name: true,
              publisher: true,
              rank: true,
              localRank: true,
            },
          },
        },
      },
      conferenceSubmissions: {
        where: { status: { in: ["ACCEPTED", "PUBLISHED"] } },
        select: {
          id: true,
          status: true,
          acceptedAt: true,
          publishedAt: true,
          updatedAt: true,
          conference: {
            select: { name: true, organizer: true, type: true },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });

  const rows: AcceptedPublishedResearchRow[] = projects.flatMap((project) => {
    const authors = authorNames(project);
    const journalRows: AcceptedPublishedResearchRow[] = project.submissions.map(
      (submission) => {
        const status =
          submission.status === "PUBLISHED" ? "PUBLISHED" : "ACCEPTED";
        const date =
          status === "PUBLISHED"
            ? (submission.publishedAt ??
              submission.acceptedAt ??
              submission.updatedAt)
            : (submission.acceptedAt ?? submission.updatedAt);
        const rank =
          submission.journal.rank ?? submission.journal.localRank ?? "";
        const statusLabel = status === "PUBLISHED" ? "Published" : "Accepted";
        const dateLabel = `${statusLabel}: ${dateText(date)}`;
        const citation = citationParts([
          authors,
          `(${citationYear(date)})`,
          project.title,
          submission.journal.name,
          submission.journal.publisher,
          rank,
          dateLabel,
        ]).join(". ");

        return {
          id: `journal-${submission.id}`,
          projectId: project.id,
          title: project.title,
          venue: submission.journal.name,
          venueKind: "journal",
          publisher: submission.journal.publisher ?? "",
          rank,
          authors,
          status,
          dateLabel,
          dateValue: date.toISOString(),
          dateMs: date.getTime(),
          fullCitation: citation,
          isRankedScopusJournal: Boolean(submission.journal.rank?.trim()),
        };
      },
    );
    const conferenceRows: AcceptedPublishedResearchRow[] =
      project.conferenceSubmissions.map((submission) => {
        const status =
          submission.status === "PUBLISHED" ? "PUBLISHED" : "ACCEPTED";
        const date =
          status === "PUBLISHED"
            ? (submission.publishedAt ??
              submission.acceptedAt ??
              submission.updatedAt)
            : (submission.acceptedAt ?? submission.updatedAt);
        const conferenceType = submission.conference.type
          ? submission.conference.type
              .toLowerCase()
              .replace(/\b\w/g, (letter) => letter.toUpperCase())
          : "";
        const statusLabel = status === "PUBLISHED" ? "Published" : "Accepted";
        const dateLabel = `${statusLabel}: ${dateText(date)}`;
        const citation = citationParts([
          authors,
          `(${citationYear(date)})`,
          project.title,
          submission.conference.name,
          submission.conference.organizer,
          conferenceType,
          dateLabel,
        ]).join(". ");

        return {
          id: `conference-${submission.id}`,
          projectId: project.id,
          title: project.title,
          venue: submission.conference.name,
          venueKind: "conference",
          publisher: submission.conference.organizer ?? "",
          rank: conferenceType,
          authors,
          status,
          dateLabel,
          dateValue: date.toISOString(),
          dateMs: date.getTime(),
          fullCitation: citation,
          isRankedScopusJournal: false,
        };
      });

    return [...journalRows, ...conferenceRows];
  });

  return <AcceptedPublishedResearchTable rows={rows} />;
}
