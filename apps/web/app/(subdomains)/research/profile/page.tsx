import { redirect } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "../../../../auth";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ResearchProfilePage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      affiliation: true,
      avatarUrl: true,
      emailVerified: true,
      roles: true,
      createdAt: true,
      _count: {
        select: {
          researchProjects: true,
          authoredResearch: true,
          registeredResearch: true,
          assignedResearchTasks: true,
        },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <ProfileClient
      user={{
        ...user,
        emailVerified: user.emailVerified?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
