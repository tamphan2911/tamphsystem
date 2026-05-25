import { Building2, FolderGit2, Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { ProposalStatus, ProposalType, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ProposalDialog } from "../components/ProposalDialog";
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
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");

  await prisma.proposal.updateMany({
    where: { status: ProposalStatus.REVIEWING },
    data: { status: ProposalStatus.NEW },
  });

  const [proposals, currentUser] = await Promise.all([
    prisma.proposal.findMany({
      include: {
        submittedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { emailVerified: true },
        })
      : null,
  ]);

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
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ProposalDialog
            type="RESEARCH"
            isLoggedIn={Boolean(session)}
            hasVerifiedEmail={Boolean(currentUser?.emailVerified)}
          />
          <ProposalDialog
            type="PROJECT"
            isLoggedIn={Boolean(session)}
            hasVerifiedEmail={Boolean(currentUser?.emailVerified)}
          />
        </div>
      </div>

      <ProposalsTable rows={rows} />
    </div>
  );
}
