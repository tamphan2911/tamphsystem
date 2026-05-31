"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { auth } from "../../../../auth";

export async function updateResearchProfile(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { error: "Unauthorized" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Display name is required." };
  const affiliation = String(formData.get("affiliation") ?? "").trim();
  if (!affiliation) return { error: "Affiliation is required." };

  try {
    await prisma.user.update({
      where: { email },
      data: { name, affiliation },
    });
    revalidatePath("/profile");
    revalidatePath("/research/profile");
    return { success: true };
  } catch {
    return { error: "Profile could not be updated." };
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
