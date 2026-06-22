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
import { displayResearchPersonName } from "@/sites/research/lib/display";
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

function externalUrl(
  value: string | null | undefined,
  fallbackOrigin?: string,
) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const candidate =
    trimmed.startsWith("/") && fallbackOrigin
      ? `${fallbackOrigin}${trimmed}`
      : /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function creatorRole(roles: Role[]) {
  if (roles.includes(Role.ADMIN)) return "Admin";
  if (roles.includes(Role.CHIEF_ASSISTANT)) return "Chief assistant";
  if (roles.includes(Role.ASSISTANT)) return "Assistant";
  if (roles.includes(Role.RESEARCHER)) return "Researcher";
  if (roles.includes(Role.LECTURER)) return "Lecturer";
  if (roles.includes(Role.MODERATOR)) return "Moderator";
  if (roles.includes(Role.STUDENT)) return "Student";
  return "User";
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

  const [currentUser, journal, creatorUsers, publishers] = await Promise.all([
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
        createdBy: {
          select: { id: true, name: true, email: true, roles: true },
        },
        _count: {
          select: { submissions: true, accounts: true, reviews: true },
        },
      },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: {
            OR: [
              { activeSites: { has: "research" } },
              { roles: { has: Role.ADMIN } },
            ],
          },
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    prisma.publisher.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        publisherCode: true,
        name: true,
        alias: true,
        country: true,
      },
    }),
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
      href: externalUrl(journal.homepageLink),
      label: "Open homepage",
      missingLabel: "Homepage link not recorded",
      icon: Globe2,
      tone: "text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200",
    },
    {
      href: externalUrl(journal.submissionLink),
      label: "Open submission portal",
      missingLabel: "Submission portal link not recorded",
      icon: Send,
      tone: "text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200",
    },
    {
      href: externalUrl(journal.scimagoLink, "https://www.scimagojr.com"),
      label: "Open Scimago profile",
      missingLabel: "Scimago link not recorded",
      icon: BarChart3,
      tone: "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200",
    },
    {
      href: externalUrl(journal.scopusLink, "https://www.scopus.com"),
      label: "Open Scopus profile",
      missingLabel: "Scopus link not recorded",
      icon: Database,
      tone: "text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
    },
  ];
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
              <div className="flex flex-none items-center gap-1">
                {externalLinks.map((item) => {
                  const iconClass = "h-[15px] w-[15px]";
                  const controlClass =
                    "research-clickable-icon research-allow-transform inline-flex h-8 w-8 items-center justify-center rounded-none border-0 bg-transparent shadow-none outline-none transition-[color,transform] duration-200 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95";

                  return (
                    <IconHint
                      key={item.label}
                      label={item.href ? item.label : item.missingLabel}
                      position="bottom"
                    >
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className={`${controlClass} ${item.tone}`}
                          aria-label={item.label}
                        >
                          <item.icon className={iconClass} />
                        </a>
                      ) : (
                        <span
                          className="inline-flex h-8 w-8 cursor-default items-center justify-center border-0 bg-transparent text-slate-400 shadow-none dark:text-[#666666]"
                          aria-disabled="true"
                        >
                          <item.icon className={iconClass} />
                        </span>
                      )}
                    </IconHint>
                  );
                })}
                {canEditVenue && (
                  <EditJournalDialog
                    journalId={journal.id}
                    publishers={publishers.map((publisher) => ({
                      ...publisher,
                      alias: publisher.alias ?? "",
                      country: publisher.country ?? "",
                    }))}
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
                      publisherId: journal.publisherId,
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
          <dl className="grid gap-4 text-sm md:grid-cols-3">
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
            <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
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
              <div className="grid gap-2">
                <div
                  className={`flex min-w-0 items-center gap-3 border p-3 ${
                    journal.isFavorite
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300"
                      : "border-slate-200 bg-white text-slate-400 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#666666]"
                  }`}
                >
                  <Star className="h-4 w-4 flex-none" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">
                      Favorite journal
                    </span>
                    <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                      {journal.isFavorite
                        ? "Marked as a preferred venue."
                        : "Not marked as preferred."}
                    </span>
                  </span>
                </div>
                <div
                  className={`flex min-w-0 items-center gap-3 border p-3 ${
                    journal.isInterest
                      ? "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-500/50 dark:bg-cyan-500/10 dark:text-cyan-300"
                      : "border-slate-200 bg-white text-slate-400 dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#666666]"
                  }`}
                >
                  <BookmarkCheck
                    className="h-4 w-4 flex-none"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">
                      Journal of interest
                    </span>
                    <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                      {journal.isInterest
                        ? "Tracked for future submissions."
                        : "Not tracked for future use."}
                    </span>
                  </span>
                </div>
              </div>
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
              <dd className="mt-1 text-sm leading-5 text-[#B0B0B0]">
                {journal.createdBy ? (
                  <span className="flex flex-wrap items-center gap-2 text-[#E4E4E4]">
                    <span>
                      {displayResearchPersonName(journal.createdBy) ||
                        "Unnamed user"}
                    </span>
                    <span className="text-[#777777]" aria-hidden="true">
                      |
                    </span>
                    <span>{creatorRole(journal.createdBy.roles)}</span>
                  </span>
                ) : (
                  <span className="block">Not recorded.</span>
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
