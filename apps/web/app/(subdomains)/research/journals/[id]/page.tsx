import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Database, Globe2, Hash } from "lucide-react";
import { prisma } from "@repo/db";
import {
  JournalDetailTabs,
  type JournalAccountRow,
  type JournalReviewRow,
  type JournalSubmissionRow,
} from "./JournalDetailTabs";

export const dynamic = "force-dynamic";

function dateText(value: Date | null) {
  return value ? value.toLocaleDateString() : "";
}

export default async function JournalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const { back } = await searchParams;
  const backHref = back?.startsWith("/journals") ? back : "/journals";

  const journal = await prisma.journal.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          project: { select: { id: true, title: true } },
          account: { select: { username: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      accounts: {
        include: { _count: { select: { submissions: true } } },
        orderBy: [{ username: "asc" }],
      },
      reviews: { orderBy: [{ dueDate: "asc" }, { requestedAt: "desc" }] },
      _count: { select: { submissions: true, accounts: true, reviews: true } },
    },
  });

  if (!journal) notFound();

  const relatedTasks = await prisma.researchTask.findMany({
    where: {
      OR: [
        { title: { contains: journal.name, mode: "insensitive" } },
        { description: { contains: journal.name, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { title: true, description: true },
  });

  const submissionRows: JournalSubmissionRow[] = journal.submissions.map((submission) => {
    const taskTitles = relatedTasks
      .filter((task) => {
        const haystack = `${task.title} ${task.description ?? ""} ${submission.project.title}`.toLowerCase();
        return haystack.includes(journal.name.toLowerCase()) || haystack.includes(submission.project.title.toLowerCase());
      })
      .map((task) => task.title);

    return {
      id: submission.id,
      projectId: submission.project.id,
      projectTitle: submission.project.title,
      status: submission.status,
      account: submission.account?.username ?? "",
      submittedAt: dateText(submission.submittedAt),
      taskTitles,
    };
  });

  const accountRows: JournalAccountRow[] = journal.accounts.map((account) => ({
    id: account.id,
    username: account.username,
    password: account.password,
    email: account.email ?? "",
    note: account.note ?? "",
    submissions: account._count.submissions,
  }));

  const reviewRows: JournalReviewRow[] = journal.reviews.map((review) => ({
    id: review.id,
    manuscriptTitle: review.manuscriptTitle,
    manuscriptId: review.manuscriptId ?? "",
    status: review.status,
    recommendation: review.recommendation ?? "",
    requestedAt: dateText(review.requestedAt),
    dueDate: dateText(review.dueDate),
    completedAt: dateText(review.completedAt),
    editorName: review.editorName ?? "",
    reviewRound: review.reviewRound ?? "",
    note: review.note ?? "",
  }));

  const externalLinks = [
    { href: journal.homepageLink, label: "Homepage", icon: Globe2 },
    { href: journal.scimagoLink, label: "Scimago", icon: BarChart3 },
    { href: journal.scopusLink, label: "Scopus", icon: Database },
  ].filter((item) => Boolean(item.href));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Journals
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{journal.name}</h1>
              <div className="flex items-center gap-1">
                {externalLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href as string}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:text-blue-600 hover:shadow-sm dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                    aria-label={item.label}
                    title={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-4">
          <div><dt className="text-xs font-bold uppercase text-slate-400">ISSN</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{journal.issn || "-"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-400">Field</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{journal.field || "-"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-400">Rank</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{journal.rank || "-"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-400">Publisher</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{journal.publisher || "-"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-400">APC</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{journal.apc || "-"}</dd></div>
          <div><dt className="text-xs font-bold uppercase text-slate-400">Submission Fee</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{journal.submissionFee || "-"}</dd></div>
          <div className="md:col-span-2"><dt className="text-xs font-bold uppercase text-slate-400"><Hash className="inline h-3.5 w-3.5" /> Note</dt><dd className="mt-1 text-slate-700 dark:text-slate-300">{journal.note || "-"}</dd></div>
        </dl>
      </section>

      <JournalDetailTabs submissions={submissionRows} accounts={accountRows} reviews={reviewRows} />
    </div>
  );
}
