import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { redirect } from "next/navigation";
import { ProposalType, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { deleteProposal } from "../actions";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { ProposalsTable, type ProposalRow } from "./ProposalsTable";
import {
  displayResearchEmail,
  displayResearchPersonName,
} from "@/sites/research/lib/display";
import {
  canAccessAllResearchProposals,
  relatedResearchProposalWhere,
} from "@/sites/research/lib/proposalAccess";

export const dynamic = "force-dynamic";

function shortDate(value: Date) {
  return researchDateTimeFormat("en-GB", {
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

  const proposals = await prisma.proposal.findMany({
    where: relatedResearchProposalWhere({ userId, roles }),
    include: {
      submittedBy: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!canAccessAll && proposals.length === 0) redirect("/401");

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
    submittedBy: displayResearchPersonName(proposal.submittedBy),
    submittedByEmail: displayResearchEmail(proposal.submittedBy.email),
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
    },
    {
      label: "Research",
      value: researchCount,
    },
    {
      label: "Project",
      value: projectCount,
    },
    {
      label: "New",
      value: newCount,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
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
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <ProposalsTable
        rows={rows}
        isAdmin={canAccessAll}
        deleteAction={canAccessAll ? deleteProposal : undefined}
      />
    </div>
  );
}
