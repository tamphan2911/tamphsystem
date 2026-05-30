import { Building2, KeyRound, Send, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deletePublisherAccount } from "../actions";
import { AccountsTable, type AccountRow } from "./AccountsTable";
import { NewAccountDialog } from "./NewAccountDialog";

export const dynamic = "force-dynamic";

export default async function PublisherAccountsPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isAdmin = roles.includes(Role.ADMIN);
  const isAssistant =
    roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT);
  if (!userId) redirect("/login");
  if (!isAdmin && !isAssistant) redirect("/401");

  const [accounts, journals] = await Promise.all([
    prisma.publisherAccount.findMany({
      where: isAdmin
        ? {}
        : { tasks: { some: { assignments: { some: { userId } } } } },
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

  const rows: AccountRow[] = accounts.map((account) => ({
    id: account.id,
    username: account.username,
    password: account.password,
    email: account.email ?? "",
    note: account.note ?? "",
    journalId: account.journalId ?? "",
    journalName: account.journal?.name ?? "",
    publisher: account.journal?.publisher ?? "",
    submissions: account._count.submissions,
  }));

  const publisherWide = accounts.filter((account) => !account.journalId).length;
  const journalOptions = journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    publisher: journal.publisher ?? "",
  }));

  const stats = [
    {
      label: "Accounts",
      value: accounts.length,
      icon: KeyRound,
      color: "text-amber-600",
    },
    {
      label: "Publisher",
      value: publisherWide,
      icon: Building2,
      color: "text-purple-600",
    },
    {
      label: "Journal",
      value: accounts.length - publisherWide,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Submits",
      value: accounts.reduce(
        (sum, account) => sum + account._count.submissions,
        0,
      ),
      icon: Send,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
          {stats.map((item) => (
            <div
              key={item.label}
              className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
                <p className="text-base font-black text-slate-950 dark:text-white">
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {isAdmin && <NewAccountDialog journals={journalOptions} />}
      </div>

      <AccountsTable
        rows={rows}
        isAdmin={isAdmin}
        deleteAction={deletePublisherAccount}
      />
    </div>
  );
}
