import Link from "next/link";
import { notFound } from "next/navigation";
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
import { prisma } from "@repo/db";
import {
  SubmissionsTable,
  type SubmissionRow,
} from "../../projects/[id]/SubmissionsTable";

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
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-base font-black text-slate-900 dark:text-slate-100">
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
          `${entry.user.name || entry.user.email}${entry.isCorresponding ? "*" : ""}`,
      )
      .join(", ");
  }

  if (project.authors.length > 0) {
    return project.authors
      .map(
        (author, index) =>
          `${author.name || author.email}${index === 0 ? "*" : ""}`,
      )
      .join(", ");
  }

  return [
    `${project.leadResearcher.name || project.leadResearcher.email}*`,
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
        orderBy: { submittedAt: "desc" },
      },
      tasks: {
        include: { project: true },
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!account) notFound();

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
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Accounts
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
              Site ID: {account.id}
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              <KeyRound className="h-5 w-5 text-amber-500" />
              {account.username}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-mono">{account.password || "-"}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AtSign className="h-3.5 w-3.5 text-sky-500" />
                {account.email || "No email"}
              </span>
            </p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {account.journal ? (
                <Link
                  href={`/journals/${account.journal.id}`}
                  className="font-medium text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
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
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
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
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
            <Send className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              Submissions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
