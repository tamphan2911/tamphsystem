import { KeyRound, PlusCircle } from "lucide-react";
import { prisma } from "@repo/db";
import { createAdminPublisherAccount } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const [accounts, journals] = await Promise.all([
    prisma.publisherAccount.findMany({
      include: { journal: true, _count: { select: { submissions: true } } },
      orderBy: { username: "asc" },
    }),
    prisma.journal.findMany({ orderBy: [{ publisher: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
          <KeyRound className="h-8 w-8 text-amber-600" />
          Publisher Accounts
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Manage journal-specific and publisher-wide submission credentials.
        </p>
      </div>

      <form action={createAdminPublisherAccount} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          Add publisher account
        </h2>
        <div className="grid gap-3 lg:grid-cols-4">
          <input name="username" required placeholder="ID / username" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
          <input name="password" placeholder="Password" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
          <input name="email" placeholder="Email" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
          <select name="journalId" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
            <option value="">Publisher-wide</option>
            {journals.map((journal) => (
              <option key={journal.id} value={journal.id}>{journal.publisher ? `${journal.publisher} - ` : ""}{journal.name}</option>
            ))}
          </select>
          <input name="note" placeholder="Login URL, note, publisher scope" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-4" />
        </div>
        <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Add Account
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {accounts.map((account) => (
          <article key={account.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold">{account.username}</h2>
                <p className="mt-1 text-sm text-slate-500">{account.journal?.name || "Publisher-wide account"}</p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800">
                {account._count.submissions} submissions
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Email</dt>
                <dd className="mt-1">{account.email || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-slate-400">Password</dt>
                <dd className="mt-1 font-mono">{account.password || "-"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase text-slate-400">Note</dt>
                <dd className="mt-1 text-slate-500">{account.note || "-"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
