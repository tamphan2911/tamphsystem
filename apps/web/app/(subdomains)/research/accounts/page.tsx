import { KeyRound, PlusCircle } from "lucide-react";
import { prisma } from "@repo/db";
import { createPublisherAccount } from "../actions";

export const dynamic = "force-dynamic";

export default async function PublisherAccountsPage() {
  const [accounts, journals] = await Promise.all([
    prisma.publisherAccount.findMany({
      include: {
        journal: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { username: "asc" },
    }),
    prisma.journal.findMany({
      orderBy: [{ publisher: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            <KeyRound className="h-8 w-8 text-amber-500" />
            Publisher Accounts
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Track journal-specific and publisher-wide login credentials used for submissions.
          </p>
        </div>

        <form action={createPublisherAccount} className="grid w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:max-w-2xl">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <PlusCircle className="h-4 w-4 text-blue-500" />
            Add account
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="username" required placeholder="ID / username" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <input name="password" placeholder="Password" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <input name="email" placeholder="Email" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <select name="journalId" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
              <option value="">Publisher-wide / not journal-specific</option>
              {journals.map((journal) => (
                <option key={journal.id} value={journal.id}>
                  {journal.publisher ? `${journal.publisher} - ` : ""}{journal.name}
                </option>
              ))}
            </select>
            <input name="note" placeholder="Publisher, login URL, recovery note, account scope" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 md:col-span-2" />
          </div>
          <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <PlusCircle className="h-4 w-4" />
            Add Account
          </button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {accounts.map((account) => (
          <article key={account.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">{account.username}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {account.journal ? account.journal.name : "Publisher-wide account"}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">
                {account._count.submissions} submissions
              </span>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Email</dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">{account.email || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Password</dt>
                <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300">{account.password || "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase text-slate-400">Note</dt>
                <dd className="mt-1 text-slate-700 dark:text-slate-300">{account.note || "-"}</dd>
              </div>
            </dl>
          </article>
        ))}

        {accounts.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            No publisher accounts yet.
          </div>
        )}
      </div>
    </div>
  );
}
