"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { prisma, ClaimStatus, ResearchStage, Role } from "@repo/db";

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

async function requireCurrentUser() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect("/login");
  }

  return {
    id: userId,
    roles: ((session?.user as { roles?: Role[] } | undefined)?.roles ?? []) as Role[],
  };
}

function canManageResearch(roles: Role[]) {
  return roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
}

function requireAdmin(roles: Role[]) {
  if (!roles.includes(Role.ADMIN)) {
    redirect("/401");
  }
}

export async function createResearchProject(formData: FormData) {
  const user = await requireCurrentUser();

  await prisma.researchProject.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled research",
      abstract: optionalString(formData.get("abstract")),
      stage: (formData.get("stage") as ResearchStage | null) ?? ResearchStage.PRODUCTION,
      coAuthors: optionalString(formData.get("coAuthors")),
      universityRegistration: optionalString(formData.get("universityRegistration")),
      claimStatus: (formData.get("claimStatus") as ClaimStatus | null) ?? ClaimStatus.CANNOT_CLAIM,
      leadResearcherId: user.id,
    },
  });

  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateResearchProject(projectId: string, formData: FormData) {
  await requireCurrentUser();

  await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled research",
      abstract: optionalString(formData.get("abstract")),
      stage: (formData.get("stage") as ResearchStage | null) ?? ResearchStage.PRODUCTION,
      coAuthors: optionalString(formData.get("coAuthors")),
      universityRegistration: optionalString(formData.get("universityRegistration")),
      claimStatus: (formData.get("claimStatus") as ClaimStatus | null) ?? ClaimStatus.CANNOT_CLAIM,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function createJournal(formData: FormData) {
  await requireCurrentUser();

  await prisma.journal.create({
    data: {
      name: optionalString(formData.get("name")) ?? "Untitled journal",
      issn: optionalString(formData.get("issn")),
      field: optionalString(formData.get("field")),
      rank: optionalString(formData.get("rank")),
      publisher: optionalString(formData.get("publisher")),
      apc: optionalString(formData.get("apc")),
      submissionFee: optionalString(formData.get("submissionFee")),
      scimagoLink: optionalString(formData.get("scimagoLink")),
      scopusLink: optionalString(formData.get("scopusLink")),
      note: optionalString(formData.get("note")),
    },
  });

  revalidatePath("/journals");
}

export async function createPublisherAccount(formData: FormData) {
  await requireCurrentUser();

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
  revalidatePath("/journals");
}

export async function createAcademicReview(formData: FormData) {
  await requireCurrentUser();

  const journalId = optionalString(formData.get("journalId"));
  if (!journalId) return;

  await prisma.academicReview.create({
    data: {
      journalId,
      manuscriptTitle: optionalString(formData.get("manuscriptTitle")) ?? "Untitled manuscript",
      manuscriptId: optionalString(formData.get("manuscriptId")),
      status: optionalString(formData.get("status")) ?? "INVITED",
      recommendation: optionalString(formData.get("recommendation")),
      editorName: optionalString(formData.get("editorName")),
      reviewRound: optionalString(formData.get("reviewRound")),
      note: optionalString(formData.get("note")),
      requestedAt: optionalString(formData.get("requestedAt"))
        ? new Date(optionalString(formData.get("requestedAt")) as string)
        : new Date(),
      dueDate: optionalString(formData.get("dueDate"))
        ? new Date(optionalString(formData.get("dueDate")) as string)
        : null,
      completedAt: optionalString(formData.get("completedAt"))
        ? new Date(optionalString(formData.get("completedAt")) as string)
        : null,
    },
  });

  revalidatePath("/reviews");
  revalidatePath("/journals");
}

export async function createResearchSubmission(projectId: string, formData: FormData) {
  await requireCurrentUser();

  const journalId = optionalString(formData.get("journalId"));
  if (!journalId) return;

  await prisma.researchSubmission.create({
    data: {
      researchProjectId: projectId,
      journalId,
      accountId: optionalString(formData.get("accountId")),
      status: optionalString(formData.get("status")) ?? "PENDING",
      submittedAt: optionalString(formData.get("submittedAt"))
        ? new Date(optionalString(formData.get("submittedAt")) as string)
        : new Date(),
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function createPublication(projectId: string, formData: FormData) {
  await requireCurrentUser();

  await prisma.publication.create({
    data: {
      projectId,
      title: optionalString(formData.get("title")) ?? "Published article",
      url: optionalString(formData.get("url")),
      scimagoLink: optionalString(formData.get("scimagoLink")),
      scopusLink: optionalString(formData.get("scopusLink")),
      rank: optionalString(formData.get("rank")),
      publishedDate: optionalString(formData.get("publishedDate"))
        ? new Date(optionalString(formData.get("publishedDate")) as string)
        : new Date(),
    },
  });

  await prisma.researchProject.update({
    where: { id: projectId },
    data: { stage: ResearchStage.PUBLISHED },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function updateResearchRoles(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const userId = optionalString(formData.get("userId"));
  if (!userId) return;

  const selectedRoles = formData
    .getAll("roles")
    .filter((role): role is Role => Object.values(Role).includes(role as Role));

  await prisma.user.update({
    where: { id: userId },
    data: {
      roles: selectedRoles.length > 0 ? selectedRoles : [Role.STUDENT],
    },
  });

  revalidatePath("/assistants");
}

export async function assignResearchAssistant(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const userId = optionalString(formData.get("userId"));
  const role = formData.get("assistantRole");
  if (!userId || (role !== Role.ASSISTANT && role !== Role.CHIEF_ASSISTANT)) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  if (!target) return;

  const roles = new Set(target.roles);
  roles.delete(Role.ASSISTANT);
  roles.delete(Role.CHIEF_ASSISTANT);
  roles.add(role);

  await prisma.user.update({
    where: { id: userId },
    data: { roles: Array.from(roles) },
  });

  revalidatePath("/assistants");
}

export async function createResearchTask(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const assigneeIds = formData
    .getAll("assigneeIds")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (assigneeIds.length === 0) return;

  await prisma.researchTask.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled task",
      description: optionalString(formData.get("description")),
      category: optionalString(formData.get("category")),
      dueDate: optionalString(formData.get("dueDate"))
        ? new Date(optionalString(formData.get("dueDate")) as string)
        : null,
      createdById: user.id,
      assignments: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
  });

  revalidatePath("/tasks");
}

export async function assertResearchManager() {
  const user = await requireCurrentUser();
  if (!canManageResearch(user.roles)) {
    redirect("/401");
  }
  return user;
}
