import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deleteResearchProject } from "../actions";
import { ProposalDialog } from "@/sites/research/components/ProposalDialog";
import { NewResearchDialog } from "./NewResearchDialog";
import {
  ResearchProjectsTable,
  type ResearchProjectRow,
} from "./ResearchProjectsTable";

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

export default async function ProjectsDashboard() {
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
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const canManageResearch =
    isAdmin ||
    roles.includes(Role.ASSISTANT) ||
    roles.includes(Role.CHIEF_ASSISTANT);
  const projectWhere = isAdmin
    ? {}
    : {
        OR: [
          { leadResearcherId: userId },
          { authors: { some: { id: userId } } },
          { authorEntries: { some: { userId } } },
          { registrationUserId: userId },
          { tasks: { some: { assignments: { some: { userId } } } } },
          ...registrationIdentityFilters,
        ],
      };

  const [projects, authorUsers, fundingInstitutions, currentUser] =
    await Promise.all([
      prisma.researchProject.findMany({
        where: projectWhere,
        include: {
          leadResearcher: { select: { name: true, email: true } },
          registrationUser: {
            select: { id: true, name: true, email: true, roles: true },
          },
          authors: {
            select: { name: true, email: true },
            orderBy: [{ name: "asc" }, { email: "asc" }],
          },
          authorEntries: {
            include: { user: { select: { name: true, email: true } } },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
          _count: {
            select: { submissions: true, publications: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.user.findMany({
        where: { activeSites: { has: "research" } },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true, roles: true },
      }),
      prisma.fundingInstitution.findMany({
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, shortName: true, country: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      }),
    ]);
  const authorOptions = authorUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    role: displayRole(user.roles),
  }));

  const submitting = projects.filter(
    (project) => project.stage === "SUBMITTING",
  );
  const published = projects.filter((project) => project.stage === "PUBLISHED");
  const claimQueue = projects.filter(
    (project) =>
      project.claimStatus === "WAITING_PUBLISH" ||
      project.claimStatus === "MAKING_DOCUMENT" ||
      project.claimStatus === "WAITING",
  );

  const rows: ResearchProjectRow[] = projects.map((project) => ({
    id: project.id,
    researchCode: project.researchCode ?? "",
    title: project.title,
    abstract: project.abstract ?? "",
    stage: project.stage,
    claimStatus: project.claimStatus,
    registerStatus: project.registerStatus,
    coAuthors:
      project.authorEntries.length > 0
        ? project.authorEntries
            .map(
              (entry) =>
                `${entry.user.name || entry.user.email}${entry.isCorresponding ? "*" : ""}`,
            )
            .join(", ")
        : project.authors.length > 0
          ? project.authors
              .map(
                (author, index) =>
                  `${author.name || author.email}${index === 0 ? "*" : ""}`,
              )
              .join(", ")
          : (project.coAuthors ?? ""),
    universityRegistration: project.universityRegistration ?? "",
    registerName:
      project.registrationUser?.name ||
      project.registrationUser?.email ||
      project.registrationName ||
      "",
    canViewRegistrationClaim:
      isAdmin ||
      project.registrationUserId === userId ||
      Boolean(
        project.registrationName &&
        registrationIdentityValues.includes(
          project.registrationName.trim().toLowerCase(),
        ),
      ),
    leadResearcher: project.leadResearcher.name || project.leadResearcher.email,
    submissions: project._count.submissions,
    publications: project._count.publications,
    updatedAt: project.updatedAt.toLocaleDateString(),
  }));

  const stats = [
    {
      label: "Total",
      value: projects.length,
    },
    {
      label: "Submitted",
      value: submitting.length,
    },
    {
      label: "Published",
      value: published.length,
    },
    {
      label: "Claims",
      value: claimQueue.length,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {canManageResearch ? (
          <div className="grid w-full border border-[#444444] bg-[#2C2C2C] sm:w-auto sm:grid-cols-4">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`px-3 py-2 text-sm text-[#E4E4E4] ${
                  index > 0
                    ? "border-t border-[#444444] sm:border-l sm:border-t-0"
                    : ""
                }`}
              >
                <span className="font-normal text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center justify-end">
          {isAdmin ? (
            <NewResearchDialog
              users={authorOptions}
              isAdmin={isAdmin}
              fundingInstitutions={fundingInstitutions.map((institution) => ({
                id: institution.id,
                name: institution.name,
                shortName: institution.shortName ?? "",
                country: institution.country ?? "",
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

      <ResearchProjectsTable
        rows={rows}
        isAdmin={isAdmin}
        deleteAction={deleteResearchProject}
        emptyMessage="No research is connected to your account yet. When you join a study, author a paper, or receive a research task, it will appear here."
      />
    </div>
  );
}
