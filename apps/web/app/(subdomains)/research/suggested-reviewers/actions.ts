"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";

async function requireAdminUserId() {
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

function reviewerValues(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const institution = String(formData.get("institution") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  if (!name) throw new Error("Enter reviewer name.");
  if (!email) throw new Error("Enter reviewer email.");

  return {
    name,
    email,
    institution: institution || null,
    bio: bio || null,
  };
}

function reviewerSaveError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new Error("A reviewer with this email already exists.");
  }
  return error;
}

export async function createSuggestedReviewer(formData: FormData) {
  const userId = await requireAdminUserId();
  const values = reviewerValues(formData);
  try {
    await prisma.suggestedReviewer.create({
      data: { ...values, createdById: userId },
    });
  } catch (error) {
    throw reviewerSaveError(error);
  }
  revalidatePath("/suggested-reviewers");
}

export async function updateSuggestedReviewer(id: string, formData: FormData) {
  await requireAdminUserId();
  const values = reviewerValues(formData);
  try {
    await prisma.suggestedReviewer.update({ where: { id }, data: values });
  } catch (error) {
    throw reviewerSaveError(error);
  }
  revalidatePath("/suggested-reviewers");
  revalidatePath("/tasks");
}

export async function deleteSuggestedReviewer(id: string) {
  await requireAdminUserId();
  await prisma.suggestedReviewer.delete({ where: { id } });
  revalidatePath("/suggested-reviewers");
  revalidatePath("/tasks");
}
