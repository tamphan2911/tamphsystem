"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, ResearchTaskType, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { taskGuideTypeOptions } from "@/sites/research/lib/task-guide";

async function requireAdmin() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  if (!user?.roles.includes(Role.ADMIN)) redirect("/401");
  return userId;
}

function guideValues(formData: FormData) {
  const taskType = String(formData.get("taskType") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!taskGuideTypeOptions.includes(taskType as never)) {
    throw new Error("Choose a valid task type.");
  }
  if (!title) throw new Error("Enter a guide title.");
  if (!content) throw new Error("Enter the guide content.");
  return { taskType: taskType as ResearchTaskType, title, content };
}

export async function createTaskGuide(formData: FormData) {
  const userId = await requireAdmin();
  const values = guideValues(formData);
  const existing = await prisma.taskGuide.findUnique({
    where: { taskType: values.taskType },
    select: { id: true },
  });
  if (existing) throw new Error("A guide already exists for this task type.");
  await prisma.taskGuide.create({
    data: { ...values, createdById: userId },
  });
  revalidatePath("/task-guides");
}

export async function updateTaskGuide(id: string, formData: FormData) {
  await requireAdmin();
  const values = guideValues(formData);
  await prisma.taskGuide.update({ where: { id }, data: values });
  revalidatePath("/task-guides");
  revalidatePath("/tasks");
}

export async function deleteTaskGuide(id: string) {
  await requireAdmin();
  await prisma.taskGuide.delete({ where: { id } });
  revalidatePath("/task-guides");
  revalidatePath("/tasks");
}
