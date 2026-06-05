import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchUsersTable, type ResearchUserRow } from "./ResearchUsersTable";

export const dynamic = "force-dynamic";

export default async function ResearchUsersPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!roles.includes(Role.ADMIN)) redirect("/401");

  const users = await prisma.user.findMany({
    where: { activeSites: { has: "research" } },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      affiliation: true,
      roles: true,
      activeSites: true,
      adminVisiblePassword: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const rows: ResearchUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    affiliation: user.affiliation,
    roles: user.roles,
    activeSites: user.activeSites,
    password: user.adminVisiblePassword ?? "",
    emailVerified: user.emailVerified?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#E4E4E4]">
            Research users
          </h1>
          <p className="mt-1 text-sm text-[#B0B0B0]">
            Accounts activated for Research Hub or registered from the research
            site.
          </p>
        </div>
        <div className="border border-[#444444] bg-[#2C2C2C] px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {rows.length} users
        </div>
      </div>

      <ResearchUsersTable rows={rows} roleOptions={Object.values(Role)} />
    </div>
  );
}
