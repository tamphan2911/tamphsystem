import { redirect } from "next/navigation";
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
  return new Intl.DateTimeFormat("en-GB", {
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

export default async function ResearchProfilePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) redirect("/login");

  const [
    user,
    authoredResearch,
    organizedProjects,
    proposals,
    taskAssignments,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        affiliation: true,
        avatarUrl: true,
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
          { leadResearcherId: userId },
          { authors: { some: { id: userId } } },
          { authorEntries: { some: { userId } } },
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
        conferenceSubmissions: {
          select: { status: true },
        },
        _count: {
          select: { submissions: true, publications: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.organizedProject.findMany({
      where: { members: { some: { userId } } },
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
      where: { submittedById: userId },
      include: {
        submittedBy: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.researchTaskAssignment.findMany({
      where: { userId },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            taskType: true,
            dueDate: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/login");

  const registrationIdentityValues = [user.name, user.email]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());

  const researchRows: ResearchProjectRow[] = authoredResearch.map((project) => {
    const submissionStatuses = [
      ...project.submissions.map((submission) => submission.status),
      ...project.conferenceSubmissions.map((submission) => submission.status),
    ];
    const hasSubmissions = submissionStatuses.length > 0;
    const hasSubmittedSubmission = submissionStatuses.some(
      (status) => status === "PENDING" || status === "SUBMITTED",
    );
    const hasAcceptedSubmission = submissionStatuses.some(
      (status) => status === "ACCEPTED",
    );

    return {
      id: project.id,
      researchCode: project.researchCode ?? "",
      title: project.title,
      abstract: project.abstract ?? "",
      stage: project.stage,
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
        project.registrationUserId === userId ||
        Boolean(
          project.registrationName &&
          registrationIdentityValues.includes(
            project.registrationName.trim().toLowerCase(),
          ),
        ),
      leadResearcher: displayResearchPersonName(project.leadResearcher),
      submissions: project._count.submissions,
      publications: project._count.publications,
      updatedAt: project.updatedAt.toLocaleDateString(),
      notSubmittedAnywhere:
        !hasSubmissions ||
        submissionStatuses.every(
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

  const taskRows = taskAssignments.map((assignment) => ({
    id: assignment.task.id,
    title: assignment.task.title,
    status: assignment.task.status,
    taskType: assignment.task.taskType ?? "OTHER",
    dueDate: assignment.task.dueDate?.toISOString() ?? null,
    completedAt: assignment.task.completedAt?.toISOString() ?? null,
    finishedAt: assignment.finishedAt?.toISOString() ?? null,
    createdAt: assignment.task.createdAt.toISOString(),
    updatedAt: assignment.task.updatedAt.toISOString(),
  }));

  return (
    <ProfileClient
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
      isAssistant={
        user.roles.includes(Role.ASSISTANT) ||
        user.roles.includes(Role.CHIEF_ASSISTANT)
      }
    />
  );
}
