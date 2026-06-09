import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import {
  createFundingInstitution,
  deleteFundingInstitution,
  updateFundingInstitution,
} from "../actions";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  FundingInstitutionsTable,
  type FundingInstitutionRow,
} from "./FundingInstitutionsTable";
import { FundingInstitutionDialog } from "./FundingInstitutionDialog";

export const dynamic = "force-dynamic";

function funderCodeBase(name: string, alias: string | null) {
  const source = alias || name;
  const words = source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const code =
    words.length > 1
      ? words.map((word) => word[0]).join("")
      : words[0]?.slice(0, 6);

  return (code && code.length >= 2 ? code : "FUND").slice(0, 8);
}

async function generateFunderCode(name: string, alias: string | null) {
  const base = funderCodeBase(name, alias);

  for (let index = 0; index < 100; index += 1) {
    const code = index === 0 ? base : `${base}${index + 1}`;
    const existing = await prisma.fundingInstitution.findUnique({
      where: { funderCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  return `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function ensureFunderCodes() {
  const institutions = await prisma.fundingInstitution.findMany({
    where: { funderCode: null },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
  });

  for (const institution of institutions) {
    await prisma.fundingInstitution.update({
      where: { id: institution.id },
      data: {
        funderCode: await generateFunderCode(
          institution.name,
          institution.shortName,
        ),
      },
    });
  }
}

export default async function FundingInstitutionsPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  if (!isAdmin) redirect("/401");

  await ensureFunderCodes();
  const institutions = await prisma.fundingInstitution.findMany({
    include: {
      _count: { select: { organizedProjects: true, researchProjects: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  const rows: FundingInstitutionRow[] = institutions.map((institution) => ({
    id: institution.id,
    funderCode: institution.funderCode ?? institution.id.slice(0, 8),
    name: institution.name,
    shortName: institution.shortName ?? "",
    country: institution.country ?? "",
    website: institution.website ?? "",
    note: institution.note ?? "",
    organizedProjects: institution._count.organizedProjects,
    researchProjects: institution._count.researchProjects,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <p className="min-w-0 truncate text-sm font-normal uppercase tracking-wide text-[#E4E4E4]">
            FUNDING INSTITUTIONS
          </p>
          <div className="flex flex-none items-center">
            <FundingInstitutionDialog
              mode="create"
              submitAction={createFundingInstitution}
            />
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <FundingInstitutionsTable
        rows={rows}
        updateAction={updateFundingInstitution}
        deleteAction={deleteFundingInstitution}
      />
    </div>
  );
}
