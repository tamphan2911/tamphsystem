import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { deleteResearchTask } from "../../actions";
import { TasksClient } from "../TasksClient";

export const dynamic = "force-dynamic";

function canUseArchivedTasks(roles: Role[]) {
  return (
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    roles.includes(Role.ASSISTANT)
  );
}

export default async function ArchivedResearchTasksPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  const roles =
    currentUser?.roles ??
    (((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[]);

  if (!canUseArchivedTasks(roles)) redirect("/401");

  const isRootAdmin = roles.includes(Role.ADMIN);
  const isChiefAssistant = roles.includes(Role.CHIEF_ASSISTANT);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <TasksClient
        isAdmin={isRootAdmin}
        isChiefAssistant={isChiefAssistant}
        canDelete={isRootAdmin}
        deleteAction={deleteResearchTask}
        archivedMode
        action={
          <Link
            href="/tasks"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-none border border-[#1F7180] bg-transparent px-4 text-sm font-normal text-[#1F7180] shadow-sm outline-none transition duration-150 ease-out hover:border-[#155864] hover:bg-[#E9F8FA] hover:text-[#155864] hover:shadow-md focus:ring-2 focus:ring-[#1F7180]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#A8DADC] dark:text-[#A8DADC] dark:hover:border-[#C9F0F2] dark:hover:bg-[#303030] dark:hover:text-[#C9F0F2]"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Active tasks
          </Link>
        }
      />
    </div>
  );
}
