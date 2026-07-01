import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  Download,
  ExternalLink,
  FolderCheck,
  FolderOpen,
  Hash,
  Hourglass,
  ListTodo,
  Send,
  CheckCircle2,
  FileText,
  Mail,
  Rocket,
  SearchCheck,
  Star,
} from "lucide-react";
import {
  prisma,
  JournalApprovalStatus,
  ResearchFolderAccessRequestStatus,
  ResearchTaskStatus,
  ResearchTaskType,
  Role,
} from "@repo/db";
import { auth } from "../../../../../auth";
import {
  updateResearchFolderSharedUsers,
  updateResearchProject,
} from "../../actions";
import { SubmissionsTable, type SubmissionRow } from "./SubmissionsTable";
import {
  RelatedResearchTasksTable,
  type RelatedResearchTaskRow,
} from "./ActiveResearchTasksTable";
import {
  SuggestedJournalsPanel,
  type SuggestedConferenceOption,
  type SuggestedJournalOption,
  type SuggestedVenueTaskOption,
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
  type TaskSubmissionOption as GeneralTaskSubmissionOption,
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
import {
  SharedFolderUsersDialog,
  type FolderSharedUserOption,
} from "./SharedFolderUsersDialog";
import { ResearchFolderAccessRequestButton } from "./ResearchFolderAccessRequestButton";
import {
  ResearchFolderAccessRequestsDialog,
  type ResearchFolderAccessRequestRow,
} from "./ResearchFolderAccessRequestsDialog";
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
import {
  ResearchChangeLogTable,
  type ResearchChangeLogRow,
} from "@/sites/research/components/ResearchChangeLogTable";

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
  PENDING: {
    label: "Pending",
    icon: Hourglass,
    className: "text-amber-700 dark:text-amber-300",
  },
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
  return researchDateTimeFormat("en-GB", {
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

const closedJournalSubmissionStatuses = new Set([
  "ACCEPTED",
  "PUBLISHED",
  "REJECTED",
  "WITHDRAWN",
]);

function normalizedPublisherKey(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function readableSubmissionStatus(status: string) {
  if (status === "PENDING") return "Submitted";
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
        OR: [
          {
            roles: { has: Role.ASSISTANT },
            NOT: { id: userId },
          },
          ...(isChiefAssistant ? [{ id: userId }] : []),
        ],
      };
  const [
    project,
    journals,
    conferences,
    publishers,
    taskAssignees,
    checkerUsers,
    authorUsers,
    fundingInstitutions,
    taskGuides,
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
        folderSharedUsers: {
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        },
        folderAccessRequests: {
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            userId: true,
            requesterName: true,
            requesterEmail: true,
            requesterRole: true,
            status: true,
            note: true,
            createdAt: true,
            updatedAt: true,
            decidedAt: true,
          },
        },
        suggestedJournals: {
          include: {
            journal: {
              include: {
                accounts: { orderBy: [{ updatedAt: "desc" }] },
                publisherRecord: {
                  include: {
                    accounts: {
                      where: { accountType: "PUBLISHER" },
                      orderBy: [{ updatedAt: "desc" }],
                    },
                  },
                },
              },
            },
            createdBy: { select: { name: true, email: true } },
            approvedBy: { select: { name: true, email: true } },
            declinedBy: { select: { name: true, email: true } },
            publisher: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        suggestedConferences: {
          include: {
            conference: true,
            createdBy: { select: { name: true, email: true } },
            approvedBy: { select: { name: true, email: true } },
            declinedBy: { select: { name: true, email: true } },
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
            account: {
              select: { id: true, username: true, password: true, email: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true, roles: true },
            },
            checker: { select: { name: true, email: true } },
            assignments: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, roles: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
            clarifications: {
              where: { answer: null },
              select: { requestedById: true },
              orderBy: { createdAt: "desc" },
              take: 1,
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
      where: { approvalStatus: JournalApprovalStatus.APPROVED },
      include: {
        accounts: { orderBy: [{ updatedAt: "desc" }] },
        publisherRecord: {
          include: {
            accounts: {
              where: { accountType: "PUBLISHER" },
              orderBy: [{ updatedAt: "desc" }],
            },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    prisma.conference.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
    prisma.publisher.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        publisherCode: true,
        name: true,
        alias: true,
        country: true,
        usesSingleAccount: true,
        approvalStatus: true,
      },
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
        orcid: true,
        roles: true,
      },
    }),
    prisma.user.findMany({
      where: {
        activeSites: { has: "research" },
        roles: { has: Role.CHIEF_ASSISTANT },
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
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
        orcid: true,
        roles: true,
      },
    }),
    prisma.fundingInstitution.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, shortName: true, country: true },
    }),
    prisma.taskGuide.findMany({
      orderBy: [{ updatedAt: "desc" }, { guideCode: "asc" }],
      select: {
        id: true,
        guideCode: true,
        title: true,
        content: true,
        importantNote: true,
        supportFileName: true,
        supportFileSize: true,
      },
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
      orcid: true,
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
  const isTaskCheckerForResearch = project.tasks.some(
    (task) => task.checkerId === userId,
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
  if (project.stage === "PENDING" && !isRootAdmin) {
    notFound();
  }
  const canViewRegistrationClaim = isAdmin || isRegistrationUser;
  const canEditResearchInfo =
    isRootAdmin || isCorrespondingAuthor || isFirstAuthor;
  const canEditResearch = isAdmin || isCorrespondingAuthor;
  const canManageResearchTasks =
    isRootAdmin || isFirstAuthor || isCorrespondingAuthor;
  const isSuggestVenueTaskAssigner = project.tasks.some(
    (task) => task.taskType === "SUGGEST_VENUE" && task.createdById === userId,
  );
  const canSendAuthorEmails =
    isRootAdmin || isFirstAuthor || isCorrespondingAuthor;
  const canSuggestVenue =
    isAdmin || isProjectAuthor || hasUnfinishedAssignedResearchTask;

  const updateAction = updateResearchProject.bind(null, project.id);
  const updateFolderSharedUsersAction = updateResearchFolderSharedUsers.bind(
    null,
    project.id,
  );
  const completedProductionSteps = new Set(project.completedProductionSteps);
  const unfinishedSteps = productionSteps.filter(
    (step) => !completedProductionSteps.has(step.label),
  );
  const productionComplete = unfinishedSteps.length === 0;
  const hasJournalSubmissions = project.submissions.length > 0;
  const displayStage: DisplayStage = hasJournalSubmissions
    ? stageFromJournalSubmissions(project.submissions)
    : project.stage === "PENDING"
      ? "PENDING"
      : productionComplete
        ? "SUBMITTING"
        : "PRODUCTION";
  const researchAcceptedOrPublished = project.submissions.some(
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
  const canAssignSuggestedVenueSubmitTask =
    (canCreateSubmitOrOtherTask || isChiefAssistant) && !researchContentLocked;
  const canCreateProductionTask = canCreateSubmitOrOtherTask;
  const canApproveVenueSuggestion =
    (isRootAdmin || isChiefAssistant || isSuggestVenueTaskAssigner) &&
    !researchContentLocked;
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
  const submitTaskLockForPublisher = ({
    publisherId,
    publisherName,
  }: {
    publisherId?: string | null;
    publisherName?: string | null;
  }) => {
    const normalizedTarget = normalizedPublisherKey(publisherName);
    if (!publisherId && !normalizedTarget) return undefined;
    const samePublisher = (journal: {
      publisherId?: string | null;
      publisher?: string | null;
    }) =>
      Boolean(
        (publisherId && journal.publisherId === publisherId) ||
          (normalizedTarget &&
            normalizedPublisherKey(journal.publisher) === normalizedTarget),
      );
    const submissionJournalIds = new Set<string>();
    const submissionItems = project.submissions
      .filter(
        (submission) => !closedJournalSubmissionStatuses.has(submission.status),
      )
      .filter((submission) => samePublisher(submission.journal))
      .map((submission) => {
        submissionJournalIds.add(submission.journalId);
        const statusDate =
          submission.status === "PENDING"
            ? shortDate(submission.submittedAt)
            : shortDate(submission.updatedAt);
        return {
          journalName: submission.journal.name,
          status: readableSubmissionStatus(submission.status),
          statusDate,
        };
      });
    const taskItems = activeSubmitTasks
      .filter((task) => task.taskType === "SUBMIT_RESEARCH" && task.journal)
      .filter((task) => !submissionJournalIds.has(task.journalId ?? ""))
      .filter((task) => samePublisher(task.journal!))
      .map((task) => ({
        journalName: task.journal?.name ?? "Unnamed journal",
        status: `Submit task: ${readableSubmissionStatus(task.status)}`,
        statusDate: shortDate(task.updatedAt),
      }));
    const items = [...submissionItems, ...taskItems];
    if (items.length === 0) return undefined;
    const displayPublisher = publisherName?.trim() || "this publisher";
    const itemLines = items
      .map(
        (item) =>
          `- ${item.journalName} | ${item.status} | status date: ${item.statusDate}`,
      )
      .join("\n");
    const firstJournal = items[0]?.journalName ?? "the current journal";
    return {
      publisherName: displayPublisher,
      items,
      checkboxText: `The publisher ${displayPublisher} already has an ongoing submission workflow for this research:\n${itemLines}\nPlease wait until the current ongoing submission for ${displayPublisher} is complete before assigning another submit task.`,
      cardText: `This suggested venue must wait until the ongoing submission workflow for ${firstJournal} is finished before assigning a submit task, because both journals are from ${displayPublisher}.`,
    };
  };
  const suggestVenueTaskOptions: SuggestedVenueTaskOption[] = project.tasks
    .filter((task) => task.taskType === "SUGGEST_VENUE")
    .map((task) => ({
      id: task.id,
      taskCode:
        task.taskCode ?? task.id.replaceAll("-", "").slice(0, 10).toUpperCase(),
      title: task.title,
      status: task.status,
      assignees: task.assignments
        .map((assignment) => displayResearchPersonName(assignment.user))
        .filter(Boolean)
        .join(", "),
    }));
  const suggestVenueTaskById = new Map(
    suggestVenueTaskOptions.map((task) => [task.id, task]),
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
      field: journal.fields.length
        ? journal.fields.join(", ")
        : (journal.field ?? ""),
      rank: journal.rank ?? "",
      publisher: journal.publisher ?? "",
      publisherId: journal.publisherId ?? undefined,
      apc: journal.apc ?? "",
      apcCurrency: journal.apcCurrency,
      hasApcOption: journal.hasApcOption,
      submissionFee: journal.submissionFee ?? "",
      submissionFeeCurrency: journal.submissionFeeCurrency,
      note: journal.note ?? "",
      venueNote: "",
      accounts: (journal.publisherRecord?.usesSingleAccount
        ? (journal.publisherRecord.accounts ?? [])
        : journal.accounts
      ).map((account) => ({
        id: account.id,
        journalId: account.journalId ?? "",
        username: account.username,
        email: account.email ?? "",
      })),
      submitTaskLock: submitTaskLockForPublisher({
        publisherId: journal.publisherId,
        publisherName: journal.publisherRecord?.name ?? journal.publisher,
      }),
    }),
  );
  const suggestedJournalOptions: SuggestedJournalOption[] =
    project.suggestedJournals.map(
      ({
        journal,
        createdBy,
        approvedBy,
        declinedBy,
        publisher,
        ...suggestion
      }) => ({
        id: suggestion.id,
        venueId: journal?.id ?? "",
        name: journal?.name ?? suggestion.venueName ?? "Unnamed journal",
        venueLink: suggestion.venueLink ?? "",
        status: suggestion.status,
        issn: journal?.issn ?? "",
        field: journal?.fields.length
          ? journal.fields.join(", ")
          : (journal?.field ?? ""),
        rank: journal?.rank ?? "",
        publisher: journal?.publisher ?? publisher?.name ?? "",
        publisherId: journal?.publisherId ?? suggestion.publisherId ?? undefined,
        apc: journal?.apc ?? suggestion.apc ?? "",
        apcCurrency: journal?.apcCurrency ?? "USD",
        hasApcOption: journal?.hasApcOption ?? false,
        submissionFee: journal?.submissionFee ?? suggestion.submissionFee ?? "",
        submissionFeeCurrency: journal?.submissionFeeCurrency ?? "USD",
        note: journal?.note ?? "",
        venueNote: suggestion.note ?? "",
        accounts: (journal?.publisherRecord?.usesSingleAccount
          ? (journal.publisherRecord.accounts ?? [])
          : (journal?.accounts ?? [])
        ).map((account) => ({
          id: account.id,
          journalId: account.journalId ?? "",
          username: account.username,
          email: account.email ?? "",
        })),
        suggestedByName: createdBy
          ? displayResearchPersonName(createdBy) || "Unknown user"
          : "Unknown user",
        suggestedByEmail: createdBy
          ? displayResearchEmail(createdBy.email)
          : "Unknown email",
        requiresApproval: suggestion.requiresApproval,
        approvalNote: suggestion.approvalNote ?? undefined,
        declineReason: suggestion.declineReason ?? undefined,
        journalCreationPending: Boolean(suggestion.journalCreationTaskId),
        taskId: suggestion.taskId ?? undefined,
        linkedTask: suggestion.taskId
          ? suggestVenueTaskById.get(suggestion.taskId)
          : undefined,
        submitTaskLock: submitTaskLockForPublisher({
          publisherId: journal?.publisherId ?? suggestion.publisherId,
          publisherName: journal?.publisher ?? publisher?.name,
        }),
        approvedByName: approvedBy
          ? displayResearchPersonName(approvedBy) || "Unknown user"
          : undefined,
        approvedByEmail: approvedBy
          ? displayResearchEmail(approvedBy.email)
          : undefined,
        declinedByName: declinedBy
          ? displayResearchPersonName(declinedBy) || "Unknown user"
          : undefined,
        declinedByEmail: declinedBy
          ? displayResearchEmail(declinedBy.email)
          : undefined,
        venueState:
          suggestion.status === "PENDING"
            ? suggestion.journalCreationTaskId
              ? { state: "addingJournal" }
              : { state: "pendingApproval" }
            : suggestion.status === "DECLINED"
              ? {
                  state: "declined",
                  declineReason: suggestion.declineReason ?? undefined,
                }
              : journal
                ? suggestedJournalState(journal.id)
                : { state: "pendingApproval" },
      }),
    );
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
        conference.startDate
          ? researchDateTimeFormat("en-GB").format(conference.startDate)
          : undefined,
        conference.endDate
          ? researchDateTimeFormat("en-GB").format(conference.endDate)
          : undefined,
      ]
        .filter(Boolean)
        .join(" - "),
      apc: conference.apc ?? "",
      apcCurrency: conference.apcCurrency,
      submissionFee: conference.submissionFee ?? "",
      submissionFeeCurrency: conference.submissionFeeCurrency,
      note: conference.note ?? "",
      venueNote: "",
    }),
  );
  const suggestedConferenceOptions: SuggestedConferenceOption[] =
    project.suggestedConferences.map(
      ({ conference, createdBy, approvedBy, declinedBy, ...suggestion }) => ({
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
          conference?.startDate
            ? researchDateTimeFormat("en-GB").format(conference.startDate)
            : undefined,
          conference?.endDate
            ? researchDateTimeFormat("en-GB").format(conference.endDate)
            : undefined,
        ]
          .filter(Boolean)
          .join(" - "),
        apc: conference?.apc ?? "",
        apcCurrency: conference?.apcCurrency ?? "USD",
        submissionFee: conference?.submissionFee ?? "",
        submissionFeeCurrency: conference?.submissionFeeCurrency ?? "USD",
        note: conference?.note ?? "",
        venueNote: suggestion.note ?? "",
        suggestedByName: createdBy
          ? displayResearchPersonName(createdBy) || "Unknown user"
          : "Unknown user",
        suggestedByEmail: createdBy
          ? displayResearchEmail(createdBy.email)
          : "Unknown email",
        requiresApproval: suggestion.requiresApproval,
        approvalNote: suggestion.approvalNote ?? undefined,
        declineReason: suggestion.declineReason ?? undefined,
        taskId: suggestion.taskId ?? undefined,
        linkedTask: suggestion.taskId
          ? suggestVenueTaskById.get(suggestion.taskId)
          : undefined,
        approvedByName: approvedBy
          ? displayResearchPersonName(approvedBy) || "Unknown user"
          : undefined,
        approvedByEmail: approvedBy
          ? displayResearchEmail(approvedBy.email)
          : undefined,
        declinedByName: declinedBy
          ? displayResearchPersonName(declinedBy) || "Unknown user"
          : undefined,
        declinedByEmail: declinedBy
          ? displayResearchEmail(declinedBy.email)
          : undefined,
        venueState:
          suggestion.status === "PENDING"
            ? { state: "pendingApproval" }
            : suggestion.status === "DECLINED"
              ? {
                  state: "declined",
                  declineReason: suggestion.declineReason ?? undefined,
                }
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
  const taskCheckerOptions: TaskAssigneeOption[] = checkerUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    roles: user.roles,
  }));
  const authorOptions: AuthorOption[] = authorUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    additionalEmails: user.additionalEmails,
    affiliation: user.affiliation,
    orcid: user.orcid,
    role: displayRole(user.roles),
  }));
  const defaultRegistrationUser: AuthorOption | null = project.registrationUser
    ? {
        id: project.registrationUser.id,
        name: project.registrationUser.name ?? "",
        email: project.registrationUser.email,
        additionalEmails: project.registrationUser.additionalEmails,
        affiliation: project.registrationUser.affiliation,
        orcid: project.registrationUser.orcid,
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
          orcid: entry.user.orcid,
          role: displayRole(entry.user.roles),
          isCorresponding: entry.isCorresponding,
          folderShared: entry.folderShared,
        }))
      : project.authors.length > 0
        ? project.authors.map((author, index) => ({
            id: author.id,
            name: author.name ?? "",
            email: author.email,
            additionalEmails: author.additionalEmails,
            selectedEmail: author.email,
            affiliation: author.affiliation,
            orcid: author.orcid,
            role: displayRole(author.roles),
            isCorresponding: index === 0,
            folderShared: false,
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
                orcid: leadResearcher.orcid,
                role: displayRole(leadResearcher.roles),
                isCorresponding: true,
                folderShared: false,
              },
            ]
          : [];
  const authorIdSet = new Set(defaultAuthors.map((author) => author.id));
  const taskAssociatedUsers = project.tasks.flatMap((task) => [
    task.createdBy,
    ...task.assignments.map((assignment) => assignment.user),
  ]);
  const folderSharedUserOptionMap = new Map<string, FolderSharedUserOption>();
  [...checkerUsers, ...taskAssociatedUsers].forEach((folderUser) => {
    if (authorIdSet.has(folderUser.id)) return;
    folderSharedUserOptionMap.set(folderUser.id, {
      id: folderUser.id,
      name: folderUser.name ?? "",
      email: displayResearchEmail(folderUser.email),
      role: displayRole(folderUser.roles),
    });
  });
  const folderSharedUserOptions = Array.from(
    folderSharedUserOptionMap.values(),
  ).sort((left, right) =>
    (left.name || left.email).localeCompare(right.name || right.email),
  );
  const folderSharedUsers = project.folderSharedUsers
    .filter((folderUser) => !authorIdSet.has(folderUser.id))
    .map((folderUser) => ({
      id: folderUser.id,
      name: folderUser.name ?? "",
      email: displayResearchEmail(folderUser.email),
      role: displayRole(folderUser.roles),
    }));
  const folderSharedUserIdSet = new Set(
    project.folderSharedUsers.map((folderUser) => folderUser.id),
  );
  const currentAuthorFolderShared = project.authorEntries.some(
    (entry) => entry.userId === userId && entry.folderShared,
  );
  const canOpenResearchFolder =
    isRootAdmin ||
    currentAuthorFolderShared ||
    folderSharedUserIdSet.has(userId);
  const canViewResearchFolderIcon =
    Boolean(project.sharedFolderUrl) &&
    (canOpenResearchFolder ||
      isProjectAuthor ||
      hasAssignedResearchTask ||
      isTaskCheckerForResearch);
  const canRequestResearchFolderAccess =
    canViewResearchFolderIcon && !canOpenResearchFolder && !isRootAdmin;
  const pendingFolderAccessRequests = project.folderAccessRequests.filter(
    (request) => request.status === ResearchFolderAccessRequestStatus.PENDING,
  );
  const currentUserFolderAccessRequest = project.folderAccessRequests.find(
    (request) =>
      request.userId === userId &&
      (request.status === ResearchFolderAccessRequestStatus.PENDING ||
        request.status === ResearchFolderAccessRequestStatus.DECLINED),
  );
  const currentUserFolderAccessRequestStatus =
    currentUserFolderAccessRequest?.status ===
      ResearchFolderAccessRequestStatus.PENDING ||
    currentUserFolderAccessRequest?.status ===
      ResearchFolderAccessRequestStatus.DECLINED
      ? currentUserFolderAccessRequest.status
      : undefined;
  const folderAccessRequestRows: ResearchFolderAccessRequestRow[] =
    project.folderAccessRequests.map((request) => ({
      id: request.id,
      requesterName: request.requesterName,
      requesterEmail: displayResearchEmail(request.requesterEmail),
      requesterRole: request.requesterRole,
      status: request.status,
      note: request.note ?? "",
      createdAt: researchDateTimeFormat("en-GB").format(request.createdAt),
      decidedAt: request.decidedAt
        ? researchDateTimeFormat("en-GB").format(request.decidedAt)
        : "",
    }));
  const completedProductionStepValues = project.completedProductionSteps;
  const researchBasicValues = {
    title: project.title,
    sharedFolderUrl: project.sharedFolderUrl ?? "",
    abstract: project.abstract ?? "",
    universityRegistration: project.universityRegistration ?? "",
    registrationName: project.registrationName ?? "",
    registerStatus: project.registerStatus,
    claimStatus: project.claimStatus,
    isPriority: project.isPriority,
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
      accounts: (journal.publisherRecord?.usesSingleAccount
        ? (journal.publisherRecord.accounts ?? [])
        : journal.accounts
      ).map((account) => ({
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
  const singleAccountByJournalId = new Map<
    string,
    { id: string; username: string; password: string; email: string | null }
  >();
  for (const journal of journals) {
    const accounts = journal.publisherRecord?.usesSingleAccount
      ? (journal.publisherRecord.accounts ?? [])
      : journal.accounts;
    if (accounts.length === 1 && accounts[0]) {
      singleAccountByJournalId.set(journal.id, accounts[0]);
    }
  }
  const submitTaskByJournalId = new Map<
    string,
    (typeof project.tasks)[number]
  >();
  const submitTaskByConferenceId = new Map<
    string,
    (typeof project.tasks)[number]
  >();
  const shouldReplaceSubmitTask = (
    current: (typeof project.tasks)[number] | undefined,
    next: (typeof project.tasks)[number],
  ) =>
    !current ||
    (current.status !== ResearchTaskStatus.COMPLETED &&
      next.status === ResearchTaskStatus.COMPLETED);

  for (const task of project.tasks) {
    if (
      task.taskType === ResearchTaskType.SUBMIT_RESEARCH &&
      task.journalId &&
      shouldReplaceSubmitTask(submitTaskByJournalId.get(task.journalId), task)
    ) {
      submitTaskByJournalId.set(task.journalId, task);
    }
    if (
      task.taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
      task.conferenceId &&
      shouldReplaceSubmitTask(
        submitTaskByConferenceId.get(task.conferenceId),
        task,
      )
    ) {
      submitTaskByConferenceId.set(task.conferenceId, task);
    }
  }

  const taskSubmissionAssignees = (
    task: (typeof project.tasks)[number] | undefined,
  ) =>
    task?.assignments.map((assignment) => ({
      id: assignment.user.id,
      name: displayResearchPersonName(assignment.user),
      email: displayResearchEmail(assignment.user.email),
    })) ?? [];
  const submissionRows: SubmissionRow[] = [
    ...project.submissions.map((submission) => {
      const submitTask = submitTaskByJournalId.get(submission.journalId);
      const account =
        submission.account ??
        submitTask?.account ??
        singleAccountByJournalId.get(submission.journalId) ??
        null;
      return {
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
        hasApcOption: submission.journal.hasApcOption,
        submissionFee: submission.journal.submissionFee ?? "",
        submissionFeeCurrency: submission.journal.submissionFeeCurrency,
        accountId: account?.id ?? "",
        account: account?.username ?? "",
        accountPassword: account?.password ?? "",
        accountEmail: account?.email ?? "",
        assignees: taskSubmissionAssignees(submitTask),
        status: submission.status,
        submittedAt: isoDate(submission.submittedAt),
        acceptedAt: isoDate(submission.acceptedAt),
        rejectedAt: isoDate(submission.rejectedAt),
        withdrawnAt: isoDate(submission.withdrawnAt),
        publishedAt: isoDate(submission.publishedAt),
        articleUrl: submission.articleUrl ?? "",
        articleFileName: submission.articleFileName ?? "",
        articleFileSize: submission.articleFileSize,
      };
    }),
    ...project.conferenceSubmissions.map((submission) => {
      const submitTask = submitTaskByConferenceId.get(submission.conferenceId);
      return {
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
        assignees: taskSubmissionAssignees(submitTask),
        status: submission.status,
        submittedAt: isoDate(submission.submittedAt ?? submission.createdAt),
        acceptedAt: isoDate(submission.acceptedAt),
        rejectedAt: isoDate(submission.rejectedAt),
        withdrawnAt: isoDate(submission.withdrawnAt),
        publishedAt: isoDate(submission.publishedAt),
      };
    }),
  ].sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));
  const generalTaskSubmissionOptions: GeneralTaskSubmissionOption[] = [
    ...project.submissions.map((submission) => ({
      id: submission.id,
      kind: "journal" as const,
      researchId: project.id,
      venueId: submission.journalId,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      researchTitle: project.title,
      venueName: submission.journal.name,
      status: submission.status,
    })),
    ...project.conferenceSubmissions.map((submission) => ({
      id: submission.id,
      kind: "conference" as const,
      researchId: project.id,
      venueId: submission.conferenceId,
      code:
        submission.submissionCode ?? submission.id.slice(0, 6).toUpperCase(),
      researchTitle: project.title,
      venueName: submission.conference.name,
      status: submission.status,
    })),
  ];
  const relatedTaskRows: RelatedResearchTaskRow[] = project.tasks.map(
    (task) => {
      const openClarification = task.clarifications[0] ?? null;
      const clarifyDirection = openClarification
        ? task.assignments.some(
            (assignment) =>
              assignment.userId === openClarification.requestedById,
          )
          ? "ASSIGNEE_TO_MANAGER"
          : "MANAGER_TO_ASSIGNEE"
        : null;
      return {
        id: task.id,
        taskCode: task.taskCode,
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        clarifyDirection,
        taskType: task.taskType ?? task.category ?? "TASK",
        dueDate: task.dueDate?.toISOString() ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
        revokedAt: task.revokedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        createdBy: displayResearchPersonName(task.createdBy) || "Unassigned",
        checker: task.checker
          ? displayResearchPersonName(task.checker) || "Unassigned"
          : "Unassigned",
        assignments: task.assignments.map((assignment) => ({
          id: assignment.id,
          name: assignment.user.name || assignment.user.email,
          email: displayResearchEmail(assignment.user.email),
        })),
      };
    },
  );
  const researchChangeRows: ResearchChangeLogRow[] = isAdmin
    ? [
        {
          id: "research-created",
          changedAt: project.createdAt.toISOString(),
          area: "Research",
          action: "Created",
          actor: leadResearcher
            ? displayResearchPersonName(leadResearcher) || leadResearcher.email
            : "",
          detail: project.title,
        },
        {
          id: "research-updated",
          changedAt: project.updatedAt.toISOString(),
          area: "Research",
          action: "Updated",
          actor: "",
          detail: `${project.stage} | ${project.researchCode ?? "No research ID"}`,
        },
        ...project.authorEntries.map((entry) => {
          const authorUser = linkedAuthorUserById.get(entry.userId);
          return {
            id: `author-${entry.id}`,
            changedAt: entry.updatedAt.toISOString(),
            area: "Authors",
            action: entry.isCorresponding ? "Corresponding author" : "Updated",
            actor: authorUser
              ? displayResearchPersonName(authorUser) || authorUser.email
              : "",
            detail: entry.selectedEmail ?? "",
          };
        }),
        ...project.submissions.flatMap((submission) =>
          [
            {
              id: `submission-${submission.id}`,
              changedAt: submission.updatedAt.toISOString(),
              area: "Submission",
              action: submission.status,
              actor: "",
              detail: `${submission.submissionCode ?? submission.id.slice(0, 8).toUpperCase()} | ${submission.journal.name}`,
            },
            submission.acceptedAt
              ? {
                  id: `submission-${submission.id}-accepted`,
                  changedAt: submission.acceptedAt.toISOString(),
                  area: "Submission",
                  action: "Accepted",
                  actor: "",
                  detail: submission.journal.name,
                }
              : null,
            submission.publishedAt
              ? {
                  id: `submission-${submission.id}-published`,
                  changedAt: submission.publishedAt.toISOString(),
                  area: "Submission",
                  action: "Published",
                  actor: "",
                  detail: submission.journal.name,
                }
              : null,
          ].filter((row): row is ResearchChangeLogRow => Boolean(row)),
        ),
        ...project.conferenceSubmissions.flatMap((submission) =>
          [
            {
              id: `conference-submission-${submission.id}`,
              changedAt: submission.updatedAt.toISOString(),
              area: "Conference submission",
              action: submission.status,
              actor: "",
              detail: `${submission.submissionCode ?? submission.id.slice(0, 8).toUpperCase()} | ${submission.conference.name}`,
            },
            submission.acceptedAt
              ? {
                  id: `conference-submission-${submission.id}-accepted`,
                  changedAt: submission.acceptedAt.toISOString(),
                  area: "Conference submission",
                  action: "Accepted",
                  actor: "",
                  detail: submission.conference.name,
                }
              : null,
            submission.publishedAt
              ? {
                  id: `conference-submission-${submission.id}-published`,
                  changedAt: submission.publishedAt.toISOString(),
                  area: "Conference submission",
                  action: "Published",
                  actor: "",
                  detail: submission.conference.name,
                }
              : null,
          ].filter((row): row is ResearchChangeLogRow => Boolean(row)),
        ),
        ...project.suggestedJournals.flatMap((suggestion) =>
          [
            {
              id: `suggested-journal-${suggestion.id}`,
              changedAt: suggestion.createdAt.toISOString(),
              area: "Suggested venue",
              action: suggestion.status,
              actor: suggestion.createdBy
                ? displayResearchPersonName(suggestion.createdBy) ||
                  suggestion.createdBy.email
                : "",
              detail: suggestion.journal?.name ?? suggestion.venueName ?? "",
            },
            suggestion.approvedAt
              ? {
                  id: `suggested-journal-${suggestion.id}-approved`,
                  changedAt: suggestion.approvedAt.toISOString(),
                  area: "Suggested venue",
                  action: "Approved",
                  actor: suggestion.approvedBy
                    ? displayResearchPersonName(suggestion.approvedBy) ||
                      suggestion.approvedBy.email
                    : "",
                  detail: suggestion.approvalNote ?? "",
                }
              : null,
            suggestion.declinedAt
              ? {
                  id: `suggested-journal-${suggestion.id}-declined`,
                  changedAt: suggestion.declinedAt.toISOString(),
                  area: "Suggested venue",
                  action: "Declined",
                  actor: "",
                  detail: suggestion.declineReason ?? "",
                }
              : null,
          ].filter((row): row is ResearchChangeLogRow => Boolean(row)),
        ),
        ...project.suggestedConferences.flatMap((suggestion) =>
          [
            {
              id: `suggested-conference-${suggestion.id}`,
              changedAt: suggestion.createdAt.toISOString(),
              area: "Suggested venue",
              action: suggestion.status,
              actor: suggestion.createdBy
                ? displayResearchPersonName(suggestion.createdBy) ||
                  suggestion.createdBy.email
                : "",
              detail: suggestion.conference?.name ?? suggestion.venueName ?? "",
            },
            suggestion.approvedAt
              ? {
                  id: `suggested-conference-${suggestion.id}-approved`,
                  changedAt: suggestion.approvedAt.toISOString(),
                  area: "Suggested venue",
                  action: "Approved",
                  actor: suggestion.approvedBy
                    ? displayResearchPersonName(suggestion.approvedBy) ||
                      suggestion.approvedBy.email
                    : "",
                  detail: suggestion.approvalNote ?? "",
                }
              : null,
            suggestion.declinedAt
              ? {
                  id: `suggested-conference-${suggestion.id}-declined`,
                  changedAt: suggestion.declinedAt.toISOString(),
                  area: "Suggested venue",
                  action: "Declined",
                  actor: "",
                  detail: suggestion.declineReason ?? "",
                }
              : null,
          ].filter((row): row is ResearchChangeLogRow => Boolean(row)),
        ),
        ...project.tasks.map((task) => ({
          id: `task-${task.id}`,
          changedAt: task.updatedAt.toISOString(),
          area: "Task",
          action: task.status,
          actor: displayResearchPersonName(task.createdBy) || "",
          detail: task.title,
        })),
        ...project.folderAccessRequests.map((request) => ({
          id: `folder-request-${request.id}`,
          changedAt: request.updatedAt.toISOString(),
          area: "Folder access",
          action: request.status,
          actor: `${request.requesterName} | ${request.requesterEmail}`,
          detail: request.note ?? "",
        })),
        ...project.organizedProjectLinks.map((link) => ({
          id: `organized-project-${link.id}`,
          changedAt: link.createdAt.toISOString(),
          area: "Project link",
          action: "Linked",
          actor: "",
          detail: link.organizedProject.title,
        })),
        ...project.publications.map((publication) => ({
          id: `publication-${publication.id}`,
          changedAt: (
            publication.publishedDate ?? project.updatedAt
          ).toISOString(),
          area: "Publication",
          action: "Published",
          actor: "",
          detail: publication.title,
        })),
      ]
    : [];
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
                {isRootAdmin && pendingFolderAccessRequests.length > 0 ? (
                  <ResearchFolderAccessRequestsDialog
                    requests={folderAccessRequestRows}
                  />
                ) : null}
                {project.sharedFolderUrl &&
                canViewResearchFolderIcon &&
                canOpenResearchFolder ? (
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
                ) : project.sharedFolderUrl &&
                  canRequestResearchFolderAccess ? (
                  <ResearchFolderAccessRequestButton
                    projectId={project.id}
                    researchTitle={project.title}
                    requestStatus={currentUserFolderAccessRequestStatus}
                    requestNote={currentUserFolderAccessRequest?.note ?? ""}
                    requestDecidedAt={
                      currentUserFolderAccessRequest?.decidedAt
                        ? researchDateTimeFormat("en-GB").format(
                            currentUserFolderAccessRequest.decidedAt,
                          )
                        : ""
                    }
                  />
                ) : null}
                {canCreateSubmitOrOtherTask ? (
                  <NewTaskDialog
                    assignees={taskAssigneeOptions}
                    researchOptions={[currentResearchTaskOption]}
                    venueOptions={generalTaskVenueOptions}
                    accountOptions={generalTaskAccountOptions}
                    reviewOptions={[]}
                    organizedProjectOptions={[]}
                    submissionOptions={generalTaskSubmissionOptions}
                    checkerOptions={taskCheckerOptions}
                    taskGuideOptions={taskGuides}
                    canChooseChecker={isRootAdmin}
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
                {canEditResearchInfo && (
                  <ResearchBasicEditDialog
                    action={updateAction}
                    values={researchBasicValues}
                    authors={defaultAuthors}
                    completedProductionSteps={completedProductionStepValues}
                    users={authorOptions}
                    fundingInstitutions={fundingInstitutionOptions}
                    registerOptions={registerOptions}
                    claimOptions={claimOptions}
                    canEditRegistrationClaim={isRootAdmin}
                    disabled={researchContentLocked}
                    disabledReason="Research information is locked after accepted or published submission"
                    initialOpen={project.stage === "PENDING" && isRootAdmin}
                  />
                )}
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
            {project.isPriority && (
              <IconHint label="Priority research">
                <span
                  className="research-allow-transform inline-flex h-5 w-5 flex-none cursor-help items-center justify-center text-amber-700 transition duration-180 ease-out hover:-translate-y-0.5 hover:drop-shadow-[0_0_0.45rem_rgba(217,119,6,0.24)] dark:text-amber-300"
                  aria-label="Priority research"
                >
                  <Star
                    className="h-4 w-4"
                    fill="currentColor"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </span>
              </IconHint>
            )}
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
                <p className="flex min-w-0 flex-wrap items-center gap-2 text-[#E4E4E4]">
                  <span>
                    ISSN: {highlightedJournalSubmission.journal.issn || "-"}
                  </span>
                  <span className="text-[#777777]" aria-hidden="true">
                    |
                  </span>
                  <span>{highlightedJournalSubmission.journal.name}</span>
                  <span className="text-[#777777]" aria-hidden="true">
                    |
                  </span>
                  <span>
                    {highlightedJournalSubmission.journal.publisher ||
                      "No publisher"}
                  </span>
                  <span className="text-[#777777]" aria-hidden="true">
                    |
                  </span>
                  <span>
                    {highlightedJournalSubmission.journal.rank ||
                      highlightedJournalSubmission.journal.localRank ||
                      "No rank"}
                  </span>
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
                <p
                  className={`flex flex-wrap items-center gap-2 text-xs ${highlightedJournalClass.meta}`}
                >
                  <span>
                    Submitted:{" "}
                    {shortDate(highlightedJournalSubmission.submittedAt)}
                  </span>
                  {highlightedJournalSubmission.acceptedAt && (
                    <>
                      <span className="text-[#777777]" aria-hidden="true">
                        |
                      </span>
                      <span>
                        Accepted:{" "}
                        {shortDate(highlightedJournalSubmission.acceptedAt)}
                      </span>
                    </>
                  )}
                  {highlightedJournalSubmission.publishedAt && (
                    <>
                      <span className="text-[#777777]" aria-hidden="true">
                        |
                      </span>
                      <span>
                        Published:{" "}
                        {shortDate(highlightedJournalSubmission.publishedAt)}
                      </span>
                    </>
                  )}
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
              <p
                className={`flex flex-wrap items-center gap-2 text-xs ${highlightedConferenceClass.meta}`}
              >
                <span>
                  Submitted:{" "}
                  {shortDate(highlightedConferenceSubmission.submittedAt)}
                </span>
                {highlightedConferenceSubmission.acceptedAt && (
                  <>
                    <span className="text-[#777777]" aria-hidden="true">
                      |
                    </span>
                    <span>
                      Accepted:{" "}
                      {shortDate(highlightedConferenceSubmission.acceptedAt)}
                    </span>
                  </>
                )}
                {highlightedConferenceSubmission.publishedAt && (
                  <>
                    <span className="text-[#777777]" aria-hidden="true">
                      |
                    </span>
                    <span>
                      Published:{" "}
                      {shortDate(highlightedConferenceSubmission.publishedAt)}
                    </span>
                  </>
                )}
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
              <input
                type="hidden"
                name="isPriority"
                value={project.isPriority ? "true" : "false"}
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
                    {canEditResearchInfo && (
                      <ResearchAuthorsEditDialog
                        action={updateAction}
                        values={researchBasicValues}
                        authors={defaultAuthors}
                        completedProductionSteps={completedProductionStepValues}
                        users={authorOptions}
                        allowPendingEmail={isRootAdmin}
                        disabled={authorsLocked}
                        disabledReason="Authors are locked after the research was accepted"
                      />
                    )}
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
                          <p className="min-w-0 whitespace-normal break-words text-sm font-normal text-[#E4E4E4] lg:truncate">
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
                          {author.folderShared ? (
                            <IconHint
                              label="Google Drive folder shared with this author"
                              position="bottom"
                            >
                              <span className="research-allow-transform inline-flex cursor-help items-center justify-center text-emerald-700 transition duration-180 ease-out hover:-translate-y-0.5 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                                <FolderCheck
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              </span>
                            </IconHint>
                          ) : null}
                        </div>
                        <p className="mt-0.5 flex min-w-0 items-start gap-1 text-xs font-normal text-[#B0B0B0] lg:items-center lg:truncate">
                          <Mail
                            className="h-3.5 w-3.5 flex-none text-[#1F7180] dark:text-[#A8DADC]"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 whitespace-normal break-all lg:truncate">
                            {displayResearchEmail(
                              author.selectedEmail || author.email,
                            )}
                          </span>
                        </p>
                        <p className="mt-0.5 flex min-w-0 items-start gap-1 text-xs font-normal leading-5 text-[#B0B0B0] lg:items-center lg:truncate">
                          <Building2
                            className="h-3.5 w-3.5 flex-none text-violet-700 dark:text-[#B39CD0]"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 whitespace-normal break-words lg:truncate">
                            {author.affiliation || "No affiliation recorded"}
                          </span>
                        </p>
                        {author.orcid ? (
                          <p className="mt-0.5 flex min-w-0 items-start gap-1 text-xs font-normal leading-5 text-[#B0B0B0] lg:items-center lg:truncate">
                            <Hash
                              className="mt-[3px] h-3.5 w-3.5 flex-none text-emerald-700 dark:text-emerald-200 lg:mt-0"
                              aria-hidden="true"
                            />
                            <a
                              href={author.orcid}
                              target="_blank"
                              rel="noreferrer"
                              className={`${researchLinkClass} min-w-0 whitespace-normal break-all lg:truncate`}
                            >
                              {author.orcid}
                            </a>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-[#E2D9CC] pt-4 dark:border-[#444444]">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
                      Google Drive shared users
                    </h3>
                    {canEditResearchInfo ? (
                      <SharedFolderUsersDialog
                        action={updateFolderSharedUsersAction}
                        users={folderSharedUserOptions}
                        selectedUsers={folderSharedUsers}
                      />
                    ) : null}
                  </div>
                  {folderSharedUsers.length > 0 ? (
                    <div className="divide-y divide-[#E2D9CC] border-y border-[#E2D9CC] dark:divide-[#444444] dark:border-[#444444]">
                      {folderSharedUsers.map((folderUser) => (
                        <div
                          key={folderUser.id}
                          className="flex min-w-0 items-start gap-3 py-3"
                        >
                          <FolderCheck
                            className="mt-0.5 h-4 w-4 flex-none text-emerald-700 dark:text-emerald-300"
                            aria-hidden="true"
                          />
                          <p className="min-w-0 break-words text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                            <span className="text-sm text-[#243047] dark:text-[#E4E4E4]">
                              {folderUser.name || folderUser.email}
                            </span>
                            <span
                              className="px-1.5 text-[#9AA4B2] dark:text-[#777777]"
                              aria-hidden="true"
                            >
                              |
                            </span>
                            <span className="break-all">
                              {folderUser.email}
                            </span>
                            <span
                              className="px-1.5 text-[#9AA4B2] dark:text-[#777777]"
                              aria-hidden="true"
                            >
                              |
                            </span>
                            <span>{folderUser.role}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
                      No non-author users are marked as shared yet.
                    </p>
                  )}
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
                      submissionOptions={generalTaskSubmissionOptions}
                      checkerOptions={taskCheckerOptions}
                      taskGuideOptions={taskGuides}
                      canChooseChecker={isRootAdmin}
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

        <section
          id="related-tasks"
          className="scroll-mt-24 space-y-4 border-t border-[#444444] pt-5"
        >
          <div className="flex min-w-0 flex-col gap-3 overflow-visible pr-px lg:flex-row lg:items-center lg:justify-between">
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
                checkers={taskCheckerOptions}
                taskGuideOptions={taskGuides}
                canChooseChecker={isRootAdmin}
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
          publishers={publishers.map((publisher) => ({
            ...publisher,
            alias: publisher.alias ?? "",
            country: publisher.country ?? "",
          }))}
          taskOptions={suggestVenueTaskOptions}
          assistants={taskAssigneeOptions}
          checkers={taskCheckerOptions}
          taskGuideOptions={taskGuides}
          canChooseChecker={isRootAdmin}
          canDeleteVenue={isRootAdmin}
          canAssignTask={canAssignSuggestedVenueSubmitTask}
          canAssignOtherTask={canCreateSubmitOrOtherTask}
          canApproveSuggestion={canApproveVenueSuggestion}
          canEditVenueTaskLink={isRootAdmin}
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
                submissionOptions={generalTaskSubmissionOptions}
                checkerOptions={taskCheckerOptions}
                taskGuideOptions={taskGuides}
                canChooseChecker={isRootAdmin}
                initialMode="suggestVenue"
                initialResearch={currentResearchTaskOption}
                initialTitle={`Suggest venue for research "${project.title}"`}
                triggerVariant="suggestVenue"
              />
            ) : null
          }
          disabled={researchContentLocked}
        />
        <section className="space-y-4 border-t border-[#444444] pt-5">
          <h2 className="flex items-center gap-2 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
            <ListTodo className="h-5 w-5 text-[#B39CD0]" />
            Related tasks
          </h2>
          <RelatedResearchTasksTable
            projectId={project.id}
            rows={relatedTaskRows}
          />
        </section>
        {isAdmin ? <ResearchChangeLogTable rows={researchChangeRows} /> : null}
      </div>
    </>
  );
}
