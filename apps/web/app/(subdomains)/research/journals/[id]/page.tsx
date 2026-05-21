import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { prisma } from "@repo/db";
import { ReviewsTable, type ReviewRow } from "../../reviews/ReviewsTable";

export const dynamic = "force-dynamic";

function dateText(value: Date | null) {
  return value ? value.toLocaleDateString() : "";
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const journal = await prisma.journal.findUnique({
    where: { id },
    include: {
      reviews: { orderBy: [{ dueDate: "asc" }, { requestedAt: "desc" }] },
      _count: { select: { submissions: true, accounts: true, reviews: true } },
    },
  });

  if (!journal) notFound();

  const reviewRows: ReviewRow[] = journal.reviews.map((review) => ({
    id: review.id,
    journalId: journal.id,
    journalName: journal.name,
    publisher: journal.publisher ?? "",
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

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link href="/journals" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Journals
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{journal.name}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{journal.note || "No journal notes yet."}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase text-slate-400">Submits</p>
              <p className="font-black">{journal._count.submissions}</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase text-slate-400">Accounts</p>
              <p className="font-black">{journal._count.accounts}</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase text-slate-400">Reviews</p>
              <p className="font-black">{journal._count.reviews}</p>
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
        </dl>
      </section>

      {reviewRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
            <ClipboardCheck className="h-4 w-4 text-emerald-600" />
            Academic reviews for this journal
          </h2>
          <ReviewsTable rows={reviewRows} />
        </section>
      )}
    </div>
  );
}
