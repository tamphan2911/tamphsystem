import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  Download,
  ExternalLink,
  FolderOpen,
  ListTodo,
  Send,
  CheckCircle2,
  FileText,
  Mail,
  Rocket,
  SearchCheck,
} from "lucide-react";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { updateResearchProject } from "../../actions";
import { SubmissionsTable, type SubmissionRow } from "./SubmissionsTable";
import {
  ActiveResearchTasksTable,
  type ActiveResearchTaskRow,
} from "./ActiveResearchTasksTable";
import {
  SuggestedJournalsPanel,
  type SuggestedConferenceOption,
  type SuggestedJournalOption,
  type SuggestedVenueState,
  type TaskAssigneeOption,
} from "./SuggestedJournalsPanel";
import { SaveForm } from "@/sites/research/components/SaveForm";
import { type AuthorOption, type SelectedAuthor } from "./AuthorsPicker";
import {
  CreateSubmissionTaskDialog,
  type SubmissionTaskVenueOption,
} from "./CreateSubmissionTaskDialog";
import {
  NewTaskDialog,
  type TaskAccountOption as GeneralTaskAccountOption,
  type TaskResearchOption as GeneralTaskResearchOption,
  type TaskVenueOption as GeneralTaskVenueOption,
} from "../../tasks/NewTaskDialog";
import { ResearchContentLockButton } from "./ResearchContentLockButton";
import { ResearchAuthorsLockButton } from "./ResearchAuthorsLockButton";
import { ProductionTimelineActions } from "./ProductionTimelineActions";
import { AuthorNotificationActions } from "./AuthorNotificationActions";
import {
  ResearchAuthorsEditDialog,
  ResearchBasicEditDialog,
} from "./ResearchDetailEditDialogs";
import { ResearchDetailSection } from "@/sites/research/components/ResearchDetailSection";
import {
  IconHint,
  researchLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

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
  { value: "WAITING_PUBLISH", label: "Waiting publish" },
  { value: "MAKING_DOCUMENT", label: "Making document" },
  { value: "WAITING", label: "Waiting response" },
  { value: "CLAIMED", label: "Claimed" },
];

const stageStyles = {
  PRODUCTION: {
    label: "Production",
    icon: FileText,
    className: "text-[#FFC1CC]",
  },
  SUBMITTING: {
    label: "Submitting",
    icon: Send,
    className: "text-[#B39CD0]",
  },
  REVIEW: {
    label: "Review",
    icon: SearchCheck,
    className: "text-[#B39CD0]",
  },
  ACCEPTED: {
    label: "Accepted",
    icon: CheckCircle2,
    className: "text-[#A8DADC]",
  },
  PUBLISHED: {
    label: "Published",
    icon: Rocket,
    className: "text-[#A8DADC]",
  },
};

type DisplayStage = keyof typeof stageStyles;

function isoDate(value: Date | null | undefined) {
  return value ? value.toISOString() : "";
}

function sentAuthorEmail(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    !("email" in value) ||
    !("status" in value) ||
    typeof value.email !== "string" ||
    value.status !== "sent"
  ) {
    return null;
  }

  return value.email.toLowerCase();
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
  if (status === "WITHDRAWN") return "withdrawn";
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
      box: "border-[#444444] bg-[#2C2C2C] text-[#E4E4E4]",
      meta: "text-[#B0B0B0]",
    };
  }

  return {
    box: "border-[#444444] bg-[#2C2C2C] text-[#E4E4E4]",
    meta: "text-[#B0B0B0]",
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

function registerLabel(status: string) {
  if (status === "PREPARING") return "Plan";
  if (status === "SUBMITTED") return "Submitted";
  if (status === "APPROVED") return "Approved";
  return "Not registered";
}

function claimLabel(status: string) {
  if (status === "CANNOT_CLAIM") return "Cannot claim";
  if (status === "WAITING_PUBLISH") return "Waiting publish";
  if (status === "MAKING_DOCUMENT") return "Making document";
  if (status === "WAITING") return "Waiting response";
  if (status === "CLAIMED") return "Claimed";
  return status.replaceAll("_", " ");
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) redirect("/login");
  const registrationIdentityValues = [session.user?.name, session.user?.email]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  const roles =
    currentUser?.roles ??
    (((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[]);
  const isRootAdmin = roles.includes(Role.ADMIN);
  const isChiefAssistant = roles.includes(Role.CHIEF_ASSISTANT);
  const isAdmin = isRootAdmin || isChiefAssistant;
  const taskAssigneeWhere = isRootAdmin
    ? { activeSites: { has: "research" } }
    : {
        activeSites: { has: "research" },
        roles: { has: Role.ASSISTANT },
        NOT: { id: userId },
      };
  const [
    project,
    journals,
    conferences,
    taskAssignees,
    authorUsers,
    fundingInstitutions,
  ] = await Promise.all([
    prisma.researchProject.findUnique({
      where: { id },
      include: {
        submissions: {
          include: { journal: true, account: true },
          orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
        },
        conferenceSubmissions: {
          include: { conference: true },
          orderBy: [{ updatedAt: "desc" }, { submittedAt: "desc" }],
        },
        publications: { orderBy: { publishedDate: "desc" } },
        authorNotifications: {
          select: { type: true, results: true },
        },
        registrationUser: true,
        fundingInstitution: true,
        authors: { orderBy: [{ name: "asc" }, { email: "asc" }] },
        authorEntries: {
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
          include: {
            journal: true,
            conference: true,
            assignments: {
              include: {
                user: { select: { name: true, email: true } },
              },
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
      include: { accounts: { orderBy: [{ updatedAt: "desc" }] } },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    prisma.conference.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: taskAssigneeWhere,
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        additionalEmails: true,
        affiliation: true,
        roles: true,
      },
    }),
    prisma.user.findMany({
      where: { activeSites: { has: "research" } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        additionalEmails: true,
        affiliation: true,
        roles: true,
      },
    }),
    prisma.fundingInstitution.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, shortName: true, country: true },
    }),
  ]);

  if (!project) notFound();
  const linkedAuthorUsers = await prisma.user.findMany({
    where: {
      id: {
        in: Array.from(
          new Set([
            project.leadResearcherId,
            ...project.authorEntries.map((entry) => entry.userId),
          ]),
        ),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      additionalEmails: true,
      affiliation: true,
      roles: true,
    },
  });
  const linkedAuthorUserById = new Map(
    linkedAuthorUsers.map((linkedUser) => [linkedUser.id, linkedUser]),
  );
  const leadResearcher = linkedAuthorUserById.get(project.leadResearcherId);
  const hydratedAuthorEntries = project.authorEntries.flatMap((entry) => {
    const entryUser = linkedAuthorUserById.get(entry.userId);
    return entryUser ? [{ ...entry, user: entryUser }] : [];
  });
  const hasAssignedResearchTask = project.tasks.some((task) =>
    task.assignments.some((assignment) => assignment.userId === userId),
  );
  const hasUnfinishedAssignedResearchTask = project.tasks.some(
    (task) =>
      task.status !== ResearchTaskStatus.COMPLETED &&
      task.status !== ResearchTaskStatus.REVOKED &&
      task.assignments.some((assignment) => assignment.userId === userId),
  );
  const isProjectAuthor =
    project.leadResearcherId === userId ||
    project.authors.some((author) => author.id === userId) ||
    project.authorEntries.some((entry) => entry.userId === userId);
  const isCorrespondingAuthor =
    project.authorEntries.length > 0
      ? project.authorEntries.some(
          (entry) => entry.userId === userId && entry.isCorresponding,
        )
      : project.leadResearcherId === userId;
  const isFirstAuthor =
    project.authorEntries.length > 0
      ? project.authorEntries[0]?.userId === userId
      : project.leadResearcherId === userId;
  const isRegistrationUser =
    project.registrationUserId === userId ||
    Boolean(
      project.registrationName &&
      registrationIdentityValues.includes(
        project.registrationName.trim().toLowerCase(),
      ),
    );
  if (
    !isAdmin &&
    !isProjectAuthor &&
    !isRegistrationUser &&
    !hasAssignedResearchTask
  ) {
    notFound();
  }
  const canViewRegistrationClaim = isAdmin || isRegistrationUser;
  const canEditResearchInfo =
    isAdmin || isCorrespondingAuthor || isFirstAuthor;
  const canEditResearch = isAdmin || isCorrespondingAuthor;
  const canManageResearchTasks =
    isRootAdmin || isFirstAuthor || isCorrespondingAuthor;
  const canSendAuthorEmails = isAdmin || isFirstAuthor || isCorrespondingAuthor;
  const canSuggestVenue =
    isAdmin || isProjectAuthor || hasUnfinishedAssignedResearchTask;

  const updateAction = updateResearchProject.bind(null, project.id);
  const hasJournalSubmissions = project.submissions.length > 0;
  const displayStage: DisplayStage = hasJournalSubmissions
    ? stageFromJournalSubmissions(project.submissions)
    : project.conferenceSubmissions.length > 0
      ? stageFromConferenceSubmissions(project.conferenceSubmissions)
      : project.stage;
  const researchAcceptedOrPublished =
    project.stage === "ACCEPTED" ||
    project.stage === "PUBLISHED" ||
    project.submissions.some(
      (submission) =>
        submission.status === "ACCEPTED" || submission.status === "PUBLISHED",
    ) ||
    project.conferenceSubmissions.some(
      (submission) =>
        submission.status === "ACCEPTED" || submission.status === "PUBLISHED",
    );
  const authorsLocked = researchAcceptedOrPublished && !project.authorsUnlocked;
  const highlightedJournalSubmission = hasJournalSubmissions
    ? (project.submissions.find(
        (submission) => submission.status === "PUBLISHED",
      ) ??
      project.submissions.find(
        (submission) => submission.status === "ACCEPTED",
      ))
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
  const publishedArticleSubmission = project.submissions.find(
    (submission) => submission.status === "PUBLISHED",
  );
  const researchContentLocked =
    researchAcceptedOrPublished && !project.contentUnlocked;
  const canCreateSubmitOrOtherTask =
    canManageResearchTasks && !researchContentLocked;
  const canCreateProductionTask = canCreateSubmitOrOtherTask;
  const canApproveVenueSuggestion = canCreateSubmitOrOtherTask;
  const authorNames =
    hydratedAuthorEntries.length > 0
      ? hydratedAuthorEntries.map(
          (entry) =>
            `${displayResearchPersonName(entry.user)}${entry.isCorresponding ? "*" : ""}`,
        )
      : project.authors.length > 0
        ? project.authors.map(
            (author, index) =>
              `${displayResearchPersonName(author)}${index === 0 ? "*" : ""}`,
          )
        : [
            `${leadResearcher ? displayResearchPersonName(leadResearcher) || "Deleted lead researcher" : "Deleted lead researcher"}*`,
            project.coAuthors,
          ].filter(Boolean);
  const authorsLine = authorNames.join(", ");
  const completedProductionSteps = new Set(project.completedProductionSteps);
  const unfinishedSteps = productionSteps.filter(
    (step) => !completedProductionSteps.has(step.label),
  );
  const productionComplete = unfinishedSteps.length === 0;
  const productionTimelineLocked =
    productionComplete && project.productionTimelineLocked;
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
      venueId: journal.id,
      name: journal.name,
      venueLink: journal.homepageLink ?? journal.submissionLink ?? "",
      status: "APPROVED",
      issn: journal.issn ?? "",
      field: journal.field ?? "",
      rank: journal.rank ?? "",
      publisher: journal.publisher ?? "",
      apc: journal.apc ?? "",
    }),
  );
  const suggestedJournalOptions: SuggestedJournalOption[] =
    project.suggestedJournals.map(({ journal, createdBy, ...suggestion }) => ({
      id: suggestion.id,
      venueId: journal?.id ?? "",
      name: journal?.name ?? suggestion.venueName ?? "Unnamed journal",
      venueLink: suggestion.venueLink ?? "",
      status: suggestion.status,
      issn: journal?.issn ?? "",
      field: journal?.field ?? "",
      rank: journal?.rank ?? "",
      publisher: journal?.publisher ?? "",
      apc: journal?.apc ?? "",
      suggestedByName: createdBy
        ? displayResearchPersonName(createdBy) || "Unknown user"
        : "Unknown user",
      suggestedByRole: createdBy
        ? displayRole(createdBy.roles)
        : "Unknown role",
      venueState:
        suggestion.status === "PENDING"
          ? { state: "pendingApproval" }
          : journal
            ? suggestedJournalState(journal.id)
            : { state: "pendingApproval" },
    }));
  const allConferenceOptions: SuggestedConferenceOption[] = conferences.map(
    (conference) => ({
      id: conference.id,
      venueId: conference.id,
      name: conference.name,
      venueLink: conference.website ?? "",
      status: "APPROVED",
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
    project.suggestedConferences.map(
      ({ conference, createdBy, ...suggestion }) => ({
        id: suggestion.id,
        venueId: conference?.id ?? "",
        name: conference?.name ?? suggestion.venueName ?? "Unnamed conference",
        venueLink: suggestion.venueLink ?? "",
        status: suggestion.status,
        type: conference?.type ?? "",
        theme: conference?.targetTheme || conference?.themes || "",
        location: conference?.location ?? "",
        organizer: conference?.organizer ?? "",
        time: [
          conference?.startDate?.toLocaleDateString(),
          conference?.endDate?.toLocaleDateString(),
        ]
          .filter(Boolean)
          .join(" - "),
        suggestedByName: createdBy
          ? displayResearchPersonName(createdBy) || "Unknown user"
          : "Unknown user",
        suggestedByRole: createdBy
          ? displayRole(createdBy.roles)
          : "Unknown role",
        venueState:
          suggestion.status === "PENDING"
            ? { state: "pendingApproval" }
            : conference
              ? suggestedConferenceState(conference.id)
              : { state: "pendingApproval" },
      }),
    );
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
    additionalEmails: user.additionalEmails,
    affiliation: user.affiliation,
    role: displayRole(user.roles),
  }));
  const defaultRegistrationUser: AuthorOption | null = project.registrationUser
    ? {
        id: project.registrationUser.id,
        name: project.registrationUser.name ?? "",
        email: project.registrationUser.email,
        additionalEmails: project.registrationUser.additionalEmails,
        affiliation: project.registrationUser.affiliation,
        role: displayRole(project.registrationUser.roles),
      }
    : null;
  const fundingInstitutionOptions = fundingInstitutions.map((institution) => ({
    id: institution.id,
    name: institution.name,
    shortName: institution.shortName ?? "",
    country: institution.country ?? "",
  }));
  const defaultFundingInstitution = project.fundingInstitution
    ? {
        id: project.fundingInstitution.id,
        name: project.fundingInstitution.name,
        shortName: project.fundingInstitution.shortName ?? "",
        country: project.fundingInstitution.country ?? "",
      }
    : null;
  const defaultAuthors: SelectedAuthor[] =
    hydratedAuthorEntries.length > 0
      ? hydratedAuthorEntries.map((entry) => ({
          id: entry.user.id,
          name: entry.user.name ?? "",
          email: entry.user.email,
          additionalEmails: entry.user.additionalEmails,
          selectedEmail: entry.selectedEmail ?? entry.user.email,
          affiliation: entry.user.affiliation,
          role: displayRole(entry.user.roles),
          isCorresponding: entry.isCorresponding,
        }))
      : project.authors.length > 0
        ? project.authors.map((author, index) => ({
            id: author.id,
            name: author.name ?? "",
            email: author.email,
            additionalEmails: author.additionalEmails,
            selectedEmail: author.email,
            affiliation: author.affiliation,
            role: displayRole(author.roles),
            isCorresponding: index === 0,
          }))
        : leadResearcher
          ? [
              {
                id: leadResearcher.id,
                name: leadResearcher.name ?? "",
                email: leadResearcher.email,
                additionalEmails: leadResearcher.additionalEmails,
                selectedEmail: leadResearcher.email,
                affiliation: leadResearcher.affiliation,
                role: displayRole(leadResearcher.roles),
                isCorresponding: true,
              },
            ]
          : [];
  const completedProductionStepValues = project.completedProductionSteps;
  const researchBasicValues = {
    title: project.title,
    sharedFolderUrl: project.sharedFolderUrl ?? "",
    abstract: project.abstract ?? "",
    universityRegistration: project.universityRegistration ?? "",
    registrationName: project.registrationName ?? "",
    registerStatus: project.registerStatus,
    claimStatus: project.claimStatus,
    registrationUser: defaultRegistrationUser,
    fundingInstitution: defaultFundingInstitution,
  };
  const registrationParts =
    project.registerStatus === "NOT_REGISTERED"
      ? [registerLabel(project.registerStatus)]
      : [
          registerLabel(project.registerStatus),
          project.universityRegistration,
          project.registrationUser?.name ||
            project.registrationUser?.email ||
            project.registrationName,
          claimLabel(project.claimStatus),
        ].filter(Boolean);
  const registrationLine = registrationParts.join(" - ");
  const showRegistrationClaimSummary =
    canViewRegistrationClaim &&
    !(
      project.registerStatus === "NOT_REGISTERED" &&
      project.claimStatus === "CANNOT_CLAIM" &&
      !project.fundingInstitution
    );
  const authorNotificationSentTypes = project.authorNotifications
    .filter((notification) => {
      if (!Array.isArray(notification.results)) return false;
      const sentEmails = new Set(
        notification.results
          .map((result) => sentAuthorEmail(result))
          .filter((email): email is string => Boolean(email)),
      );

      return defaultAuthors.every((author) =>
        sentEmails.has(author.email.toLowerCase()),
      );
    })
    .map((notification) => notification.type);
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
  const currentResearchTaskOption: GeneralTaskResearchOption = {
    id: project.id,
    title: project.title,
    code: project.researchCode ?? "",
    stage: project.stage,
  };
  const generalTaskVenueOptions: GeneralTaskVenueOption[] = venueOptions.map(
    (venue) => ({
      kind: venue.kind,
      id: venue.id,
      name: venue.name,
      meta:
        venue.kind === "journal"
          ? [venue.publisher, venue.rank, venue.issn]
              .filter(Boolean)
              .join(" - ")
          : [venue.organizer, venue.type, venue.location]
              .filter(Boolean)
              .join(" - "),
    }),
  );
  const generalTaskAccountOptions: GeneralTaskAccountOption[] = venueOptions
    .filter((venue) => venue.kind === "journal")
    .flatMap((venue) => venue.accounts);
  const submissionRows: SubmissionRow[] = [
    ...project.submissions.map((submission) => ({
      id: submission.id,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      kind: "journal" as const,
      venueId: submission.journalId,
      venueName: submission.journal.name,
      metaLine: `${submission.journal.publisher || "No publisher"} - ${
        submission.journal.type === "LOCAL"
          ? submission.journal.localRank || "No local rank"
          : submission.journal.rank || "No rank"
      }`,
      apc: submission.journal.apc ?? "",
      apcCurrency: submission.journal.apcCurrency,
      submissionFee: submission.journal.submissionFee ?? "",
      submissionFeeCurrency: submission.journal.submissionFeeCurrency,
      account: submission.account?.username ?? "",
      status: submission.status,
      submittedAt: isoDate(submission.submittedAt),
      acceptedAt: isoDate(submission.acceptedAt),
      rejectedAt: isoDate(submission.rejectedAt),
      withdrawnAt: isoDate(submission.withdrawnAt),
      publishedAt: isoDate(submission.publishedAt),
      articleUrl: submission.articleUrl ?? "",
      articleFileName: submission.articleFileName ?? "",
      articleFileSize: submission.articleFileSize,
    })),
    ...project.conferenceSubmissions.map((submission) => ({
      id: submission.id,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
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
      apc: "",
      apcCurrency: submission.conference.submissionFeeCurrency,
      submissionFee: submission.conference.submissionFee ?? "",
      submissionFeeCurrency: submission.conference.submissionFeeCurrency,
      account: "",
      status: submission.status,
      submittedAt: isoDate(submission.submittedAt ?? submission.createdAt),
      acceptedAt: isoDate(submission.acceptedAt),
      rejectedAt: isoDate(submission.rejectedAt),
      withdrawnAt: isoDate(submission.withdrawnAt),
      publishedAt: isoDate(submission.publishedAt),
    })),
  ].sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  const activeTaskRows: ActiveResearchTaskRow[] = project.tasks
    .filter(
      (task) =>
        task.status !== ResearchTaskStatus.COMPLETED &&
        task.status !== ResearchTaskStatus.REVOKED,
    )
    .map((task) => ({
      id: task.id,
      taskCode: task.taskCode,
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      taskType: task.taskType ?? task.category ?? "TASK",
      dueDate: task.dueDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      assignments: task.assignments.map((assignment) => ({
        id: assignment.id,
        name: assignment.user.name || assignment.user.email,
        email: displayResearchEmail(assignment.user.email),
      })),
    }));
  const stageStyle = stageStyles[displayStage];
  const StageIcon = stageStyle.icon;

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="min-w-0 text-sm font-normal leading-5 text-[#E4E4E4] xl:text-base xl:leading-6">
              <h1 className="inline break-words font-normal">
                {project.title}
              </h1>
              <span className="ml-2 inline-flex items-center gap-2 align-middle">
                {project.sharedFolderUrl ? (
                  <IconHint label="Open research folder" position="bottom">
                    <a
                      href={project.sharedFolderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="research-allow-transform research-title-icon-button research-folder-link-button"
                      aria-label="Open research folder"
                    >
                      <FolderOpen className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </IconHint>
                ) : null}
                {canCreateSubmitOrOtherTask ? (
                  <NewTaskDialog
                    assignees={taskAssigneeOptions}
                    researchOptions={[currentResearchTaskOption]}
                    venueOptions={generalTaskVenueOptions}
                    accountOptions={generalTaskAccountOptions}
                    reviewOptions={[]}
                    organizedProjectOptions={[]}
                    initialMode="other"
                    initialResearch={currentResearchTaskOption}
                    triggerVariant="other"
                  />
                ) : null}
                <IconHint label={stageStyle.label} position="bottom">
                  <span
                    className={`inline-flex h-5 w-5 flex-none cursor-help items-center justify-center transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] ${stageStyle.className}`}
                    aria-label={stageStyle.label}
                  >
                    <StageIcon
                      className="h-4 w-4"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </span>
                </IconHint>
                <ResearchBasicEditDialog
                  action={updateAction}
                  values={researchBasicValues}
                  authors={defaultAuthors}
                  completedProductionSteps={completedProductionStepValues}
                  users={authorOptions}
                  fundingInstitutions={fundingInstitutionOptions}
                  registerOptions={registerOptions}
                  claimOptions={claimOptions}
                  canEditRegistrationClaim={isAdmin}
                  disabled={!canEditResearchInfo || researchContentLocked}
                  disabledReason={
                    researchContentLocked
                      ? "Research information is locked after accepted or published submission"
                      : "Only admin, first author, or corresponding author can edit research information"
                  }
                />
                {isRootAdmin && (
                  <ResearchContentLockButton
                    projectId={project.id}
                    locked={researchContentLocked}
                  />
                )}
              </span>
            </div>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="min-w-0 space-y-2 text-sm text-[#B0B0B0]">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[#B0B0B0]">
            {project.researchCode && (
              <span className="font-normal">ID: {project.researchCode}</span>
            )}
            {project.researchCode && (
              <span className="text-[#777777]" aria-hidden="true">
                |
              </span>
            )}
            <span className="min-w-0 text-[#E4E4E4]">
              Authors: {authorsLine}
            </span>
          </div>
          {(project.fundingInstitution || showRegistrationClaimSummary) && (
            <p className="flex min-w-0 flex-wrap items-center gap-2">
              {project.fundingInstitution && (
                <span>
                  Funded by:{" "}
                  <span className="font-normal text-[#E4E4E4]">
                    {project.fundingInstitution.name}
                  </span>
                </span>
              )}
              {project.fundingInstitution && showRegistrationClaimSummary && (
                <span className="text-[#777777]" aria-hidden="true">
                  |
                </span>
              )}
              {showRegistrationClaimSummary && (
                <IconHint label={registrationLine}>
                  <span className="inline-flex flex-none items-center border border-[#444444] bg-[#202020] px-2 py-0.5 text-[11px] font-normal text-[#B0B0B0]">
                    {registrationLine}
                  </span>
                </IconHint>
              )}
            </p>
          )}
          {highlightedJournalSubmission && highlightedJournalClass && (
            <div className="space-y-1 py-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="min-w-0 text-[#E4E4E4]">
                  ISSN: {highlightedJournalSubmission.journal.issn || "-"} |{" "}
                  {highlightedJournalSubmission.journal.name} |{" "}
                  {highlightedJournalSubmission.journal.publisher ||
                    "No publisher"}{" "}
                  |{" "}
                  {highlightedJournalSubmission.journal.rank ||
                    highlightedJournalSubmission.journal.localRank ||
                    "No rank"}
                </p>
                {publishedArticleSubmission?.articleFileName && (
                  <IconHint
                    label="Download published article file"
                    position="bottom"
                  >
                    <a
                      href={`/api/research/submissions/${publishedArticleSubmission.id}/article`}
                      className="research-allow-transform research-download-button"
                      aria-label="Download published article file"
                    >
                      <Download
                        className="svgIcon h-4 w-4"
                        aria-hidden="true"
                      />
                      <span className="icon2" aria-hidden="true" />
                    </a>
                  </IconHint>
                )}
                {publishedArticleSubmission?.articleUrl && (
                  <IconHint
                    label="Open published article link"
                    position="bottom"
                  >
                    <a
                      href={publishedArticleSubmission.articleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="research-allow-transform research-title-icon-button"
                      aria-label="Open published article link"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </IconHint>
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-xs ${highlightedJournalClass.meta}`}>
                  Submitted:{" "}
                  {shortDate(highlightedJournalSubmission.submittedAt)}
                  {highlightedJournalSubmission.acceptedAt
                    ? ` | Accepted: ${shortDate(highlightedJournalSubmission.acceptedAt)}`
                    : ""}
                  {highlightedJournalSubmission.publishedAt
                    ? ` | Published: ${shortDate(highlightedJournalSubmission.publishedAt)}`
                    : ""}
                </p>
              </div>
            </div>
          )}
          {highlightedConferenceSubmission && highlightedConferenceClass && (
            <div className="space-y-1 py-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="min-w-0 text-[#E4E4E4]">
                  {highlightedConferenceSubmission.conference.name} -{" "}
                  {highlightedConferenceSubmission.conference.organizer ||
                    "No organizer"}{" "}
                  -{" "}
                  {highlightedConferenceSubmission.conference.type || "No type"}{" "}
                  -{" "}
                  {highlightedConferenceSubmission.conference.location ||
                    "No location"}
                </p>
              </div>
              <p className={`text-xs ${highlightedConferenceClass.meta}`}>
                Submitted:{" "}
                {shortDate(highlightedConferenceSubmission.submittedAt)}
                {highlightedConferenceSubmission.acceptedAt
                  ? ` | Accepted: ${shortDate(highlightedConferenceSubmission.acceptedAt)}`
                  : ""}
                {highlightedConferenceSubmission.publishedAt
                  ? ` | Published: ${shortDate(highlightedConferenceSubmission.publishedAt)}`
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

        <SaveForm
          id="research-detail-form"
          action={updateAction}
          className="grid gap-6 xl:grid-cols-[1fr_22rem]"
        >
          <fieldset
            disabled={!canEditResearch || researchContentLocked}
            className="contents"
          >
            <ResearchDetailSection>
              <input type="hidden" name="title" value={project.title} />
              <input
                type="hidden"
                name="sharedFolderUrl"
                value={project.sharedFolderUrl ?? ""}
              />
              <input
                type="hidden"
                name="abstract"
                value={project.abstract ?? ""}
              />
              {defaultAuthors.map((author) => (
                <input
                  key={author.id}
                  type="hidden"
                  name="authorUserIds"
                  value={author.id}
                />
              ))}
              <input
                type="hidden"
                name="correspondingAuthorId"
                value={
                  defaultAuthors.find((author) => author.isCorresponding)?.id ??
                  defaultAuthors[0]?.id ??
                  ""
                }
              />
              <input
                type="hidden"
                name="universityRegistration"
                value={project.universityRegistration ?? ""}
              />
              <input
                type="hidden"
                name="registrationUserId"
                value={defaultRegistrationUser?.id ?? ""}
              />
              <input
                type="hidden"
                name="fundingInstitutionId"
                value={defaultFundingInstitution?.id ?? ""}
              />
              {!defaultRegistrationUser && project.registrationName && (
                <input
                  type="hidden"
                  name="registrationName"
                  value={project.registrationName}
                />
              )}
              <input
                type="hidden"
                name="registerStatus"
                value={project.registerStatus}
              />
              <input
                type="hidden"
                name="claimStatus"
                value={project.claimStatus}
              />
              <div>
                {project.organizedProjectLinks.length > 0 && (
                  <>
                    <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
                      Associated project:
                    </h2>
                    <div className="mt-3 grid gap-2">
                      {project.organizedProjectLinks.map(
                        ({ organizedProject }) => (
                          <p
                            key={organizedProject.id}
                            className="text-sm leading-6 text-[#E4E4E4]"
                          >
                            <Link
                              href={`/organized-projects/${organizedProject.id}`}
                              className={researchLinkClass}
                            >
                              {organizedProject.title}
                            </Link>
                            <span className="text-[#B0B0B0]">
                              {" "}
                              - {organizedProject.organizer ||
                                "No funder"} - {organizedProject.status}
                            </span>
                          </p>
                        ),
                      )}
                    </div>
                    <div className="my-5 border-t border-[#444444]" />
                  </>
                )}

                <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
                  Research notes:
                </h2>
                <div className="mt-3 text-sm leading-6 text-[#E4E4E4]">
                  {project.abstract?.trim() ? (
                    <p className="whitespace-pre-wrap">{project.abstract}</p>
                  ) : (
                    <p className="text-[#B0B0B0]">
                      No note recorded for this research.
                    </p>
                  )}
                </div>

                <div className="my-5 border-t border-[#444444]" />

                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
                      Authors
                    </h2>
                    {isRootAdmin && researchAcceptedOrPublished && (
                      <ResearchAuthorsLockButton
                        projectId={project.id}
                        locked={authorsLocked}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ResearchAuthorsEditDialog
                      action={updateAction}
                      values={researchBasicValues}
                      authors={defaultAuthors}
                      completedProductionSteps={completedProductionStepValues}
                      users={authorOptions}
                      disabled={!canEditResearch || authorsLocked}
                      disabledReason={
                        authorsLocked
                          ? "Authors are locked after the research was accepted"
                          : "Only admin or the corresponding author can edit authors"
                      }
                    />
                    {canSendAuthorEmails && (
                      <AuthorNotificationActions
                        projectId={project.id}
                        sentTypes={authorNotificationSentTypes}
                      />
                    )}
                  </div>
                </div>
                <div className="research-readonly-authors-list divide-y divide-[#e2d9cc] border-y border-[#e2d9cc] dark:divide-[#444444] dark:border-[#444444]">
                  {defaultAuthors.map((author, index) => (
                    <div
                      key={author.id}
                      className="flex items-center gap-4 py-3"
                    >
                      <span className="inline-flex w-8 flex-none justify-center font-mono text-sm text-[#A8DADC]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-normal text-[#E4E4E4]">
                            {displayResearchPersonName(author)}
                            {author.isCorresponding ? "*" : ""}
                          </p>
                          <span className="border border-[#444444] bg-[#202020] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#B0B0B0]">
                            {index === 0 ? "First author" : "Author"}
                          </span>
                          {author.isCorresponding && (
                            <span className="border border-[#444444] bg-[#202020] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#A8DADC]">
                              Corresponding
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-normal text-[#B0B0B0]">
                          <Mail
                            className="h-3.5 w-3.5 flex-none text-[#1F7180] dark:text-[#A8DADC]"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {displayResearchEmail(
                              author.selectedEmail || author.email,
                            )}
                          </span>
                        </p>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-normal text-[#B0B0B0]">
                          <Building2
                            className="h-3.5 w-3.5 flex-none text-violet-700 dark:text-[#B39CD0]"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {author.affiliation || "No affiliation recorded"}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ResearchDetailSection>

            <ResearchDetailSection>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
                    Cooking process
                  </h2>
                  {canCreateProductionTask ? (
                    <NewTaskDialog
                      assignees={taskAssigneeOptions}
                      researchOptions={[currentResearchTaskOption]}
                      venueOptions={generalTaskVenueOptions}
                      accountOptions={generalTaskAccountOptions}
                      reviewOptions={[]}
                      organizedProjectOptions={[]}
                      initialMode="production"
                      initialResearch={currentResearchTaskOption}
                      triggerVariant="production"
                    />
                  ) : null}
                </div>
                <ProductionTimelineActions
                  projectId={project.id}
                  locked={productionTimelineLocked}
                  disabled={!canEditResearch || researchContentLocked}
                  canUnlock={isRootAdmin}
                  totalSteps={productionSteps.length}
                  beforeActions={
                    canSendAuthorEmails && productionComplete ? (
                      <AuthorNotificationActions
                        projectId={project.id}
                        sentTypes={authorNotificationSentTypes}
                        types={["PRODUCTION_FINISHED"]}
                      />
                    ) : null
                  }
                />
              </div>
              <div className="relative">
                <div className="absolute bottom-7 left-[1.06rem] top-7 w-px bg-[#e2d9cc] dark:bg-[#444444]" />
                {productionSteps.map((step, index) => {
                  const active = completedProductionSteps.has(step.label);
                  return (
                    <label
                      key={step.label}
                      className={`group/timeline relative grid cursor-pointer grid-cols-[2.125rem_minmax(0,1fr)] gap-4 border-b border-[#444444]/70 py-4 transition duration-150 last:border-b-0 ${productionTimelineLocked ? "cursor-default" : "hover:bg-[#303030]"}`}
                    >
                      <input
                        type="checkbox"
                        name="completedProductionSteps"
                        value={step.label}
                        defaultChecked={active}
                        disabled={productionTimelineLocked}
                        className="peer sr-only"
                      />
                      <span className="relative z-10 mt-0.5 flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-slate-400 transition duration-150 peer-checked:border-[#1F7180] peer-checked:bg-[#E6F4F2] peer-checked:text-[#1F7180] peer-focus-visible:ring-4 peer-focus-visible:ring-[#1F7180]/10 group-hover/timeline:border-slate-300 peer-checked:group-hover/timeline:border-[#155864] dark:border-[#444444] dark:bg-[#202020] dark:text-[#666666] dark:peer-checked:border-[#A8DADC] dark:peer-checked:bg-[#263636] dark:peer-checked:text-[#A8DADC] dark:peer-focus-visible:ring-[#A8DADC]/10 dark:group-hover/timeline:border-[#666666] dark:peer-checked:group-hover/timeline:border-[#A8DADC] peer-checked:[&_.timeline-check]:opacity-100 peer-checked:[&_.timeline-dot]:opacity-0">
                        <CheckCircle2
                          className="timeline-check h-4 w-4 opacity-0 transition duration-150"
                          aria-hidden="true"
                        />
                        <span className="timeline-dot absolute h-2 w-2 bg-current opacity-100 transition duration-150" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center justify-between gap-3">
                          <span className="block truncate text-sm font-normal text-[#E4E4E4]">
                            {step.label}
                          </span>
                          <span className="hidden border border-[#444444] bg-[#202020] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#B0B0B0] sm:inline-flex">
                            Step {String(index + 1).padStart(2, "0")}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[#B0B0B0]">
                          {step.detail}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </ResearchDetailSection>
          </fieldset>
        </SaveForm>

        <section className="space-y-4 border-t border-[#444444] pt-5">
          <h2 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
            <ListTodo className="h-5 w-5 text-[#B39CD0]" />
            Active tasks
          </h2>
          <ActiveResearchTasksTable
            projectId={project.id}
            rows={activeTaskRows}
          />
        </section>

        <section className="space-y-4 border-t border-[#444444] pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
              <Send className="h-5 w-5 text-[#A8DADC]" />
              Submissions
            </h2>
            {canCreateSubmitOrOtherTask ? (
              <CreateSubmissionTaskDialog
                projectId={project.id}
                projectTitle={project.title}
                venues={venueOptions}
                assistants={taskAssigneeOptions}
                disabled={researchContentLocked}
              />
            ) : (
              <div className="border border-[#444444] bg-[#2C2C2C] px-4 py-3 text-sm text-[#E4E4E4] shadow-none">
                <p className="font-normal">
                  Submissions are updated from assigned tasks.
                </p>
                <p className="mt-1 text-[#B0B0B0]">
                  When an assigned submission task is marked finished, this
                  table and related journal/account views update automatically.
                </p>
              </div>
            )}
          </div>
          <SubmissionsTable
            rows={submissionRows}
            isAdmin={isAdmin}
            disabled={researchContentLocked}
            flushControls
          />
        </section>
        <SuggestedJournalsPanel
          projectId={project.id}
          projectTitle={project.title}
          journals={allJournalOptions}
          suggested={suggestedJournalOptions}
          conferences={allConferenceOptions}
          suggestedConferences={suggestedConferenceOptions}
          assistants={taskAssigneeOptions}
          isAdmin={isAdmin}
          canAssignTask={canCreateSubmitOrOtherTask}
          canApproveSuggestion={canApproveVenueSuggestion}
          canSuggestVenue={canSuggestVenue}
          taskAction={
            canCreateSubmitOrOtherTask ? (
              <NewTaskDialog
                assignees={taskAssigneeOptions}
                researchOptions={[currentResearchTaskOption]}
                venueOptions={generalTaskVenueOptions}
                accountOptions={generalTaskAccountOptions}
                reviewOptions={[]}
                organizedProjectOptions={[]}
                initialMode="other"
                initialResearch={currentResearchTaskOption}
                initialTitle={`Suggest venue for research "${project.title}"`}
                triggerVariant="other"
              />
            ) : null
          }
          disabled={researchContentLocked}
        />
      </div>
    </>
  );
}
