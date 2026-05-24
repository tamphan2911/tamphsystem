import { redirect } from "next/navigation";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { NewTaskDialog, type TaskAssigneeOption } from "./NewTaskDialog";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function ResearchTasksPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ?? []) as Role[];

  if (!userId) redirect("/login");

  const isAdmin = roles.includes(Role.ADMIN);
  const isAssistant = roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT);

  if (!isAdmin && !isAssistant) redirect("/401");

  await prisma.researchTask.updateMany({
    where: { status: ResearchTaskStatus.OPEN },
    data: { status: ResearchTaskStatus.IN_PROGRESS },
  });

  const assistants: TaskAssigneeOption[] = isAdmin
    ? (
        await prisma.user.findMany({
          where: {
            roles: {
              hasSome: [Role.ADMIN, Role.ASSISTANT, Role.CHIEF_ASSISTANT],
            },
          },
          orderBy: [{ name: "asc" }, { email: "asc" }],
          select: { id: true, name: true, email: true, roles: true },
        })
      ).map((user) => ({
        id: user.id,
        name: user.name ?? "",
        email: user.email,
        roles: user.roles,
      }))
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <TasksClient
        isAdmin={isAdmin}
        action={isAdmin ? <NewTaskDialog assistants={assistants} /> : null}
      />
    </div>
  );
}
