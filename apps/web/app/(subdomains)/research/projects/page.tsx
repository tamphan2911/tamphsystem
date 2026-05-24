import { Clock, FileText, Send, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import {
  ClaimStatus,
  prisma,
  RegistrationStatus,
  ResearchStage,
  Role,
  SubmissionStatus,
} from "@repo/db";
import { auth } from "../../../../auth";
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

const demoProjects = [
  {
    title: "AI-Assisted Literature Mapping for FinTech Research",
    abstract:
      "Demo pipeline for mapping fintech literature, methods, and journal-fit signals.",
    stage: ResearchStage.REVIEW,
    claimStatus: ClaimStatus.WAITING,
    registerStatus: RegistrationStatus.PREPARING,
    universityRegistration: "Plan Q2 2026",
    coAuthors: "Demo Admin, Demo Researcher",
    submissions: 12,
  },
  {
    title: "Banking Risk Disclosure Quality in Emerging Markets",
    abstract:
      "Demo study on risk disclosure patterns and financial reporting quality.",
    stage: ResearchStage.ACCEPTED,
    claimStatus: ClaimStatus.MAKING_DOCUMENT,
    registerStatus: RegistrationStatus.SUBMITTED,
    universityRegistration: "Q1 2026",
    coAuthors: "Demo Admin, Demo Lecturer",
    submissions: 14,
  },
  {
    title: "Digital Learning Analytics for Research Skill Development",
    abstract:
      "Demo LMS analytics project for measuring research training outcomes.",
    stage: ResearchStage.SUBMITTING,
    claimStatus: ClaimStatus.CANNOT_CLAIM,
    registerStatus: RegistrationStatus.APPROVED,
    universityRegistration: "Q4 2025",
    coAuthors: "Demo Researcher",
    submissions: 7,
  },
  {
    title: "Corporate Green Innovation and Capital Market Response",
    abstract: "Demo empirical finance project on green innovation disclosure.",
    stage: ResearchStage.PRODUCTION,
    claimStatus: ClaimStatus.CANNOT_CLAIM,
    registerStatus: RegistrationStatus.PREPARING,
    universityRegistration: "Plan Q3 2026",
    coAuthors: "Demo Admin, Demo Assistant",
    submissions: 0,
  },
  {
    title: "Reference Quality and Citation Behavior in Applied Research",
    abstract:
      "Demo project reviewing reference quality, citation behavior, and manuscript readiness.",
    stage: ResearchStage.PUBLISHED,
    claimStatus: ClaimStatus.CLAIMED,
    registerStatus: RegistrationStatus.APPROVED,
    universityRegistration: "Q3 2025",
    coAuthors: "Demo Admin",
    submissions: 11,
  },
  {
    title: "AI Feedback Loops in Academic Writing Workflows",
    abstract:
      "Demo research record studying how AI feedback loops support clarity, revision speed, and manuscript quality.",
    stage: ResearchStage.PRODUCTION,
    claimStatus: ClaimStatus.CANNOT_CLAIM,
    registerStatus: RegistrationStatus.PREPARING,
    universityRegistration: "Demo plan Q3 2026",
    coAuthors: "Demo Research Team",
    submissions: 0,
  },
  {
    title: "Journal Selection Signals for Interdisciplinary Manuscripts",
    abstract:
      "Demo project comparing venue fit, scope alignment, rank signals, and submission readiness for interdisciplinary manuscripts.",
    stage: ResearchStage.SUBMITTING,
    claimStatus: ClaimStatus.MAKING_DOCUMENT,
    registerStatus: RegistrationStatus.SUBMITTED,
    universityRegistration: "Demo registration 2026",
    coAuthors: "Demo Admin; Demo Assistant",
    submissions: 5,
  },
  {
    title: "Research Task Assignment Efficiency in Submission Pipelines",
    abstract:
      "Demo operations study about assigning submission tasks, tracking overdue work, and reducing handoff delays.",
    stage: ResearchStage.REVIEW,
    claimStatus: ClaimStatus.WAITING,
    registerStatus: RegistrationStatus.APPROVED,
    universityRegistration: "Demo Q2 2026",
    coAuthors: "Demo Chief Assistant",
    submissions: 8,
  },
  {
    title: "Conference-to-Journal Publication Pathways in Education Technology",
    abstract:
      "Demo research record following conference submission outcomes and later journal publication planning.",
    stage: ResearchStage.ACCEPTED,
    claimStatus: ClaimStatus.CLAIMED,
    registerStatus: RegistrationStatus.APPROVED,
    universityRegistration: "Demo Q1 2026",
    coAuthors: "Demo Lecturer; Demo Researcher",
    submissions: 10,
  },
];

async function ensureDemoResearchProjects() {
  const leadResearcher = await prisma.user.findFirst({
    where: { roles: { hasSome: ["ADMIN", "RESEARCHER", "LECTURER"] } },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  if (!leadResearcher) return;

  const demoJournals = await Promise.all(
    Array.from({ length: 14 }, async (_, index) => {
      const name = `Demo Research Journal ${String(index + 1).padStart(2, "0")}`;
      const existing = await prisma.journal.findFirst({ where: { name } });

      if (existing) return existing;

      return prisma.journal.create({
        data: {
          name,
          field: index % 2 === 0 ? "Finance" : "Research methods",
          rank:
            index % 4 === 0
              ? "Q1"
              : index % 4 === 1
                ? "Q2"
                : index % 4 === 2
                  ? "Q3"
                  : "Q4",
          publisher:
            index % 2 === 0 ? "Demo Academic Press" : "Demo Research Group",
        },
      });
    }),
  );

  for (const demo of demoProjects) {
    const project =
      (await prisma.researchProject.findFirst({
        where: { title: demo.title },
      })) ??
      (await prisma.researchProject.create({
        data: {
          title: demo.title,
          abstract: demo.abstract,
          stage: demo.stage,
          claimStatus: demo.claimStatus,
          registerStatus: demo.registerStatus,
          universityRegistration: demo.universityRegistration,
          coAuthors: demo.coAuthors,
          leadResearcherId: leadResearcher.id,
        },
      }));

    await prisma.researchProject.update({
      where: { id: project.id },
      data: {
        abstract: demo.abstract,
        stage: demo.stage,
        claimStatus: demo.claimStatus,
        registerStatus: demo.registerStatus,
        universityRegistration: demo.universityRegistration,
        coAuthors: demo.coAuthors,
      },
    });

    for (const journal of demoJournals.slice(0, demo.submissions)) {
      const existingSubmission = await prisma.researchSubmission.findFirst({
        where: {
          researchProjectId: project.id,
          journalId: journal.id,
        },
      });

      if (!existingSubmission) {
        await prisma.researchSubmission.create({
          data: {
            researchProjectId: project.id,
            journalId: journal.id,
            status:
              demo.stage === ResearchStage.PUBLISHED
                ? SubmissionStatus.PUBLISHED
                : demo.stage === ResearchStage.ACCEPTED
                  ? SubmissionStatus.ACCEPTED
                  : demo.stage === ResearchStage.REVIEW
                    ? SubmissionStatus.UNDER_REVIEW
                    : SubmissionStatus.PENDING,
          },
        });
      }
    }
  }
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
  await ensureDemoResearchProjects();
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
  const projectWhere = canManageResearch
    ? {}
    : {
        OR: [
          { leadResearcherId: userId },
          { authors: { some: { id: userId } } },
          { authorEntries: { some: { userId } } },
          { registrationUserId: userId },
          ...registrationIdentityFilters,
        ],
      };

  const [projects, authorUsers] = await Promise.all([
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
      icon: FileText,
      color: "text-slate-600",
    },
    {
      label: "Submitted",
      value: submitting.length,
      icon: Send,
      color: "text-blue-600",
    },
    {
      label: "Published",
      value: published.length,
      icon: Trophy,
      color: "text-emerald-600",
    },
    {
      label: "Claims",
      value: claimQueue.length,
      icon: Clock,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {canManageResearch ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
            {stats.map((item) => (
              <div
                key={item.label}
                className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-base font-black text-slate-950 dark:text-white">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div />
        )}

        {canManageResearch && (
          <NewResearchDialog users={authorOptions} isAdmin={isAdmin} />
        )}
      </div>

      <ResearchProjectsTable rows={rows} />
    </div>
  );
}
