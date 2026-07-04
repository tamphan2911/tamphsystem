"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";

async function requireTeamAdmin() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  if (!user?.roles.includes(Role.ADMIN)) redirect("/401");
  return user;
}

function textValue(value: FormDataEntryValue | null, fallback = "") {
  const text =
    typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text || fallback;
}

function optionalTextValue(value: FormDataEntryValue | null) {
  const text = textValue(value);
  return text || null;
}

function selectedIds(formData: FormData, name: string) {
  return Array.from(
    new Set(
      formData
        .getAll(name)
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  );
}

async function teamPayload(formData: FormData, _currentTeamId?: string) {
  const name = textValue(formData.get("name"));
  if (!name) throw new Error("Team name is required.");

  const leaderId = textValue(formData.get("leaderId"));
  if (!leaderId) throw new Error("Choose a chief assistant as team leader.");

  const leader = await prisma.user.findFirst({
    where: {
      id: leaderId,
      activeSites: { has: "research" },
      roles: { has: Role.CHIEF_ASSISTANT },
    },
    select: { id: true },
  });
  if (!leader) throw new Error("Choose an active chief assistant as leader.");

  const existingLeaderTeam = await prisma.researchAssistantTeam.findFirst({
    where: {
      leaderId,
      ...(_currentTeamId ? { NOT: { id: _currentTeamId } } : {}),
    },
    select: { name: true },
  });
  if (existingLeaderTeam) {
    throw new Error(
      `This chief assistant already leads ${existingLeaderTeam.name}. A chief assistant can lead only one team.`,
    );
  }

  const memberIds = selectedIds(formData, "memberIds");
  if (memberIds.length > 0) {
    const assistantMembers = await prisma.user.findMany({
      where: {
        id: { in: memberIds },
        activeSites: { has: "research" },
        roles: { has: Role.ASSISTANT },
        NOT: { roles: { has: Role.CHIEF_ASSISTANT } },
      },
      select: { id: true },
    });
    if (assistantMembers.length !== memberIds.length) {
      throw new Error("Team members must be active assistants.");
    }
  }

  return {
    name: name.slice(0, 160),
    description: optionalTextValue(formData.get("description"))?.slice(0, 800),
    leaderId,
    memberIds,
  };
}

export async function createResearchAssistantTeam(formData: FormData) {
  await requireTeamAdmin();
  const payload = await teamPayload(formData);

  await prisma.researchAssistantTeam.create({
    data: {
      name: payload.name,
      description: payload.description,
      leaderId: payload.leaderId,
      ...(payload.memberIds.length > 0
        ? {
            members: {
              createMany: {
                data: payload.memberIds.map((userId) => ({ userId })),
                skipDuplicates: true,
              },
            },
          }
        : {}),
    },
  });

  revalidatePath("/teams");
  revalidatePath("/team");
}

export async function updateResearchAssistantTeam(
  teamId: string,
  formData: FormData,
) {
  await requireTeamAdmin();
  const existing = await prisma.researchAssistantTeam.findUnique({
    where: { id: teamId },
    select: { id: true },
  });
  if (!existing) throw new Error("Team was not found.");
  const payload = await teamPayload(formData, teamId);

  await prisma.$transaction(async (tx) => {
    await tx.researchAssistantTeam.update({
      where: { id: teamId },
      data: {
        name: payload.name,
        description: payload.description,
        leaderId: payload.leaderId,
      },
    });
    await tx.researchAssistantTeamMember.deleteMany({
      where: {
        teamId,
        ...(payload.memberIds.length > 0
          ? { userId: { notIn: payload.memberIds } }
          : {}),
      },
    });
    if (payload.memberIds.length > 0) {
      await tx.researchAssistantTeamMember.createMany({
        data: payload.memberIds.map((userId) => ({ teamId, userId })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath("/teams");
  revalidatePath("/team");
}
