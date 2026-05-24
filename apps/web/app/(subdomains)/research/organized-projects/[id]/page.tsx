import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { prisma } from "@repo/db";
import { updateOrganizedProject } from "../../actions";
import {
  ProjectInfoEditDialog,
  ProjectMembersEditDialog,
  ProjectResearchEditDialog,
} from "./ProjectDetailEditDialogs";

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

function memberName(member: { name: string; email: string }) {
  return member.name || member.email;
}

export default async function OrganizedProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
                  _count: { select: { submissions: true, publications: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, roles: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      }),
      prisma.researchProject.findMany({
        select: { id: true, title: true, stage: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.fundingInstitution.findMany({
        select: { id: true, name: true, shortName: true, country: true },
        orderBy: { name: "asc" },
      }),
    ]);

  if (!project) notFound();

  const saveProject = updateOrganizedProject.bind(null, project.id);
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
    title: researchProject.title,
    stage: researchProject.stage,
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
              <ProjectInfoEditDialog
                action={saveProject}
                info={projectInfo}
                members={memberDefaults}
                research={researchDefaults}
                fundingInstitutions={fundingOptions}
              />
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

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">
            Members
          </h2>
          <ProjectMembersEditDialog
            action={saveProject}
            info={projectInfo}
            members={memberDefaults}
            research={researchDefaults}
            users={userOptions}
          />
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
            Research Associated
          </h2>
          <ProjectResearchEditDialog
            action={saveProject}
            info={projectInfo}
            members={memberDefaults}
            research={researchDefaults}
            researchOptions={researchOptions}
          />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {project.research.map(({ researchProject }) => (
            <div
              key={researchProject.id}
              className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_8rem_8rem]"
            >
              <Link
                href={`/projects/${researchProject.id}`}
                className="min-w-0 text-sm font-medium text-slate-800 transition hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-300"
              >
                {researchProject.title}
              </Link>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {researchProject.stage}
              </p>
              <p className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                {researchProject._count.submissions} submit /{" "}
                {researchProject._count.publications} publish
              </p>
            </div>
          ))}
          {project.research.length === 0 && (
            <p className="py-5 text-sm text-slate-400 dark:text-slate-500">
              No research associated.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
