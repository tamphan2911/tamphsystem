import { Building2, CheckCircle2, Clock3, FileText } from "lucide-react";
import {
  OrganizedProjectFinancialClaimStatus,
  OrganizedProjectStatus,
  prisma,
} from "@repo/db";
import { NewOrganizedProjectDialog } from "./NewOrganizedProjectDialog";
import {
  OrganizedProjectsTable,
  type OrganizedProjectRow,
} from "./OrganizedProjectsTable";
import { ProjectToastFeedback } from "./ProjectToastFeedback";

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

const demoFundingInstitutions = [
  {
    name: "University of Economics Ho Chi Minh City",
    shortName: "UEH",
    country: "Vietnam",
    website: "https://ueh.edu.vn",
    note: "Demo institutional funding source for education and business research.",
  },
  {
    name: "Green Growth Research Institute",
    shortName: "GGRI",
    country: "Vietnam",
    website: "",
    note: "Demo funding institution for sustainability and finance projects.",
  },
  {
    name: "Tam Pham Research Lab",
    shortName: "TPRL",
    country: "Vietnam",
    website: "https://research.tamph.com",
    note: "Demo internal project sponsor.",
  },
  {
    name: "Mekong Business School",
    shortName: "MBS",
    country: "Vietnam",
    website: "",
    note: "Demo academic institution for regional business data work.",
  },
  {
    name: "International Digital Pedagogy Association",
    shortName: "IDPA",
    country: "International",
    website: "",
    note: "Demo project organizer for digital pedagogy research outputs.",
  },
];

const demoOrganizedProjects = [
  {
    title: "Digital Teaching Innovation Grant",
    organizer: "University of Economics Ho Chi Minh City",
    referenceCode: "UEH-DTI-2026",
    description:
      "Institutional project tracking classroom technology pilots and research outputs on digital learning outcomes.",
    status: OrganizedProjectStatus.ACTIVE,
    financialClaimStatus: OrganizedProjectFinancialClaimStatus.ADVANCED,
    startDate: new Date("2026-01-15"),
    durationMonths: 12,
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
    financialClaimStatus: OrganizedProjectFinancialClaimStatus.NOT_ADVANCED,
    startDate: new Date("2025-09-01"),
    durationMonths: 12,
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
    financialClaimStatus: OrganizedProjectFinancialClaimStatus.NOT_ADVANCED,
    startDate: new Date("2026-03-01"),
    durationMonths: 9,
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
    financialClaimStatus: OrganizedProjectFinancialClaimStatus.SETTLED,
    startDate: new Date("2024-04-01"),
    durationMonths: 13,
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
    financialClaimStatus: OrganizedProjectFinancialClaimStatus.REFUND_ADVANCE,
    startDate: new Date("2026-06-01"),
    durationMonths: 5,
    note: "Demo project currently waiting for research assignment.",
    linkCount: 0,
  },
];

async function ensureDemoFundingInstitutions() {
  for (const institution of demoFundingInstitutions) {
    const existing = await prisma.fundingInstitution.findFirst({
      where: { name: institution.name },
      select: { id: true },
    });

    if (existing) {
      await prisma.fundingInstitution.update({
        where: { id: existing.id },
        data: institution,
      });
    } else {
      await prisma.fundingInstitution.create({ data: institution });
    }
  }
}

async function ensureDemoOrganizedProjects() {
  await ensureDemoFundingInstitutions();
  const [createdBy, researchProjects, users] = await Promise.all([
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
    prisma.user.findMany({
      select: { id: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 6,
    }),
  ]);

  let researchOffset = 0;

  for (const [index, demo] of demoOrganizedProjects.entries()) {
    const fundingInstitution = await prisma.fundingInstitution.findFirst({
      where: { name: demo.organizer },
      select: { id: true },
    });
    const endDate = new Date(demo.startDate);
    endDate.setMonth(endDate.getMonth() + demo.durationMonths);

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
          financialClaimStatus: demo.financialClaimStatus,
          requiredResearchCount: null,
          fundingInstitutionId: fundingInstitution?.id,
          startDate: demo.startDate,
          durationMonths: demo.durationMonths,
          endDate,
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
        financialClaimStatus: demo.financialClaimStatus,
        requiredResearchCount: null,
        fundingInstitutionId: fundingInstitution?.id,
        startDate: demo.startDate,
        durationMonths: demo.durationMonths,
        endDate,
        note: demo.note,
      },
    });

    const existingMembers = await prisma.organizedProjectMember.count({
      where: { organizedProjectId: project.id },
    });
    if (existingMembers === 0 && users.length > 0) {
      const selectedUsers = users.slice(
        index % users.length,
        (index % users.length) + 3,
      );
      const fallbackUsers =
        selectedUsers.length > 0 ? selectedUsers : users.slice(0, 2);
      await prisma.organizedProjectMember.createMany({
        data: fallbackUsers.map((member, position) => ({
          organizedProjectId: project.id,
          userId: member.id,
          position,
          isTeamLead: position === 0,
          isInstructor: position === 1,
        })),
        skipDuplicates: true,
      });
    }

    const linkedResearch = researchProjects.slice(
      researchOffset,
      researchOffset + demo.linkCount,
    );
    researchOffset =
      (researchOffset + demo.linkCount) % Math.max(1, researchProjects.length);

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

  const [projects, researchOptions, users, fundingInstitutions] =
    await Promise.all([
      prisma.organizedProject.findMany({
        include: {
          fundingInstitution: true,
          members: {
            include: {
              user: true,
            },
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
      prisma.researchProject.findMany({
        select: { id: true, researchCode: true, title: true, stage: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.user.findMany({
        where: { activeSites: { has: "research" } },
        select: { id: true, name: true, email: true, roles: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      }),
      prisma.fundingInstitution.findMany({
        select: { id: true, name: true, shortName: true, country: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const active = projects.filter((project) => project.status === "ACTIVE");
  const completed = projects.filter(
    (project) => project.status === "COMPLETED",
  );
  const linkedResearch = projects.reduce(
    (sum, project) => sum + project.research.length,
    0,
  );
  const stats = [
    {
      label: "Projects",
      value: projects.length,
      icon: Building2,
      color: "text-slate-600",
    },
    {
      label: "Active",
      value: active.length,
      icon: Clock3,
      color: "text-blue-600",
    },
    {
      label: "Completed",
      value: completed.length,
      icon: CheckCircle2,
      color: "text-emerald-600",
    },
    {
      label: "Research results",
      value: linkedResearch,
      icon: FileText,
      color: "text-amber-600",
    },
  ];
  const rows: OrganizedProjectRow[] = projects.map((project) => ({
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
      email: member.user.email,
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
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ProjectToastFeedback />
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

        <NewOrganizedProjectDialog
          researchOptions={researchOptions.map((research) => ({
            id: research.id,
            researchCode: research.researchCode ?? "",
            title: research.title,
            stage: research.stage,
          }))}
          users={users.map((user) => ({
            id: user.id,
            name: user.name ?? "",
            email: user.email,
            role: user.roles.join(", "),
          }))}
          fundingInstitutions={fundingInstitutions.map((institution) => ({
            id: institution.id,
            name: institution.name,
            shortName: institution.shortName ?? "",
            country: institution.country ?? "",
          }))}
        />
      </div>

      <OrganizedProjectsTable rows={rows} />
    </div>
  );
}
