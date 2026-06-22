import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { prisma, Role } from "@repo/db";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { createPublisher, deletePublisher, updatePublisher } from "../actions";
import { PublisherDialog } from "./PublisherDialog";
import { PublishersTable, type PublisherRow } from "./PublishersTable";

export const dynamic = "force-dynamic";

export default async function PublishersPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");

  const publishers = await prisma.publisher.findMany({
    include: {
      _count: { select: { accounts: true } },
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
    journals: publisher.journals.length,
    submissions: publisher.journals.reduce(
      (sum, journal) => sum + journal._count.submissions,
      0,
    ),
    accounts:
      publisher._count.accounts +
      publisher.journals.reduce(
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
          <PublisherDialog mode="create" submitAction={createPublisher} />
        </div>
      </ResearchPageHeaderPortal>
      <PublishersTable
        rows={rows}
        updateAction={updatePublisher}
        deleteAction={deletePublisher}
      />
    </div>
  );
}
