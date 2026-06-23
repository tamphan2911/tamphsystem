import { auth } from "../../../../auth";
import { prisma, Role } from "@repo/db";
import { deleteJournal } from "../actions";
import { ProposalDialog } from "@/sites/research/components/ProposalDialog";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { JournalsTable, type JournalRow } from "./JournalsTable";
import { NewJournalDialog } from "./NewJournalDialog";
import {
  accessibleJournalWhere,
  staffJournalAccessWhere,
} from "@/sites/research/lib/venueAccess";
import {
  assignedResearchReviewWhere,
  canAccessAllResearchReviews,
} from "@/sites/research/lib/reviewAccess";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const canDelete = roles.includes(Role.ADMIN);
  const staffAccessWhere = staffJournalAccessWhere(roles);
  const journalWhere = staffAccessWhere
    ? staffAccessWhere
    : userId
      ? accessibleJournalWhere(userId)
      : { id: "__no_access__" };
  const reviewCountWhere = canAccessAllResearchReviews(roles)
    ? {}
    : userId
      ? assignedResearchReviewWhere(userId)
      : { id: "__no_access__" };
  const [journals, currentUser, publishers, duplicateJournals] =
    await Promise.all([
      prisma.journal.findMany({
        where: journalWhere,
        include: {
          submissions: { select: { status: true } },
          _count: {
            select: {
              accounts: true,
              reviews: { where: reviewCountWhere },
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      }),
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
            select: { emailVerified: true, canManageResearchVenues: true },
          })
        : Promise.resolve(null),
      prisma.publisher.findMany({
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          publisherCode: true,
          name: true,
          alias: true,
          country: true,
          usesSingleAccount: true,
        },
      }),
      prisma.journal.findMany({
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, issn: true },
      }),
    ]);

  const activeSubmissionStatuses = new Set([
    "PENDING",
    "UNDER_REVIEW",
    "REVISION",
  ]);
  const publishedSubmissionStatuses = new Set(["ACCEPTED", "PUBLISHED"]);
  const rows: JournalRow[] = journals.map((journal) => ({
    id: journal.id,
    name: journal.name,
    issn: journal.issn ?? "",
    fields:
      journal.fields.length > 0
        ? journal.fields
        : journal.field
          ? journal.field
              .split(";")
              .map((field) => field.trim())
              .filter(Boolean)
          : [],
    type: journal.type,
    rank: journal.rank ?? "",
    localRank: journal.localRank ?? "",
    issuesPerYear: journal.issuesPerYear,
    isFavorite: journal.isFavorite,
    isInterest: journal.isInterest,
    publisher: journal.publisher ?? "",
    country: journal.country ?? "",
    apc: journal.apc ?? "",
    apcCurrency: journal.apcCurrency,
    hasApcOption: journal.hasApcOption,
    approvalStatus: journal.approvalStatus,
    submissionFee: journal.submissionFee ?? "",
    submissionFeeCurrency: journal.submissionFeeCurrency,
    note: journal.note ?? "",
    ongoingSubmissions: journal.submissions.filter((submission) =>
      activeSubmissionStatuses.has(submission.status),
    ).length,
    publishedSubmissions: journal.submissions.filter((submission) =>
      publishedSubmissionStatuses.has(submission.status),
    ).length,
    reviews: journal._count.reviews,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <p className="min-w-0 truncate text-sm font-normal text-[#B0B0B0]">
            JOURNAL LIST
          </p>
          <div className="flex flex-none items-center">
            {isAdmin || currentUser?.canManageResearchVenues ? (
              <NewJournalDialog
                publishers={publishers.map((publisher) => ({
                  ...publisher,
                  alias: publisher.alias ?? "",
                  country: publisher.country ?? "",
                }))}
                duplicateJournals={duplicateJournals}
              />
            ) : (
              <ProposalDialog
                type="JOURNAL"
                isLoggedIn={Boolean(session)}
                hasVerifiedEmail={Boolean(currentUser?.emailVerified)}
              />
            )}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <JournalsTable
        rows={rows}
        isAdmin={canDelete}
        deleteAction={deleteJournal}
      />
    </div>
  );
}
