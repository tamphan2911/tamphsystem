import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, BookOpen, CheckCircle2, Circle, ClipboardCheck, ExternalLink, FileText, Library, Plus, Save, Send } from "lucide-react";
import { prisma } from "@repo/db";
import {
  createPublication,
  createResearchSubmission,
  updateResearchProject,
} from "../../actions";
import { SubmissionsTable, type SubmissionRow } from "./SubmissionsTable";

export const dynamic = "force-dynamic";

const productionSteps = [
  { label: "Idea forming", detail: "Define research question and contribution" },
  { label: "Data collection", detail: "Collect, clean, and document data sources" },
  { label: "Modeling", detail: "Run analysis, models, robustness checks" },
  { label: "Writing", detail: "Build manuscript structure and core arguments" },
  { label: "Humanizing", detail: "Refine tone, flow, and academic readability" },
  { label: "References", detail: "Verify citations, DOI, format, and links" },
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
  const showPublicationBlock = project.stage === "PUBLISHED" || project.publications.length > 0;
  const submissionRows: SubmissionRow[] = project.submissions.map((submission) => ({
    id: submission.id,
    journalId: submission.journalId,
    journalName: submission.journal.name,
    publisher: submission.journal.publisher ?? "",
    rank: submission.journal.rank ?? "",
    apc: submission.journal.apc ?? "",
    account: submission.account?.username ?? "",
    status: submission.status,
    submittedAt: submission.submittedAt.toLocaleDateString(),
  }));

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

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <form action={updateAction} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <input type="hidden" name="claimStatus" value={project.claimStatus} />
          <input type="hidden" name="universityRegistration" value={project.universityRegistration ?? ""} />
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
              <FileText className="h-5 w-5 text-blue-500" />
              Research record
            </h2>
            <button className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Title
              <input name="title" defaultValue={project.title} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Abstract and working notes
              <textarea name="abstract" defaultValue={project.abstract ?? ""} className="min-h-40 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Stage
                <select name="stage" defaultValue={project.stage} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  <option value="PRODUCTION">Production</option>
                  <option value="SUBMITTING">Submitting</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Co-authors
                <input name="coAuthors" defaultValue={project.coAuthors ?? ""} placeholder="Names separated by comma" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
              </label>
            </div>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
              <ClipboardCheck className="h-4 w-4 text-emerald-500" />
              Production timeline
            </h2>
            <div className="relative space-y-1">
              <div className="absolute bottom-5 left-[0.78rem] top-5 w-px bg-slate-200 dark:bg-slate-700" />
              {productionSteps.map((step, index) => {
                const active = project.stage === "PRODUCTION" ? index <= 1 : true;
                return (
                  <div key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                    <span className={`z-10 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border bg-white dark:bg-slate-900 ${
                      active ? "border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-300" : "border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-500"
                    }`}>
                      {active ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{step.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{step.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <form action={updateAction} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <input type="hidden" name="title" value={project.title} />
            <input type="hidden" name="abstract" value={project.abstract ?? ""} />
            <input type="hidden" name="stage" value={project.stage} />
            <input type="hidden" name="coAuthors" value={project.coAuthors ?? ""} />
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
              <Award className="h-4 w-4 text-amber-500" />
              Registration and claim
            </h2>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                University registration
                <input name="universityRegistration" defaultValue={project.universityRegistration ?? ""} placeholder="Q1 2026" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Claim status
                <select name="claimStatus" defaultValue={project.claimStatus} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  <option value="CANNOT_CLAIM">Cannot claim</option>
                  <option value="MAKING_DOCUMENT">Making document</option>
                  <option value="WAITING">Waiting response</option>
                  <option value="CLAIMED">Claimed</option>
                </select>
              </label>
              <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </form>
        </aside>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
            <Send className="h-5 w-5 text-blue-500" />
            Submissions
          </h2>
          <form action={submissionAction} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[16rem_16rem_10rem_auto]">
            <select name="journalId" required className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <option value="">Journal</option>
              {journals.map((journal) => (
                <option key={journal.id} value={journal.id}>
                  {journal.name} {journal.rank ? `(${journal.rank})` : ""}
                </option>
              ))}
            </select>
            <select name="accountId" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <option value="">Account used</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.username}{account.journal ? ` - ${account.journal.name}` : ""}
                </option>
              ))}
            </select>
            <select name="status" defaultValue="PENDING" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <option value="PENDING">Pending</option>
              <option value="REVISION">Revision</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
            <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md">
              <Plus className="h-4 w-4" />
              Log
            </button>
          </form>
        </div>
        <SubmissionsTable rows={submissionRows} />
      </section>

      {showPublicationBlock && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-2">
            <Library className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Publication information</h2>
          </div>

          <form action={publicationAction} className="mb-5 grid gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-950 md:grid-cols-3">
            <input name="title" required placeholder="Article title" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
            <input name="url" placeholder="Article link" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
            <input name="publishedDate" type="date" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
            <input name="rank" placeholder="Rank, e.g. Q1" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
            <input name="scimagoLink" placeholder="Scimago link" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
            <input name="scopusLink" placeholder="Scopus link" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" />
            <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md md:col-span-3 md:w-fit">
              <Plus className="h-4 w-4" />
              Add publication
            </button>
          </form>

          <div className="grid gap-3 md:grid-cols-2">
            {project.publications.map((publication) => (
              <div key={publication.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-bold text-slate-950 dark:text-white">{publication.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Published {publication.publishedDate.toLocaleDateString()} • {publication.rank || "No rank"}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  {publication.url && <a className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-300" href={publication.url} target="_blank" rel="noreferrer">Article <ExternalLink className="h-3 w-3" /></a>}
                  {publication.scimagoLink && <a className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-300" href={publication.scimagoLink} target="_blank" rel="noreferrer">Scimago <ExternalLink className="h-3 w-3" /></a>}
                  {publication.scopusLink && <a className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-300" href={publication.scopusLink} target="_blank" rel="noreferrer">Scopus <ExternalLink className="h-3 w-3" /></a>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
          <BookOpen className="h-4 w-4 text-slate-400" />
          Suggested journals
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {journals.slice(0, 8).map((journal) => (
            <Link key={journal.id} href={`/journals/${journal.id}`} className="rounded-lg border border-slate-200 p-3 text-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm dark:border-slate-800 dark:hover:border-blue-900 dark:hover:bg-blue-950/30">
              <p className="font-semibold text-slate-950 dark:text-white">{journal.name}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {journal.field || "No field"} • {journal.rank || "No rank"} • {journal.publisher || "No publisher"}
              </p>
            </Link>
          ))}
          {journals.length === 0 && <p className="text-sm text-slate-500">Add journals to build suggestions.</p>}
        </div>
      </section>
    </div>
  );
}
