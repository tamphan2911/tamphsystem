import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, ExternalLink, Library, Plus, Save, Send } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import {
  createPublication,
  createResearchSubmission,
  updateResearchProject,
} from "../../actions";
import { SubmissionsTable, type SubmissionRow } from "./SubmissionsTable";
import { SuggestedJournalsPanel, type SuggestedJournalOption, type TaskAssigneeOption } from "./SuggestedJournalsPanel";

export const dynamic = "force-dynamic";

const productionSteps = [
  { label: "Idea forming", detail: "Define research question and contribution" },
  { label: "Data collection", detail: "Collect, clean, and document data sources" },
  { label: "Modeling", detail: "Run analysis, models, robustness checks" },
  { label: "Writing", detail: "Build manuscript structure and core arguments" },
  { label: "Humanizing", detail: "Refine tone, flow, and academic readability" },
  { label: "References", detail: "Verify citations, DOI, format, and links" },
];

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ?? []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const [project, journals, accounts, taskAssignees] = await Promise.all([
    prisma.researchProject.findUnique({
      where: { id },
      include: {
        submissions: {
          include: { journal: true, account: true },
          orderBy: { submittedAt: "desc" },
        },
        publications: { orderBy: { publishedDate: "desc" } },
        leadResearcher: true,
        suggestedJournals: {
          include: { journal: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.journal.findMany({ orderBy: [{ rank: "asc" }, { name: "asc" }] }),
    prisma.publisherAccount.findMany({
      include: { journal: true },
      orderBy: { username: "asc" },
    }),
    prisma.user.findMany({
      where: { roles: { hasSome: [Role.ADMIN, Role.ASSISTANT, Role.CHIEF_ASSISTANT] } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, roles: true },
    }),
  ]);

  if (!project) notFound();

  const updateAction = updateResearchProject.bind(null, project.id);
  const submissionAction = createResearchSubmission.bind(null, project.id);
  const publicationAction = createPublication.bind(null, project.id);
  const showPublicationBlock = project.stage === "PUBLISHED" || project.publications.length > 0;
  const latestPublication = project.publications[0];
  const acceptedSubmission = project.submissions.find((submission) => submission.status === "ACCEPTED");
  const publishedJournal = acceptedSubmission?.journal ?? project.submissions[0]?.journal;
  const authorsLine = [project.leadResearcher.name || project.leadResearcher.email, project.coAuthors].filter(Boolean).join(", ");
  const completedProductionSteps = new Set(project.completedProductionSteps);
  const unfinishedSteps = productionSteps.filter((step) => !completedProductionSteps.has(step.label));
  const allJournalOptions: SuggestedJournalOption[] = journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    issn: journal.issn ?? "",
    field: journal.field ?? "",
    rank: journal.rank ?? "",
    publisher: journal.publisher ?? "",
    apc: journal.apc ?? "",
  }));
  const suggestedJournalOptions: SuggestedJournalOption[] = project.suggestedJournals.map(({ journal }) => ({
    id: journal.id,
    name: journal.name,
    issn: journal.issn ?? "",
    field: journal.field ?? "",
    rank: journal.rank ?? "",
    publisher: journal.publisher ?? "",
    apc: journal.apc ?? "",
  }));
  const taskAssigneeOptions: TaskAssigneeOption[] = taskAssignees.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    roles: user.roles,
  }));
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
          <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
            {project.title}
          </h1>
          <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>Authors: {authorsLine}</p>
            {project.stage === "PUBLISHED" && publishedJournal && (
              <div>
                <p>
                  {publishedJournal.name} - {publishedJournal.publisher || "No publisher"} - {latestPublication?.rank || publishedJournal.rank || "No rank"} -{" "}
                  {latestPublication?.publishedDate ? latestPublication.publishedDate.toLocaleDateString() : "No published date"}
                </p>
                {latestPublication?.url && (
                  <a href={latestPublication.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">
                    DOI / article link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
            {project.stage === "ACCEPTED" && publishedJournal && (
              <p>
                {publishedJournal.name} - {publishedJournal.publisher || "No publisher"} - {publishedJournal.rank || "No rank"}
              </p>
            )}
            {project.stage === "PRODUCTION" && (
              <p>
                Not finished: {unfinishedSteps.length > 0 ? unfinishedSteps.map((step) => step.label).join(", ") : "All production stages checked"}
              </p>
            )}
          </div>
        </div>
      </div>

      <form action={updateAction} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-end">
            <button className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>

          <div className="grid gap-5">
            <section className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Title
                  <input name="title" defaultValue={project.title} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Co-authors
                  <input name="coAuthors" defaultValue={project.coAuthors ?? ""} placeholder="Names separated by comma" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
                </label>
              </div>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Stage
                <select name="stage" defaultValue={project.stage} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  <option value="PRODUCTION">Production</option>
                  <option value="SUBMITTING">Submitting</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </label>
            </section>

            <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
              <h2 className="mb-4 text-base font-bold text-slate-950 dark:text-white">Registration and claim</h2>
              <div className="grid gap-4 md:grid-cols-2">
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
              </div>
            </section>
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
            <ClipboardCheck className="h-4 w-4 text-emerald-500" />
            Production timeline
          </h2>
          <div className="relative space-y-1">
            <div className="absolute bottom-5 left-[0.78rem] top-5 w-px bg-slate-200 dark:bg-slate-700" />
            {productionSteps.map((step) => {
              const active = completedProductionSteps.has(step.label);
              return (
                <label key={step.label} className="relative flex cursor-pointer gap-3 pb-4 last:pb-0">
                  <input
                    type="checkbox"
                    name="completedProductionSteps"
                    value={step.label}
                    defaultChecked={active}
                    className="z-10 mt-1 h-5 w-5 cursor-pointer rounded-full border-slate-300 bg-white text-emerald-600 accent-emerald-600 shadow-sm transition focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{step.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{step.detail}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </aside>
      </form>

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

      <SuggestedJournalsPanel
        projectId={project.id}
        projectTitle={project.title}
        journals={allJournalOptions}
        suggested={suggestedJournalOptions}
        assistants={taskAssigneeOptions}
        isAdmin={isAdmin}
      />
    </div>
  );
}
