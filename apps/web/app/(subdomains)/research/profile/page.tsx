import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { notFound, redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ProfileClient } from "./ProfileClient";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import type { ResearchProjectRow } from "../projects/ResearchProjectsTable";
import type { OrganizedProjectRow } from "../organized-projects/OrganizedProjectsTable";
import type { ProposalRow } from "../proposals/ProposalsTable";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  if (!value) return "";
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function durationLabel(months: number | null) {
  if (!months || months <= 0) return "";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (remainingMonths) {
    parts.push(
      `${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`,
    );
  }
  return parts.join(" ");
}

function fileSizeLabel(value: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function authorLine(project: {
  authorEntries: {
    isCorresponding: boolean;
    user: { name: string | null; email: string };
  }[];
  authors: { name: string | null; email: string }[];
  leadResearcher: { name: string | null; email: string };
  coAuthors: string | null;
}) {
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

const productionStepLabels = [
  "Idea forming",
  "Data collection",
  "Modeling",
  "Writing",
  "Humanizing",
  "References",
];

function journalFocusedResearchStage(project: {
  stage: string;
  completedProductionSteps: string[];
  submissions: { status: string }[];
}) {
  const journalStatuses = project.submissions.map(
    (submission) => submission.status,
  );
  if (journalStatuses.includes("PUBLISHED")) return "PUBLISHED";
  if (journalStatuses.includes("ACCEPTED")) return "ACCEPTED";
  if (
    journalStatuses.some(
      (status) => status === "UNDER_REVIEW" || status === "REVISION",
    )
  ) {
    return "REVIEW";
  }
  if (
    journalStatuses.some(
      (status) =>
        status === "PENDING" || status === "REJECTED" || status === "WITHDRAWN",
    )
  ) {
    return "SUBMITTING";
  }
  if (project.stage === "PENDING") return "PENDING";
  return productionStepLabels.every((step) =>
    project.completedProductionSteps.includes(step),
  )
    ? "SUBMITTING"
    : "PRODUCTION";
}

export default async function ResearchProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await auth();
  const viewerUserId = (session?.user as { id?: string } | undefined)?.id;

  if (!viewerUserId) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: { roles: true },
  });
  if (!viewer) redirect("/login");

  const requestedUserId = (await searchParams).userId?.trim();
  const viewingAnotherUser = Boolean(
    requestedUserId && requestedUserId !== viewerUserId,
  );
  const profileUserId = requestedUserId || viewerUserId;
  const canViewTeamMemberProfile =
    viewingAnotherUser &&
    viewer.roles.includes(Role.CHIEF_ASSISTANT)
      ? Boolean(
          await prisma.researchAssistantTeam.findFirst({
            where: {
              leaderId: viewerUserId,
              members: { some: { userId: profileUserId } },
            },
            select: { id: true },
          }),
        )
      : false;
  if (
    viewingAnotherUser &&
    !viewer.roles.includes(Role.ADMIN) &&
    !canViewTeamMemberProfile
  ) {
    redirect("/401");
  }

  const [
    user,
    authoredResearch,
    organizedProjects,
    proposals,
    taskAssignments,
    checkerTasks,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: profileUserId },
      select: {
        id: true,
        name: true,
        email: true,
        additionalEmails: true,
        affiliation: true,
        orcid: true,
        bio: true,
        avatarUrl: true,
        researchThemePreference: true,
        emailVerified: true,
        roles: true,
        createdAt: true,
        _count: {
          select: {
            researchProjects: true,
            authoredResearch: true,
            registeredResearch: true,
            assignedResearchTasks: true,
          },
        },
      },
    }),
    prisma.researchProject.findMany({
      where: {
        OR: [
          { leadResearcherId: profileUserId },
          { authors: { some: { id: profileUserId } } },
          { authorEntries: { some: { userId: profileUserId } } },
        ],
      },
      include: {
        leadResearcher: { select: { name: true, email: true } },
        registrationUser: { select: { id: true, name: true, email: true } },
        authors: {
          select: { name: true, email: true },
          orderBy: [{ name: "asc" }, { email: "asc" }],
        },
        authorEntries: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        },
        submissions: {
          select: { status: true },
        },
        tasks: {
          where: { status: { notIn: ["COMPLETED", "REVOKED"] } },
          select: { dueDate: true },
        },
        _count: {
          select: {
            submissions: true,
            publications: true,
            tasks: {
              where: { status: { notIn: ["COMPLETED", "REVOKED"] } },
            },
            folderAccessRequests: {
              where: { status: "PENDING" },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.organizedProject.findMany({
      where: { members: { some: { userId: profileUserId } } },
      include: {
        fundingInstitution: true,
        members: {
          include: { user: true },
          orderBy: { position: "asc" },
        },
        research: {
          include: {
            researchProject: {
              include: {
                _count: { select: { submissions: true, publications: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.proposal.findMany({
      where: { submittedById: profileUserId },
      include: {
        submittedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.researchTaskAssignment.findMany({
      where: { userId: profileUserId },
      include: {
        task: {
          select: {
            id: true,
            taskCode: true,
            title: true,
            description: true,
            category: true,
            status: true,
            taskType: true,
            dueDate: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
            assignments: { select: { userId: true } },
            clarifications: {
              where: { answer: null },
              select: { requestedById: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.researchTask.findMany({
      where: { checkerId: profileUserId },
      select: {
        id: true,
        taskCode: true,
        title: true,
        description: true,
        category: true,
        status: true,
        taskType: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        assignments: { select: { userId: true, finishedAt: true } },
        clarifications: {
          where: { answer: null },
          select: { requestedById: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!user) notFound();

  const registrationIdentityValues = [user.name, user.email]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());

  const now = new Date();
  const productionQueuePositionByProjectId = new Map(
    authoredResearch
      .filter((project) => project.productionPriorityQueuedAt)
      .sort(
        (left, right) =>
          left.productionPriorityQueuedAt!.getTime() -
          right.productionPriorityQueuedAt!.getTime(),
      )
      .map((project, index) => [project.id, index + 1]),
  );
  const researchRows: ResearchProjectRow[] = authoredResearch.map((project) => {
    const journalSubmissionStatuses = project.submissions.map(
      (submission) => submission.status,
    );
    const hasJournalSubmissions = journalSubmissionStatuses.length > 0;
    const hasSubmittedSubmission = journalSubmissionStatuses.some(
      (status) => status === "PENDING",
    );
    const hasAcceptedSubmission = journalSubmissionStatuses.some(
      (status) => status === "ACCEPTED",
    );

    return {
      id: project.id,
      researchCode: project.researchCode ?? "",
      title: project.title,
      abstract: project.abstract ?? "",
      isPriority: project.isPriority,
      productionPriorityQueuedAt:
        project.productionPriorityQueuedAt?.toISOString() ?? "",
      productionQueuePosition:
        productionQueuePositionByProjectId.get(project.id) ?? null,
      stage: journalFocusedResearchStage(project),
      claimStatus: project.claimStatus,
      registerStatus: project.registerStatus,
      coAuthors: authorLine(project),
      universityRegistration: project.universityRegistration ?? "",
      registerName:
        project.registrationUser?.name ||
        displayResearchEmail(project.registrationUser?.email) ||
        project.registrationName ||
        "",
      canViewRegistrationClaim:
        project.registrationUserId === profileUserId ||
        Boolean(
          project.registrationName &&
          registrationIdentityValues.includes(
            project.registrationName.trim().toLowerCase(),
          ),
        ),
      leadResearcher: displayResearchPersonName(project.leadResearcher),
      submissions: project._count.submissions,
      publications: project._count.publications,
      activeTasks: project._count.tasks,
      overdueTasks: project.tasks.filter(
        (task) => task.dueDate && task.dueDate < now,
      ).length,
      pendingFolderAccessRequests: project._count.folderAccessRequests,
      updatedAt: researchDateTimeFormat("en-GB").format(project.updatedAt),
      notSubmittedAnywhere:
        !hasJournalSubmissions ||
        journalSubmissionStatuses.every(
          (status) => status === "REJECTED" || status === "WITHDRAWN",
        ),
      hasSubmittedSubmission,
      hasAcceptedSubmission,
    };
  });

  const projectRows: OrganizedProjectRow[] = organizedProjects.map(
    (project) => ({
      id: project.id,
      title: project.title,
      organizer: project.fundingInstitution?.name ?? project.organizer ?? "",
      referenceCode: project.referenceCode ?? "",
      description: project.description ?? "",
      status: project.status,
      financialClaimStatus: project.financialClaimStatus,
      fundingAmount: project.fundingAmount?.toString() ?? "",
      fundingCurrency: project.fundingCurrency,
      durationLabel: durationLabel(project.durationMonths),
      startDate: shortDate(project.startDate),
      endDate: shortDate(project.endDate),
      note: project.note ?? "",
      hasSharedFolder: Boolean(project.sharedFolderUrl),
      members: project.members.map((member) => ({
        id: member.user.id,
        name: member.user.name ?? "",
        email: displayResearchEmail(member.user.email),
        isTeamLead: member.isTeamLead,
        isInstructor: member.isInstructor,
      })),
      researchCount: project.research.length,
      research: project.research.map(({ researchProject }) => ({
        id: researchProject.id,
        title: researchProject.title,
        stage: researchProject.stage,
        submissions: researchProject._count.submissions,
        publications: researchProject._count.publications,
      })),
    }),
  );

  const proposalRows: ProposalRow[] = proposals.map((proposal) => ({
    id: proposal.id,
    type: proposal.type,
    status: proposal.status,
    title: proposal.title,
    description: proposal.description,
    contactInfo: proposal.contactInfo ?? "",
    notes: proposal.notes ?? "",
    identifier: proposal.identifier ?? "",
    organization: proposal.organization ?? "",
    location: proposal.location ?? "",
    website: proposal.website ?? "",
    decisionComment: proposal.decisionComment ?? "",
    fileName: proposal.supportFileName ?? "",
    fileSize: fileSizeLabel(proposal.supportFileSize),
    submittedBy: displayResearchPersonName(proposal.submittedBy),
    submittedByEmail: displayResearchEmail(proposal.submittedBy.email),
    createdAt: shortDate(proposal.createdAt),
  }));

  const taskRows = taskAssignments.map((assignment) => {
    const openClarification = assignment.task.clarifications[0] ?? null;
    const clarifyDirection = openClarification
      ? assignment.task.assignments.some(
          (taskAssignment) =>
            taskAssignment.userId === openClarification.requestedById,
        )
        ? ("ASSIGNEE_TO_MANAGER" as const)
        : ("MANAGER_TO_ASSIGNEE" as const)
      : null;
    return {
      id: assignment.task.id,
      taskCode: assignment.task.taskCode,
      title: assignment.task.title,
      description: assignment.task.description ?? "",
      category: assignment.task.category ?? "",
      status: assignment.task.status,
      clarifyDirection,
      taskType: assignment.task.taskType ?? "OTHER",
      dueDate: assignment.task.dueDate?.toISOString() ?? null,
      completedAt: assignment.task.completedAt?.toISOString() ?? null,
      finishedAt: assignment.finishedAt?.toISOString() ?? null,
      createdAt: assignment.task.createdAt.toISOString(),
      updatedAt: assignment.task.updatedAt.toISOString(),
    };
  });
  const checkerTaskRows = checkerTasks.map((task) => {
    const openClarification = task.clarifications[0] ?? null;
    const clarifyDirection = openClarification
      ? task.assignments.some(
          (taskAssignment) =>
            taskAssignment.userId === openClarification.requestedById,
        )
        ? ("ASSIGNEE_TO_MANAGER" as const)
        : ("MANAGER_TO_ASSIGNEE" as const)
      : null;
    const latestFinishedAt = task.assignments.reduce<Date | null>(
      (latest, assignment) => {
        if (!assignment.finishedAt) return latest;
        return !latest || assignment.finishedAt > latest
          ? assignment.finishedAt
          : latest;
      },
      null,
    );

    return {
      id: task.id,
      taskCode: task.taskCode,
      title: task.title,
      description: task.description ?? "",
      category: task.category ?? "",
      status: task.status,
      clarifyDirection,
      taskType: task.taskType ?? "OTHER",
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      finishedAt: latestFinishedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  });

  return (
    <ProfileClient
      key={user.id}
      user={{
        ...user,
        email: displayResearchEmail(user.email),
        emailVerified: user.emailVerified?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      }}
      researchRows={researchRows}
      projectRows={projectRows}
      proposalRows={proposalRows}
      taskRows={taskRows}
      checkerTaskRows={checkerTaskRows}
      canEditProfile={!viewingAnotherUser || viewer.roles.includes(Role.ADMIN)}
      canChangePassword={!viewingAnotherUser}
      canViewWorkflowGuides={viewer.roles.includes(Role.ADMIN)}
    />
  );
}
