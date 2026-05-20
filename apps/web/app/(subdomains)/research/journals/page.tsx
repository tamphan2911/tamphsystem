import { BookOpen, PlusCircle } from "lucide-react";
import { prisma } from "@repo/db";
import { createJournal } from "../actions";

export const dynamic = "force-dynamic";

function rankBadge(rank: string | null) {
  if (!rank) return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  if (rank === "Q1") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (rank === "Q2") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  if (rank === "Q3") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default async function JournalsPage() {
  const journals = await prisma.journal.findMany({
    include: {
      _count: { select: { submissions: true, accounts: true } },
    },
    orderBy: [{ rank: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            <BookOpen className="h-8 w-8 text-blue-500" />
            Journals Database
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Store target journals, ranks, fees, publishers, and submission notes.
          </p>
        </div>

        <form action={createJournal} className="grid w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <PlusCircle className="h-4 w-4 text-blue-500" />
            Add journal
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input name="name" required placeholder="Journal name" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <input name="issn" placeholder="ISSN" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <input name="field" placeholder="Field" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <select name="rank" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
              <option value="">Rank</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
              <option value="Scopus">Scopus</option>
              <option value="ISI">ISI</option>
            </select>
            <input name="publisher" placeholder="Publisher" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <input name="apc" placeholder="APC" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <input name="submissionFee" placeholder="Submission fee" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <input name="note" placeholder="Submission link, Scimago/Scopus notes, fit notes" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 md:col-span-2" />
          </div>
          <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <PlusCircle className="h-4 w-4" />
            Add Journal
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[72rem] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3">Journal</th>
                <th className="px-5 py-3">ISSN</th>
                <th className="px-5 py-3">Field</th>
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Publisher</th>
                <th className="px-5 py-3">APC</th>
                <th className="px-5 py-3">Submission Fee</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {journals.map((journal) => (
                <tr key={journal.id} className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">{journal.name}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{journal.issn || "-"}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{journal.field || "-"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded px-2 py-1 text-xs font-bold ${rankBadge(journal.rank)}`}>
                      {journal.rank || "N/A"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{journal.publisher || "-"}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{journal.apc || "-"}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{journal.submissionFee || "-"}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {journal._count.submissions} submissions, {journal._count.accounts} accounts
                  </td>
                  <td className="max-w-xs px-5 py-4 text-sm text-slate-500">{journal.note || "-"}</td>
                </tr>
              ))}
              {journals.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center text-slate-500">
                    No journals yet. Add target journals to start building the submission database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
