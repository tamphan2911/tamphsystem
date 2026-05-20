import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle, ExternalLink, FileText, Library, Plus, Save, Send } from "lucide-react";
import { prisma } from "@repo/db";
import {
  createPublication,
  createResearchSubmission,
  updateResearchProject,
} from "../../actions";

export const dynamic = "force-dynamic";

const productionSteps = [
  "Idea forming",
  "Data collection",
  "Modeling",
  "Writing",
  "Humanizing",
  "References",
];

function badgeClass(value: string) {
  switch (value) {
    case "PRODUCTION":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "SUBMITTING":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "ACCEPTED":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    case "PUBLISHED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "CLAIMED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "WAITING":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, journals, accounts] = await Promise.all([
    prisma.researchProject.findUnique({
      where: { id },
      include: {
        submissions: {
          include: { journal: true, account: true },
          orderBy: { submittedAt: "desc" },
        },
        publications: { orderBy: { publishedDate: "desc" } },
        leadResearcher: true,
      },
    }),
    prisma.journal.findMany({ orderBy: [{ rank: "asc" }, { name: "asc" }] }),
    prisma.publisherAccount.findMany({
      include: { journal: true },
      orderBy: { username: "asc" },
    }),
  ]);

  if (!project) notFound();

  const updateAction = updateResearchProject.bind(null, project.id);
  const submissionAction = createResearchSubmission.bind(null, project.id);
  const publicationAction = createPublication.bind(null, project.id);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/projects" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {project.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${badgeClass(project.stage)}`}>
              {project.stage}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${badgeClass(project.claimStatus)}`}>
              Claim: {project.claimStatus.replace("_", " ")}
            </span>
            {project.universityRegistration && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                {project.universityRegistration}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-8">
          <form action={updateAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <FileText className="h-5 w-5 text-blue-500" />
                Research record
              </h2>
              <button className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-1 text-sm font-semibold">
                Title
                <input name="title" defaultValue={project.title} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950" />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Abstract and working notes
                <textarea name="abstract" defaultValue={project.abstract ?? ""} className="min-h-40 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold">
                  Stage
                  <select name="stage" defaultValue={project.stage} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950">
                    <option value="PRODUCTION">Production</option>
                    <option value="SUBMITTING">Submitting</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Claim status
                  <select name="claimStatus" defaultValue={project.claimStatus} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950">
                    <option value="CANNOT_CLAIM">Cannot claim</option>
                    <option value="MAKING_DOCUMENT">Making document</option>
                    <option value="WAITING">Waiting response</option>
                    <option value="CLAIMED">Claimed</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  Co-authors
                  <input name="coAuthors" defaultValue={project.coAuthors ?? ""} placeholder="Names separated by comma" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950" />
                </label>
                <label className="grid gap-1 text-sm font-semibold">
                  University registration quarter
                  <input name="universityRegistration" defaultValue={project.universityRegistration ?? ""} placeholder="Q1 2026" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950" />
                </label>
              </div>
            </div>
          </form>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-bold">Submissions</h2>
            </div>

            <form action={submissionAction} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-950 md:grid-cols-4">
              <select name="journalId" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                <option value="">Journal</option>
                {journals.map((journal) => (
                  <option key={journal.id} value={journal.id}>
                    {journal.name} {journal.rank ? `(${journal.rank})` : ""}
                  </option>
                ))}
              </select>
              <select name="accountId" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                <option value="">Account used</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.username}{account.journal ? ` - ${account.journal.name}` : ""}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue="PENDING" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                <option value="PENDING">Pending</option>
                <option value="REVISION">Revision</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Log
              </button>
            </form>

            <div className="space-y-3">
              {project.submissions.map((submission) => (
                <div key={submission.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-bold">{submission.journal.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {submission.journal.publisher || "Unknown publisher"} • {submission.journal.rank || "No rank"} • APC {submission.journal.apc || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Account: {submission.account?.username || "Not recorded"} • Submitted {submission.submittedAt.toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`w-fit rounded px-2 py-1 text-xs font-bold ${badgeClass(submission.status)}`}>
                      {submission.status}
                    </span>
                  </div>
                </div>
              ))}
              {project.submissions.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                  No journal submissions yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center gap-2">
              <Library className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-bold">Publications</h2>
            </div>

            <form action={publicationAction} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-950 md:grid-cols-3">
              <input name="title" required placeholder="Article title" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
              <input name="url" placeholder="Article link" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
              <input name="publishedDate" type="date" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
              <input name="rank" placeholder="Rank, e.g. Q1" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
              <input name="scimagoLink" placeholder="Scimago link" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
              <input name="scopusLink" placeholder="Scopus link" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
              <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 md:col-span-3 md:w-fit">
                <Plus className="h-4 w-4" />
                Add Publication
              </button>
            </form>

            <div className="space-y-3">
              {project.publications.map((publication) => (
                <div key={publication.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <p className="font-bold">{publication.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Published {publication.publishedDate.toLocaleDateString()} • {publication.rank || "No rank"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {publication.url && <a className="inline-flex items-center gap-1 text-blue-600" href={publication.url} target="_blank" rel="noreferrer">Article <ExternalLink className="h-3 w-3" /></a>}
                    {publication.scimagoLink && <a className="inline-flex items-center gap-1 text-blue-600" href={publication.scimagoLink} target="_blank" rel="noreferrer">Scimago <ExternalLink className="h-3 w-3" /></a>}
                    {publication.scopusLink && <a className="inline-flex items-center gap-1 text-blue-600" href={publication.scopusLink} target="_blank" rel="noreferrer">Scopus <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                </div>
              ))}
              {project.publications.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                  No final publication recorded yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              <CheckCircle className="h-4 w-4 text-slate-400" />
              Production checklist
            </h2>
            <div className="space-y-3">
              {productionSteps.map((step) => (
                <label key={step} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                  {step}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              <BookOpen className="h-4 w-4 text-slate-400" />
              Suggested journals
            </h2>
            <div className="space-y-3">
              {journals.slice(0, 8).map((journal) => (
                <div key={journal.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                  <p className="font-semibold">{journal.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {journal.field || "No field"} • {journal.rank || "No rank"} • {journal.publisher || "No publisher"}
                  </p>
                </div>
              ))}
              {journals.length === 0 && <p className="text-sm text-slate-500">Add journals to build suggestions.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
