import Link from "next/link";
import { Building2, CheckCircle2, Clock3, FileText, Landmark } from "lucide-react";
import { prisma } from "@repo/db";
import { NewOrganizedProjectDialog } from "./NewOrganizedProjectDialog";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  return value ? value.toLocaleDateString() : "-";
}

function statusClass(status: string) {
  if (status === "COMPLETED")
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (status === "ACTIVE")
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  if (status === "ARCHIVED")
    return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default async function OrganizedProjectsPage() {
  const [projects, researchOptions] = await Promise.all([
    prisma.organizedProject.findMany({
      include: {
        research: {
          include: {
            researchProject: {
              include: {
                _count: { select: { submissions: true, publications: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.researchProject.findMany({
      select: { id: true, title: true, stage: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const active = projects.filter((project) => project.status === "ACTIVE");
  const completed = projects.filter((project) => project.status === "COMPLETED");
  const linkedResearch = projects.reduce(
    (sum, project) => sum + project.research.length,
    0,
  );
  const stats = [
    { label: "Projects", value: projects.length, icon: Building2, color: "text-slate-600" },
    { label: "Active", value: active.length, icon: Clock3, color: "text-blue-600" },
    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Research results", value: linkedResearch, icon: FileText, color: "text-amber-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
          {stats.map((item) => (
            <div
              key={item.label}
              className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className="text-base font-black text-slate-950 dark:text-white">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <NewOrganizedProjectDialog researchOptions={researchOptions} />
      </div>

      <div className="grid gap-4">
        {projects.map((project) => {
          const required = project.requiredResearchCount ?? 0;
          const linked = project.research.length;
          const progressLabel = required > 0 ? `${linked}/${required}` : `${linked}`;

          return (
            <article
              key={project.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(project.status)}`}>
                      {statusLabel(project.status)}
                    </span>
                    {project.referenceCode && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {project.referenceCode}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
                    {project.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Landmark className="h-4 w-4" />
                      {project.organizer || "No organizer"}
                    </span>
                    <span>
                      {shortDate(project.startDate)} to {shortDate(project.endDate)}
                    </span>
                  </div>
                  {project.description && (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 px-4 py-3 text-center dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Results
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                    {progressLabel}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Associated research
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {project.research.map(({ researchProject }) => (
                    <Link
                      key={researchProject.id}
                      href={`/projects/${researchProject.id}`}
                      className="rounded-lg border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-blue-700 dark:hover:bg-slate-800/60"
                    >
                      <p className="line-clamp-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {researchProject.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {researchProject.stage} - {researchProject._count.submissions} submissions - {researchProject._count.publications} publications
                      </p>
                    </Link>
                  ))}
                  {project.research.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-800">
                      No research results linked yet.
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <Building2 className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-3 text-base font-bold text-slate-950 dark:text-white">
              No organized projects yet
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Create one to connect institutional requirements with research outputs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
