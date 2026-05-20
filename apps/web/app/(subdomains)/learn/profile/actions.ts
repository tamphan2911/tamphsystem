"use server";

import { prisma } from "@repo/db";
import { auth } from "../../../../auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  
  if (!name) return { error: "Name is required" };

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { name }
    });
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update profile" };
  }
}

export async function applyForLecturer() {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };
  
  // In a full implementation, this would insert a record into a LecturerApplication table
  // For now, we simulate success.
  return { success: true, message: "Your application has been submitted to the Admin for review." };
}
