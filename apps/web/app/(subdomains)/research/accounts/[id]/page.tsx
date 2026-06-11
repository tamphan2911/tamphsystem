import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  ClipboardList,
  KeyRound,
  LockKeyhole,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import {
  SubmissionsTable,
  type SubmissionRow,
} from "../../projects/[id]/SubmissionsTable";
import {
  researchLinkClass,
  researchMutedLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { displayResearchPersonName } from "@/sites/research/lib/display";

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

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#444444] bg-[#242424] px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#5a5a5a] hover:bg-[#292929] hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#777777]">
        <span className="flex h-7 w-7 items-center justify-center rounded-none bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-base font-semibold text-[#E4E4E4]">
        {value || "-"}
      </p>
    </div>
  );
}

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
  const isAdmin = roles.includes(Role.ADMIN);
  const account = await prisma.publisherAccount.findUnique({
    where: { id },
    include: {
      journal: true,
      submissions: {
        include: {
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
  });

  if (!account) notFound();
  const hasUnfinishedAssignedTask = account.tasks.some(
    (task) =>
      task.status !== ResearchTaskStatus.COMPLETED &&
      task.status !== ResearchTaskStatus.REVOKED &&
      task.assignments.some((assignment) => assignment.userId === userId),
  );
  if (!isAdmin && !hasUnfinishedAssignedTask) redirect("/401");

  const submissionRows: SubmissionRow[] = account.submissions.map(
    (submission) => ({
      id: submission.id,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      kind: "journal",
      venueId: account.journalId ?? submission.journalId,
      venueName: account.journal?.name ?? "Journal not recorded",
      metaLine: account.journal?.publisher ?? "",
      projectId: submission.project.id,
      projectTitle: submission.project.title,
      projectAuthors: authorLine(submission.project),
      projectStage: submission.project.stage,
      projectClaimStatus: submission.project.claimStatus,
      projectRegisterStatus: submission.project.registerStatus,
      projectRegistration: submission.project.universityRegistration ?? "",
      canViewRegistrationClaim: false,
      apc: account.journal?.apc ?? "",
      apcCurrency: account.journal?.apcCurrency ?? "USD",
      submissionFee: account.journal?.submissionFee ?? "",
      submissionFeeCurrency: account.journal?.submissionFeeCurrency ?? "USD",
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
    <div className="mx-auto max-w-6xl space-y-4">
      <Link
        href="/accounts"
        className={`inline-flex items-center gap-2 text-sm ${researchMutedLinkClass}`}
      >
        <ArrowLeft className="h-4 w-4" />
        Accounts
      </Link>

      <section className="border border-[#444444] bg-[#2C2C2C] p-5 shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
              Site ID: {account.id}
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-normal tracking-tight text-[#E4E4E4]">
              <KeyRound className="h-5 w-5 text-amber-500" />
              {account.username}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#B0B0B0]">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-mono">{account.password || "-"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5 text-sky-500" />
                {account.email || "No email"}
              </span>
            </p>
            <p className="mt-3 text-sm text-[#B0B0B0]">
              {account.journal ? (
                <Link
                  href={`/journals/${account.journal.id}`}
                  className={researchLinkClass}
                >
                  {account.journal.name}
                </Link>
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
            <p className="mt-2 max-w-3xl text-xs leading-5 text-[#B0B0B0]">
              {account.note || "No note recorded."}
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 lg:w-[24rem]">
            <InfoTile
              icon={Send}
              label="Submissions"
              value={String(account.submissions.length)}
            />
            <InfoTile
              icon={ClipboardList}
              label="Tasks"
              value={String(account.tasks.length)}
            />
            <InfoTile
              icon={ShieldCheck}
              label="Scope"
              value={account.journal ? "Journal" : "Publisher"}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-none bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
            <Send className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-[#E4E4E4]">Submissions</h2>
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
