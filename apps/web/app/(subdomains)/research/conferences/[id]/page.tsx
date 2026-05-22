import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Globe2, MapPin, Users } from "lucide-react";
import { prisma } from "@repo/db";
import { ResearchProjectsTable, type ResearchProjectRow } from "../../projects/ResearchProjectsTable";

export const dynamic = "force-dynamic";

function dateText(start: Date | null, end: Date | null) {
  if (!start && !end) return "";
  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" });
  if (start && end) return `${formatter.format(start)} - ${formatter.format(end)}`;
  return formatter.format((start ?? end) as Date);
}

export default async function ConferenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conference = await prisma.conference.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          project: {
            include: {
              leadResearcher: true,
              authors: { select: { name: true, email: true }, orderBy: [{ name: "asc" }, { email: "asc" }] },
              _count: { select: { submissions: true, publications: true } },
            },
          },
        },
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!conference) notFound();

  const submittedResearch: ResearchProjectRow[] = conference.submissions.map(({ project }) => ({
    id: project.id,
    title: project.title,
    abstract: project.abstract ?? "",
    stage: project.stage,
    claimStatus: project.claimStatus,
    registerStatus: project.registerStatus,
    coAuthors:
      project.authors.length > 0
        ? project.authors.map((author) => author.name || author.email).join(", ")
        : project.coAuthors ?? "",
    universityRegistration: project.universityRegistration ?? "",
    leadResearcher: project.leadResearcher.name || project.leadResearcher.email,
    submissions: project._count.submissions,
    publications: project._count.publications,
    updatedAt: project.updatedAt.toLocaleDateString(),
  }));

  const schedule = dateText(conference.startDate, conference.endDate);
  const theme = conference.targetTheme || conference.themes || "";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link href="/conferences" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Conferences
      </Link>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{conference.name}</h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
                  {conference.type || "Type not set"}
                </span>
              </div>
              {theme && <p className="mt-3 max-w-4xl text-sm text-slate-600 dark:text-slate-300">{theme}</p>}
            </div>
            {conference.website && (
              <a
                href={conference.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-blue-600 hover:shadow-sm dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
              >
                <Globe2 className="h-4 w-4" />
                Website
              </a>
            )}
          </div>
        </div>

        <dl className="grid gap-4 p-5 text-sm md:grid-cols-4">
          <div>
            <dt className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              Time
            </dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">{schedule || "-"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">{conference.location || "-"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
              <Users className="h-3.5 w-3.5" />
              Organizer
            </dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">{conference.organizer || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">ISBN</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">{conference.isbn || "-"}</dd>
          </div>
          {conference.note && (
            <div className="md:col-span-4">
              <dt className="text-xs font-bold uppercase text-slate-400">Note</dt>
              <dd className="mt-1 text-slate-700 dark:text-slate-300">{conference.note}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Research submitted to this conference</p>
        </div>
        <ResearchProjectsTable rows={submittedResearch} />
      </section>
    </div>
  );
}
