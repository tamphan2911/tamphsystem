import Link from "next/link";
import { ExternalLink, FolderGit2, PlusCircle } from "lucide-react";
import { prisma } from "@repo/db";
import { createAdminResearchProject } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminResearchPage() {
  const [projects, researchers] = await Promise.all([
    prisma.researchProject.findMany({
      include: {
        leadResearcher: true,
        _count: { select: { submissions: true, publications: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        roles: {
          hasSome: [
            "ADMIN",
            "RESEARCHER",
            "CHIEF_ASSISTANT",
            "ASSISTANT",
            "LECTURER",
          ],
        },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
          <FolderGit2 className="h-8 w-8 text-emerald-600" />
          Research Projects
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Admin view of research stages, registration, claims, submissions, and
          publications.
        </p>
      </div>

      <form
        action={createAdminResearchProject}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          New research project
        </h2>
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            name="title"
            required
            placeholder="Title"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <select
            name="leadResearcherId"
            required
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Lead researcher</option>
            {researchers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
          <select
            name="stage"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="PRODUCTION">Production</option>
            <option value="SUBMITTING">Submitting</option>
            <option value="REVIEW">Review</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select
            name="claimStatus"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="CANNOT_CLAIM">Cannot claim</option>
            <option value="MAKING_DOCUMENT">Making document</option>
            <option value="WAITING">Waiting</option>
            <option value="CLAIMED">Claimed</option>
          </select>
          <input
            name="coAuthors"
            placeholder="Co-authors"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            name="universityRegistration"
            placeholder="University registration, e.g. Q2 2026"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            name="abstract"
            placeholder="Notes / abstract"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:col-span-2"
          />
        </div>
        <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-400">
          Create Project
        </button>
      </form>

      <div className="grid gap-4">
        {projects.map((project) => (
          <article
            key={project.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-bold">{project.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {project.leadResearcher.name || project.leadResearcher.email}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {project.stage} • Claim{" "}
                  {project.claimStatus.replace("_", " ")} •{" "}
                  {project.universityRegistration || "No registration"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span>{project._count.submissions} submissions</span>
                <span>{project._count.publications} publications</span>
                <Link
                  href={`https://research.tamph.com/projects/${project.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 font-semibold text-blue-600"
                >
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
