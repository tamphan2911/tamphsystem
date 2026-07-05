import { redirect } from "next/navigation";
import { prisma, ProposalType, Role } from "@repo/db";
import { auth } from "../../../../auth";
import {
  deleteResearchProject,
  ensureAcceptedProposalRecords,
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

export const dynamic = "force-dynamic";
const projectPageSize = 10;

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

type ProjectSearchParams = {
  q?: string;
  stage?: string;
  claim?: string;
  registration?: string;
  sort?: string;
  page?: string;
  priority?: string;
  productionQueue?: string;
  folderRequests?: string;
};

function selectedValues(value: string | undefined, options: string[]) {
  if (!value || value === "ALL") return [];
  const valid = new Set(options.filter((option) => option !== "ALL"));
  return value.split(",").filter((option) => valid.has(option));
}

const stageFilterOptions = [
  "ALL",
  "PENDING",
  "PRODUCTION",
  "NEED_SUBMIT",
  "SUBMITTED",
  "REVIEW",
  "ACCEPTED",
  "PUBLISHED",
];
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

function parseProjectSort(value: string | undefined) {
  const [column, direction] = (value ?? "NONE").split(":");
  if (
    (column === "stage" ||
      column === "claim" ||
      column === "registration" ||
      column === "submit") &&
    (direction === "asc" || direction === "desc")
  ) {
    return { column, direction };
  }
  return null;
}

function stageFilterKey(row: ResearchProjectRow) {
  if (row.stage === "SUBMITTING") {
    return row.hasSubmittedSubmission ? "SUBMITTED" : "NEED_SUBMIT";
  }
  return row.stage;
}

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

function registrationSortLabel(row: ResearchProjectRow) {
  const label = registrationLabel(row.registerStatus);
  const registerName = row.registerName.trim();
  return row.registerStatus !== "NOT_REGISTERED" && registerName
    ? `${label} - ${registerName}`
    : label;
}

export default async function ProjectsDashboard({
  searchParams,
}: {
  searchParams: Promise<ProjectSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
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
          { assistantTeam: { members: { some: { userId } } } },
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
          authors: {
            select: { name: true, email: true, additionalEmails: true },
            orderBy: [{ name: "asc" }, { email: "asc" }],
          },
          authorEntries: {
            include: {
              user: {
                select: { name: true, email: true, additionalEmails: true },
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
  const query = (resolvedSearchParams.q ?? "").trim();
  const stageValue = resolvedSearchParams.stage || "ALL";
  const claimValue = resolvedSearchParams.claim || "ALL";
  const registrationValue = resolvedSearchParams.registration || "ALL";
  const sortValue = resolvedSearchParams.sort || "NONE";
  const pageValue = Number.parseInt(resolvedSearchParams.page ?? "1", 10);
  const priorityValue = resolvedSearchParams.priority === "1" ? "1" : "0";
  const productionQueueValue =
    resolvedSearchParams.productionQueue === "1" ? "1" : "0";
  const folderRequestValue =
    resolvedSearchParams.folderRequests === "1" ? "1" : "0";
  const selectedStages = selectedValues(stageValue, stageFilterOptions);
  const selectedClaims = selectedValues(claimValue, claimFilterOptions);
  const selectedRegistrations = selectedValues(
    registrationValue,
    registrationFilterOptions,
  );
  const showRegistrationClaim = rows.some(
    (row) => row.canViewRegistrationClaim,
  );
  const showFolderRequestsOnly = isRootAdmin && folderRequestValue === "1";
  const showPriorityOnly = priorityValue === "1";
  const showProductionQueueOnly = isRootAdmin && productionQueueValue === "1";
  const needle = query.toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesStage =
      selectedStages.length === 0 ||
      selectedStages.includes(stageFilterKey(row));
    const matchesClaim =
      !showRegistrationClaim ||
      selectedClaims.length === 0 ||
      selectedClaims.includes(row.claimStatus);
    const matchesRegistration =
      !showRegistrationClaim ||
      selectedRegistrations.length === 0 ||
      selectedRegistrations.includes(row.registerStatus);
    const matchesFolderRequest =
      !showFolderRequestsOnly || row.pendingFolderAccessRequests > 0;
    const matchesPriority = !showPriorityOnly || row.isPriority;
    const matchesProductionQueue =
      !showProductionQueueOnly || Boolean(row.productionPriorityQueuedAt);
    const haystack = [
      row.title,
      row.researchCode,
      row.abstract,
      row.isPriority ? "priority" : "",
      row.productionPriorityQueuedAt ? "production queue" : "",
      row.coAuthors,
      row.leadResearcher,
      row.stage,
      row.canViewRegistrationClaim ? row.universityRegistration : "",
      row.canViewRegistrationClaim ? row.registerName : "",
      row.canViewRegistrationClaim ? row.registerStatus : "",
      row.canViewRegistrationClaim ? row.claimStatus : "",
    ]
      .join(" ")
      .toLowerCase();
    return (
      matchesStage &&
      matchesClaim &&
      matchesRegistration &&
      matchesFolderRequest &&
      matchesPriority &&
      matchesProductionQueue &&
      (!needle || haystack.includes(needle))
    );
  });
  const sort = parseProjectSort(sortValue);
  const sortedRows = showProductionQueueOnly
    ? filteredRows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          const leftTime = new Date(
            left.row.productionPriorityQueuedAt,
          ).getTime();
          const rightTime = new Date(
            right.row.productionPriorityQueuedAt,
          ).getTime();
          if (leftTime === rightTime) return left.index - right.index;
          return leftTime - rightTime;
        })
        .map(({ row }) => row)
    : sort
      ? filteredRows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          let comparison = 0;

          if (sort.column === "stage") {
            comparison = left.row.activeTasks - right.row.activeTasks;
          } else if (sort.column === "submit") {
            comparison = left.row.submissions - right.row.submissions;
          } else if (sort.column === "claim") {
            comparison = claimLabel(left.row.claimStatus).localeCompare(
              claimLabel(right.row.claimStatus),
              undefined,
              { sensitivity: "base" },
            );
          } else {
            comparison = registrationSortLabel(left.row).localeCompare(
              registrationSortLabel(right.row),
              undefined,
              { sensitivity: "base" },
            );
          }

          if (comparison === 0) return left.index - right.index;
          return sort.direction === "desc" ? -comparison : comparison;
        })
        .map(({ row }) => row)
      : filteredRows;
  const totalRows = sortedRows.length;
  const pendingFolderRequestCount = rows.reduce(
    (total, row) => total + row.pendingFolderAccessRequests,
    0,
  );
  const pageCount = Math.max(1, Math.ceil(totalRows / projectPageSize));
  const currentPage = Math.min(
    Math.max(Number.isFinite(pageValue) ? pageValue : 1, 1),
    pageCount,
  );
  const pagedRows = sortedRows.slice(
    (currentPage - 1) * projectPageSize,
    currentPage * projectPageSize,
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
        rows={pagedRows}
        isAdmin={isRootAdmin}
        deleteAction={deleteResearchProject}
        showClaimRegistration={showRegistrationClaim}
        serverState={{
          query,
          stageValue,
          claimValue,
          registrationValue,
          sortValue,
          folderRequestValue,
          priorityValue,
          productionQueueValue,
          page: currentPage,
          pageSize: projectPageSize,
          total: totalRows,
          pendingFolderRequestCount,
        }}
        emptyMessage="No research is connected to your account yet. When you join a study, author a paper, or receive a research task, it will appear here."
      />
    </div>
  );
}
