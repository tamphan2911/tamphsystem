import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, ExternalLink } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  ResearchChangeLogTable,
  type ResearchChangeLogRow,
} from "@/sites/research/components/ResearchChangeLogTable";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { displayResearchPersonName } from "@/sites/research/lib/display";
import { staffPublisherAccessWhere } from "@/sites/research/lib/venueAccess";

export const dynamic = "force-dynamic";

function displayDate(value: Date | null | undefined) {
  if (!value) return "-";
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function externalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default async function PublisherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const isChiefAssistant = roles.includes(Role.CHIEF_ASSISTANT);
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

  const publisher = await prisma.publisher.findFirst({
    where: { AND: [{ id }, publisherWhere] },
    include: {
      createdBy: { select: { name: true, email: true } },
      accounts: {
        where: { accountType: "PUBLISHER" },
        orderBy: [{ updatedAt: "desc" }],
      },
      journals: {
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
        include: {
          _count: { select: { submissions: true, accounts: true } },
        },
      },
    },
  });

  if (!publisher) notFound();

  const website = externalUrl(publisher.website);
  const canViewChangeLog = isAdmin || isChiefAssistant;
  const changeRows: ResearchChangeLogRow[] = canViewChangeLog
    ? [
        {
          id: "publisher-created",
          changedAt: publisher.createdAt.toISOString(),
          area: "Publisher",
          action: "Created",
          actor: publisher.createdBy
            ? displayResearchPersonName(publisher.createdBy) ||
              publisher.createdBy.email
            : "",
          detail: publisher.name,
        },
        {
          id: "publisher-updated",
          changedAt: publisher.updatedAt.toISOString(),
          area: "Publisher",
          action: "Updated",
          actor: "",
          detail: `${publisher.approvalStatus} | ${publisher.usesSingleAccount ? "Single account" : "Journal accounts"}`,
        },
        ...publisher.journals.map((journal) => ({
          id: `journal-${journal.id}`,
          changedAt: journal.updatedAt.toISOString(),
          area: "Journal",
          action: journal.approvalStatus,
          actor: "",
          detail: journal.name,
        })),
        ...publisher.accounts.map((account) => ({
          id: `publisher-account-${account.id}`,
          changedAt: account.updatedAt.toISOString(),
          area: "Account",
          action: "Updated",
          actor: "",
          detail: account.username,
        })),
      ]
    : [];

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-normal leading-6 text-[#E4E4E4]">
              {publisher.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#B0B0B0]">
              <span>{publisher.publisherCode}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              <span>{publisher.approvalStatus}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              <span>
                {publisher.usesSingleAccount
                  ? "One publisher account"
                  : "Separate journal accounts"}
              </span>
            </p>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        <section className="grid gap-5 border border-[#D8D0C2] bg-[#FFFDF8] p-5 dark:border-[#444444] dark:bg-[#2C2C2C] md:grid-cols-3">
          <div>
            <h2 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              Publisher
            </h2>
            <p className="mt-2 break-words text-sm leading-6 text-[#243047] dark:text-[#E4E4E4]">
              {publisher.alias
                ? `${publisher.name} | ${publisher.alias}`
                : publisher.name}
            </p>
            <p className="mt-1 text-xs text-[#667085] dark:text-[#B0B0B0]">
              {publisher.country || "No country recorded"}
            </p>
          </div>
          <div>
            <h2 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              Usage
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#243047] dark:text-[#E4E4E4]">
              {publisher.journals.length} journals
            </p>
            <p className="text-xs text-[#667085] dark:text-[#B0B0B0]">
              {publisher.journals.reduce(
                (sum, journal) => sum + journal._count.submissions,
                0,
              )}{" "}
              submissions |{" "}
              {publisher.usesSingleAccount
                ? publisher.accounts.length
                : publisher.journals.reduce(
                    (sum, journal) => sum + journal._count.accounts,
                    0,
                  )}{" "}
              accounts
            </p>
          </div>
          <div>
            <h2 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              Updated
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#243047] dark:text-[#E4E4E4]">
              {displayDate(publisher.updatedAt)}
            </p>
            {website ? (
              <Link
                href={website}
                target="_blank"
                rel="noreferrer"
                className="research-allow-transform mt-1 inline-flex items-center gap-1.5 text-xs text-[#1F7180] transition-[color,transform] hover:-translate-y-0.5 hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-cyan-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open website
              </Link>
            ) : (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#667085] dark:text-[#B0B0B0]">
                <Building2 className="h-3.5 w-3.5" />
                No website recorded
              </p>
            )}
          </div>
          <div className="md:col-span-3">
            <h2 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
              Note
            </h2>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#667085] dark:text-[#B0B0B0]">
              {publisher.note || "No note recorded."}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            Journals
          </h2>
          <div className="overflow-hidden border border-[#D8D0C2] bg-[#FFFDF8] dark:border-[#444444] dark:bg-[#2C2C2C]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] table-fixed text-left">
                <thead className="border-b border-[#D8D0C2] bg-[#F7F3EA] text-xs uppercase text-[#667085] dark:border-[#444444] dark:bg-[#383838] dark:text-[#B0B0B0]">
                  <tr>
                    <th className="px-4 py-3">Journal</th>
                    <th className="w-[9rem] px-3 py-3">Status</th>
                    <th className="w-[8rem] px-3 py-3 text-center">Submits</th>
                    <th className="w-[8rem] px-3 py-3 text-center">Accounts</th>
                    <th className="w-[10rem] px-3 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D9CC] dark:divide-[#444444]">
                  {publisher.journals.map((journal) => (
                    <tr
                      key={journal.id}
                      className="align-top transition-colors hover:bg-[#F7F3EA] dark:hover:bg-[#383838]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/journals/${journal.id}`}
                          className="break-words text-sm text-[#1F7180] hover:text-[#155864] dark:text-[#A8DADC] dark:hover:text-cyan-100"
                        >
                          {journal.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#667085] dark:text-[#B0B0B0]">
                        {journal.approvalStatus}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-[#667085] dark:text-[#B0B0B0]">
                        {journal._count.submissions}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-[#667085] dark:text-[#B0B0B0]">
                        {journal._count.accounts}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#667085] dark:text-[#B0B0B0]">
                        {displayDate(journal.updatedAt)}
                      </td>
                    </tr>
                  ))}
                  {publisher.journals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-[#667085] dark:text-[#B0B0B0]"
                      >
                        No journals are linked to this publisher yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {canViewChangeLog ? <ResearchChangeLogTable rows={changeRows} /> : null}
      </div>
    </>
  );
}
