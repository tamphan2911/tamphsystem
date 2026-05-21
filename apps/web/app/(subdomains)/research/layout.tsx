import { Role } from "@repo/db";
import { auth } from "../../../auth";
import { ResearchShell } from "./ResearchShell";

export default async function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ?? []) as Role[];

  return (
    <ResearchShell
      email={session?.user?.email}
      name={session?.user?.name}
      isAdmin={roles.includes(Role.ADMIN)}
      isAssistant={roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT)}
    >
      {children}
    </ResearchShell>
  );
}
