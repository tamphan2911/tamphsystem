import { redirect } from "next/navigation";
import bcrypt from "bcrypt";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { displayResearchEmail } from "@/sites/research/lib/display";
import { ResearchUsersTable, type ResearchUserRow } from "./ResearchUsersTable";
import { NewResearchUserDialog } from "./NewResearchUserDialog";

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
      passwordHash: true,
      adminVisiblePassword: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const taskAssignments = await prisma.researchTaskAssignment.findMany({
    where: {
      userId: { in: users.map((user) => user.id) },
      task: {
        status: {
          notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
        },
      },
    },
    select: {
      userId: true,
      task: {
        select: {
          status: true,
        },
      },
    },
  });

  const taskBreakdowns = new Map<string, Map<ResearchTaskStatus, number>>();
  taskAssignments.forEach((assignment) => {
    const breakdown =
      taskBreakdowns.get(assignment.userId) ??
      new Map<ResearchTaskStatus, number>();
    breakdown.set(
      assignment.task.status,
      (breakdown.get(assignment.task.status) ?? 0) + 1,
    );
    taskBreakdowns.set(assignment.userId, breakdown);
  });

  const visiblePasswords = await Promise.all(
    users.map(async (user) => {
      if (!user.adminVisiblePassword) return [user.id, ""] as const;
      const matches = await bcrypt.compare(
        user.adminVisiblePassword,
        user.passwordHash,
      );
      return [user.id, matches ? user.adminVisiblePassword : ""] as const;
    }),
  );
  const visiblePasswordByUserId = new Map(visiblePasswords);

  const rows: ResearchUserRow[] = users.map((user) => {
    const email = displayResearchEmail(user.email);
    return {
      id: user.id,
      name: user.name ?? "",
      email,
      affiliation: user.affiliation,
      roles: user.roles,
      activeSites: user.activeSites,
      password: visiblePasswordByUserId.get(user.id) ?? "",
      emailVerified: email ? (user.emailVerified?.toISOString() ?? null) : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      unfinishedTasks: Array.from(taskBreakdowns.get(user.id) ?? []).map(
        ([status, count]) => ({
          status,
          count,
        }),
      ),
    };
  });
  const stats = [
    {
      label: "Users",
      value: rows.length,
    },
    {
      label: "Verified",
      value: rows.filter((row) => Boolean(row.emailVerified)).length,
    },
    {
      label: "Admins",
      value: rows.filter((row) => row.roles.includes(Role.ADMIN)).length,
    },
    {
      label: "Assistants",
      value: rows.filter(
        (row) =>
          row.roles.includes(Role.ASSISTANT) ||
          row.roles.includes(Role.CHIEF_ASSISTANT),
      ).length,
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
          <div className="flex flex-none items-center">
            <NewResearchUserDialog roleOptions={Object.values(Role)} />
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <ResearchUsersTable rows={rows} roleOptions={Object.values(Role)} />
    </div>
  );
}
