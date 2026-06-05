import Link from "next/link";
import { ExternalLink, Globe2, Landmark, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import {
  createFundingInstitution,
  deleteFundingInstitution,
  updateFundingInstitution,
} from "../actions";
import { IconHint } from "@/sites/research/components/TableControls";
import { DeleteFundingInstitutionButton } from "./DeleteFundingInstitutionButton";
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

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950 dark:text-white">
                Funding institutions
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Institutions used as funding sources for organized projects.
              </p>
            </div>
          </div>
          {isAdmin && (
            <FundingInstitutionDialog
              mode="create"
              submitAction={createFundingInstitution}
            />
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="w-24 px-4 py-3">Funder ID</th>
              <th className="px-4 py-3">Funder name</th>
              <th className="w-24 px-3 py-3">Alias</th>
              <th className="w-28 px-3 py-3">Country</th>
              <th className="w-20 px-3 py-3 text-center">Projects</th>
              <th className="w-16 px-3 py-3 text-center">Web</th>
              {isAdmin && <th className="w-14 px-3 py-3 text-center">Edit</th>}
              {isAdmin && (
                <th className="w-14 px-3 py-3 text-center">
                  <span className="sr-only">Delete</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {institutions.map((institution) => (
              <tr
                key={institution.id}
                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {institution.funderCode || institution.id.slice(0, 8)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="line-clamp-1 text-base font-normal text-slate-800 dark:text-slate-100">
                    {institution.name}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {institution.note || "No note"}
                  </p>
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {institution.shortName || "-"}
                </td>
                <td className="px-3 py-3">
                  {institution.country ? (
                    <IconHint label={institution.country}>
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-500 dark:text-sky-300" />
                        <span className="truncate">{institution.country}</span>
                      </span>
                    </IconHint>
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-50 px-2 py-1 text-sm font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                    {institution._count.organizedProjects}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {institution.website ? (
                    <IconHint label="Open website">
                      <Link
                        href={institution.website}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-100 hover:shadow-md dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:bg-blue-900/50"
                        aria-label={`Open ${institution.name} website`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </IconHint>
                  ) : (
                    <IconHint label="No website">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600">
                        <Globe2 className="h-4 w-4" />
                      </span>
                    </IconHint>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-3 py-3 text-center">
                    <FundingInstitutionDialog
                      mode="edit"
                      submitAction={updateFundingInstitution.bind(
                        null,
                        institution.id,
                      )}
                      initialValues={{
                        funderCode: institution.funderCode,
                        name: institution.name,
                        shortName: institution.shortName,
                        country: institution.country,
                        website: institution.website,
                        note: institution.note,
                      }}
                    />
                  </td>
                )}
                {isAdmin && (
                  <td className="px-3 py-3 text-center">
                    <DeleteFundingInstitutionButton
                      funder={{
                        id: institution.id,
                        name: institution.name,
                        organizedProjects: institution._count.organizedProjects,
                        researchProjects: institution._count.researchProjects,
                      }}
                      deleteAction={deleteFundingInstitution}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
