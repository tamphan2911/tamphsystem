import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deleteOrganizedProject } from "../actions";
import { ProposalDialog } from "@/sites/research/components/ProposalDialog";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
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
          { members: { some: { userId } } },
          { tasks: { some: { assignments: { some: { userId } } } } },
        ],
      };

  const [projects, researchOptions, users, fundingInstitutions] =
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
        select: {
          id: true,
          name: true,
          email: true,
          additionalEmails: true,
          roles: true,
        },
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
    },
    {
      label: "Active",
      value: active.length,
    },
    {
      label: "Completed",
      value: completed.length,
    },
    {
      label: "Research results",
      value: linkedResearch,
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
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-4">
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
                <span className="font-normal text-[#E4E4E4]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-none items-center">
            {isRootAdmin ? (
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
                  additionalEmails: user.additionalEmails,
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
        </div>
      </ResearchPageHeaderPortal>

      <OrganizedProjectsTable
        rows={rows}
        isAdmin={isRootAdmin}
        deleteAction={deleteOrganizedProject}
        emptyMessage="No project is connected to your account yet. Projects will show here when you are added as a member or assigned a related task."
      />
    </div>
  );
}
