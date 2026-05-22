import { Clock, FileText, Send, Trophy } from "lucide-react";
import {
  ClaimStatus,
  prisma,
  RegistrationStatus,
  ResearchStage,
  SubmissionStatus,
} from "@repo/db";
import { NewResearchDialog } from "./NewResearchDialog";
import {
  ResearchProjectsTable,
  type ResearchProjectRow,
} from "./ResearchProjectsTable";

export const dynamic = "force-dynamic";

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

export default async function ProjectsDashboard() {
  await ensureDemoResearchProjects();

  const projects = await prisma.researchProject.findMany({
    include: {
      leadResearcher: { select: { name: true, email: true } },
      _count: {
        select: { submissions: true, publications: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const submitting = projects.filter(
    (project) => project.stage === "SUBMITTING",
  );
  const published = projects.filter((project) => project.stage === "PUBLISHED");
  const claimQueue = projects.filter(
    (project) =>
      project.claimStatus === "MAKING_DOCUMENT" ||
      project.claimStatus === "WAITING",
  );

  const rows: ResearchProjectRow[] = projects.map((project) => ({
    id: project.id,
    title: project.title,
    abstract: project.abstract ?? "",
    stage: project.stage,
    claimStatus: project.claimStatus,
    registerStatus: project.registerStatus,
    coAuthors: project.coAuthors ?? "",
    universityRegistration: project.universityRegistration ?? "",
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

        <NewResearchDialog />
      </div>

      <ResearchProjectsTable rows={rows} />
    </div>
  );
}
