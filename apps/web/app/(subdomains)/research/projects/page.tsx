import { Clock, FileText, Send, Trophy } from "lucide-react";
import { prisma } from "@repo/db";
import { NewResearchDialog } from "./NewResearchDialog";
import { ResearchProjectsTable, type ResearchProjectRow } from "./ResearchProjectsTable";

export const dynamic = "force-dynamic";

export default async function ProjectsDashboard() {
  const projects = await prisma.researchProject.findMany({
    include: {
      leadResearcher: { select: { name: true, email: true } },
      _count: {
        select: { submissions: true, publications: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const submitting = projects.filter((project) => project.stage === "SUBMITTING");
  const published = projects.filter((project) => project.stage === "PUBLISHED");
  const claimQueue = projects.filter(
    (project) => project.claimStatus === "MAKING_DOCUMENT" || project.claimStatus === "WAITING",
  );

  const rows: ResearchProjectRow[] = projects.map((project) => ({
    id: project.id,
    title: project.title,
    abstract: project.abstract ?? "",
    stage: project.stage,
    claimStatus: project.claimStatus,
    coAuthors: project.coAuthors ?? "",
    universityRegistration: project.universityRegistration ?? "",
    leadResearcher: project.leadResearcher.name || project.leadResearcher.email,
    submissions: project._count.submissions,
    publications: project._count.publications,
    updatedAt: project.updatedAt.toLocaleDateString(),
  }));

  const stats = [
    { label: "Total", value: projects.length, icon: FileText, color: "text-slate-600" },
    { label: "Submitting", value: submitting.length, icon: Send, color: "text-blue-600" },
    { label: "Published", value: published.length, icon: Trophy, color: "text-emerald-600" },
    { label: "Claims", value: claimQueue.length, icon: Clock, color: "text-amber-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
          {stats.map((item) => (
            <div
              key={item.label}
              className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="text-base font-black text-slate-950">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <NewResearchDialog />
      </div>

      <ResearchProjectsTable rows={rows} />
    </div>
  );
}
