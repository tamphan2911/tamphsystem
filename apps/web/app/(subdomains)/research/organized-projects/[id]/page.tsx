import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Save } from "lucide-react";
import { prisma } from "@repo/db";
import { updateOrganizedProject } from "../../actions";
import { ResearchFormSelect } from "../../components/ResearchFormSelect";
import { SaveForm } from "../../components/SaveForm";
import {
  FundingInstitutionPicker,
  ProjectMembersPicker,
  ProjectResearchPicker,
} from "../ProjectFormControls";

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
            include: { researchProject: true },
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
  const memberDefaults = project.members.map((member) => ({
    id: member.user.id,
    name: member.user.name ?? "",
    email: member.user.email,
    role: member.user.roles.join(", "),
    isTeamLead: member.isTeamLead,
    isInstructor: member.isInstructor,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link
        href="/organized-projects"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
              {project.referenceCode || project.id.slice(0, 8).toUpperCase()}
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
              {project.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {project.fundingInstitution?.name ||
                project.organizer ||
                "No funding institution"}
            </p>
          </div>
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              {shortDate(project.startDate)} - {shortDate(project.endDate)}
            </div>
            {durationLabel(project.durationMonths) && (
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                Duration: {durationLabel(project.durationMonths)}
              </p>
            )}
          </div>
        </div>
      </div>

      <SaveForm
        action={saveProject}
        successMessage="Project changes saved"
        successDetail="Project information, members, duration, funding details, and linked research outputs are now updated."
        className="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <section className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">
            Basic information
          </h2>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Project name
              <input
                name="title"
                required
                defaultValue={project.title}
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Project ID
              <input
                name="referenceCode"
                required
                defaultValue={project.referenceCode ?? ""}
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>

          <FundingInstitutionPicker
            institutions={fundingInstitutions.map((institution) => ({
              id: institution.id,
              name: institution.name,
              shortName: institution.shortName ?? "",
              country: institution.country ?? "",
            }))}
            defaultInstitution={
              project.fundingInstitution
                ? {
                    id: project.fundingInstitution.id,
                    name: project.fundingInstitution.name,
                    shortName: project.fundingInstitution.shortName ?? "",
                    country: project.fundingInstitution.country ?? "",
                  }
                : null
            }
          />

          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Status
              <ResearchFormSelect
                name="status"
                defaultValue={
                  project.status === "ARCHIVED" ? "PLANNED" : project.status
                }
                ariaLabel="Choose project status"
                options={[
                  { value: "PLANNED", label: "Planned" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "COMPLETED", label: "Completed" },
                ]}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Financial claim
              <ResearchFormSelect
                name="financialClaimStatus"
                defaultValue={project.financialClaimStatus}
                ariaLabel="Choose financial claim status"
                options={[
                  { value: "NOT_ADVANCED", label: "Not advanced" },
                  { value: "ADVANCED", label: "Advanced" },
                  { value: "SETTLED", label: "Settled" },
                  { value: "REFUND_ADVANCE", label: "Refund advance" },
                ]}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Start date
              <input
                name="startDate"
                type="date"
                required
                defaultValue={dateInputValue(project.startDate)}
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Duration months
              <input
                name="durationMonths"
                type="number"
                min="1"
                required
                defaultValue={project.durationMonths ?? 1}
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Description
            <textarea
              name="description"
              defaultValue={project.description ?? ""}
              className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
        </section>

        <section className="grid gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">
            People and results
          </h2>
          <ProjectMembersPicker
            users={users.map((user) => ({
              id: user.id,
              name: user.name ?? "",
              email: user.email,
              role: user.roles.join(", "),
            }))}
            defaultMembers={memberDefaults}
          />
          <ProjectResearchPicker
            researchOptions={researchOptions}
            defaultResearch={project.research.map(({ researchProject }) => ({
              id: researchProject.id,
              title: researchProject.title,
              stage: researchProject.stage,
            }))}
          />
        </section>

        <label className="grid gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Notes
          <textarea
            name="note"
            defaultValue={project.note ?? ""}
            className="min-h-20 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>

        <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            <Save className="h-4 w-4" />
            Save changes
          </button>
        </div>
      </SaveForm>
    </div>
  );
}
