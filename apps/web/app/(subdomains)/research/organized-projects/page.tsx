import { Building2, CheckCircle2, Clock3, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deleteOrganizedProject } from "../actions";
import { ProposalDialog } from "@/sites/research/components/ProposalDialog";
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

export default async function OrganizedProjectsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) redirect("/login");
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const projectWhere = isAdmin
    ? {}
    : {
        OR: [
          { members: { some: { userId } } },
          { tasks: { some: { assignments: { some: { userId } } } } },
        ],
      };

  const [projects, researchOptions, users, fundingInstitutions, currentUser] =
    await Promise.all([
      prisma.organizedProject.findMany({
        where: projectWhere,
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
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
            select: { emailVerified: true },
          })
        : Promise.resolve(null),
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

        {isAdmin ? (
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
        ) : (
          <ProposalDialog
            type="PROJECT"
            isLoggedIn={Boolean(session)}
            hasVerifiedEmail={Boolean(currentUser?.emailVerified)}
          />
        )}
      </div>

      <OrganizedProjectsTable
        rows={rows}
        isAdmin={isAdmin}
        deleteAction={deleteOrganizedProject}
        emptyMessage="No project is connected to your account yet. Projects will show here when you are added as a member or assigned a related task."
      />
    </div>
  );
}
