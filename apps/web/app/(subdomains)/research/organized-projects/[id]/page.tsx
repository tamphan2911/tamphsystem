import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Ban,
  BookOpenCheck,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CircleOff,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileClock,
  FileSearch,
  FlaskConical,
  GraduationCap,
  RotateCcw,
  Send,
  SendHorizontal,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
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
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    };
  }
  if (status === "ACTIVE") {
    return {
      label: "Active",
      icon: Clock3,
      className:
        "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
    };
  }
  return {
    label: "Planned",
    icon: CalendarClock,
    className:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  };
}

function claimMeta(status: string) {
  if (status === "ADVANCED") {
    return {
      label: "Advanced",
      icon: Banknote,
      className:
        "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
    };
  }
  if (status === "SETTLED") {
    return {
      label: "Settled",
      icon: ShieldCheck,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    };
  }
  if (status === "REFUND_ADVANCE") {
    return {
      label: "Refund advance",
      icon: RotateCcw,
      className:
        "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
    };
  }
  return {
    label: "Not advanced",
    icon: CircleDollarSign,
    className:
      "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  };
}

function researchStageLabel(stage: string) {
  if (stage === "SUBMITTING") return "SUBMITTED";
  if (stage === "REVIEW") return "REVIEW";
  return stage;
}

function researchStageClass(stage: string) {
  if (stage === "PUBLISHED" || stage === "ACCEPTED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  if (stage === "REVIEW") {
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  }
  if (stage === "SUBMITTING") {
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }
  return "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function researchStageIcon(stage: string) {
  if (stage === "PUBLISHED") return BookOpenCheck;
  if (stage === "ACCEPTED") return BadgeCheck;
  if (stage === "REVIEW") return FileSearch;
  if (stage === "SUBMITTING") return Send;
  return FlaskConical;
}

function researchClaimLabel(claim: string) {
  if (claim === "CANNOT_CLAIM") return "Cannot claim";
  if (claim === "WAITING_PUBLISH") return "Waiting publish";
  if (claim === "MAKING_DOCUMENT") return "Making document";
  if (claim === "WAITING") return "Waiting";
  if (claim === "CLAIMED") return "Claimed";
  return claim.replace("_", " ");
}

function researchClaimClass(claim: string) {
  if (claim === "CLAIMED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  if (claim === "WAITING") {
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  }
  if (claim === "WAITING_PUBLISH") {
    return "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900";
  }
  if (claim === "MAKING_DOCUMENT") {
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }
  return "bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
}

function researchClaimIcon(claim: string) {
  if (claim === "CLAIMED") return CheckCircle2;
  if (claim === "WAITING") return FileClock;
  if (claim === "WAITING_PUBLISH") return FileSearch;
  if (claim === "MAKING_DOCUMENT") return FileCheck2;
  if (claim === "CANNOT_CLAIM") return Ban;
  return CircleDollarSign;
}

function registrationLabel(status: string) {
  if (status === "APPROVED") return "Approved";
  if (status === "SUBMITTED") return "Submitted";
  if (status === "PREPARING") return "Plan";
  return "Not registered";
}

function registrationClass(status: string) {
  if (status === "APPROVED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  }
  if (status === "SUBMITTED") {
    return "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900";
  }
  if (status === "PREPARING") {
    return "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
  }
  return "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:ring-rose-900/70";
}

function registrationIcon(status: string) {
  if (status === "APPROVED") return CalendarCheck2;
  if (status === "SUBMITTED") return SendHorizontal;
  if (status === "PREPARING") return FileClock;
  return CircleOff;
}

function IconHint({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group/icon relative inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 opacity-0 shadow-lg shadow-slate-900/10 transition duration-200 ease-out group-hover/icon:translate-y-0 group-hover/icon:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:shadow-black/30">
        {label}
      </span>
    </span>
  );
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
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    </IconHint>
  );
}

function RegistrationCell({
  status,
  registration,
  registerName,
}: {
  status: string;
  registration: string | null;
  registerName: string;
}) {
  const Icon = registrationIcon(status);
  const label = registrationLabel(status);
  const detail = registration?.trim() ?? "";
  const showDetail = detail.length > 0;
  const registerLine =
    status !== "NOT_REGISTERED" && registerName.trim()
      ? `${label} - ${registerName.trim()}`
      : label;

  return (
    <div className="flex max-w-56 items-center gap-2">
      <IconHint label={registerLine}>
        <span
          className={`inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${registrationClass(status)}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </IconHint>
      <div
        className={`min-w-0 ${showDetail ? "" : "flex min-h-8 items-center"}`}
      >
        {showDetail && (
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {detail}
          </p>
        )}
        <p
          className={`${showDetail ? "mt-0.5" : ""} text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500`}
        >
          {registerLine}
        </p>
      </div>
    </div>
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
        className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-semibold ring-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}
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
  return member.name || member.email;
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
          `${entry.user.name || entry.user.email}${entry.isCorresponding ? "*" : ""}`,
      )
      .join(", ");
  }
  if (project.authors.length > 0) {
    return project.authors
      .map(
        (author, index) =>
          `${author.name || author.email}${index === 0 ? "*" : ""}`,
      )
      .join(", ");
  }
  return (
    project.coAuthors ||
    project.leadResearcher.name ||
    project.leadResearcher.email
  );
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
  const currentRoles = ((session?.user as { roles?: Role[] } | undefined)
    ?.roles ?? []) as Role[];
  const [project, users, researchOptions, fundingInstitutions] =
    await Promise.all([
      prisma.organizedProject.findUnique({
        where: { id },
        include: {
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
        select: { id: true, name: true, email: true, roles: true },
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
  const memberDefaults = project.members.map((member) => ({
    id: member.user.id,
    name: member.user.name ?? "",
    email: member.user.email,
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
    project.members.some(
      (member) => member.userId === currentUserId && member.isTeamLead,
    );
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
    status: project.status,
    financialClaimStatus: project.financialClaimStatus,
    startDate: dateInputValue(project.startDate),
    durationMonths: project.durationMonths ?? 1,
    requiredProducts: project.requiredProducts,
    description: project.description ?? "",
    note: project.note ?? "",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href="/organized-projects"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
                {project.referenceCode || project.id.slice(0, 8).toUpperCase()}
              </p>
              {canEditProject && (
                <ProjectInfoEditDialog
                  action={saveProject}
                  info={projectInfo}
                  members={memberDefaults}
                  research={researchDefaults}
                  fundingInstitutions={fundingOptions}
                />
              )}
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="min-w-0 text-2xl font-medium leading-tight text-slate-950 dark:text-white">
                {project.title}
              </h1>
              <IconHint label={`Status: ${status.label}`}>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ${status.className}`}
                >
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              </IconHint>
              <IconHint label={`Financial claim: ${claim.label}`}>
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ${claim.className}`}
                >
                  <ClaimIcon className="h-4 w-4" aria-hidden="true" />
                </span>
              </IconHint>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              {project.fundingInstitution?.name ||
                project.organizer ||
                "No funding institution"}
            </p>
            {project.description && (
              <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {project.description}
              </p>
            )}
            {project.note && (
              <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-400 dark:text-slate-500">
                {project.note}
              </p>
            )}
          </div>
          <div className="flex flex-none items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            <span>
              {shortDate(project.startDate)} - {shortDate(project.endDate)}
            </span>
            {durationLabel(project.durationMonths) && (
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                ({durationLabel(project.durationMonths)})
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
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
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {memberDefaults.map((member) => (
              <div key={member.id} className="flex items-center gap-3 py-3">
                <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {memberName(member)}
                    </p>
                    {member.isTeamLead && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
                        <Star className="h-3 w-3" />
                        Team lead
                      </span>
                    )}
                    {member.isInstructor && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900">
                        <GraduationCap className="h-3 w-3" />
                        Instructor
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                    {member.email}
                  </p>
                </div>
              </div>
            ))}
            {memberDefaults.length === 0 && (
              <p className="py-5 text-sm text-slate-400 dark:text-slate-500">
                No members assigned.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Important documents
            </h2>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Shared project folder
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
                Add Drive, manuscript, grant, data, or shared reference links
                here later.
              </p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 p-4 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Key files and links
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
                Use this space for contracts, approval documents, and evidence
                files.
              </p>
            </div>
          </div>
        </section>
      </div>

      <ProjectProductsForm
        requiredProducts={project.requiredProducts}
        completedProducts={project.completedProducts}
        action={saveProducts}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Research Associated
            </h2>
            {canEditResearchAssociated && (
              <CreateProjectResearchDialog
                action={createProjectResearch}
                users={userOptions}
                members={memberDefaults}
              />
            )}
          </div>
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
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full table-fixed text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-[5.75rem] px-3 py-3">ID</th>
                <th className="px-3 py-3">Research</th>
                <th className="w-[4.5rem] px-3 py-3">Stage</th>
                <th className="w-[5rem] px-3 py-3 text-center">Submit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {project.research.map(({ researchProject }) => {
                const venueLine = acceptedVenueLine(researchProject);
                const rankLine = stageRankLine(researchProject);

                return (
                  <tr
                    key={researchProject.id}
                    className="group align-top transition duration-200 ease-out hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-3 align-top">
                      <Link href={`/projects/${researchProject.id}`}>
                        <span className="font-mono text-xs font-bold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300">
                          {researchProject.researchCode || "-"}
                        </span>
                      </Link>
                    </td>
                    <td className="min-w-0 px-3 py-3 align-top">
                      <Link
                        href={`/projects/${researchProject.id}`}
                        className="group"
                      >
                        <p className="line-clamp-2 text-base font-normal text-slate-700 transition group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-300">
                          {researchProject.title}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          {researchAuthorLine(researchProject)}
                        </p>
                        {venueLine && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-400 dark:text-slate-500">
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
                        <p className="mt-1 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
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
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
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
  );
}
