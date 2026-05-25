"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { prisma, ClaimStatus, ResearchStage, Role } from "@repo/db";

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

async function requireAdmin() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];

  if (!roles.includes(Role.ADMIN)) {
    redirect("/401");
  }
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const email = optionalString(formData.get("email"));
  const affiliation = optionalString(formData.get("affiliation"));
  const password = optionalString(formData.get("password")) ?? "password";
  const roles = formData
    .getAll("roles")
    .filter((role): role is Role => Object.values(Role).includes(role as Role));

  if (!email) return;

  await prisma.user.create({
    data: {
      email,
      name: optionalString(formData.get("name")),
      affiliation: affiliation ?? "Not set",
      passwordHash: await bcrypt.hash(password, 10),
      emailVerified: new Date(),
      roles: roles.length > 0 ? roles : [Role.STUDENT],
      activeSites: ["admin"],
    },
  });

  revalidatePath("/users");
}

export async function updateUserRoles(formData: FormData) {
  await requireAdmin();

  const userId = optionalString(formData.get("userId"));
  if (!userId) return;

  const roles = formData
    .getAll("roles")
    .filter((role): role is Role => Object.values(Role).includes(role as Role));

  await prisma.user.update({
    where: { id: userId },
    data: { roles: roles.length > 0 ? roles : [Role.STUDENT] },
  });

  revalidatePath("/users");
}

export async function createCourse(formData: FormData) {
  await requireAdmin();

  const authorId = optionalString(formData.get("authorId"));
  if (!authorId) return;

  await prisma.course.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled course",
      description: optionalString(formData.get("description")),
      isPublished: formData.get("isPublished") === "on",
      authorId,
    },
  });

  revalidatePath("/courses");
}

export async function updateCoursePublishing(formData: FormData) {
  await requireAdmin();

  const courseId = optionalString(formData.get("courseId"));
  if (!courseId) return;

  await prisma.course.update({
    where: { id: courseId },
    data: { isPublished: formData.get("isPublished") === "on" },
  });

  revalidatePath("/courses");
}

export async function createAdminResearchProject(formData: FormData) {
  await requireAdmin();

  const leadResearcherId = optionalString(formData.get("leadResearcherId"));
  if (!leadResearcherId) return;

  await prisma.researchProject.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled research",
      abstract: optionalString(formData.get("abstract")),
      stage:
        (formData.get("stage") as ResearchStage | null) ??
        ResearchStage.PRODUCTION,
      claimStatus:
        (formData.get("claimStatus") as ClaimStatus | null) ??
        ClaimStatus.CANNOT_CLAIM,
      coAuthors: optionalString(formData.get("coAuthors")),
      universityRegistration: optionalString(
        formData.get("universityRegistration"),
      ),
      leadResearcherId,
    },
  });

  revalidatePath("/research");
}

export async function createAdminJournal(formData: FormData) {
  await requireAdmin();

  await prisma.journal.create({
    data: {
      name: optionalString(formData.get("name")) ?? "Untitled journal",
      issn: optionalString(formData.get("issn")),
      field: optionalString(formData.get("field")),
      rank: optionalString(formData.get("rank")),
      publisher: optionalString(formData.get("publisher")),
      apc: optionalString(formData.get("apc")),
      submissionFee: optionalString(formData.get("submissionFee")),
      note: optionalString(formData.get("note")),
    },
  });

  revalidatePath("/journals");
}

export async function createAdminPublisherAccount(formData: FormData) {
  await requireAdmin();

  await prisma.publisherAccount.create({
    data: {
      username: optionalString(formData.get("username")) ?? "new-account",
      password: optionalString(formData.get("password")) ?? "",
      email: optionalString(formData.get("email")),
      note: optionalString(formData.get("note")),
      journalId: optionalString(formData.get("journalId")),
    },
  });

  revalidatePath("/accounts");
}
