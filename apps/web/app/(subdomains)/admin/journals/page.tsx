import { BookOpen, PlusCircle } from "lucide-react";
import { prisma } from "@repo/db";
import { createAdminJournal } from "../actions";
import { PublisherPicker } from "@/sites/research/components/PublisherPicker";

export const dynamic = "force-dynamic";

export default async function AdminJournalsPage() {
  const [journals, publishers] = await Promise.all([
    prisma.journal.findMany({
      include: { _count: { select: { submissions: true, accounts: true } } },
      orderBy: [{ rank: "asc" }, { name: "asc" }],
    }),
    prisma.publisher.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
          <BookOpen className="h-8 w-8 text-blue-600" />
          Journals
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Admin source of truth for target journals used by research
          submissions.
        </p>
      </div>

      <form
        action={createAdminJournal}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          Add journal
        </h2>
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            name="name"
            required
            placeholder="Journal name"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            name="issn"
            placeholder="ISSN"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            name="field"
            placeholder="Field"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <select
            name="rank"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Rank</option>
            <option value="Q1">Q1</option>
            <option value="Q2">Q2</option>
            <option value="Q3">Q3</option>
            <option value="Q4">Q4</option>
            <option value="Scopus">Scopus</option>
            <option value="ISI">ISI</option>
          </select>
          <PublisherPicker
            publishers={publishers.map((publisher) => ({
              id: publisher.id,
              publisherCode: publisher.publisherCode,
              name: publisher.name,
              alias: publisher.alias ?? "",
              country: publisher.country ?? "",
            }))}
          />
          <input
            name="apc"
            placeholder="APC"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            name="submissionFee"
            placeholder="Submission fee"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            name="note"
            placeholder="Note, URL, fit, login instructions"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-400">
          Add Journal
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 px-5 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800">
                  Journal
                </th>
                <th className="px-5 py-3">ISSN</th>
                <th className="px-5 py-3">Field</th>
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Publisher</th>
                <th className="px-5 py-3">Fees</th>
                <th className="px-5 py-3">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {journals.map((journal) => (
                <tr
                  key={journal.id}
                  className="group hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="sticky left-0 z-10 bg-white px-5 py-4 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800">
                    <p className="font-semibold">{journal.name}</p>
                    <p className="mt-1 max-w-md text-sm text-slate-500">
                      {journal.note || "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {journal.issn || "-"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {journal.field || "-"}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold">
                    {journal.rank || "-"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {journal.publisher || "-"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    APC {journal.apc || "-"} / Fee{" "}
                    {journal.submissionFee || "-"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {journal._count.submissions} submissions,{" "}
                    {journal._count.accounts} accounts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
