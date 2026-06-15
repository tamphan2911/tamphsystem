import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleOff,
  Clock3,
  FileSearch,
  FlaskConical,
  GraduationCap,
  Landmark,
  Mail,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import {
  researchLinkClass,
  researchMutedLinkClass,
} from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  createResearchForOrganizedProject,
  updateOrganizedProject,
  updateOrganizedProjectProducts,
} from "../../actions";
import {
  CreateProjectResearchDialog,
  ProjectInfoEditDialog,
  ProjectMembersEditDialog,
  ProjectResearchEditDialog,
} from "./ProjectDetailEditDialogs";
import { ProjectProductsForm } from "./ProjectProductsForm";
import { formatCurrencyCodeMoney } from "@/sites/research/lib/currency";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function dateInputValue(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
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

function statusMeta(status: string) {
  if (status === "COMPLETED") {
    return {
      label: "Completed",
      icon: CheckCircle2,
      className: "text-[#2F8F62] dark:text-[#9ED6B5]",
    };
  }
  if (status === "ACTIVE") {
    return {
      label: "Active",
      icon: Clock3,
      className: "text-[#2F6FAE] dark:text-[#93C5FD]",
    };
  }
  return {
    label: "Planned",
    icon: CalendarClock,
    className: "text-[#A06716] dark:text-[#F4D47A]",
  };
}

function claimMeta(status: string) {
  if (status === "NONE") {
    return {
      label: "None",
      icon: CircleOff,
      className: "text-[#667085] dark:text-[#B8BEC8]",
    };
  }
  if (status === "ADVANCED") {
    return {
      label: "Advanced",
      icon: Banknote,
      className: "text-[#6F5AA8] dark:text-[#C8B6E2]",
    };
  }
  if (status === "SETTLED") {
    return {
      label: "Settled",
      icon: ShieldCheck,
      className: "text-[#2F8F62] dark:text-[#9ED6B5]",
    };
  }
  if (status === "REFUND_ADVANCE") {
    return {
      label: "Refund advance",
      icon: RotateCcw,
      className: "text-[#B33E5C] dark:text-[#F0A6B5]",
    };
  }
  return {
    label: "Not advanced",
    icon: WalletCards,
    className: "text-[#B33E5C] dark:text-[#FFC1CC]",
  };
}

function projectTypeMeta(type: string) {
  if (type === "FACULTY") {
    return { label: "faculty", icon: UserRound };
  }
  if (type === "UNIVERSITY") {
    return { label: "university", icon: Building2 };
  }
  if (type === "VNU") {
    return { label: "VNU", icon: Landmark };
  }
  if (type === "NATIONAL") {
    return { label: "national", icon: ShieldCheck };
  }
  return { label: "student", icon: GraduationCap };
}

function researchStageLabel(stage: string) {
  if (stage === "SUBMITTING") return "SUBMITTED";
  if (stage === "REVIEW") return "REVIEW";
  return stage;
}

function researchStageClass(stage: string) {
  if (stage === "PUBLISHED" || stage === "ACCEPTED") {
    return "text-[#9ED6B5]";
  }
  if (stage === "REVIEW") {
    return "text-[#F4D47A]";
  }
  if (stage === "SUBMITTING") {
    return "text-[#93C5FD]";
  }
  return "text-[#B8BEC8]";
}

function researchStageIcon(stage: string) {
  if (stage === "PUBLISHED") return BookOpenCheck;
  if (stage === "ACCEPTED") return BadgeCheck;
  if (stage === "REVIEW") return FileSearch;
  if (stage === "SUBMITTING") return Send;
  return FlaskConical;
}

function StatusIconChip({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  return (
    <IconHint label={label}>
      <span
        className={`research-task-icon-motion inline-flex h-8 w-8 items-center justify-center ${className}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function ResearchCount({ count, label }: { count: number; label: string }) {
  const isZero = count === 0;
  const className = isZero
    ? "bg-rose-50 text-rose-500 ring-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:ring-rose-900/70"
    : "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";

  return (
    <IconHint label={`${count} ${label.toLowerCase()}`}>
      <span
        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-none px-2 text-sm font-semibold ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
      >
        {count}
        <span className="sr-only">
          {count} {label.toLowerCase()}
        </span>
      </span>
    </IconHint>
  );
}

function memberName(member: { name: string; email: string }) {
  return displayResearchPersonName(member);
}

function ProjectMemberRoleBadges({
  isTeamLead,
  isInstructor,
}: {
  isTeamLead: boolean;
  isInstructor: boolean;
}) {
  if (!isTeamLead && !isInstructor) {
    return (
      <span className="border border-[#D8D0C2] bg-[#FFFDF8] px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-[#667085] dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0]">
        Member
      </span>
    );
  }

  return (
    <>
      {isTeamLead && (
        <span className="border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-amber-800 dark:border-[#6f5d2a] dark:bg-[#2d2819] dark:text-[#F4D47A]">
          Leader
        </span>
      )}
      {isInstructor && (
        <span className="border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-violet-700 dark:border-[#4f436d] dark:bg-[#282236] dark:text-[#B39CD0]">
          Instructor
        </span>
      )}
    </>
  );
}

function researchAuthorLine(project: {
  coAuthors: string | null;
  leadResearcher: { name: string | null; email: string };
  authors: { name: string | null; email: string }[];
  authorEntries: {
    isCorresponding: boolean;
    user: { name: string | null; email: string };
  }[];
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
  return project.coAuthors || displayResearchPersonName(project.leadResearcher);
}

function acceptedVenueLine(project: {
  submissions: {
    status: string;
    journal: { name: string; publisher: string | null; rank: string | null };
  }[];
  conferenceSubmissions: {
    status: string;
    conference: { name: string; organizer: string | null; type: string | null };
  }[];
}) {
  const journal =
    project.submissions.find((item) => item.status === "PUBLISHED") ??
    project.submissions.find((item) => item.status === "ACCEPTED");
  if (journal) {
    return [
      journal.journal.name,
      journal.journal.publisher,
      journal.journal.rank,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  const conference =
    project.conferenceSubmissions.find((item) => item.status === "PUBLISHED") ??
    project.conferenceSubmissions.find((item) => item.status === "ACCEPTED");
  if (conference) {
    return [
      conference.conference.name,
      conference.conference.organizer,
      conference.conference.type,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  return "";
}

function stageRankLine(project: {
  stage: string;
  submissions: {
    status: string;
    journal: { rank: string | null };
  }[];
}) {
  if (project.stage !== "ACCEPTED" && project.stage !== "PUBLISHED") return "";
  const submission =
    project.submissions.find((item) => item.status === "PUBLISHED") ??
    project.submissions.find((item) => item.status === "ACCEPTED");
  return submission?.journal.rank ?? "";
}

export default async function OrganizedProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !currentUserId) redirect("/login");
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: { roles: true },
  });
  const currentRoles =
    currentUser?.roles ??
    (((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[]);
  const [project, users, researchOptions, fundingInstitutions] =
    await Promise.all([
      prisma.organizedProject.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true } },
          fundingInstitution: true,
          members: {
            include: { user: true },
            orderBy: { position: "asc" },
          },
          research: {
            include: {
              researchProject: {
                include: {
                  leadResearcher: { select: { name: true, email: true } },
                  registrationUser: {
                    select: { name: true, email: true },
                  },
                  authors: {
                    select: { name: true, email: true },
                    orderBy: [{ name: "asc" }, { email: "asc" }],
                  },
                  authorEntries: {
                    include: {
                      user: { select: { name: true, email: true } },
                    },
                    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
                  },
                  submissions: {
                    select: {
                      status: true,
                      journal: {
                        select: { name: true, publisher: true, rank: true },
                      },
                    },
                  },
                  conferenceSubmissions: {
                    select: {
                      status: true,
                      conference: {
                        select: { name: true, organizer: true, type: true },
                      },
                    },
                  },
                  _count: { select: { submissions: true, publications: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.user.findMany({
        where: { activeSites: { has: "research" } },
        select: {
          id: true,
          name: true,
          email: true,
          affiliation: true,
          roles: true,
        },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      }),
      prisma.researchProject.findMany({
        select: { id: true, researchCode: true, title: true, stage: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.fundingInstitution.findMany({
        select: { id: true, name: true, shortName: true, country: true },
        orderBy: { name: "asc" },
      }),
    ]);

  if (!project) notFound();

  const assignedResearchEditTask = currentUserId
    ? await prisma.researchTask.findFirst({
        where: {
          organizedProjectId: project.id,
          taskType: "PROJECT_RESEARCH_ASSOCIATED",
          status: "IN_PROGRESS",
          assignments: { some: { userId: currentUserId } },
        },
        select: { id: true },
      })
    : null;

  const saveProject = updateOrganizedProject.bind(null, project.id);
  const saveProducts = updateOrganizedProjectProducts.bind(null, project.id);
  const createProjectResearch = createResearchForOrganizedProject.bind(
    null,
    project.id,
  );
  const status = statusMeta(project.status);
  const StatusIcon = status.icon;
  const claim = claimMeta(project.financialClaimStatus);
  const ClaimIcon = claim.icon;
  const projectType = projectTypeMeta(project.projectType);
  const ProjectTypeIcon = projectType.icon;
  const memberDefaults = project.members.map((member) => ({
    id: member.user.id,
    name: member.user.name ?? "",
    email: member.user.email,
    affiliation: member.user.affiliation,
    role: member.user.roles.join(", "),
    isTeamLead: member.isTeamLead,
    isInstructor: member.isInstructor,
  }));
  const researchDefaults = project.research.map(({ researchProject }) => ({
    id: researchProject.id,
    researchCode: researchProject.researchCode ?? "",
    title: researchProject.title,
    stage: researchProject.stage,
  }));
  const canEditProject =
    currentRoles.includes(Role.ADMIN) ||
    currentRoles.includes(Role.CHIEF_ASSISTANT) ||
    project.members.some(
      (member) => member.userId === currentUserId && member.isTeamLead,
    );
  const canViewProject =
    currentRoles.includes(Role.ADMIN) ||
    currentRoles.includes(Role.CHIEF_ASSISTANT) ||
    project.createdBy?.id === currentUserId ||
    project.members.some((member) => member.userId === currentUserId) ||
    Boolean(assignedResearchEditTask);
  if (!canViewProject) notFound();
  const canEditResearchAssociated =
    canEditProject || Boolean(assignedResearchEditTask);
  const mappedResearchOptions = researchOptions.map((research) => ({
    id: research.id,
    researchCode: research.researchCode ?? "",
    title: research.title,
    stage: research.stage,
  }));
  const userOptions = users.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    affiliation: user.affiliation,
    role: user.roles.join(", "),
  }));
  const fundingOptions = fundingInstitutions.map((institution) => ({
    id: institution.id,
    name: institution.name,
    shortName: institution.shortName ?? "",
    country: institution.country ?? "",
  }));
  const projectInfo = {
    title: project.title,
    referenceCode: project.referenceCode ?? "",
    fundingInstitution: project.fundingInstitution
      ? {
          id: project.fundingInstitution.id,
          name: project.fundingInstitution.name,
          shortName: project.fundingInstitution.shortName ?? "",
          country: project.fundingInstitution.country ?? "",
        }
      : null,
    projectType: project.projectType,
    status: project.status,
    financialClaimStatus: project.financialClaimStatus,
    fundingAmount: project.fundingAmount?.toString() ?? "",
    fundingCurrency: project.fundingCurrency,
    startDate: dateInputValue(project.startDate),
    durationMonths: project.durationMonths ?? 1,
    requiredProducts: project.requiredProducts,
    description: project.description ?? "",
    note: project.note ?? "",
  };
  const fundingAmountLabel = formatCurrencyCodeMoney(
    project.fundingAmount?.toString() ?? null,
    project.fundingCurrency,
  );
  const projectTimeLabel = `${shortDate(project.startDate)} - ${shortDate(
    project.endDate,
  )}${
    durationLabel(project.durationMonths)
      ? ` (${durationLabel(project.durationMonths)})`
      : ""
  }`;

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="min-w-0 max-w-full whitespace-normal break-words text-[15px] font-normal leading-5 text-[#E4E4E4]">
                {project.title}
              </h1>
              <IconHint label={`Status: ${status.label}`}>
                <span
                  className={`research-task-icon-motion inline-flex h-7 w-7 items-center justify-center ${status.className}`}
                >
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              </IconHint>
              {canEditProject && (
                <ProjectInfoEditDialog
                  action={saveProject}
                  info={projectInfo}
                  members={memberDefaults}
                  research={researchDefaults}
                  fundingInstitutions={fundingOptions}
                  formId="project-info-edit-form-header"
                />
              )}
            </div>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        <header className="border border-[#444444] bg-[#2C2C2C] p-5 shadow-none">
          <div className="min-w-0">
            <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 lg:hidden">
              <h1 className="min-w-0 max-w-full whitespace-normal break-words text-[18px] font-normal leading-6 text-[#E4E4E4]">
                {project.title}
              </h1>
              <IconHint label={`Status: ${status.label}`}>
                <span
                  className={`research-task-icon-motion inline-flex h-7 w-7 flex-none items-center justify-center ${status.className}`}
                >
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              </IconHint>
              {canEditProject && (
                <ProjectInfoEditDialog
                  action={saveProject}
                  info={projectInfo}
                  members={memberDefaults}
                  research={researchDefaults}
                  fundingInstitutions={fundingOptions}
                  formId="project-info-edit-form-mobile"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[#B0B0B0]">
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
                {project.referenceCode || project.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-[#777777]">|</span>
              <span className="min-w-0 truncate font-normal">
                {project.fundingInstitution?.name ||
                  project.organizer ||
                  "No funding institution"}
              </span>
              <IconHint label={`Financial: ${claim.label}`}>
                <span
                  className={`research-task-icon-motion inline-flex h-7 w-7 items-center justify-center ${claim.className}`}
                >
                  <ClaimIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              </IconHint>
              <IconHint label={`Project type: ${projectType.label}`}>
                <span className="research-task-icon-motion inline-flex h-7 w-7 items-center justify-center text-[#B0B0B0] hover:text-[#A8DADC]">
                  <ProjectTypeIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              </IconHint>
              {fundingAmountLabel && (
                <span className="text-sm font-normal text-[#B0B0B0]">
                  ({fundingAmountLabel})
                </span>
              )}
              <span className="text-[#777777]">|</span>
              <span className="text-sm font-normal text-[#B0B0B0]">
                {projectTimeLabel}
              </span>
            </div>
            {project.description && (
              <p className="mt-1 max-w-4xl text-sm leading-6 text-[#B0B0B0]">
                {project.description}
              </p>
            )}
            {project.note && (
              <p className="mt-1 max-w-4xl text-xs leading-5 text-[#777777]">
                {project.note}
              </p>
            )}
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="border border-[#444444] bg-[#2C2C2C] p-5 shadow-none">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
                Members
              </h2>
              {canEditProject && (
                <ProjectMembersEditDialog
                  action={saveProject}
                  info={projectInfo}
                  members={memberDefaults}
                  research={researchDefaults}
                  users={userOptions}
                />
              )}
            </div>
            <div className="research-project-member-list divide-y divide-[#e2d9cc] border-y border-[#e2d9cc] dark:divide-[#444444] dark:border-[#444444]">
              {memberDefaults.map((member, index) => (
                <div key={member.id} className="flex items-center gap-4 py-3">
                  <span className="inline-flex w-8 flex-none justify-center font-mono text-sm text-[#A8DADC]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="min-w-0 text-sm font-medium text-[#E4E4E4]">
                        {memberName(member)}
                      </p>
                      <ProjectMemberRoleBadges
                        isTeamLead={member.isTeamLead}
                        isInstructor={member.isInstructor}
                      />
                    </div>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-[#777777]">
                      <Mail className="research-task-icon-motion h-3 w-3 flex-none text-[#A8DADC]" />
                      <span className="truncate">
                        {displayResearchEmail(member.email)}
                      </span>
                    </p>
                    <p className="mt-0.5 flex min-w-0 items-start gap-1 text-xs leading-5 text-[#B0B0B0]">
                      <Building2 className="research-task-icon-motion mt-1 h-3 w-3 flex-none text-[#B39CD0]" />
                      <span className="line-clamp-2 min-w-0 whitespace-normal break-words">
                        {member.affiliation || "No affiliation recorded"}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
              {memberDefaults.length === 0 && (
                <p className="px-3 py-5 text-sm text-[#777777]">
                  No members assigned.
                </p>
              )}
            </div>
          </section>

          <section className="border border-[#444444] bg-[#2C2C2C] p-5 shadow-none">
            <h2 className="mb-4 text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
              Important documents
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-[#E4E4E4]">
                  Shared project folder
                </p>
                <p className="mt-1 text-xs leading-5 text-[#777777]">
                  Add Drive, manuscript, grant, data, or shared reference links
                  here later.
                </p>
              </div>
            </div>
            <div className="mt-5 border-t border-[#444444] pt-5">
              <ProjectProductsForm
                requiredProducts={project.requiredProducts}
                completedProducts={project.completedProducts}
                action={saveProducts}
                embedded
              />
            </div>
          </section>
        </div>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-normal uppercase tracking-wide text-[#B0B0B0]">
              Research associated
            </h2>
            {canEditResearchAssociated && (
              <CreateProjectResearchDialog
                action={createProjectResearch}
                users={userOptions}
                members={memberDefaults}
              />
            )}
            {canEditResearchAssociated && (
              <ProjectResearchEditDialog
                action={saveProject}
                info={projectInfo}
                members={memberDefaults}
                research={researchDefaults}
                researchOptions={mappedResearchOptions}
              />
            )}
          </div>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-left">
              <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
                <tr>
                  <th className="w-[5.75rem] px-3 py-3">ID</th>
                  <th className="px-3 py-3">Research</th>
                  <th className="w-[4.5rem] px-3 py-3">Stage</th>
                  <th className="w-[5rem] px-3 py-3 text-center">Submit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#444444]">
                {project.research.map(({ researchProject }) => {
                  const venueLine = acceptedVenueLine(researchProject);
                  const rankLine = stageRankLine(researchProject);

                  return (
                    <tr
                      key={researchProject.id}
                      className="group align-top transition-colors duration-150 hover:bg-[#383838]"
                    >
                      <td className="px-3 py-3 align-top">
                        <Link href={`/projects/${researchProject.id}`}>
                          <span
                            className={`font-mono text-xs ${researchMutedLinkClass}`}
                          >
                            {researchProject.researchCode || "-"}
                          </span>
                        </Link>
                      </td>
                      <td className="min-w-0 px-3 py-3 align-top">
                        <Link
                          href={`/projects/${researchProject.id}`}
                          className="group"
                        >
                          <p
                            className={`line-clamp-2 text-base group-hover:text-[#A8DADC] ${researchLinkClass}`}
                          >
                            {researchProject.title}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-[#B0B0B0]">
                            {researchAuthorLine(researchProject)}
                          </p>
                          {venueLine && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-[#777777]">
                              {venueLine}
                            </p>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <StatusIconChip
                          icon={researchStageIcon(researchProject.stage)}
                          label={researchStageLabel(researchProject.stage)}
                          className={researchStageClass(researchProject.stage)}
                        />
                        {rankLine && (
                          <p className="mt-1 text-center text-[11px] font-semibold text-[#777777]">
                            {rankLine}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center align-top">
                        <ResearchCount
                          count={researchProject._count.submissions}
                          label="Submissions"
                        />
                      </td>
                    </tr>
                  );
                })}
                {project.research.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-[#B0B0B0]"
                    >
                      No research associated.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
