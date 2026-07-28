import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AtSign, KeyRound, LockKeyhole, Send } from "lucide-react";
import {
  prisma,
  JournalApprovalStatus,
  ResearchTaskStatus,
  Role,
} from "@repo/db";
import { auth } from "../../../../../auth";
import {
  SubmissionsTable,
  type SubmissionRow,
} from "../../projects/[id]/SubmissionsTable";
import { researchLinkClass } from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { displayResearchPersonName } from "@/sites/research/lib/display";
import { canManageAllResearchAccounts } from "@/sites/research/lib/accountAccess";
import { EditAccountDialog } from "./EditAccountDialog";

export const dynamic = "force-dynamic";

type AuthorUser = {
  name: string | null;
  email: string;
};

type ProjectForAuthorLine = {
  coAuthors: string | null;
  leadResearcher: AuthorUser;
  authors: AuthorUser[];
  authorEntries: {
    isCorresponding: boolean;
    user: AuthorUser;
  }[];
};

function authorLine(project: ProjectForAuthorLine) {
  if (project.authorEntries.length > 0) {
    return project.authorEntries
      .map(
        (entry) =>
          `${displayResearchPersonName(entry.user)}${entry.isCorresponding ? "*" : ""}`,
      )
      .join(", ");
  }

  if (project.authors.length > 0) {
    return project.authors
      .map(
        (author, index) =>
          `${displayResearchPersonName(author)}${index === 0 ? "*" : ""}`,
      )
      .join(", ");
  }

  return [
    `${displayResearchPersonName(project.leadResearcher)}*`,
    project.coAuthors,
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!userId) redirect("/login");
  const canManageAccounts = canManageAllResearchAccounts({
    roles,
    email: session?.user?.email,
  });
  const [account, journals, publishers] = await Promise.all([
    prisma.publisherAccount.findUnique({
      where: { id },
      include: {
        journal: true,
        publisher: true,
        submissions: {
          include: {
            journal: true,
            project: {
              include: {
                leadResearcher: true,
                authors: { orderBy: [{ name: "asc" }, { email: "asc" }] },
                authorEntries: {
                  include: { user: true },
                  orderBy: [{ position: "asc" }, { createdAt: "asc" }],
                },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
        },
        tasks: {
          include: {
            project: true,
            assignments: { select: { userId: true } },
          },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    }),
    prisma.journal.findMany({
      where: {
        approvalStatus: { not: JournalApprovalStatus.PENDING_APPROVAL },
      },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, publisher: true },
    }),
    prisma.publisher.findMany({
      orderBy: [{ name: "asc" }],
    }),
  ]);

  if (!account) notFound();
  const hasUnfinishedAssignedTask = account.tasks.some(
    (task) =>
      task.status !== ResearchTaskStatus.COMPLETED &&
      task.status !== ResearchTaskStatus.REVOKED &&
      task.assignments.some((assignment) => assignment.userId === userId),
  );
  if (!canManageAccounts && !hasUnfinishedAssignedTask) redirect("/401");

  const submissionRows: SubmissionRow[] = account.submissions.map(
    (submission) => ({
      id: submission.id,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      kind: "journal",
      venueId: submission.journalId,
      venueName: submission.journal.name,
      metaLine: submission.journal.publisher ?? "",
      projectId: submission.project.id,
      projectTitle: submission.project.title,
      projectAuthors: authorLine(submission.project),
      projectStage: submission.project.stage,
      projectClaimStatus: submission.project.claimStatus,
      projectRegisterStatus: submission.project.registerStatus,
      projectRegistration: submission.project.universityRegistration ?? "",
      canViewRegistrationClaim: false,
      apc: submission.journal.apc ?? "",
      apcCurrency: submission.journal.apcCurrency,
      hasApcOption: submission.journal.hasApcOption,
      submissionFee: submission.journal.submissionFee ?? "",
      submissionFeeCurrency: submission.journal.submissionFeeCurrency,
      accountId: account.id,
      account: account.username,
      accountEmail: account.email ?? "",
      status: submission.status,
      submittedAt: submission.submittedAt.toISOString(),
      acceptedAt: submission.acceptedAt?.toISOString() ?? "",
      rejectedAt: submission.rejectedAt?.toISOString() ?? "",
      withdrawnAt: submission.withdrawnAt?.toISOString() ?? "",
      publishedAt: submission.publishedAt?.toISOString() ?? "",
    }),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#E4E4E4]">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <KeyRound className="h-4 w-4 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
              <span className="min-w-0 truncate font-mono text-sm font-normal">
                {account.username}
              </span>
            </span>
            <span className="text-[#777777]" aria-hidden="true">
              |
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <LockKeyhole className="h-4 w-4 flex-none text-[#A06716] dark:text-[#F4D47A]" />
              <span className="min-w-0 truncate font-mono text-sm font-normal">
                {account.password || "-"}
              </span>
            </span>
            {canManageAccounts && (
              <EditAccountDialog
                account={{
                  id: account.id,
                  username: account.username,
                  password: account.password,
                  email: account.email ?? "",
                  note: account.note ?? "",
                  accountType: account.accountType,
                  publisherId: account.publisherId ?? "",
                  publisherName: account.publisher?.name ?? "",
                  journal: account.journal
                    ? {
                        id: account.journal.id,
                        name: account.journal.name,
                        publisher: account.journal.publisher ?? "",
                      }
                    : null,
                }}
                journals={journals.map((journal) => ({
                  id: journal.id,
                  name: journal.name,
                  publisher: journal.publisher ?? "",
                }))}
                publishers={publishers.map((publisher) => ({
                  id: publisher.id,
                  publisherCode: publisher.publisherCode,
                  name: publisher.name,
                  alias: publisher.alias ?? "",
                  country: publisher.country ?? "",
                }))}
              />
            )}
          </div>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-[#B0B0B0]">
            <AtSign className="h-3.5 w-3.5 flex-none text-[#1F7180] dark:text-[#A8DADC]" />
            <span className="truncate">{account.email || "No email"}</span>
          </p>
        </div>
      </ResearchPageHeaderPortal>

      <section className="space-y-2 border-b border-[#444444] pb-4">
        <p className="text-sm text-[#B0B0B0]">
          {account.journal ? (
            <Link
              href={`/journals/${account.journal.id}`}
              className={researchLinkClass}
            >
              {account.journal.name}
            </Link>
          ) : account.publisher?.name ? (
            `${account.publisher.name} publisher account`
          ) : (
            "Publisher-wide account"
          )}
          {account.journal && (
            <>
              {" "}
              - {account.journal.publisher || "No publisher"} -{" "}
              {account.journal.rank || "No rank"}
            </>
          )}
        </p>
        <p className="text-xs text-[#B0B0B0]">
          Submissions:{" "}
          <span className="text-[#E4E4E4]">{account.submissions.length}</span>
        </p>
        <p className="max-w-3xl text-xs leading-5 text-[#B0B0B0]">
          {account.note || "No note recorded."}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex items-center justify-center text-[#1F7180] dark:text-[#A8DADC]">
            <Send className="h-4 w-4 transition-[color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:scale-110" />
          </span>
          <div>
            <h2 className="text-sm font-normal text-[#E4E4E4]">Submissions</h2>
            <p className="text-xs text-[#B0B0B0]">
              Research records submitted with this account.
            </p>
          </div>
        </div>
        <SubmissionsTable
          rows={submissionRows}
          isAdmin={false}
          actionMode="none"
          view="research"
        />
      </section>
    </div>
  );
}
