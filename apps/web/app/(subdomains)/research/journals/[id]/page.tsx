import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookmarkCheck,
  Database,
  Globe2,
  Hash,
  Send,
  Star,
} from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { formatMoney } from "@/sites/research/lib/currency";
import { countryFlag, countryName } from "@/sites/research/lib/countries";
import {
  IconHint,
  researchMutedLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  JournalDetailTabs,
  type JournalAccountRow,
  type JournalReviewRow,
  type JournalSubmissionRow,
} from "./JournalDetailTabs";
import { EditJournalDialog } from "./EditJournalDialog";

export const dynamic = "force-dynamic";

function dateText(value: Date | null) {
  return value ? value.toLocaleDateString() : "";
}

export default async function JournalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { id } = await params;
  const { back } = await searchParams;
  const backHref = back?.startsWith("/journals") ? back : "/journals";
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const registrationIdentityValues = [session?.user?.name, session?.user?.email]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);

  const journal = await prisma.journal.findUnique({
    where: { id },
    include: {
      submissions: {
        include: {
          project: {
            include: {
              leadResearcher: true,
              registrationUser: true,
              authors: { orderBy: [{ name: "asc" }, { email: "asc" }] },
              authorEntries: {
                include: { user: true },
                orderBy: [{ position: "asc" }, { createdAt: "asc" }],
              },
            },
          },
          account: { select: { id: true, username: true, email: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
      },
      accounts: {
        include: { _count: { select: { submissions: true } } },
        orderBy: [{ updatedAt: "desc" }],
      },
      reviews: { orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }] },
      _count: { select: { submissions: true, accounts: true, reviews: true } },
    },
  });

  if (!journal) notFound();

  const submissionRows: JournalSubmissionRow[] = journal.submissions.map(
    (submission) => {
      const canViewRegistrationClaim =
        isAdmin ||
        Boolean(userId && submission.project.registrationUserId === userId) ||
        Boolean(
          submission.project.registrationName &&
          registrationIdentityValues.includes(
            submission.project.registrationName.trim().toLowerCase(),
          ),
        );
      const authorNames =
        submission.project.authorEntries.length > 0
          ? submission.project.authorEntries.map(
              (entry) =>
                `${entry.user.name || entry.user.email}${entry.isCorresponding ? "*" : ""}`,
            )
          : submission.project.authors.length > 0
            ? submission.project.authors.map(
                (author, index) =>
                  `${author.name || author.email}${index === 0 ? "*" : ""}`,
              )
            : [
                `${submission.project.leadResearcher.name || submission.project.leadResearcher.email}*`,
                submission.project.coAuthors,
              ].filter(Boolean);

      return {
        id: submission.id,
        code:
          submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
        kind: "journal" as const,
        venueId: journal.id,
        venueName: journal.name,
        metaLine: submission.project.title,
        projectId: submission.project.id,
        projectTitle: submission.project.title,
        projectAuthors: authorNames.join(", "),
        projectStage: submission.project.stage,
        projectClaimStatus: submission.project.claimStatus,
        projectRegisterStatus: submission.project.registerStatus,
        projectRegistration: submission.project.universityRegistration ?? "",
        projectRegisterName:
          submission.project.registrationUser?.name ||
          submission.project.registrationUser?.email ||
          submission.project.registrationName ||
          "",
        canViewRegistrationClaim,
        apc: journal.apc ?? "",
        apcCurrency: journal.apcCurrency,
        submissionFee: journal.submissionFee ?? "",
        submissionFeeCurrency: journal.submissionFeeCurrency,
        accountId: submission.account?.id ?? "",
        account: submission.account?.username ?? "",
        accountEmail: submission.account?.email ?? "",
        status: submission.status,
        submittedAt: submission.submittedAt.toISOString(),
        acceptedAt: submission.acceptedAt?.toISOString() ?? "",
        rejectedAt: submission.rejectedAt?.toISOString() ?? "",
        withdrawnAt: submission.withdrawnAt?.toISOString() ?? "",
        publishedAt: submission.publishedAt?.toISOString() ?? "",
      };
    },
  );

  const accountRows: JournalAccountRow[] = journal.accounts.map((account) => ({
    id: account.id,
    username: account.username,
    password: account.password,
    email: account.email ?? "",
    note: account.note ?? "",
    submissions: account._count.submissions,
  }));

  const reviewRows: JournalReviewRow[] = journal.reviews.map((review) => ({
    id: review.id,
    manuscriptTitle: review.manuscriptTitle,
    manuscriptId: review.manuscriptId ?? "",
    status: review.status,
    recommendation: review.recommendation ?? "",
    requestedAt: dateText(review.requestedAt),
    dueDate: dateText(review.dueDate),
    completedAt: dateText(review.completedAt),
    editorName: review.editorName ?? "",
    reviewRound: review.reviewRound ?? "",
    note: review.note ?? "",
  }));

  const externalLinks = [
    {
      href: journal.homepageLink,
      label: "Open homepage",
      icon: Globe2,
      tone: "border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50",
    },
    {
      href: journal.submissionLink,
      label: "Open submission portal",
      icon: Send,
      tone: "border-sky-100 bg-sky-50 text-sky-600 hover:border-sky-200 hover:bg-sky-100 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50",
    },
    {
      href: journal.scimagoLink,
      label: "Open Scimago profile",
      icon: BarChart3,
      tone: "border-emerald-100 bg-emerald-50 text-emerald-600 hover:border-emerald-200 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50",
    },
    {
      href: journal.scopusLink,
      label: "Open Scopus profile",
      icon: Database,
      tone: "border-violet-100 bg-violet-50 text-violet-600 hover:border-violet-200 hover:bg-violet-100 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50",
    },
  ].filter((item) => Boolean(item.href));
  const journalFields =
    journal.fields.length > 0
      ? journal.fields
      : journal.field
        ? journal.field
            .split(";")
            .map((field) => field.trim())
            .filter(Boolean)
        : [];
  const journalRank =
    journal.type === "LOCAL"
      ? journal.localRank || "No local rank"
      : journal.rank || "No rank";
  const journalTypeLabel =
    journal.type === "LOCAL" ? "Local" : "International";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link
        href={backHref}
        className={`inline-flex items-center gap-2 text-sm ${researchMutedLinkClass}`}
      >
        <ArrowLeft className="h-4 w-4" />
        Journals
      </Link>

      <section className="border border-[#444444] bg-[#2C2C2C] p-5 shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-[#E4E4E4]">
                {journal.name}
              </h1>
              <div className="flex items-center gap-2">
                <IconHint
                  label={
                    journal.isFavorite
                      ? "Favorite journal"
                      : "Not favorite"
                  }
                >
                  <Star
                    className={`h-5 w-5 transition duration-150 ease-out hover:text-[#A8DADC] ${
                      journal.isFavorite
                        ? "fill-amber-200 text-amber-400"
                        : "text-[#777777]"
                    }`}
                    aria-hidden="true"
                  />
                </IconHint>
                <IconHint
                  label={
                    journal.isInterest
                      ? "Journal of interest"
                      : "Not marked as interest"
                  }
                >
                  <BookmarkCheck
                    className={`h-5 w-5 transition duration-150 ease-out hover:text-[#A8DADC] ${
                      journal.isInterest
                        ? "fill-sky-200 text-sky-400"
                        : "text-[#777777]"
                    }`}
                    aria-hidden="true"
                  />
                </IconHint>
              </div>
              <div className="flex items-center gap-1">
                {externalLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href as string}
                    target="_blank"
                    rel="noreferrer"
                    className={`group/icon relative inline-flex h-9 w-9 items-center justify-center rounded-none border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}
                    aria-label={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap border border-[#444444] bg-[#2C2C2C] px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 opacity-0 shadow-lg shadow-slate-900/10 transition duration-200 ease-out group-hover/icon:translate-y-0 group-hover/icon:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
                      {item.label}
                    </span>
                  </a>
                ))}
                <EditJournalDialog
                  journalId={journal.id}
                  journal={{
                    name: journal.name,
                    issn: journal.issn,
                    fields: journalFields,
                    field: journal.field,
                    type: journal.type,
                    rank: journal.rank,
                    localRank: journal.localRank,
                    issuesPerYear: journal.issuesPerYear,
                    isFavorite: journal.isFavorite,
                    isInterest: journal.isInterest,
                    publisher: journal.publisher,
                    country: journal.country,
                    apc: journal.apc,
                    apcCurrency: journal.apcCurrency,
                    submissionFee: journal.submissionFee,
                    submissionFeeCurrency: journal.submissionFeeCurrency,
                    homepageLink: journal.homepageLink,
                    submissionLink: journal.submissionLink,
                    scimagoLink: journal.scimagoLink,
                    scopusLink: journal.scopusLink,
                    note: journal.note,
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-[#B0B0B0]">
              ISSN {journal.issn || "-"} - {journal.publisher || "No publisher"}{" "}
              - {journalTypeLabel} - {journalRank}
              {journal.issuesPerYear
                ? ` - ${journal.issuesPerYear} issues/year`
                : ""}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm md:grid-cols-5">
          <div className="md:col-span-2">
            <dt className="text-xs font-bold uppercase text-slate-400">Area</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {journalFields.length > 0 ? journalFields.join("; ") : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Type</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {journalTypeLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">Rank</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {journalRank}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">
              Issues/year
            </dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {journal.issuesPerYear || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">APC</dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {formatMoney(journal.apc, journal.apcCurrency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">
              Submission Fee
            </dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {formatMoney(
                journal.submissionFee,
                journal.submissionFeeCurrency,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-400">
              Country
            </dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {journal.country ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">
                    {countryFlag(journal.country)}
                  </span>
                  <span>{countryName(journal.country)}</span>
                </span>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div className="md:col-span-5">
            <dt className="text-xs font-bold uppercase text-slate-400">
              <span className="group/note relative inline-flex items-center gap-1">
                <Hash className="h-3.5 w-3.5 text-amber-500" /> Note
                <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap border border-[#444444] bg-[#2C2C2C] px-2.5 py-1.5 text-[11px] font-semibold normal-case tracking-normal text-slate-700 opacity-0 shadow-lg shadow-slate-900/10 transition duration-200 ease-out group-hover/note:translate-y-0 group-hover/note:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
                  Journal note
                </span>
              </span>
            </dt>
            <dd className="mt-1 text-slate-700 dark:text-slate-300">
              {journal.note || "-"}
            </dd>
          </div>
        </dl>
      </section>

      <JournalDetailTabs
        submissions={submissionRows}
        accounts={accountRows}
        reviews={reviewRows}
      />
    </div>
  );
}
