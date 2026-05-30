import { auth } from "../../../../auth";
import { prisma, Role } from "@repo/db";
import { deleteJournal } from "../actions";
import { ProposalDialog } from "../components/ProposalDialog";
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
      orderBy: [{ rank: "asc" }, { name: "asc" }],
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
    rank: journal.rank ?? "",
    publisher: journal.publisher ?? "",
    country: journal.country ?? "",
    apc: journal.apc ?? "",
    apcCurrency: journal.apcCurrency,
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
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Journal List
        </p>
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

      <JournalsTable
        rows={rows}
        isAdmin={isAdmin}
        deleteAction={deleteJournal}
      />
    </div>
  );
}
