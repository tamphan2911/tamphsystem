import { notFound } from "next/navigation";
import {
  BarChart3,
  BookmarkCheck,
  Database,
  Globe2,
  Send,
  Star,
} from "lucide-react";
import { prisma, JournalApprovalStatus, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { CountryFlag } from "@/sites/research/components/CountryFlag";
import { formatMoney } from "@/sites/research/lib/currency";
import { countryName } from "@/sites/research/lib/countries";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  JournalDetailTabs,
  type JournalAccountRow,
  type JournalReviewRow,
  type JournalSubmissionRow,
} from "./JournalDetailTabs";
import { EditJournalDialog } from "./EditJournalDialog";
import {
  EditJournalCreatorButton,
  JournalApprovalToggleButton,
  type JournalCreatorOption,
} from "./JournalApprovalActions";
import {
  accessibleJournalWhere,
  associatedResearchWhere,
  hasUnrestrictedVenueAccess,
} from "@/sites/research/lib/venueAccess";
import { accessibleResearchReviewWhere } from "@/sites/research/lib/reviewAccess";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";

export const dynamic = "force-dynamic";

function dateText(value: Date | null) {
  return value ? researchDateTimeFormat("en-GB").format(value) : "";
}

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const registrationIdentityValues = [session?.user?.name, session?.user?.email]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const isAssistant =
    roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT);
  const canViewAllRegistrationClaims =
    isAdmin || roles.includes(Role.CHIEF_ASSISTANT);
  const unrestrictedAccess = hasUnrestrictedVenueAccess(roles);
  const scopedProjectWhere = userId
    ? associatedResearchWhere(userId, registrationIdentityValues)
    : { id: "__no_access__" };
  const journalAccessWhere = unrestrictedAccess
    ? {}
    : userId
      ? accessibleJournalWhere(userId, registrationIdentityValues)
      : { id: "__no_access__" };

  const [currentUser, journal, creatorUsers] = await Promise.all([
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { canManageResearchVenues: true },
        })
      : Promise.resolve(null),
    prisma.journal.findFirst({
      where: { AND: [{ id }, journalAccessWhere] },
      include: {
      submissions: {
        where: isAdmin ? {} : { project: scopedProjectWhere },
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
        where: isAdmin
          ? {}
          : isAssistant && userId
            ? { tasks: { some: { assignments: { some: { userId } } } } }
            : { id: "__no_access__" },
        include: { _count: { select: { submissions: true } } },
        orderBy: [{ updatedAt: "desc" }],
      },
      reviews: {
        where:
          isAdmin && userId
            ? {}
            : isAssistant && userId
              ? accessibleResearchReviewWhere(roles, userId)
              : { id: "__no_access__" },
        orderBy: [{ updatedAt: "desc" }, { requestedAt: "desc" }],
      },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { submissions: true, accounts: true, reviews: true } },
      },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: {
            OR: [{ activeSites: { has: "research" } }, { roles: { has: Role.ADMIN } }],
          },
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  if (!journal) notFound();
  const approvalPending =
    journal.approvalStatus === JournalApprovalStatus.PENDING_APPROVAL;
  const canEditVenue =
    isAdmin ||
    (approvalPending &&
      Boolean(currentUser?.canManageResearchVenues) &&
      Boolean(userId) &&
      journal.createdById === userId);
  const creatorOptions: JournalCreatorOption[] = creatorUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
  }));

  const submissionRows: JournalSubmissionRow[] = journal.submissions.map(
    (submission) => {
      const canViewRegistrationClaim =
        canViewAllRegistrationClaims ||
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
                `${displayResearchPersonName(entry.user)}${entry.isCorresponding ? "*" : ""}`,
            )
          : submission.project.authors.length > 0
            ? submission.project.authors.map(
                (author, index) =>
                  `${displayResearchPersonName(author)}${index === 0 ? "*" : ""}`,
              )
            : [
                `${displayResearchPersonName(submission.project.leadResearcher)}*`,
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
        articleUrl: submission.articleUrl ?? "",
        articleFileName: submission.articleFileName ?? "",
        articleFileSize: submission.articleFileSize,
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
  const journalTypeLabel = journal.type === "LOCAL" ? "Local" : "International";

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate text-[16px] font-normal leading-6 text-[#E4E4E4] xl:text-[16px]">
                {journal.name}
              </h1>
              {approvalPending ? (
                <span className="flex-none border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  Need approval
                </span>
              ) : null}
              <div className="flex flex-none items-center gap-2">
                <IconHint
                  label={
                    journal.isFavorite ? "Favorite journal" : "Not favorite"
                  }
                  position="bottom"
                >
                  <Star
                    className={`h-4 w-4 transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-[#A8DADC] hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] ${
                      journal.isFavorite ? "text-amber-400" : "text-[#777777]"
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
                  position="bottom"
                >
                  <BookmarkCheck
                    className={`h-4 w-4 transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:text-[#A8DADC] hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] ${
                      journal.isInterest ? "text-sky-400" : "text-[#777777]"
                    }`}
                    aria-hidden="true"
                  />
                </IconHint>
              </div>
              <div className="flex flex-none items-center gap-1">
                {externalLinks.map((item) => (
                  <IconHint
                    key={item.label}
                    label={item.label}
                    position="bottom"
                  >
                    <a
                      href={item.href as string}
                      target="_blank"
                      rel="noreferrer"
                      className="research-clickable-icon research-allow-transform inline-flex h-8 w-8 items-center justify-center rounded-none border-0 bg-transparent text-[#B0B0B0] shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:bg-transparent hover:text-[#A8DADC] hover:shadow-none focus-visible:ring-0"
                      aria-label={item.label}
                    >
                      <item.icon className="h-[15px] w-[15px]" />
                    </a>
                  </IconHint>
                ))}
                {canEditVenue && (
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
                      hasApcOption: journal.hasApcOption,
                      submissionFee: journal.submissionFee,
                      submissionFeeCurrency: journal.submissionFeeCurrency,
                      homepageLink: journal.homepageLink,
                      submissionLink: journal.submissionLink,
                      scimagoLink: journal.scimagoLink,
                      scopusLink: journal.scopusLink,
                      note: journal.note,
                    }}
                  />
                )}
              </div>
            </div>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs font-normal text-[#B0B0B0]">
              <span>ISSN: {journal.issn || "-"}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              <span>{journal.publisher || "No publisher"}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              <span>{journalTypeLabel}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              <span>{journalRank}</span>
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
              {journal.country ? (
                <IconHint label={countryName(journal.country)}>
                  <span className="inline-flex cursor-help items-center gap-1 align-middle transition-[color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:text-[#A8DADC]">
                    <CountryFlag value={journal.country} />
                    <span>{countryName(journal.country)}</span>
                  </span>
                </IconHint>
              ) : (
                "No country"
              )}
            </p>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        <section className="space-y-5 px-1">
          <dl className="grid gap-4 border-t border-[#3A3A3A] pt-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">
                Area
              </dt>
              <dd className="mt-1 space-y-1 text-sm leading-5 text-[#B0B0B0]">
                {journalFields.length > 0
                  ? journalFields.map((field) => (
                      <span key={field} className="block">
                        {field}
                      </span>
                    ))
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">
                APC
              </dt>
              <dd className="mt-1 text-base font-normal text-[#A8DADC]">
                {formatMoney(journal.apc, journal.apcCurrency)}
                {journal.hasApcOption ? " (Option)" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-slate-400">
                Submission Fee
              </dt>
              <dd className="mt-1 text-base font-normal text-[#A8DADC]">
                {formatMoney(
                  journal.submissionFee,
                  journal.submissionFeeCurrency,
                )}
              </dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs font-bold uppercase text-slate-400">
                Note
              </dt>
              <dd className="mt-1 max-w-4xl text-sm leading-5 text-[#B0B0B0]">
                {journal.note || "No note recorded."}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <span>Added by</span>
                {isAdmin ? (
                  <>
                    <EditJournalCreatorButton
                      journalId={journal.id}
                      users={creatorOptions}
                      currentCreatorId={journal.createdById ?? ""}
                    />
                    <JournalApprovalToggleButton
                      journalId={journal.id}
                      journalName={journal.name}
                      approvalStatus={journal.approvalStatus}
                    />
                  </>
                ) : null}
              </dt>
              <dd className="mt-1 space-y-1 text-sm leading-5 text-[#B0B0B0]">
                {journal.createdBy ? (
                  <>
                    <span className="block text-[#E4E4E4]">
                      {displayResearchPersonName(journal.createdBy) ||
                        "Unnamed user"}
                    </span>
                    <span className="block break-all">
                      {displayResearchEmail(journal.createdBy.email)}
                    </span>
                  </>
                ) : (
                  <span className="block">Not recorded.</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <JournalDetailTabs
          submissions={submissionRows}
          accounts={accountRows}
          reviews={reviewRows}
          submissionCount={journal._count.submissions}
          accountCount={journal._count.accounts}
          reviewCount={journal._count.reviews}
          showManagementTabs={isAdmin || isAssistant}
          linkSubmissions={isAdmin}
        />
      </div>
    </>
  );
}
