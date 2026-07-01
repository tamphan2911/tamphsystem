"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";

export async function updateResearchProfile(formData: FormData) {
  const session = await auth();
  const viewerUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!viewerUserId) return { error: "Unauthorized" };

  const targetUserId =
    String(formData.get("targetUserId") ?? "").trim() || viewerUserId;
  const viewer = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: { roles: true },
  });
  if (!viewer) return { error: "Unauthorized" };
  if (targetUserId !== viewerUserId && !viewer.roles.includes(Role.ADMIN)) {
    return { error: "Only admin can edit another user's profile." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { email: true },
  });
  if (!targetUser) return { error: "User account was not found." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Display name is required." };
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  if (!affiliation) return { error: "Affiliation is required." };
  const orcid = String(formData.get("orcid") ?? "").trim();
  const orcidPattern = /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-[\dX]{4}$/i;
  if (orcid && !orcidPattern.test(orcid)) {
    return {
      error:
        "ORCID must use the full URL format, for example https://orcid.org/0000-0001-5111-1024.",
    };
  }
  const bio = String(formData.get("bio") ?? "").trim();
  const bioWordCount = bio ? bio.split(/\s+/).filter(Boolean).length : 0;
  if (bioWordCount > 100) {
    return { error: "Bio must be 100 words or fewer." };
  }
  const requestedThemePreference = String(
    formData.get("researchThemePreference") ?? "system",
  ).trim();
  const researchThemePreference = ["system", "light", "dark"].includes(
    requestedThemePreference,
  )
    ? requestedThemePreference
    : "system";
  const additionalEmails = String(formData.get("additionalEmails") ?? "")
    .split(/[\n,;]/)
    .map((value) => value.trim())
    .filter(Boolean);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmail = additionalEmails.find(
    (additionalEmail) => !emailPattern.test(additionalEmail),
  );
  if (invalidEmail) {
    return { error: `Additional email is not valid: ${invalidEmail}` };
  }
  const mainEmail = targetUser.email.trim().toLowerCase();
  const uniqueAdditionalEmails = Array.from(
    new Map(
      additionalEmails
        .filter(
          (additionalEmail) =>
            additionalEmail.trim().toLowerCase() !== mainEmail,
        )
        .map((additionalEmail) => [
          additionalEmail.trim().toLowerCase(),
          additionalEmail.trim(),
        ]),
    ).values(),
  );

  try {
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        name,
        affiliation,
        orcid: orcid || null,
        bio: bio || null,
        additionalEmails: uniqueAdditionalEmails,
        researchThemePreference,
      },
    });
    const linkedResearch = await prisma.researchProject.findMany({
      where: {
        OR: [
          { leadResearcherId: targetUserId },
          { authors: { some: { id: targetUserId } } },
          { authorEntries: { some: { userId: targetUserId } } },
        ],
      },
      select: { id: true },
    });
    revalidatePath("/profile");
    revalidatePath("/research/profile");
    revalidatePath("/users");
    revalidatePath("/assistants");
    revalidatePath("/projects");
    revalidatePath("/research/projects");
    linkedResearch.forEach((research) => {
      revalidatePath(`/projects/${research.id}`);
      revalidatePath(`/research/projects/${research.id}`);
    });
    return { success: true };
  } catch {
    return { error: "Profile could not be updated." };
  }
}

export async function updateResearchPassword(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { error: "Unauthorized" };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required." };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }
  if (currentPassword === newPassword) {
    return { error: "New password must be different from current password." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true },
  });
  if (!user) return { error: "User account was not found." };

  const currentPasswordMatches = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );
  if (!currentPasswordMatches) {
    return { error: "Current password is not correct." };
  }

  try {
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        adminVisiblePassword: newPassword,
      },
    });
    revalidatePath("/profile");
    revalidatePath("/research/profile");
    revalidatePath("/users");
    revalidatePath("/assistants");
    return { success: true };
  } catch {
    return { error: "Password could not be updated." };
  }
}

export async function updateResearchAvatar(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { error: "Unauthorized" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PNG or JPG avatar first." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Avatar must be 2 MB or smaller." };
  }
  const allowed = ["image/png", "image/jpeg"];
  if (!allowed.includes(file.type)) {
    return { error: "Avatar must be a PNG or JPG image." };
  }

  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    await prisma.user.update({
      where: { email },
      data: { avatarUrl: `data:${file.type};base64,${data}` },
    });
    revalidatePath("/profile");
    revalidatePath("/research/profile");
    return { success: true };
  } catch {
    return { error: "Avatar could not be updated." };
  }
}
