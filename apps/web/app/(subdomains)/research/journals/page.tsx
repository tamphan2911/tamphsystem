import { BookOpen, Building2 } from "lucide-react";
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

  const publishers = new Set(journals.map((journal) => journal.publisher).filter(Boolean));
  const stats = [
    { label: "Journals", value: journals.length, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
    { label: "Publishers", value: publishers.size, icon: Building2, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/40" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:w-fit">
          {stats.map((item) => (
            <div key={item.label} className="flex min-w-36 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-start lg:justify-end">
          <NewJournalDialog />
        </div>
      </div>

      <JournalsTable rows={rows} />
    </div>
  );
}
