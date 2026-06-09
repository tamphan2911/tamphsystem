import { Building2, FolderGit2, Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { ProposalType, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deleteProposal } from "../actions";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { ProposalsTable, type ProposalRow } from "./ProposalsTable";

export const dynamic = "force-dynamic";

function shortDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function fileSizeLabel(value: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ProposalsPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");

  const proposals = await prisma.proposal.findMany({
    include: {
      submittedBy: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows: ProposalRow[] = proposals.map((proposal) => ({
    id: proposal.id,
    type: proposal.type,
    status: proposal.status,
    title: proposal.title,
    description: proposal.description,
    contactInfo: proposal.contactInfo ?? "",
    notes: proposal.notes ?? "",
    identifier: proposal.identifier ?? "",
    organization: proposal.organization ?? "",
    location: proposal.location ?? "",
    website: proposal.website ?? "",
    decisionComment: proposal.decisionComment ?? "",
    fileName: proposal.supportFileName ?? "",
    fileSize: fileSizeLabel(proposal.supportFileSize),
    submittedBy: proposal.submittedBy.name ?? proposal.submittedBy.email,
    submittedByEmail: proposal.submittedBy.email,
    createdAt: shortDate(proposal.createdAt),
  }));

  const researchCount = proposals.filter(
    (proposal) => proposal.type === ProposalType.RESEARCH,
  ).length;
  const projectCount = proposals.filter(
    (proposal) => proposal.type === ProposalType.PROJECT,
  ).length;
  const newCount = proposals.filter(
    (proposal) => proposal.status === "NEW",
  ).length;

  const stats = [
    {
      label: "Total",
      value: proposals.length,
      icon: Inbox,
      color: "text-slate-600",
    },
    {
      label: "Research",
      value: researchCount,
      icon: FolderGit2,
      color: "text-amber-600",
    },
    {
      label: "Project",
      value: projectCount,
      icon: Building2,
      color: "text-violet-600",
    },
    {
      label: "New",
      value: newCount,
      icon: FolderGit2,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="flex min-w-32 items-center gap-3 border-[#444444] px-3 py-2 text-sm text-[#E4E4E4] sm:border-l first:sm:border-l-0"
              >
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="text-base font-black text-[#E4E4E4]">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <ProposalsTable rows={rows} isAdmin deleteAction={deleteProposal} />
    </div>
  );
}
