import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CheckCircle, FileText, Library, PlusCircle, Send, UploadCloud } from "lucide-react";
import { prisma, type ResearchProject, type User } from "@repo/db";
import { createResearchProject } from "../actions";

export const dynamic = "force-dynamic";

type ProjectWithLead = ResearchProject & {
  leadResearcher: Pick<User, "name" | "email">;
  _count: { submissions: number; publications: number };
};

function stageLabel(stage: string) {
  return stage.toLowerCase().replace("_", " ");
}

function ProjectCard({ project }: { project: ProjectWithLead }) {
  return (
    <Link key={project.id} href={`/projects/${project.id}`} className="block group">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-bold leading-5 text-slate-950 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
            {project.title}
          </h4>
          <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {stageLabel(project.stage)}
          </span>
        </div>

        {project.abstract && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {project.abstract}
          </p>
        )}

        <div className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          {project.coAuthors && <div>Co-authors: {project.coAuthors}</div>}
          {project.universityRegistration && <div>Registration: {project.universityRegistration}</div>}
          <div>Claim: {stageLabel(project.claimStatus)}</div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
              {project.leadResearcher.name || project.leadResearcher.email}
            </p>
          </div>
          <div className="flex gap-3 text-[11px] text-slate-400">
            <span>{project._count.submissions} submissions</span>
            <span>{project._count.publications} pubs</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PipelineColumn({
  title,
  icon: Icon,
  projects,
  colorClass,
}: {
  title: string;
  icon: LucideIcon;
  projects: ProjectWithLead[];
  colorClass: string;
}) {
  return (
    <section className="flex min-h-[28rem] flex-col rounded-xl border border-slate-200 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          {title}
        </h3>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">
          {projects.length}
        </span>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {projects.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400 dark:border-slate-700">
            Empty
          </div>
        )}
      </div>
    </section>
  );
}

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

  const production = projects.filter((project) => project.stage === "PRODUCTION");
  const submitting = projects.filter((project) => project.stage === "SUBMITTING");
  const accepted = projects.filter((project) => project.stage === "ACCEPTED");
  const published = projects.filter((project) => project.stage === "PUBLISHED");
  const claimQueue = projects.filter((project) => project.claimStatus === "MAKING_DOCUMENT" || project.claimStatus === "WAITING");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Research Pipeline
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Track ideas, university registration, bonus claims, submissions, acceptances, and publications.
          </p>
        </div>

        <form action={createResearchProject} className="grid w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:max-w-2xl">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <PlusCircle className="h-4 w-4 text-blue-500" />
            New research
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="title" required placeholder="Research title" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950" />
            <select name="stage" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950">
              <option value="PRODUCTION">Production</option>
              <option value="SUBMITTING">Submitting</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PUBLISHED">Published</option>
            </select>
            <input name="coAuthors" placeholder="Co-authors" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950" />
            <input name="universityRegistration" placeholder="University registration, e.g. Q2 2026" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950" />
          </div>
          <textarea name="abstract" placeholder="Idea, data, model, writing notes, references..." className="min-h-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950" />
          <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            <PlusCircle className="h-4 w-4" />
            Add Project
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Total research</p>
          <p className="mt-2 text-3xl font-black">{projects.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Submitting</p>
          <p className="mt-2 text-3xl font-black text-blue-600">{submitting.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Published</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{published.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Claim follow-up</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{claimQueue.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <PipelineColumn title="Production" icon={FileText} projects={production} colorClass="text-slate-500" />
        <PipelineColumn title="Submitting" icon={UploadCloud} projects={submitting} colorClass="text-blue-500" />
        <PipelineColumn title="Accepted" icon={CheckCircle} projects={accepted} colorClass="text-purple-500" />
        <PipelineColumn title="Published" icon={Library} projects={published} colorClass="text-emerald-500" />
      </div>
    </div>
  );
}
