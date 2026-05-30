import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
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
      className:
        "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
    };
  }
  if (type === ProposalType.JOURNAL) {
    return {
      icon: BookOpen,
      label: "Journal proposal",
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    };
  }
  if (type === ProposalType.PROJECT) {
    return {
      icon: Building2,
      label: "Project proposal",
      className:
        "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900",
    };
  }
  return {
    icon: FolderGit2,
    label: "Research proposal",
    className:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  };
}

function statusMeta(status: ProposalStatus) {
  if (status === ProposalStatus.ACCEPTED) {
    return {
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    };
  }
  if (status === ProposalStatus.DECLINED) {
    return {
      icon: XCircle,
      className:
        "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
    };
  }
  return {
    icon: FolderGit2,
    className:
      "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {value === null || value === undefined || value === "" ? "-" : value}
      </dd>
    </div>
  );
}

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
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Proposals
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${type.className}`}
              >
                <TypeIcon className="h-3.5 w-3.5" />
                {type.label}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${status.className}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {label(visibleStatus)}
              </span>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Submitted {longDate(proposal.createdAt)}
              </span>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <h1 className="min-w-0 flex-1 text-2xl font-normal leading-tight tracking-tight text-slate-950 dark:text-white">
                {proposal.title}
              </h1>
              <ProposalFeedbackButton
                proposalId={proposal.id}
                proposalTitle={proposal.title}
                disabled={
                  effectiveStatus === ProposalStatus.ACCEPTED ||
                  effectiveStatus === ProposalStatus.DECLINED
                }
              />
            </div>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Proposal ID:{" "}
              <span className="font-mono text-xs text-slate-400">
                {proposal.id}
              </span>
            </p>
          </div>

          {hasFile && (
            <a
              href={`/api/research/proposals/${proposal.id}/file`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
            >
              <Download className="h-4 w-4" />
              Download file
            </a>
          )}
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Proposal description
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
              {proposal.description}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">
              Notes
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
              {proposal.notes || "No notes."}
            </p>
          </div>
        </div>

        <aside className="space-y-5">
          <dl className="grid gap-3">
            <DetailItem
              icon={<UserRound className="h-3.5 w-3.5" />}
              label="Submitted by"
              value={
                <span>
                  <span className="block text-slate-800 dark:text-slate-100">
                    {proposal.submittedBy.name || proposal.submittedBy.email}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {proposal.submittedBy.email}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
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
            {(proposal.identifier ||
              proposal.organization ||
              proposal.location ||
              proposal.website) && (
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
            )}
            {proposal.decisionComment && (
              <DetailItem
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Admin comment"
                value={proposal.decisionComment}
              />
            )}
            <DetailItem
              icon={<FileText className="h-3.5 w-3.5" />}
              label="Support file"
              value={
                hasFile ? (
                  <span>
                    <span className="block">{proposal.supportFileName}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {proposal.supportFileType || "Unknown type"}
                      {proposal.supportFileSize
                        ? ` - ${fileSizeLabel(proposal.supportFileSize)}`
                        : ""}
                    </span>
                  </span>
                ) : (
                  "No support file"
                )
              }
            />
          </dl>
        </aside>
      </section>
    </div>
  );
}
