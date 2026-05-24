import { Building2, CheckCircle2, Clock3, FileText } from "lucide-react";
import { OrganizedProjectStatus, prisma } from "@repo/db";
import { NewOrganizedProjectDialog } from "./NewOrganizedProjectDialog";
import {
  OrganizedProjectsTable,
  type OrganizedProjectRow,
} from "./OrganizedProjectsTable";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  return value ? value.toLocaleDateString() : "";
}

const demoOrganizedProjects = [
  {
    title: "Digital Teaching Innovation Grant",
    organizer: "University of Economics Ho Chi Minh City",
    referenceCode: "UEH-DTI-2026",
    description:
      "Institutional project tracking classroom technology pilots and research outputs on digital learning outcomes.",
    status: OrganizedProjectStatus.ACTIVE,
    requiredResearchCount: 2,
    startDate: new Date("2026-01-15"),
    endDate: new Date("2026-12-15"),
    note: "Demo project for linking education research outputs.",
    linkCount: 2,
  },
  {
    title: "Sustainable Finance Research Program",
    organizer: "Green Growth Research Institute",
    referenceCode: "GGRI-SF-25",
    description:
      "Applied research program on ESG disclosure, banking risk, and capital market response.",
    status: OrganizedProjectStatus.ACTIVE,
    requiredResearchCount: 3,
    startDate: new Date("2025-09-01"),
    endDate: new Date("2026-08-31"),
    note: "Demo project with multiple expected research results.",
    linkCount: 3,
  },
  {
    title: "AI for Academic Productivity Initiative",
    organizer: "Tam Pham Research Lab",
    referenceCode: "TAMPH-AI-2026",
    description:
      "Internal initiative for workflow automation, literature mapping, manuscript preparation, and submission support.",
    status: OrganizedProjectStatus.PLANNED,
    requiredResearchCount: 1,
    startDate: new Date("2026-03-01"),
    endDate: new Date("2026-11-30"),
    note: "Demo project connected to one research result.",
    linkCount: 1,
  },
  {
    title: "Regional Business Data Partnership",
    organizer: "Mekong Business School",
    referenceCode: "MBS-DATA-24",
    description:
      "Collaborative project for building business datasets and turning them into publishable empirical studies.",
    status: OrganizedProjectStatus.COMPLETED,
    requiredResearchCount: 2,
    startDate: new Date("2024-04-01"),
    endDate: new Date("2025-04-30"),
    note: "Completed demo project with linked research outputs.",
    linkCount: 2,
  },
  {
    title: "Conference Research Output Track",
    organizer: "International Digital Pedagogy Association",
    referenceCode: "IDPA-CROT-26",
    description:
      "Organizer-led track for converting accepted conference work into journal-ready research outputs.",
    status: OrganizedProjectStatus.PLANNED,
    requiredResearchCount: 1,
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-10-15"),
    note: "Demo project currently waiting for research assignment.",
    linkCount: 0,
  },
];

async function ensureDemoOrganizedProjects() {
  const [createdBy, researchProjects] = await Promise.all([
    prisma.user.findFirst({
      where: { roles: { hasSome: ["ADMIN", "RESEARCHER", "LECTURER"] } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true },
    }),
    prisma.researchProject.findMany({
      select: { id: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  let researchOffset = 0;

  for (const demo of demoOrganizedProjects) {
    const project =
      (await prisma.organizedProject.findFirst({
        where: { title: demo.title },
        select: { id: true },
      })) ??
      (await prisma.organizedProject.create({
        data: {
          title: demo.title,
          organizer: demo.organizer,
          referenceCode: demo.referenceCode,
          description: demo.description,
          status: demo.status,
          requiredResearchCount: demo.requiredResearchCount,
          startDate: demo.startDate,
          endDate: demo.endDate,
          note: demo.note,
          createdById: createdBy?.id,
        },
        select: { id: true },
      }));

    await prisma.organizedProject.update({
      where: { id: project.id },
      data: {
        organizer: demo.organizer,
        referenceCode: demo.referenceCode,
        description: demo.description,
        status: demo.status,
        requiredResearchCount: demo.requiredResearchCount,
        startDate: demo.startDate,
        endDate: demo.endDate,
        note: demo.note,
      },
    });

    const linkedResearch = researchProjects.slice(
      researchOffset,
      researchOffset + demo.linkCount,
    );
    researchOffset = (researchOffset + demo.linkCount) % Math.max(1, researchProjects.length);

    for (const researchProject of linkedResearch) {
      await prisma.organizedProjectResearch.upsert({
        where: {
          organizedProjectId_researchProjectId: {
            organizedProjectId: project.id,
            researchProjectId: researchProject.id,
          },
        },
        update: {},
        create: {
          organizedProjectId: project.id,
          researchProjectId: researchProject.id,
          resultNote: "Demo linked research result.",
        },
      });
    }
  }
}

export default async function OrganizedProjectsPage() {
  await ensureDemoOrganizedProjects();

  const [projects, researchOptions] = await Promise.all([
    prisma.organizedProject.findMany({
      include: {
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
    prisma.researchProject.findMany({
      select: { id: true, title: true, stage: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const active = projects.filter((project) => project.status === "ACTIVE");
  const completed = projects.filter((project) => project.status === "COMPLETED");
  const linkedResearch = projects.reduce(
    (sum, project) => sum + project.research.length,
    0,
  );
  const stats = [
    { label: "Projects", value: projects.length, icon: Building2, color: "text-slate-600" },
    { label: "Active", value: active.length, icon: Clock3, color: "text-blue-600" },
    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Research results", value: linkedResearch, icon: FileText, color: "text-amber-600" },
  ];
  const rows: OrganizedProjectRow[] = projects.map((project) => ({
    id: project.id,
    title: project.title,
    organizer: project.organizer ?? "",
    referenceCode: project.referenceCode ?? "",
    description: project.description ?? "",
    status: project.status,
    requiredResearchCount: project.requiredResearchCount ?? 0,
    startDate: shortDate(project.startDate),
    endDate: shortDate(project.endDate),
    note: project.note ?? "",
    research: project.research.map(({ researchProject }) => ({
      id: researchProject.id,
      title: researchProject.title,
      stage: researchProject.stage,
      submissions: researchProject._count.submissions,
      publications: researchProject._count.publications,
    })),
  }));

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

        <NewOrganizedProjectDialog researchOptions={researchOptions} />
      </div>

      <OrganizedProjectsTable rows={rows} />
    </div>
  );
}
