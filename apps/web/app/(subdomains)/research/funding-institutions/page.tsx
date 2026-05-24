import Link from "next/link";
import { ExternalLink, Landmark } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import {
  createFundingInstitution,
  updateFundingInstitution,
} from "../actions";
import { FundingInstitutionDialog } from "./FundingInstitutionDialog";

export const dynamic = "force-dynamic";

const demoFundingInstitutions = [
  {
    funderCode: "UEH",
    name: "University of Economics Ho Chi Minh City",
    shortName: "UEH",
    country: "Vietnam",
    website: "https://ueh.edu.vn",
    note: "Demo institutional funding source for education and business research.",
  },
  {
    funderCode: "GGRI",
    name: "Green Growth Research Institute",
    shortName: "GGRI",
    country: "Vietnam",
    website: "",
    note: "Demo funding institution for sustainability and finance projects.",
  },
  {
    funderCode: "TPRL",
    name: "Tam Pham Research Lab",
    shortName: "TPRL",
    country: "Vietnam",
    website: "https://research.tamph.com",
    note: "Demo internal project sponsor.",
  },
  {
    funderCode: "MBS",
    name: "Mekong Business School",
    shortName: "MBS",
    country: "Vietnam",
    website: "",
    note: "Demo academic institution for regional business data work.",
  },
  {
    funderCode: "IDPA",
    name: "International Digital Pedagogy Association",
    shortName: "IDPA",
    country: "International",
    website: "",
    note: "Demo project organizer for digital pedagogy research outputs.",
  },
];

async function ensureDemoFundingInstitutions() {
  for (const institution of demoFundingInstitutions) {
    const existing = await prisma.fundingInstitution.findFirst({
      where: { name: institution.name },
      select: { id: true },
    });

    if (existing) {
      await prisma.fundingInstitution.update({
        where: { id: existing.id },
        data: institution,
      });
    } else {
      await prisma.fundingInstitution.create({ data: institution });
    }
  }
}

export default async function FundingInstitutionsPage() {
  await ensureDemoFundingInstitutions();
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const institutions = await prisma.fundingInstitution.findMany({
    include: { _count: { select: { organizedProjects: true } } },
    orderBy: [{ name: "asc" }],
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
              <th className="w-28 px-4 py-3">Funder ID</th>
              <th className="px-4 py-3">Funding institution</th>
              <th className="w-32 px-3 py-3">Alias</th>
              <th className="w-36 px-3 py-3">Country</th>
              <th className="w-28 px-3 py-3 text-center">Projects</th>
              <th className="w-32 px-3 py-3">Website</th>
              {isAdmin && <th className="w-16 px-3 py-3 text-center">Edit</th>}
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
                  <p className="line-clamp-1 text-base font-semibold text-slate-800 dark:text-slate-100">
                    {institution.name}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {institution.note || "No note"}
                  </p>
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {institution.shortName || "-"}
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {institution.country || "-"}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-slate-50 px-2 py-1 text-sm font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                    {institution._count.organizedProjects}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {institution.website ? (
                    <Link
                      href={institution.website}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      Visit
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
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
                        name: institution.name,
                        shortName: institution.shortName,
                        country: institution.country,
                        website: institution.website,
                        note: institution.note,
                      }}
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
