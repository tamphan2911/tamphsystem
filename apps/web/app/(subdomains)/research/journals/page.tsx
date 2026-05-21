import { prisma } from "@repo/db";
import { JournalsTable, type JournalRow } from "./JournalsTable";
import { NewJournalDialog } from "./NewJournalDialog";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
  const journals = await prisma.journal.findMany({
    include: {
      _count: { select: { submissions: true, accounts: true, reviews: true } },
    },
    orderBy: [{ rank: "asc" }, { name: "asc" }],
  });

  const rows: JournalRow[] = journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    issn: journal.issn ?? "",
    field: journal.field ?? "",
    rank: journal.rank ?? "",
    publisher: journal.publisher ?? "",
    apc: journal.apc ?? "",
    submissionFee: journal.submissionFee ?? "",
    note: journal.note ?? "",
    submissions: journal._count.submissions,
    accounts: journal._count.accounts,
    reviews: journal._count.reviews,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Journal List</p>
        <NewJournalDialog />
      </div>

      <JournalsTable rows={rows} />
    </div>
  );
}
