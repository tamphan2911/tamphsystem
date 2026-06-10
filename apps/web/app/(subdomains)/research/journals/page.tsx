import { auth } from "../../../../auth";
import { prisma, Role } from "@repo/db";
import { deleteJournal } from "../actions";
import { ProposalDialog } from "@/sites/research/components/ProposalDialog";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { JournalsTable, type JournalRow } from "./JournalsTable";
import { NewJournalDialog } from "./NewJournalDialog";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const [journals, currentUser] = await Promise.all([
    prisma.journal.findMany({
      include: {
        submissions: { select: { status: true } },
        _count: { select: { accounts: true, reviews: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { emailVerified: true },
        })
      : Promise.resolve(null),
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
            {isAdmin ? (
              <NewJournalDialog />
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
        isAdmin={isAdmin}
        deleteAction={deleteJournal}
      />
    </div>
  );
}
