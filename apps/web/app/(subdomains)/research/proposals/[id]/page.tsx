import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  FolderGit2,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import { prisma, ProposalStatus, ProposalType, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { ProposalFeedbackButton } from "./ProposalFeedbackButton";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";

export const dynamic = "force-dynamic";

function longDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
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
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");

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
    },
  });

  if (!proposal) notFound();
  if (proposal.status === ProposalStatus.NEW) {
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
                <ProposalFeedbackButton
                  proposalId={proposal.id}
                  proposalTitle={proposal.title}
                  disabled={
                    effectiveStatus === ProposalStatus.ACCEPTED ||
                    effectiveStatus === ProposalStatus.DECLINED
                  }
                />
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

          <div className={`${sectionDividerClass} p-5`}>
            <h2 className="text-sm font-normal text-[#252525] dark:text-[#E4E4E4]">
              Proposal description
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4B5565] dark:text-[#B0B0B0]">
              {proposal.description}
            </p>
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
