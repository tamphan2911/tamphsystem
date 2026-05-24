"use server";

import { prisma } from "@repo/db";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";

export async function activateResearchSite() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSites: true },
  });
  const activeSites = new Set(user?.activeSites ?? []);
  activeSites.add("research");

  await prisma.user.update({
    where: { id: userId },
    data: { activeSites: { set: Array.from(activeSites) } },
  });

  redirect("/");
}
