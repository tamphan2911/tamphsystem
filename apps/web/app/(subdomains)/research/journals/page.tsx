import { BookOpen, Building2, Trophy, Users } from "lucide-react";
import { prisma } from "@repo/db";
import { JournalsTable, type JournalRow } from "./JournalsTable";
import { NewJournalDialog } from "./NewJournalDialog";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
  const journals = await prisma.journal.findMany({
    include: {
      _count: { select: { submissions: true, accounts: true } },
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
  }));

  const publishers = new Set(journals.map((journal) => journal.publisher).filter(Boolean));
  const ranked = journals.filter((journal) => journal.rank).length;

  const stats = [
    { label: "Journals", value: journals.length, icon: BookOpen, color: "text-blue-600" },
    { label: "Ranked", value: ranked, icon: Trophy, color: "text-emerald-600" },
    { label: "Publishers", value: publishers.size, icon: Building2, color: "text-purple-600" },
    { label: "Accounts", value: journals.reduce((sum, journal) => sum + journal._count.accounts, 0), icon: Users, color: "text-amber-600" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
          {stats.map((item) => (
            <div key={item.label} className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                <p className="text-base font-black text-slate-950 dark:text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <NewJournalDialog />
      </div>

      <JournalsTable rows={rows} />
    </div>
  );
}
