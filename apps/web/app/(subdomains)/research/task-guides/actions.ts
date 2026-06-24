"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";

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
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const importantNote =
    String(formData.get("importantNote") ?? "").trim() || null;
  if (!title) throw new Error("Enter a guide title.");
  if (!content) throw new Error("Enter the guide content.");
  return { title, content, importantNote };
}

async function nextGuideCode() {
  const guides = await prisma.taskGuide.findMany({
    select: { guideCode: true },
  });
  const highestNumber = guides.reduce((highest, guide) => {
    const match = /^G(\d+)$/.exec(guide.guideCode);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `G${String(highestNumber + 1).padStart(3, "0")}`;
}

export async function createTaskGuide(formData: FormData) {
  const userId = await requireAdmin();
  const values = guideValues(formData);
  let created = false;
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    try {
      await prisma.taskGuide.create({
        data: {
          ...values,
          guideCode: await nextGuideCode(),
          createdById: userId,
        },
      });
      created = true;
    } catch (error) {
      const isCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!isCodeCollision || attempt === 2) throw error;
    }
  }
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
