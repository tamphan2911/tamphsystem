import { redirect } from "next/navigation";
import {
  prisma,
  JournalApprovalStatus,
  ResearchTaskStatus,
  Role,
} from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { canManageAllResearchAccounts } from "@/sites/research/lib/accountAccess";
import { deletePublisherAccount } from "../actions";
import { AccountsTable, type AccountRow } from "./AccountsTable";
import { NewAccountDialog } from "./NewAccountDialog";

export const dynamic = "force-dynamic";

export default async function PublisherAccountsPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const canManageAccounts = canManageAllResearchAccounts({
    roles,
    email: session?.user?.email,
  });
  const canDelete = roles.includes(Role.ADMIN);
  if (!userId) redirect("/login");

  const [accounts, journals, publishers] = await Promise.all([
    prisma.publisherAccount.findMany({
      where: canManageAccounts
        ? {}
        : {
            tasks: {
              some: {
                status: {
                  notIn: [
                    ResearchTaskStatus.COMPLETED,
                    ResearchTaskStatus.REVOKED,
                  ],
                },
                assignments: { some: { userId } },
              },
            },
          },
      include: {
        journal: true,
        publisher: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.journal.findMany({
      where: { approvalStatus: JournalApprovalStatus.APPROVED },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    prisma.publisher.findMany({
      orderBy: [{ name: "asc" }],
    }),
  ]);

  if (!canManageAccounts && accounts.length === 0) redirect("/401");

  const rows: AccountRow[] = accounts.map((account) => ({
    id: account.id,
    username: account.username,
    password: account.password,
    email: account.email ?? "",
    note: account.note ?? "",
    accountType: account.accountType,
    journalId: account.journalId ?? "",
    journalName: account.journal?.name ?? "",
    publisherId: account.publisherId ?? account.journal?.publisherId ?? "",
    publisher: account.publisher?.name ?? account.journal?.publisher ?? "",
    submissions: account._count.submissions,
  }));

  const publisherWide = accounts.filter(
    (account) => account.accountType === "PUBLISHER",
  ).length;
  const journalOptions = journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    publisher: journal.publisher ?? "",
  }));
  const publisherOptions = publishers.map((publisher) => ({
    id: publisher.id,
    publisherCode: publisher.publisherCode,
    name: publisher.name,
    alias: publisher.alias ?? "",
    country: publisher.country ?? "",
  }));

  const stats = [
    {
      label: "Accounts",
      value: accounts.length,
    },
    {
      label: "Publisher",
      value: publisherWide,
    },
    {
      label: "Journal",
      value: accounts.length - publisherWide,
    },
    {
      label: "Submits",
      value: accounts.reduce(
        (sum, account) => sum + account._count.submissions,
        0,
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-4">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4] ${
                  index > 0 ? "border-l border-[#444444]" : ""
                }`}
              >
                <span className="font-normal text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-none items-center">
            {canManageAccounts && (
              <NewAccountDialog
                journals={journalOptions}
                publishers={publisherOptions}
              />
            )}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <AccountsTable
        rows={rows}
        isAdmin={canDelete}
        deleteAction={deletePublisherAccount}
      />
    </div>
  );
}
