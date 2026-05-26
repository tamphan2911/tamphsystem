import { UserRound } from "lucide-react";
import { prisma, Role } from "@repo/db";
import { assertResearchManager } from "../actions";
import { AssistantsTable, type AssistantRow } from "./AssistantsTable";
import {
  AddAssistantDialog,
  type AssistantCandidate,
} from "./AddAssistantDialog";

export const dynamic = "force-dynamic";

async function ensureAssistantResearchAccess() {
  const assistantUsers = await prisma.user.findMany({
    where: { roles: { hasSome: [Role.ASSISTANT, Role.CHIEF_ASSISTANT] } },
    select: { id: true, activeSites: true },
  });
  const updates = assistantUsers
    .filter((user) => !user.activeSites.includes("research"))
    .map((user) =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          activeSites: {
            set: Array.from(new Set([...user.activeSites, "research"])),
          },
        },
      }),
    );

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

export default async function AssistantsPage() {
  const currentUser = await assertResearchManager();
  const canAssignAssistants = currentUser.roles.includes(Role.ADMIN);

  await ensureAssistantResearchAccess();

  const users = await prisma.user.findMany({
    where: { activeSites: { has: "research" } },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  const assistantUsers = users.filter(
    (user) =>
      user.roles.includes(Role.ASSISTANT) ||
      user.roles.includes(Role.CHIEF_ASSISTANT),
  );

  const rows: AssistantRow[] = assistantUsers.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    password: user.adminVisiblePassword ?? "",
    assistantRole: user.roles.includes(Role.CHIEF_ASSISTANT)
      ? Role.CHIEF_ASSISTANT
      : Role.ASSISTANT,
  }));

  const candidates: AssistantCandidate[] = users.map((user) => ({
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    roles: user.roles,
  }));

  const stats = [
    {
      label: "Assistants",
      value: assistantUsers.length,
      icon: UserRound,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:flex-wrap">
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

        {canAssignAssistants && <AddAssistantDialog users={candidates} />}
      </div>

      <AssistantsTable rows={rows} canManage={canAssignAssistants} />
    </div>
  );
}
