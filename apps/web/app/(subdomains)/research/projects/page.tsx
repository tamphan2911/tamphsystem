import { redirect } from "next/navigation";
import { prisma, ProposalType, Role } from "@repo/db";
import { auth } from "../../../../auth";
import {
  deleteResearchProject,
  ensureAcceptedProposalRecords,
  updateResearchProject,
} from "../actions";
import { ProposalDialog } from "@/sites/research/components/ProposalDialog";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { NewResearchDialog } from "./NewResearchDialog";
import {
  ResearchProjectsTable,
  type ResearchProjectRow,
} from "./ResearchProjectsTable";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import type { SelectedAuthor } from "./[id]/AuthorsPicker";
import type { ResearchBasicValues } from "./[id]/ResearchDetailEditDialogs";

export const dynamic = "force-dynamic";

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

async function ensureResearchCodes() {
  const projects = await prisma.researchProject.findMany({
    where: { researchCode: null },
    select: { id: true, createdAt: true },
  });

  if (projects.length === 0) return;

  const existing = await prisma.researchProject.findMany({
    where: { researchCode: { not: null } },
    select: { researchCode: true },
  });
  const usedByYear = new Map<number, Set<number>>();

  for (const project of existing) {
    const [yearText, numberText] = project.researchCode?.split("-") ?? [];
    const year = Number(yearText);
    const number = Number(numberText);
    if (!Number.isFinite(year) || !Number.isFinite(number)) continue;
    const used = usedByYear.get(year) ?? new Set<number>();
    used.add(number);
    usedByYear.set(year, used);
  }

  const byYear = new Map<number, typeof projects>();
  for (const project of projects) {
    const year = project.createdAt.getFullYear();
    byYear.set(year, [...(byYear.get(year) ?? []), project]);
  }

  for (const [year, yearProjects] of byYear) {
    const used = usedByYear.get(year) ?? new Set<number>();
    const shuffled = [...yearProjects].sort(() => Math.random() - 0.5);

    for (const project of shuffled) {
      let next = 1;
      while (used.has(next)) next += 1;
      used.add(next);
      await prisma.researchProject.update({
        where: { id: project.id },
        data: { researchCode: `${year}-${String(next).padStart(2, "0")}` },
      });
    }
  }
}

const claimFilterOptions = [
  "ALL",
  "CANNOT_CLAIM",
  "WAITING_PUBLISH",
  "MAKING_DOCUMENT",
  "WAITING",
  "CLAIMED",
];
const registrationFilterOptions = [
  "ALL",
  "NOT_REGISTERED",
  "PREPARING",
  "SUBMITTED",
  "APPROVED",
];

function claimLabel(claim: string) {
  if (claim === "CANNOT_CLAIM") return "Cannot claim";
  if (claim === "WAITING_PUBLISH") return "Waiting publish";
  if (claim === "MAKING_DOCUMENT") return "Making document";
  if (claim === "WAITING") return "Waiting";
  if (claim === "CLAIMED") return "Claimed";
  return claim.replace("_", " ");
}

function registrationLabel(status: string) {
  if (status === "APPROVED") return "Approved";
  if (status === "SUBMITTED") return "Submitted";
  if (status === "PREPARING") return "Plan";
  return "Not registered";
}

export default async function ProjectsDashboard() {
  await ensureAcceptedProposalRecords(ProposalType.RESEARCH);
  await ensureResearchCodes();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) redirect("/login");
  const registrationIdentityValues = [session.user?.name, session.user?.email]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase());
  const registrationIdentityFilters = registrationIdentityValues.map(
    (value) => ({
      registrationName: { equals: value, mode: "insensitive" as const },
    }),
  );
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true, emailVerified: true },
  });
  const roles =
    currentUser?.roles ??
    (((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[]);
  const isRootAdmin = roles.includes(Role.ADMIN);
  const projectWhere = isRootAdmin
    ? {}
    : {
        OR: [
          { leadResearcherId: userId },
          { authors: { some: { id: userId } } },
          { authorEntries: { some: { userId } } },
          { registrationUserId: userId },
          { tasks: { some: { assignments: { some: { userId } } } } },
          { assistantTeam: { leaderId: userId } },
          { teamParticipants: { some: { userId } } },
          ...registrationIdentityFilters,
        ],
      };

  const [projects, authorUsers, fundingInstitutions, assistantTeams] =
    await Promise.all([
      prisma.researchProject.findMany({
        where: projectWhere,
        include: {
          leadResearcher: { select: { name: true, email: true } },
          registrationUser: {
            select: {
              id: true,
              name: true,
              email: true,
              additionalEmails: true,
              roles: true,
            },
          },
          fundingInstitution: true,
          assistantTeam: {
            select: {
              id: true,
              name: true,
              leaderId: true,
              leader: { select: { name: true, email: true } },
              _count: { select: { members: true } },
            },
          },
          authors: {
            select: {
              id: true,
              name: true,
              email: true,
              additionalEmails: true,
              affiliation: true,
              orcid: true,
              roles: true,
            },
            orderBy: [{ name: "asc" }, { email: "asc" }],
          },
          authorEntries: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  additionalEmails: true,
                  affiliation: true,
                  orcid: true,
                  roles: true,
                },
              },
            },
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
      prisma.user.findMany({
        where: { activeSites: { has: "research" } },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          additionalEmails: true,
          roles: true,
        },
      }),
      prisma.fundingInstitution.findMany({
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, shortName: true, country: true },
      }),
      prisma.researchAssistantTeam.findMany({
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          leader: { select: { name: true, email: true } },
          _count: { select: { members: true } },
        },
      }),
    ]);
  const authorOptions = authorUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    additionalEmails: user.additionalEmails,
    role: displayRole(user.roles),
  }));
  const fundingInstitutionOptions = fundingInstitutions.map((institution) => ({
    id: institution.id,
    name: institution.name,
    shortName: institution.shortName ?? "",
    country: institution.country ?? "",
  }));
  const registerOptions = registrationFilterOptions
    .filter((value) => value !== "ALL")
    .map((value) => ({ value, label: registrationLabel(value) }));
  const claimOptions = claimFilterOptions
    .filter((value) => value !== "ALL")
    .map((value) => ({ value, label: claimLabel(value) }));

  const claimed = projects.filter(
    (project) => project.claimStatus === "CLAIMED",
  );

  const now = new Date();
  const productionQueuePositionByProjectId = new Map(
    projects
      .filter((project) => project.productionPriorityQueuedAt)
      .sort(
        (left, right) =>
          left.productionPriorityQueuedAt!.getTime() -
          right.productionPriorityQueuedAt!.getTime(),
      )
      .map((project, index) => [project.id, index + 1]),
  );
  const rows: ResearchProjectRow[] = projects.map((project) => {
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
    const hasPublishedSubmission = journalSubmissionStatuses.some(
      (status) => status === "PUBLISHED",
    );
    const ongoingSubmissionCount = journalSubmissionStatuses.filter(
      (status) =>
        !["REJECTED", "WITHDRAWN", "ACCEPTED", "PUBLISHED"].includes(status),
    ).length;

    const editAuthors: SelectedAuthor[] =
      project.authorEntries.length > 0
        ? project.authorEntries.map((entry) => ({
            id: entry.user.id,
            name: entry.user.name ?? "",
            email: entry.user.email,
            additionalEmails: entry.user.additionalEmails,
            selectedEmail: entry.selectedEmail ?? entry.user.email,
            affiliation: entry.user.affiliation,
            orcid: entry.user.orcid,
            role: displayRole(entry.user.roles),
            position: entry.position,
            isCorresponding: entry.isCorresponding,
          }))
        : project.authors.map((author, index) => ({
            id: author.id,
            name: author.name ?? "",
            email: author.email,
            additionalEmails: author.additionalEmails,
            selectedEmail: author.email,
            affiliation: author.affiliation,
            orcid: author.orcid,
            role: displayRole(author.roles),
            position: index + 1,
            isCorresponding: index === 0,
          }));
    const editValues: ResearchBasicValues = {
      title: project.title,
      sharedFolderUrl: project.sharedFolderUrl ?? "",
      abstract: project.abstract ?? "",
      universityRegistration: project.universityRegistration ?? "",
      registrationName: project.registrationName ?? "",
      registerStatus: project.registerStatus,
      claimStatus: project.claimStatus,
      isPriority: project.isPriority,
      needsFollowUp: project.needsFollowUp,
      productionPriorityQueuedAt:
        project.productionPriorityQueuedAt?.toISOString() ?? "",
      registrationUser: project.registrationUser
        ? {
            id: project.registrationUser.id,
            name: project.registrationUser.name ?? "",
            email: project.registrationUser.email,
            additionalEmails: project.registrationUser.additionalEmails,
            role: displayRole(project.registrationUser.roles),
          }
        : null,
      fundingInstitution: project.fundingInstitution
        ? {
            id: project.fundingInstitution.id,
            name: project.fundingInstitution.name,
            shortName: project.fundingInstitution.shortName ?? "",
            country: project.fundingInstitution.country ?? "",
          }
        : null,
      assistantTeam: project.assistantTeam
        ? {
            id: project.assistantTeam.id,
            name: project.assistantTeam.name,
            leaderName: project.assistantTeam.leader.name ?? "",
            leaderEmail: project.assistantTeam.leader.email,
            memberCount: project.assistantTeam._count.members,
          }
        : null,
    };

    return {
      id: project.id,
      researchCode: project.researchCode ?? "",
      title: project.title,
      abstract: project.abstract ?? "",
      isPriority: project.isPriority,
      needsFollowUp: project.needsFollowUp,
      productionPriorityQueuedAt:
        project.productionPriorityQueuedAt?.toISOString() ?? "",
      productionQueuePosition:
        productionQueuePositionByProjectId.get(project.id) ?? null,
      stage: journalFocusedResearchStage(project),
      claimStatus: project.claimStatus,
      registerStatus: project.registerStatus,
      coAuthors:
        project.authorEntries.length > 0
          ? project.authorEntries
              .map(
                (entry) =>
                  `${displayResearchPersonName(entry.user)}${entry.isCorresponding ? "*" : ""}`,
              )
              .join(", ")
          : project.authors.length > 0
            ? project.authors
                .map(
                  (author, index) =>
                    `${displayResearchPersonName(author)}${index === 0 ? "*" : ""}`,
                )
                .join(", ")
            : (project.coAuthors ?? ""),
      universityRegistration: project.universityRegistration ?? "",
      registerName:
        project.registrationUser?.name ||
        displayResearchEmail(project.registrationUser?.email) ||
        project.registrationName ||
        "",
      canViewRegistrationClaim:
        isRootAdmin ||
        project.registrationUserId === userId ||
        Boolean(
          project.registrationName &&
          registrationIdentityValues.includes(
            project.registrationName.trim().toLowerCase(),
          ),
        ),
      leadResearcher: displayResearchPersonName(project.leadResearcher),
      submissions: project._count.submissions,
      ongoingSubmissions: ongoingSubmissionCount,
      publications: project._count.publications,
      activeTasks: project._count.tasks,
      overdueTasks: project.tasks.filter(
        (task) => task.dueDate && task.dueDate < now,
      ).length,
      canViewTaskCounts:
        isRootAdmin || project.assistantTeam?.leaderId === userId,
      pendingFolderAccessRequests: project._count.folderAccessRequests,
      updatedAt: researchDateTimeFormat("en-GB").format(project.updatedAt),
      notSubmittedAnywhere:
        !hasJournalSubmissions ||
        journalSubmissionStatuses.every(
          (status) => status === "REJECTED" || status === "WITHDRAWN",
        ),
      hasSubmittedSubmission,
      hasAcceptedSubmission,
      hasAcceptedOrPublishedSubmission:
        hasAcceptedSubmission || hasPublishedSubmission,
      editValues,
      editAuthors,
      completedProductionSteps: project.completedProductionSteps,
    };
  });

  const production = rows.filter((row) => row.stage === "PRODUCTION");
  const needSubmit = rows.filter(
    (row) => row.stage === "SUBMITTING" && !row.hasSubmittedSubmission,
  );
  const submitted = rows.filter(
    (row) =>
      row.stage === "SUBMITTED" ||
      (row.stage === "SUBMITTING" && row.hasSubmittedSubmission),
  );
  const accepted = rows.filter((row) => row.hasAcceptedSubmission);
  const published = rows.filter((row) => row.stage === "PUBLISHED");
  const showRegistrationClaim = rows.some(
    (row) => row.canViewRegistrationClaim,
  );

  const stats = [
    {
      label: "Production",
      value: production.length,
    },
    {
      label: "Need submit",
      value: needSubmit.length,
    },
    {
      label: "Submitted",
      value: submitted.length,
    },
    {
      label: "Accepted",
      value: accepted.length,
    },
    {
      label: "Published",
      value: published.length,
    },
    ...(isRootAdmin
      ? [
          {
            label: "Claimed",
            value: claimed.length,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div
            className={`grid min-w-0 border border-[#444444] bg-[#2C2C2C] ${
              isRootAdmin ? "sm:grid-cols-6" : "sm:grid-cols-5"
            }`}
          >
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4] ${
                  index > 0 ? "border-l border-[#444444]" : ""
                }`}
              >
                <span className="font-normal text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-none items-center">
            {isRootAdmin ? (
              <NewResearchDialog
                users={authorOptions}
                isAdmin={isRootAdmin}
                fundingInstitutions={fundingInstitutions.map((institution) => ({
                  id: institution.id,
                  name: institution.name,
                  shortName: institution.shortName ?? "",
                  country: institution.country ?? "",
                }))}
                assistantTeams={assistantTeams.map((team) => ({
                  id: team.id,
                  name: team.name,
                  leaderName: team.leader.name ?? "",
                  leaderEmail: team.leader.email,
                  memberCount: team._count.members,
                }))}
              />
            ) : (
              <ProposalDialog
                type="RESEARCH"
                isLoggedIn={Boolean(session)}
                hasVerifiedEmail={Boolean(currentUser?.emailVerified)}
              />
            )}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <ResearchProjectsTable
        rows={rows}
        isAdmin={isRootAdmin}
        deleteAction={deleteResearchProject}
        quickEditAction={updateResearchProject}
        users={authorOptions}
        fundingInstitutions={fundingInstitutionOptions}
        assistantTeams={assistantTeams.map((team) => ({
          id: team.id,
          name: team.name,
          leaderName: team.leader.name ?? "",
          leaderEmail: team.leader.email,
          memberCount: team._count.members,
        }))}
        registerOptions={registerOptions}
        claimOptions={claimOptions}
        showClaimRegistration={showRegistrationClaim}
        emptyMessage="No research is connected to your account yet. When you join a study, author a paper, or receive a research task, it will appear here."
      />
    </div>
  );
}
