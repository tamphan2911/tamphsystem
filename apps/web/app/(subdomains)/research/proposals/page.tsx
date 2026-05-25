import { FileText, Inbox, Lightbulb, Rocket } from "lucide-react";
import { redirect } from "next/navigation";
import { ProposalType, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
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
    orderBy: { createdAt: "desc" },
  });

  const rows: ProposalRow[] = proposals.map((proposal) => ({
    id: proposal.id,
    type: proposal.type,
    status: proposal.status,
    title: proposal.title,
    description: proposal.description,
    contactInfo: proposal.contactInfo ?? "",
    notes: proposal.notes ?? "",
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
      icon: Lightbulb,
      color: "text-amber-600",
    },
    {
      label: "Project",
      value: projectCount,
      icon: Rocket,
      color: "text-violet-600",
    },
    {
      label: "New",
      value: newCount,
      icon: FileText,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex xl:flex-wrap">
        {stats.map((item) => (
          <div
            key={item.label}
            className="flex min-w-32 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <item.icon className={`h-4 w-4 ${item.color}`} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </p>
              <p className="text-base font-black text-slate-950 dark:text-white">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <ProposalsTable rows={rows} />
    </div>
  );
}
