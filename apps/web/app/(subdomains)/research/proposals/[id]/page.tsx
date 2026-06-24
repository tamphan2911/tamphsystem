import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  FolderGit2,
  Pencil,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import { prisma, ProposalStatus, ProposalType, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { ProposalFeedbackButton } from "./ProposalFeedbackButton";
import { ProposalEditButton } from "./ProposalEditButton";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import {
  canAccessAllResearchProposals,
  proposalIsOpenForEditing,
} from "@/sites/research/lib/proposalAccess";

export const dynamic = "force-dynamic";

function longDate(value: Date | null) {
  if (!value) return "-";
  return researchDateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function fileSizeLabel(value: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function typeMeta(type: ProposalType) {
  if (type === ProposalType.CONFERENCE) {
    return {
      icon: CalendarDays,
      label: "Conference proposal",
      className: "text-blue-700 dark:text-blue-300",
    };
  }
  if (type === ProposalType.JOURNAL) {
    return {
      icon: BookOpen,
      label: "Journal proposal",
      className: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (type === ProposalType.PROJECT) {
    return {
      icon: Building2,
      label: "Project proposal",
      className: "text-violet-700 dark:text-violet-300",
    };
  }
  return {
    icon: FolderGit2,
    label: "Research proposal",
    className: "text-amber-700 dark:text-amber-300",
  };
}

function statusMeta(status: ProposalStatus) {
  if (status === ProposalStatus.ACCEPTED) {
    return {
      icon: CheckCircle2,
      className: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (status === ProposalStatus.DECLINED) {
    return {
      icon: XCircle,
      className: "text-rose-700 dark:text-rose-300",
    };
  }
  if (status === ProposalStatus.REVIEWING) {
    return {
      icon: FileSearch,
      className: "text-sky-700 dark:text-sky-300",
    };
  }
  return {
    icon: FolderGit2,
    className: "text-amber-700 dark:text-amber-300",
  };
}

function displayStatus(status: ProposalStatus) {
  return status;
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6 text-slate-700 dark:text-[#E4E4E4]">
        {value === null || value === undefined || value === "" ? "-" : value}
      </dd>
    </div>
  );
}

function AssociatedRecordCard({
  proposal,
}: {
  proposal: {
    status: ProposalStatus;
    createdResearchProject: {
      id: string;
      title: string;
      researchCode: string | null;
      stage: string;
      updatedAt: Date;
      leadResearcher: { name: string | null; email: string };
    } | null;
    createdOrganizedProject: {
      id: string;
      title: string;
      referenceCode: string | null;
      status: string;
      projectType: string;
      updatedAt: Date;
      createdBy: { name: string | null; email: string } | null;
    } | null;
  };
}) {
  if (proposal.status !== ProposalStatus.ACCEPTED) return null;

  const record = proposal.createdResearchProject
    ? {
        label: "Associated research",
        href: `/projects/${proposal.createdResearchProject.id}`,
        title: proposal.createdResearchProject.title,
        code: proposal.createdResearchProject.researchCode || "No research ID",
        state: label(proposal.createdResearchProject.stage),
        ownerLabel: "Lead",
        owner: proposal.createdResearchProject.leadResearcher,
        meta: `Updated ${longDate(proposal.createdResearchProject.updatedAt)}`,
        icon: FolderGit2,
        iconClass: "text-amber-700 dark:text-amber-300",
      }
    : proposal.createdOrganizedProject
      ? {
          label: "Associated project",
          href: `/organized-projects/${proposal.createdOrganizedProject.id}`,
          title: proposal.createdOrganizedProject.title,
          code:
            proposal.createdOrganizedProject.referenceCode || "No project ID",
          state: `${label(proposal.createdOrganizedProject.status)} | ${label(
            proposal.createdOrganizedProject.projectType,
          )}`,
          ownerLabel: "Owner",
          owner: proposal.createdOrganizedProject.createdBy,
          meta: `Updated ${longDate(proposal.createdOrganizedProject.updatedAt)}`,
          icon: Building2,
          iconClass: "text-violet-700 dark:text-violet-300",
        }
      : null;

  if (!record) return null;
  const Icon = record.icon;

  return (
    <aside className="min-w-0 border border-[#D8D0C2] bg-[#F7F4ED] p-4 dark:border-[#444444] dark:bg-[#242424]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-normal uppercase tracking-wide text-[#667085] dark:text-[#B0B0B0]">
            <Icon className={`h-3.5 w-3.5 ${record.iconClass}`} />
            {record.label}
          </div>
          <a
            href={record.href}
            className="research-clickable-icon mt-2 block min-w-0 text-sm font-normal leading-6 text-[#1F2937] transition-[color,text-shadow,transform] duration-180 ease-out hover:text-[#1F7180] hover:[text-shadow:0_0_0.55rem_rgba(31,113,128,0.16)] active:scale-[0.99] dark:text-[#E4E4E4] dark:hover:text-[#A8DADC]"
          >
            {record.title}
          </a>
        </div>
        <IconHint
          label={`Open ${record.label.toLowerCase()}`}
          position="bottom"
        >
          <a
            href={record.href}
            className="research-clickable-icon research-allow-transform inline-flex h-5 w-5 flex-none items-center justify-center border-0 bg-transparent text-[#1F7180] shadow-none outline-none transition-[color,transform,filter] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
            aria-label={`Open ${record.label.toLowerCase()}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </IconHint>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-y-1 text-xs leading-5 text-[#667085] dark:text-[#B0B0B0]">
        <span>{record.code}</span>
        <span className="px-2 text-[#A0A8B5] dark:text-[#777777]">|</span>
        <span>{record.state}</span>
      </div>
      <div className="mt-3 border-t border-[#D8D0C2] pt-3 text-xs leading-5 text-[#667085] dark:border-[#444444] dark:text-[#B0B0B0]">
        <span className="block uppercase tracking-wide">
          {record.ownerLabel}
        </span>
        <span className="mt-1 block text-sm text-[#1F2937] dark:text-[#E4E4E4]">
          {record.owner ? displayResearchPersonName(record.owner) : "Not set"}
        </span>
        {record.owner?.email ? (
          <span className="block break-all">
            {displayResearchEmail(record.owner.email)}
          </span>
        ) : null}
        <span className="mt-2 block">{record.meta}</span>
      </div>
    </aside>
  );
}

function HeaderIcon({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <IconHint label={label} position="bottom">
      <span
        className={`inline-flex h-5 w-5 cursor-help items-center justify-center border border-transparent bg-transparent transition-[color,filter,transform] duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 hover:drop-shadow-[0_0_0.45rem_rgba(168,218,220,0.22)] active:scale-95 ${className}`}
      >
        {children}
      </span>
    </IconHint>
  );
}

const sectionDividerClass = "border-t border-[#D8D0C2] dark:border-[#4A4A4A]";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  const roles =
    currentUser?.roles ??
    (((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[]);
  const canAccessAll = canAccessAllResearchProposals(roles);

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          roles: true,
        },
      },
      task: {
        select: {
          createdById: true,
          checkerId: true,
          assignments: { select: { userId: true } },
        },
      },
      createdResearchProject: {
        select: {
          id: true,
          title: true,
          researchCode: true,
          stage: true,
          updatedAt: true,
          leadResearcher: { select: { name: true, email: true } },
        },
      },
      createdOrganizedProject: {
        select: {
          id: true,
          title: true,
          referenceCode: true,
          status: true,
          projectType: true,
          updatedAt: true,
          createdBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!proposal) notFound();
  const canAccessProposal =
    canAccessAll ||
    proposal.submittedById === userId ||
    proposal.task?.createdById === userId ||
    proposal.task?.checkerId === userId ||
    Boolean(
      proposal.task?.assignments.some(
        (assignment) => assignment.userId === userId,
      ),
    );
  if (!canAccessProposal) redirect("/401");

  if (canAccessAll && proposal.status === ProposalStatus.NEW) {
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: ProposalStatus.REVIEWING },
    });
  }

  const type = typeMeta(proposal.type);
  const TypeIcon = type.icon;
  const effectiveStatus =
    proposal.status === ProposalStatus.NEW
      ? ProposalStatus.REVIEWING
      : proposal.status;
  const visibleStatus = displayStatus(effectiveStatus);
  const status = statusMeta(visibleStatus);
  const StatusIcon = status.icon;
  const hasFile = Boolean(proposal.supportFileName);
  const hasAssociatedAcceptedRecord =
    proposal.status === ProposalStatus.ACCEPTED &&
    Boolean(
      proposal.createdResearchProject || proposal.createdOrganizedProject,
    );
  const canEditProposal = proposalIsOpenForEditing(effectiveStatus);

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="min-w-0 text-[14px] font-normal leading-6 text-[#252525] dark:text-[#E4E4E4]">
              <h1 className="inline whitespace-normal break-words font-normal">
                {proposal.title}
              </h1>
              <span className="ml-2 inline-flex items-center gap-2 align-middle">
                <HeaderIcon label={type.label} className={type.className}>
                  <TypeIcon className="h-4 w-4" aria-hidden="true" />
                </HeaderIcon>
                <HeaderIcon
                  label={label(visibleStatus)}
                  className={status.className}
                >
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                </HeaderIcon>
                {canEditProposal ? (
                  <ProposalEditButton
                    proposal={{
                      id: proposal.id,
                      type: proposal.type,
                      title: proposal.title,
                      description: proposal.description,
                      contactInfo: proposal.contactInfo ?? "",
                      notes: proposal.notes ?? "",
                      identifier: proposal.identifier ?? "",
                      organization: proposal.organization ?? "",
                      location: proposal.location ?? "",
                      website: proposal.website ?? "",
                      venueType: proposal.venueType ?? "",
                      supportFileName: proposal.supportFileName ?? "",
                      supportFileSize: fileSizeLabel(proposal.supportFileSize),
                    }}
                  />
                ) : (
                  <HeaderIcon
                    label="Proposal can no longer be edited"
                    className="text-[#667085] dark:text-[#B0B0B0]"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </HeaderIcon>
                )}
                {canAccessAll ? (
                  <ProposalFeedbackButton
                    proposalId={proposal.id}
                    proposalTitle={proposal.title}
                    disabled={
                      effectiveStatus === ProposalStatus.ACCEPTED ||
                      effectiveStatus === ProposalStatus.DECLINED
                    }
                  />
                ) : null}
              </span>
            </div>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-5">
        <section className="border border-[#D8D0C2] bg-[#FFFDF8] shadow-none dark:border-[#444444] dark:bg-[#2C2C2C]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-5 py-3 text-xs text-[#667085] dark:text-[#B0B0B0]">
            <span>
              Proposal ID:{" "}
              <span className="font-mono text-[#344054] dark:text-[#E4E4E4]">
                {proposal.id}
              </span>
            </span>
            <span className="text-[#A0A8B5] dark:text-[#777777]">|</span>
            <span>Submitted {longDate(proposal.createdAt)}</span>
          </div>

          <div
            className={`${sectionDividerClass} grid gap-5 p-5 ${
              hasAssociatedAcceptedRecord ? "lg:grid-cols-2" : ""
            }`}
          >
            <div className="min-w-0">
              <h2 className="text-sm font-normal text-[#252525] dark:text-[#E4E4E4]">
                Proposal description
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4B5565] dark:text-[#B0B0B0]">
                {proposal.description}
              </p>
            </div>
            <AssociatedRecordCard proposal={proposal} />
          </div>

          <div
            className={`${sectionDividerClass} grid gap-5 p-5 lg:grid-cols-2`}
          >
            <DetailItem
              icon={<UserRound className="h-3.5 w-3.5" />}
              label="Submitted by"
              value={
                <span>
                  <span className="block text-[#252525] dark:text-[#E4E4E4]">
                    {displayResearchPersonName(proposal.submittedBy)}
                  </span>
                  <span className="block text-xs text-[#667085] dark:text-[#B0B0B0]">
                    {displayResearchEmail(proposal.submittedBy.email)}
                  </span>
                  <span className="mt-1 block text-xs text-[#667085] dark:text-[#B0B0B0]">
                    {proposal.submittedBy.roles.map(label).join(", ") ||
                      "No roles"}
                  </span>
                </span>
              }
            />
            <DetailItem
              icon={<Phone className="h-3.5 w-3.5" />}
              label="Contact"
              value={proposal.contactInfo || "-"}
            />
          </div>

          {(proposal.identifier ||
            proposal.organization ||
            proposal.location ||
            proposal.website) && (
            <div className={`${sectionDividerClass} p-5`}>
              <dl>
                <DetailItem
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Venue details"
                  value={
                    <span>
                      {proposal.identifier && (
                        <span className="block">
                          {proposal.type === ProposalType.CONFERENCE
                            ? "ISBN"
                            : "ISSN"}
                          : {proposal.identifier}
                        </span>
                      )}
                      {proposal.organization && (
                        <span className="block">{proposal.organization}</span>
                      )}
                      {proposal.location && (
                        <span className="block">{proposal.location}</span>
                      )}
                      {proposal.website && (
                        <span className="block break-all">
                          {proposal.website}
                        </span>
                      )}
                    </span>
                  }
                />
              </dl>
            </div>
          )}

          <div
            className={`${sectionDividerClass} grid gap-5 p-5 lg:grid-cols-2`}
          >
            <DetailItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Support file"
              value={
                hasFile ? (
                  <span>
                    <span className="block">{proposal.supportFileName}</span>
                    <span className="block text-xs text-[#667085] dark:text-[#B0B0B0]">
                      {proposal.supportFileType || "Unknown type"}
                      {proposal.supportFileSize
                        ? ` - ${fileSizeLabel(proposal.supportFileSize)}`
                        : ""}
                    </span>
                    <a
                      href={`/api/research/proposals/${proposal.id}/file`}
                      className="mt-2 inline-flex origin-left items-center gap-2 text-sm font-normal text-emerald-700 outline-none transition-[color,text-shadow,transform] duration-180 ease-out hover:text-emerald-800 hover:[text-shadow:0_0_0.55rem_rgba(16,185,129,0.18)] active:scale-[0.985] dark:text-emerald-300 dark:hover:text-emerald-200"
                    >
                      <Download className="h-4 w-4" />
                      Download file
                    </a>
                  </span>
                ) : (
                  "No support file"
                )
              }
            />
            {proposal.decisionComment && (
              <DetailItem
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Admin comment"
                value={proposal.decisionComment}
              />
            )}
          </div>

          <div className={`${sectionDividerClass} p-5`}>
            <h2 className="text-sm font-normal text-[#252525] dark:text-[#E4E4E4]">
              Notes
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4B5565] dark:text-[#B0B0B0]">
              {proposal.notes || "No notes."}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
