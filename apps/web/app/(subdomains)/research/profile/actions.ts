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
