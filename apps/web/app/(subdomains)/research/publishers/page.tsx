import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { prisma, Role } from "@repo/db";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { staffPublisherAccessWhere } from "@/sites/research/lib/venueAccess";
import {
  approvePublisher,
  createPublisher,
  deletePublisher,
  updatePublisher,
} from "../actions";
import { PublisherDialog } from "./PublisherDialog";
import { PublishersTable, type PublisherRow } from "./PublishersTable";

export const dynamic = "force-dynamic";

export default async function PublishersPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const currentUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { canManageResearchVenues: true },
      })
    : null;
  const publisherWhere = staffPublisherAccessWhere(
    roles,
    userId,
    currentUser?.canManageResearchVenues ?? false,
  );
  if (!publisherWhere) redirect("/401");

  const publishers = await prisma.publisher.findMany({
    where: publisherWhere,
    include: {
      _count: {
        select: {
          accounts: { where: { accountType: "PUBLISHER" } },
        },
      },
      accounts: {
        where: { accountType: "PUBLISHER" },
        orderBy: [{ updatedAt: "desc" }],
        take: 1,
      },
      journals: {
        select: {
          _count: { select: { submissions: true, accounts: true } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
  const rows: PublisherRow[] = publishers.map((publisher) => ({
    id: publisher.id,
    publisherCode: publisher.publisherCode,
    name: publisher.name,
    alias: publisher.alias ?? "",
    country: publisher.country ?? "",
    website: publisher.website ?? "",
    note: publisher.note ?? "",
    usesSingleAccount: publisher.usesSingleAccount,
    approvalStatus: publisher.approvalStatus,
    publisherAccount: publisher.accounts[0]
      ? {
          id: publisher.accounts[0].id,
          username: publisher.accounts[0].username,
          password: publisher.accounts[0].password,
          email: publisher.accounts[0].email ?? "",
          note: publisher.accounts[0].note ?? "",
        }
      : null,
    journals: publisher.journals.length,
    submissions: publisher.journals.reduce(
      (sum, journal) => sum + journal._count.submissions,
      0,
    ),
    accounts: publisher.usesSingleAccount
      ? publisher._count.accounts
      : publisher.journals.reduce(
          (sum, journal) => sum + journal._count.accounts,
          0,
        ),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <p className="truncate text-sm font-normal uppercase text-[#E4E4E4]">
            Publisher List
          </p>
          {isAdmin ? (
            <PublisherDialog mode="create" submitAction={createPublisher} />
          ) : null}
        </div>
      </ResearchPageHeaderPortal>
      <PublishersTable
        rows={rows}
        isAdmin={isAdmin}
        approveAction={approvePublisher}
        updateAction={updatePublisher}
        deleteAction={deletePublisher}
      />
    </div>
  );
}
