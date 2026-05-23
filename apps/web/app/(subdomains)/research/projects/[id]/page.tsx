import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  ClipboardCheck,
  Save,
  Send,
  CheckCircle2,
  FileText,
  Rocket,
  SearchCheck,
} from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { updateResearchProject } from "../../actions";
import { SubmissionsTable, type SubmissionRow } from "./SubmissionsTable";
import {
  SuggestedJournalsPanel,
  type SuggestedConferenceOption,
  type SuggestedJournalOption,
  type SuggestedVenueState,
  type TaskAssigneeOption,
} from "./SuggestedJournalsPanel";
import { SaveForm } from "../../components/SaveForm";
import { ResearchFormSelect } from "../../components/ResearchFormSelect";
import {
  AuthorsPicker,
  type AuthorOption,
  type SelectedAuthor,
} from "./AuthorsPicker";
import {
  CreateSubmissionTaskDialog,
  type SubmissionTaskVenueOption,
} from "./CreateSubmissionTaskDialog";
import { ResearchContentLockButton } from "./ResearchContentLockButton";
import { AuthorNotificationActions } from "./AuthorNotificationActions";
import { ResearchTitleField } from "./ResearchTitleField";

export const dynamic = "force-dynamic";

const productionSteps = [
  {
    label: "Idea forming",
    detail: "Define research question and contribution",
  },
  {
    label: "Data collection",
    detail: "Collect, clean, and document data sources",
  },
  { label: "Modeling", detail: "Run analysis, models, robustness checks" },
  { label: "Writing", detail: "Build manuscript structure and core arguments" },
  {
    label: "Humanizing",
    detail: "Refine tone, flow, and academic readability",
  },
  { label: "References", detail: "Verify citations, DOI, format, and links" },
];

const registerOptions = [
  { value: "NOT_REGISTERED", label: "Not registered" },
  { value: "PREPARING", label: "Plan" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "APPROVED", label: "Approved" },
];

const claimOptions = [
  { value: "CANNOT_CLAIM", label: "Cannot claim" },
  { value: "MAKING_DOCUMENT", label: "Making document" },
  { value: "WAITING", label: "Waiting response" },
  { value: "CLAIMED", label: "Claimed" },
];

const stageStyles = {
  PRODUCTION: {
    label: "Production",
    icon: FileText,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200",
  },
  SUBMITTING: {
    label: "Submitting",
    icon: Send,
    className:
      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/40 dark:text-indigo-200",
  },
  REVIEW: {
    label: "Review",
    icon: SearchCheck,
    className:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-200",
  },
  ACCEPTED: {
    label: "Accepted",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  PUBLISHED: {
    label: "Published",
    icon: Rocket,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200",
  },
};

type DisplayStage = keyof typeof stageStyles;

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "";
}

function shortDate(value: Date | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function suggestedSubmissionState(
  status: string,
): SuggestedVenueState["state"] {
  if (status === "PUBLISHED") return "published";
  if (status === "ACCEPTED") return "accepted";
  if (status === "REJECTED") return "rejected";
  if (
    status === "UNDER_REVIEW" ||
    status === "REVISION" ||
    status === "REVIEWING"
  )
    return "reviewing";
  return "submitted";
}

function stageFromJournalSubmissions(
  submissions: { status: string }[],
): DisplayStage {
  if (submissions.some((submission) => submission.status === "PUBLISHED"))
    return "PUBLISHED";
  if (submissions.some((submission) => submission.status === "ACCEPTED"))
    return "ACCEPTED";
  if (
    submissions.some(
      (submission) =>
        submission.status === "UNDER_REVIEW" ||
        submission.status === "REVISION",
    )
  )
    return "REVIEW";
  return "SUBMITTING";
}

function stageFromConferenceSubmissions(
  submissions: { status: string }[],
): DisplayStage {
  if (submissions.some((submission) => submission.status === "PUBLISHED"))
    return "PUBLISHED";
  if (submissions.some((submission) => submission.status === "ACCEPTED"))
    return "ACCEPTED";
  if (submissions.some((submission) => submission.status === "REVIEWING"))
    return "REVIEW";
  return "SUBMITTING";
}

function highlightedSubmissionBoxClass(status: string) {
  if (status === "PUBLISHED") {
    return {
      box: "border-blue-100 bg-blue-50/60 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100",
      meta: "text-blue-700/80 dark:text-blue-200/80",
    };
  }

  return {
    box: "border-emerald-100 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100",
    meta: "text-emerald-700/80 dark:text-emerald-200/80",
  };
}

function displayRole(roles: Role[]) {
  if (roles.includes(Role.ADMIN)) return "Admin";
  if (roles.includes(Role.CHIEF_ASSISTANT)) return "Chief assistant";
  if (roles.includes(Role.ASSISTANT)) return "Assistant";
  if (roles.includes(Role.RESEARCHER)) return "Researcher";
  if (roles.includes(Role.LECTURER)) return "Lecturer";
  return (
    roles[0]
      ?.replace("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "User"
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const [project, journals, conferences, taskAssignees, authorUsers] =
    await Promise.all([
      prisma.researchProject.findUnique({
        where: { id },
        include: {
          submissions: {
            include: { journal: true, account: true },
            orderBy: { submittedAt: "desc" },
          },
          conferenceSubmissions: {
            include: { conference: true },
            orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
          },
          publications: { orderBy: { publishedDate: "desc" } },
          authorNotifications: {
            select: { type: true },
          },
          leadResearcher: true,
          authors: { orderBy: [{ name: "asc" }, { email: "asc" }] },
          authorEntries: {
            include: { user: true },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
          suggestedJournals: {
            include: {
              journal: true,
              createdBy: { select: { name: true, email: true, roles: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          suggestedConferences: {
            include: {
              conference: true,
              createdBy: { select: { name: true, email: true, roles: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          organizedProjectLinks: {
            include: { organizedProject: true },
            orderBy: { createdAt: "desc" },
          },
          tasks: {
            where: {
              taskType: { in: ["SUBMIT_RESEARCH", "SUBMIT_CONFERENCE"] },
            },
            include: {
              journal: true,
              conference: true,
              assignments: {
                include: { user: true },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: [
              { status: "asc" },
              { dueDate: "asc" },
              { createdAt: "desc" },
            ],
          },
        },
      }),
      prisma.journal.findMany({
        include: { accounts: { orderBy: [{ username: "asc" }] } },
        orderBy: [{ rank: "asc" }, { name: "asc" }],
      }),
      prisma.conference.findMany({
        orderBy: [{ startDate: "desc" }, { name: "asc" }],
      }),
      prisma.user.findMany({
        where: {
          roles: {
            hasSome: [Role.ADMIN, Role.ASSISTANT, Role.CHIEF_ASSISTANT],
          },
        },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true, roles: true },
      }),
      prisma.user.findMany({
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true, roles: true },
      }),
    ]);

  if (!project) notFound();

  const updateAction = updateResearchProject.bind(null, project.id);
  const hasJournalSubmissions = project.submissions.length > 0;
  const displayStage: DisplayStage = hasJournalSubmissions
    ? stageFromJournalSubmissions(project.submissions)
    : project.conferenceSubmissions.length > 0
      ? stageFromConferenceSubmissions(project.conferenceSubmissions)
      : project.stage;
  const highlightedJournalSubmission = hasJournalSubmissions
    ? project.submissions.find(
        (submission) =>
          submission.status === "PUBLISHED" || submission.status === "ACCEPTED",
      )
    : undefined;
  const highlightedConferenceSubmission = hasJournalSubmissions
    ? undefined
    : project.conferenceSubmissions.find(
        (submission) =>
          submission.status === "PUBLISHED" || submission.status === "ACCEPTED",
      );
  const highlightedJournalClass = highlightedJournalSubmission
    ? highlightedSubmissionBoxClass(highlightedJournalSubmission.status)
    : undefined;
  const highlightedConferenceClass = highlightedConferenceSubmission
    ? highlightedSubmissionBoxClass(highlightedConferenceSubmission.status)
    : undefined;
  const journalSuccessLocksResearch = project.submissions.some(
    (submission) =>
      submission.status === "PUBLISHED" || submission.status === "ACCEPTED",
  );
  const researchContentLocked =
    journalSuccessLocksResearch && !project.contentUnlocked;
  const authorNames =
    project.authorEntries.length > 0
      ? project.authorEntries.map(
          (entry) =>
            `${entry.user.name || entry.user.email}${entry.isCorresponding ? "*" : ""}`,
        )
      : project.authors.length > 0
        ? project.authors.map(
            (author, index) =>
              `${author.name || author.email}${index === 0 ? "*" : ""}`,
          )
        : [
            `${project.leadResearcher.name || project.leadResearcher.email}*`,
            project.coAuthors,
          ].filter(Boolean);
  const authorsLine = authorNames.join(", ");
  const completedProductionSteps = new Set(project.completedProductionSteps);
  const unfinishedSteps = productionSteps.filter(
    (step) => !completedProductionSteps.has(step.label),
  );
  const productionComplete = unfinishedSteps.length === 0;
  const successfulJournalSubmission = project.submissions.find(
    (submission) =>
      submission.status === "PUBLISHED" || submission.status === "ACCEPTED",
  );
  const journalSuccessState = successfulJournalSubmission
    ? suggestedSubmissionState(successfulJournalSubmission.status)
    : null;
  const activeSubmitTasks = project.tasks.filter(
    (task) => task.status !== "COMPLETED" && task.status !== "REVOKED",
  );
  const suggestedJournalState = (journalId: string): SuggestedVenueState => {
    const submission = project.submissions.find(
      (item) => item.journalId === journalId,
    );
    const task = activeSubmitTasks.find(
      (item) =>
        item.taskType === "SUBMIT_RESEARCH" && item.journalId === journalId,
    );
    if (submission) {
      return {
        state: suggestedSubmissionState(submission.status),
        publishedAt: isoDate(submission.publishedAt),
      };
    }
    if (task) return { state: "assigned" };
    if (journalSuccessState) return { state: "blocked" };
    return { state: "idle" };
  };
  const suggestedConferenceState = (
    conferenceId: string,
  ): SuggestedVenueState => {
    const submission = project.conferenceSubmissions.find(
      (item) => item.conferenceId === conferenceId,
    );
    const task = activeSubmitTasks.find(
      (item) =>
        item.taskType === "SUBMIT_CONFERENCE" &&
        item.conferenceId === conferenceId,
    );
    if (submission) {
      return {
        state: suggestedSubmissionState(submission.status),
        publishedAt: isoDate(submission.publishedAt),
      };
    }
    if (task) return { state: "assigned" };
    if (journalSuccessState) return { state: "blocked" };
    return { state: "idle" };
  };
  const allJournalOptions: SuggestedJournalOption[] = journals.map(
    (journal) => ({
      id: journal.id,
      name: journal.name,
      issn: journal.issn ?? "",
      field: journal.field ?? "",
      rank: journal.rank ?? "",
      publisher: journal.publisher ?? "",
      apc: journal.apc ?? "",
    }),
  );
  const suggestedJournalOptions: SuggestedJournalOption[] =
    project.suggestedJournals.map(({ journal, createdBy }) => ({
      id: journal.id,
      name: journal.name,
      issn: journal.issn ?? "",
      field: journal.field ?? "",
      rank: journal.rank ?? "",
      publisher: journal.publisher ?? "",
      apc: journal.apc ?? "",
      suggestedByName: createdBy?.name || createdBy?.email || "Unknown user",
      suggestedByRole: createdBy
        ? displayRole(createdBy.roles)
        : "Unknown role",
      venueState: suggestedJournalState(journal.id),
    }));
  const allConferenceOptions: SuggestedConferenceOption[] = conferences.map(
    (conference) => ({
      id: conference.id,
      name: conference.name,
      type: conference.type ?? "",
      theme: conference.targetTheme || conference.themes || "",
      location: conference.location ?? "",
      organizer: conference.organizer ?? "",
      isbn: conference.isbn ?? "",
      time: [
        conference.startDate?.toLocaleDateString(),
        conference.endDate?.toLocaleDateString(),
      ]
        .filter(Boolean)
        .join(" - "),
    }),
  );
  const suggestedConferenceOptions: SuggestedConferenceOption[] =
    project.suggestedConferences.map(({ conference, createdBy }) => ({
      id: conference.id,
      name: conference.name,
      type: conference.type ?? "",
      theme: conference.targetTheme || conference.themes || "",
      location: conference.location ?? "",
      organizer: conference.organizer ?? "",
      time: [
        conference.startDate?.toLocaleDateString(),
        conference.endDate?.toLocaleDateString(),
      ]
        .filter(Boolean)
        .join(" - "),
      suggestedByName: createdBy?.name || createdBy?.email || "Unknown user",
      suggestedByRole: createdBy
        ? displayRole(createdBy.roles)
        : "Unknown role",
      venueState: suggestedConferenceState(conference.id),
    }));
  const taskAssigneeOptions: TaskAssigneeOption[] = taskAssignees.map(
    (user) => ({
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      roles: user.roles,
    }),
  );
  const authorOptions: AuthorOption[] = authorUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    role: displayRole(user.roles),
  }));
  const defaultAuthors: SelectedAuthor[] =
    project.authorEntries.length > 0
      ? project.authorEntries.map((entry) => ({
          id: entry.user.id,
          name: entry.user.name ?? "",
          email: entry.user.email,
          role: displayRole(entry.user.roles),
          isCorresponding: entry.isCorresponding,
        }))
      : project.authors.length > 0
        ? project.authors.map((author, index) => ({
            id: author.id,
            name: author.name ?? "",
            email: author.email,
            role: displayRole(author.roles),
            isCorresponding: index === 0,
          }))
        : [
            {
              id: project.leadResearcher.id,
              name: project.leadResearcher.name ?? "",
              email: project.leadResearcher.email,
              role: displayRole(project.leadResearcher.roles),
              isCorresponding: true,
            },
          ];
  const venueOptions: SubmissionTaskVenueOption[] = [
    ...journals.map((journal) => ({
      kind: "journal" as const,
      id: journal.id,
      name: journal.name,
      issn: journal.issn ?? "",
      publisher: journal.publisher ?? "",
      rank: journal.rank ?? "",
      accounts: journal.accounts.map((account) => ({
        id: account.id,
        journalId: account.journalId ?? "",
        username: account.username,
        email: account.email ?? "",
      })),
    })),
    ...conferences.map((conference) => ({
      kind: "conference" as const,
      id: conference.id,
      name: conference.name,
      isbn: conference.isbn ?? "",
      organizer: conference.organizer ?? "",
      type: conference.type ?? "",
      location: conference.location ?? "",
      time: [
        conference.startDate?.toISOString(),
        conference.endDate?.toISOString(),
      ]
        .filter(Boolean)
        .join(" - "),
    })),
  ];
  const submissionRows: SubmissionRow[] = [
    ...project.submissions.map((submission) => ({
      id: submission.id,
      kind: "journal" as const,
      venueId: submission.journalId,
      venueName: submission.journal.name,
      metaLine: `${submission.journal.publisher || "No publisher"} - ${submission.journal.rank || "No rank"}`,
      apc: submission.journal.apc ?? "",
      apcCurrency: submission.journal.apcCurrency,
      submissionFee: submission.journal.submissionFee ?? "",
      submissionFeeCurrency: submission.journal.submissionFeeCurrency,
      account: submission.account?.username ?? "",
      status: submission.status,
      submittedAt: isoDate(submission.submittedAt),
      acceptedAt: isoDate(submission.acceptedAt),
      rejectedAt: isoDate(submission.rejectedAt),
      publishedAt: isoDate(submission.publishedAt),
    })),
    ...project.conferenceSubmissions.map((submission) => ({
      id: submission.id,
      kind: "conference" as const,
      venueId: submission.conferenceId,
      venueName: submission.conference.name,
      metaLine: [
        submission.conference.organizer || "No organizer",
        submission.conference.type || "No type",
        submission.conference.location || "No location",
        [
          shortDate(submission.conference.startDate),
          shortDate(submission.conference.endDate),
        ]
          .filter(Boolean)
          .join(" - "),
      ]
        .filter(Boolean)
        .join(" - "),
      apc: submission.conference.apc ?? "",
      apcCurrency: submission.conference.apcCurrency,
      submissionFee: submission.conference.submissionFee ?? "",
      submissionFeeCurrency: submission.conference.submissionFeeCurrency,
      account: "",
      status: submission.status,
      submittedAt: isoDate(submission.submittedAt ?? submission.createdAt),
      acceptedAt: isoDate(submission.acceptedAt),
      rejectedAt: isoDate(submission.rejectedAt),
      publishedAt: isoDate(submission.publishedAt),
    })),
  ].sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  const openSubmissionTasks = project.tasks.filter(
    (task) => task.status !== "COMPLETED",
  );
  const stageStyle = stageStyles[displayStage];
  const StageIcon = stageStyle.icon;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="min-w-0">
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <h1 className="min-w-0 text-xl font-bold leading-8 tracking-tight text-slate-950 dark:text-white">
            {project.title}
            {project.researchCode && (
              <span className="ml-2 align-baseline text-sm font-semibold text-slate-500 dark:text-slate-400">
                (ID: {project.researchCode})
              </span>
            )}
          </h1>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row xl:justify-end">
            <div
              className={`inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold shadow-sm transition sm:w-[11.5rem] ${stageStyle.className}`}
            >
              <StageIcon className="h-4 w-4 flex-none" />
              <span className="truncate">{stageStyle.label}</span>
            </div>
            <button
              type="submit"
              form="research-detail-form"
              disabled={researchContentLocked}
              title={
                researchContentLocked
                  ? "Research content is locked after journal acceptance or publication"
                  : "Save research changes"
              }
              className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 shadow-sm shadow-emerald-900/5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:bg-slate-100 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200 dark:shadow-black/20 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/60 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-500 sm:w-[11.5rem]"
            >
              <Save className="h-4 w-4 flex-none" />
              Save changes
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>Authors: {authorsLine}</p>
          {highlightedJournalSubmission && highlightedJournalClass && (
            <div
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${highlightedJournalClass.box}`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p>
                  {highlightedJournalSubmission.journal.name} -{" "}
                  {highlightedJournalSubmission.journal.publisher ||
                    "No publisher"}{" "}
                  - ISSN {highlightedJournalSubmission.journal.issn || "-"} -{" "}
                  {highlightedJournalSubmission.journal.rank || "No rank"}
                </p>
                <p className={`text-xs ${highlightedJournalClass.meta}`}>
                  Submitted:{" "}
                  {shortDate(highlightedJournalSubmission.submittedAt)}
                  {highlightedJournalSubmission.acceptedAt
                    ? ` - Accepted: ${shortDate(highlightedJournalSubmission.acceptedAt)}`
                    : ""}
                  {highlightedJournalSubmission.publishedAt
                    ? ` - Published: ${shortDate(highlightedJournalSubmission.publishedAt)}`
                    : ""}
                </p>
              </div>
              {isAdmin && (
                <ResearchContentLockButton
                  projectId={project.id}
                  locked={researchContentLocked}
                />
              )}
            </div>
          )}
          {highlightedConferenceSubmission && highlightedConferenceClass && (
            <div
              className={`space-y-1 rounded-xl border px-3 py-2 ${highlightedConferenceClass.box}`}
            >
              <p>
                {highlightedConferenceSubmission.conference.name} -{" "}
                {highlightedConferenceSubmission.conference.organizer ||
                  "No organizer"}{" "}
                - {highlightedConferenceSubmission.conference.type || "No type"}{" "}
                -{" "}
                {highlightedConferenceSubmission.conference.location ||
                  "No location"}
              </p>
              <p className={`text-xs ${highlightedConferenceClass.meta}`}>
                Submitted:{" "}
                {shortDate(highlightedConferenceSubmission.submittedAt)}
                {highlightedConferenceSubmission.acceptedAt
                  ? ` - Accepted: ${shortDate(highlightedConferenceSubmission.acceptedAt)}`
                  : ""}
                {highlightedConferenceSubmission.publishedAt
                  ? ` - Published: ${shortDate(highlightedConferenceSubmission.publishedAt)}`
                  : ""}
              </p>
            </div>
          )}
          {displayStage === "PRODUCTION" && (
            <p>
              Not finished:{" "}
              {unfinishedSteps.length > 0
                ? unfinishedSteps.map((step) => step.label).join(", ")
                : "All production stages checked"}
            </p>
          )}
        </div>
      </div>

      {project.organizedProjectLinks.length > 0 && (
        <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20">
          <h2 className="flex items-center gap-2 text-sm font-bold text-blue-900 dark:text-blue-100">
            <Building2 className="h-4 w-4" />
            Used as project result
          </h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {project.organizedProjectLinks.map(({ organizedProject }) => (
              <Link
                key={organizedProject.id}
                href="/organized-projects"
                className="rounded-lg border border-blue-100 bg-white/80 px-3 py-2 transition hover:border-blue-300 hover:bg-white dark:border-blue-900/60 dark:bg-slate-900/70 dark:hover:border-blue-700"
              >
                <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {organizedProject.title}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {organizedProject.organizer || "No organizer"} -{" "}
                  {organizedProject.status}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <SaveForm
        id="research-detail-form"
        action={updateAction}
        className="grid gap-6 xl:grid-cols-[1fr_22rem]"
      >
        <fieldset disabled={researchContentLocked} className="contents">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-5">
              <section className="grid gap-4">
                <ResearchTitleField
                  defaultValue={project.title}
                  notes={project.abstract ?? ""}
                />
                <AuthorsPicker
                  users={authorOptions}
                  defaultAuthors={defaultAuthors}
                  disabled={researchContentLocked}
                  headerActions={
                    isAdmin ? (
                      <AuthorNotificationActions
                        projectId={project.id}
                        sentTypes={project.authorNotifications.map(
                          (notification) => notification.type,
                        )}
                      />
                    ) : null
                  }
                />
              </section>

              <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
                <h2 className="mb-4 text-base font-bold text-slate-950 dark:text-white">
                  Registration and claim
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Registration period
                    <input
                      name="universityRegistration"
                      defaultValue={project.universityRegistration ?? ""}
                      placeholder="Q1 2026"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Register name
                    <input
                      name="registrationName"
                      defaultValue={project.registrationName ?? ""}
                      placeholder="Person name"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Register
                    <ResearchFormSelect
                      name="registerStatus"
                      defaultValue={project.registerStatus}
                      options={registerOptions}
                      ariaLabel="Registration status"
                      disabled={researchContentLocked}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Claim status
                    <ResearchFormSelect
                      name="claimStatus"
                      defaultValue={project.claimStatus}
                      options={claimOptions}
                      ariaLabel="Claim status"
                      disabled={researchContentLocked}
                    />
                  </label>
                </div>
              </section>
            </div>
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
              <ClipboardCheck className="h-4 w-4 text-emerald-500" />
              Production timeline
            </h2>
            <div className="relative space-y-1">
              <div className="absolute bottom-5 left-[0.78rem] top-5 w-px bg-slate-200 dark:bg-slate-700" />
              {productionSteps.map((step) => {
                const active = completedProductionSteps.has(step.label);
                return (
                  <label
                    key={step.label}
                    className="relative flex cursor-pointer gap-3 pb-4 last:pb-0"
                  >
                    <input
                      type="checkbox"
                      name="completedProductionSteps"
                      value={step.label}
                      defaultChecked={active}
                      className="z-10 mt-1 h-5 w-5 cursor-pointer rounded-full border-slate-300 bg-white text-emerald-600 accent-emerald-600 shadow-sm transition focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <span>
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                        {step.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {step.detail}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </aside>
        </fieldset>
      </SaveForm>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950 dark:text-white">
            <Send className="h-5 w-5 text-blue-500" />
            Submissions
          </h2>
          {isAdmin ? (
            <CreateSubmissionTaskDialog
              projectId={project.id}
              projectTitle={project.title}
              venues={venueOptions}
              assistants={taskAssigneeOptions}
              disabled={researchContentLocked}
              productionComplete={productionComplete}
            />
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
              <p className="font-semibold">
                Submissions are updated from assigned tasks.
              </p>
              <p className="mt-1 text-blue-800/80 dark:text-blue-200/80">
                When an assigned submission task is marked finished, this table
                and related journal/account views update automatically.
              </p>
            </div>
          )}
        </div>
        {openSubmissionTasks.length > 0 && (
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Active submission tasks
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {openSubmissionTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-sm dark:border-slate-800 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                >
                  <span className="block font-semibold text-slate-800 dark:text-slate-100">
                    {task.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {task.journal?.name || task.conference?.name || "No venue"}{" "}
                    - {task.status.replace("_", " ")} -{" "}
                    {task.assignments
                      .map(
                        (assignment) =>
                          assignment.user.name || assignment.user.email,
                      )
                      .join(", ")}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
        <SubmissionsTable
          rows={submissionRows}
          isAdmin={isAdmin}
          disabled={researchContentLocked}
        />
      </section>
      <SuggestedJournalsPanel
        projectId={project.id}
        journals={allJournalOptions}
        suggested={suggestedJournalOptions}
        conferences={allConferenceOptions}
        suggestedConferences={suggestedConferenceOptions}
        isAdmin={isAdmin}
        disabled={researchContentLocked}
      />
    </div>
  );
}
