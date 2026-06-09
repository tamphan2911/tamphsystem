import { prisma, Role } from "@repo/db";
import { assertResearchManager } from "../actions";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
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
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="grid min-w-0 border border-[#444444] bg-[#2C2C2C]">
            {stats.map((item) => (
              <div
                key={item.label}
                className="whitespace-nowrap px-3 py-2 text-sm text-[#E4E4E4]"
              >
                <span className="font-normal text-[#B0B0B0]">
                  {item.label}:{" "}
                </span>
                <span className="font-normal text-[#E4E4E4]">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-none items-center">
            {canAssignAssistants && <AddAssistantDialog users={candidates} />}
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <AssistantsTable rows={rows} canManage={canAssignAssistants} />
    </div>
  );
}
