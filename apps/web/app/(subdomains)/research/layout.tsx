import { Role } from "@repo/db";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ResearchShell } from "./ResearchShell";

export default async function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (userId) {
    const sitePathname = (await headers()).get("x-site-pathname") ?? "";
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeSites: true },
    });
    if (
      !user?.activeSites.includes("research") &&
      sitePathname !== "/activate"
    ) {
      redirect("/activate");
    }
  }

  return (
    <ResearchShell
      email={session?.user?.email}
      name={session?.user?.name}
      isAdmin={roles.includes(Role.ADMIN)}
      isAssistant={
        roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT)
      }
    >
      {children}
    </ResearchShell>
  );
}
