"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import { auth } from "../../../auth";
import {
  prisma,
  ClaimStatus,
  ConferenceSubmissionStatus,
  CurrencyCode,
  RegistrationStatus,
  ResearchStage,
  OrganizedProjectStatus,
  ResearchAuthorNotificationType,
  ResearchTaskCategory,
  ResearchTaskStatus,
  ResearchTaskType,
  Role,
  SubmissionStatus,
} from "@repo/db";

export type ResearchAuthorEmailResult = {
  authorName: string;
  email: string;
  status: "sent" | "skipped" | "failed";
  reason?: string;
};

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function enumValue<T extends Record<string, string>>(
  values: T,
  value: FormDataEntryValue | null,
) {
  return typeof value === "string" && Object.values(values).includes(value)
    ? (value as T[keyof T])
    : null;
}

function taskCategoryFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  const normalized: Record<string, ResearchTaskCategory> = {
    Submitting: ResearchTaskCategory.SUBMITTING,
    "Submit research": ResearchTaskCategory.SUBMIT_RESEARCH,
    Production: ResearchTaskCategory.PRODUCTION,
    "Research production": ResearchTaskCategory.RESEARCH_PRODUCTION,
    References: ResearchTaskCategory.REFERENCES,
  };

  return enumValue(ResearchTaskCategory, value) ?? normalized[value] ?? null;
}

function taskTypeFromForm(value: FormDataEntryValue | null) {
  return enumValue(ResearchTaskType, value);
}

function dateFromForm(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  return text ? new Date(text) : null;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function dateIsBefore(left: Date, right: Date) {
  return startOfDay(left).getTime() < startOfDay(right).getTime();
}

function researchBaseUrl() {
  const configured =
    process.env.RESEARCH_BASE_URL ||
    process.env.NEXT_PUBLIC_RESEARCH_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://research.tamph.com";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });
}

async function researchContentIsLocked(projectId: string) {
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      contentUnlocked: true,
      submissions: { select: { status: true } },
    },
  });

  if (!project) return false;
  return (
    !project.contentUnlocked &&
    project.submissions.some(
      (submission) =>
        submission.status === SubmissionStatus.ACCEPTED ||
        submission.status === SubmissionStatus.PUBLISHED,
    )
  );
}

async function researchProductionIsComplete(projectId: string) {
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { completedProductionSteps: true },
  });

  if (!project) return false;
  return productionStepLabels.every((step) =>
    project.completedProductionSteps.includes(step),
  );
}

async function generateTaskCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(
      bytes,
      (byte) => alphabet[byte % alphabet.length],
    ).join("");
    const existing = await prisma.researchTask.findUnique({
      where: { taskCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  return crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
}

const productionStepLabels = [
  "Idea forming",
  "Data collection",
  "Modeling",
  "Writing",
  "Humanizing",
  "References",
];

function orderedUniqueStrings(values: FormDataEntryValue[]) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (
      typeof value !== "string" ||
      value.trim().length === 0 ||
      seen.has(value)
    ) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function stageFromResearchState(
  completedProductionSteps: string[],
  submissionStatuses: SubmissionStatus[],
) {
  if (submissionStatuses.includes(SubmissionStatus.PUBLISHED))
    return ResearchStage.PUBLISHED;
  if (submissionStatuses.includes(SubmissionStatus.ACCEPTED))
    return ResearchStage.ACCEPTED;
  if (
    submissionStatuses.some(
      (status) =>
        status === SubmissionStatus.UNDER_REVIEW ||
        status === SubmissionStatus.REVISION,
    )
  ) {
    return ResearchStage.REVIEW;
  }

  return productionStepLabels.every((step) =>
    completedProductionSteps.includes(step),
  )
    ? ResearchStage.SUBMITTING
    : ResearchStage.PRODUCTION;
}

async function refreshResearchStage(
  projectId: string,
  completedProductionSteps?: string[],
) {
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      completedProductionSteps: true,
      submissions: { select: { status: true } },
    },
  });

  if (!project) return;

  await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      stage: stageFromResearchState(
        completedProductionSteps ?? project.completedProductionSteps,
        project.submissions.map((submission) => submission.status),
      ),
    },
  });
}

async function generateResearchCode(year = new Date().getFullYear()) {
  const existing = await prisma.researchProject.findMany({
    where: {
      researchCode: {
        startsWith: `${year}-`,
      },
    },
    select: { researchCode: true },
  });
  const used = new Set(
    existing
      .map((project) => project.researchCode?.split("-")[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value)),
  );

  let next = 1;
  while (used.has(next)) next += 1;
  return `${year}-${String(next).padStart(2, "0")}`;
}

async function requireCurrentUser() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect("/login");
  }

  return {
    id: userId,
    roles: ((session?.user as { roles?: Role[] } | undefined)?.roles ??
      []) as Role[],
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
  const authorIds = orderedUniqueStrings(formData.getAll("authorUserIds"));
  const selectedAuthorIds = authorIds.length > 0 ? authorIds : [user.id];
  const correspondingAuthorId =
    optionalString(formData.get("correspondingAuthorId")) ??
    selectedAuthorIds[0];

  await prisma.researchProject.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled research",
      researchCode: await generateResearchCode(),
      abstract: optionalString(formData.get("abstract")),
      stage: ResearchStage.PRODUCTION,
      coAuthors: optionalString(formData.get("coAuthors")),
      universityRegistration: optionalString(
        formData.get("universityRegistration"),
      ),
      registrationName: optionalString(formData.get("registrationName")),
      registerStatus:
        (formData.get("registerStatus") as RegistrationStatus | null) ??
        RegistrationStatus.NOT_REGISTERED,
      claimStatus:
        (formData.get("claimStatus") as ClaimStatus | null) ??
        ClaimStatus.CANNOT_CLAIM,
      leadResearcherId: user.id,
      authors: {
        connect: selectedAuthorIds.map((id) => ({ id })),
      },
      authorEntries: {
        create: selectedAuthorIds.map((id, index) => ({
          userId: id,
          position: index,
          isCorresponding: id === correspondingAuthorId,
        })),
      },
    },
  });

  revalidatePath("/projects");
  redirect("/projects");
}

export async function createOrganizedProject(formData: FormData) {
  const user = await requireCurrentUser();
  const researchProjectIds = orderedUniqueStrings(
    formData.getAll("researchProjectIds"),
  );
  const requiredResearchCountText = optionalString(
    formData.get("requiredResearchCount"),
  );
  const requiredResearchCount = requiredResearchCountText
    ? Number(requiredResearchCountText)
    : null;

  await prisma.organizedProject.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled project",
      organizer: optionalString(formData.get("organizer")),
      referenceCode: optionalString(formData.get("referenceCode")),
      description: optionalString(formData.get("description")),
      note: optionalString(formData.get("note")),
      status:
        enumValue(OrganizedProjectStatus, formData.get("status")) ??
        OrganizedProjectStatus.PLANNED,
      requiredResearchCount:
        typeof requiredResearchCount === "number" &&
        Number.isFinite(requiredResearchCount)
          ? requiredResearchCount
          : null,
      startDate: dateFromForm(formData.get("startDate")),
      endDate: dateFromForm(formData.get("endDate")),
      createdById: user.id,
      research: {
        create: researchProjectIds.map((researchProjectId) => ({
          researchProjectId,
        })),
      },
    },
  });

  revalidatePath("/organized-projects");
  redirect("/organized-projects");
}

export async function updateResearchProject(
  projectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const projectLock = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      contentUnlocked: true,
      submissions: { select: { status: true } },
    },
  });

  const hasLockedJournalSubmission = projectLock?.submissions.some(
    (submission) =>
      submission.status === SubmissionStatus.ACCEPTED ||
      submission.status === SubmissionStatus.PUBLISHED,
  );

  if (hasLockedJournalSubmission && !projectLock?.contentUnlocked) {
    revalidatePath(`/projects/${projectId}`);
    return;
  }

  const authorIds = orderedUniqueStrings(formData.getAll("authorUserIds"));
  const selectedAuthorIds = authorIds.length > 0 ? authorIds : [user.id];
  const correspondingAuthorId =
    optionalString(formData.get("correspondingAuthorId")) ??
    selectedAuthorIds[0];
  const completedProductionSteps = formData
    .getAll("completedProductionSteps")
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

  const data = {
    title: optionalString(formData.get("title")) ?? "Untitled research",
    coAuthors: null,
    universityRegistration: optionalString(
      formData.get("universityRegistration"),
    ),
    registrationName: optionalString(formData.get("registrationName")),
    registerStatus:
      (formData.get("registerStatus") as RegistrationStatus | null) ??
      RegistrationStatus.NOT_REGISTERED,
    claimStatus:
      (formData.get("claimStatus") as ClaimStatus | null) ??
      ClaimStatus.CANNOT_CLAIM,
    completedProductionSteps,
    ...(formData.has("abstract")
      ? { abstract: optionalString(formData.get("abstract")) }
      : {}),
  };

  await prisma.$transaction(async (tx) => {
    await tx.researchProject.update({
      where: { id: projectId },
      data: {
        ...data,
        authors: {
          set: selectedAuthorIds.map((id) => ({ id })),
        },
      },
    });

    await tx.researchProjectAuthor.deleteMany({ where: { projectId } });
    await tx.researchProjectAuthor.createMany({
      data: selectedAuthorIds.map((id, index) => ({
        projectId,
        userId: id,
        position: index,
        isCorresponding: id === correspondingAuthorId,
      })),
    });
  });

  await refreshResearchStage(projectId, completedProductionSteps);

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function setResearchContentLock(
  projectId: string,
  locked: boolean,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.researchProject.update({
    where: { id: projectId },
    data: { contentUnlocked: !locked },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function createJournal(formData: FormData) {
  await requireCurrentUser();
  const fields = orderedUniqueStrings(formData.getAll("fields"));
  const legacyField = optionalString(formData.get("field"));

  await prisma.journal.create({
    data: {
      name: optionalString(formData.get("name")) ?? "Untitled journal",
      issn: optionalString(formData.get("issn")),
      field: fields.length > 0 ? fields.join("; ") : legacyField,
      fields,
      rank: optionalString(formData.get("rank")),
      publisher: optionalString(formData.get("publisher")),
      apc: optionalString(formData.get("apc")),
      apcCurrency:
        enumValue(CurrencyCode, formData.get("apcCurrency")) ??
        CurrencyCode.USD,
      submissionFee: optionalString(formData.get("submissionFee")),
      submissionFeeCurrency:
        enumValue(CurrencyCode, formData.get("submissionFeeCurrency")) ??
        CurrencyCode.USD,
      homepageLink: optionalString(formData.get("homepageLink")),
      scimagoLink: optionalString(formData.get("scimagoLink")),
      scopusLink: optionalString(formData.get("scopusLink")),
      note: optionalString(formData.get("note")),
    },
  });

  revalidatePath("/journals");
}

export async function updateJournal(journalId: string, formData: FormData) {
  await requireCurrentUser();
  const fields = orderedUniqueStrings(formData.getAll("fields"));
  const legacyField = optionalString(formData.get("field"));

  await prisma.journal.update({
    where: { id: journalId },
    data: {
      name: optionalString(formData.get("name")) ?? "Untitled journal",
      issn: optionalString(formData.get("issn")),
      field: fields.length > 0 ? fields.join("; ") : legacyField,
      fields,
      rank: optionalString(formData.get("rank")),
      publisher: optionalString(formData.get("publisher")),
      apc: optionalString(formData.get("apc")),
      apcCurrency:
        enumValue(CurrencyCode, formData.get("apcCurrency")) ??
        CurrencyCode.USD,
      submissionFee: optionalString(formData.get("submissionFee")),
      submissionFeeCurrency:
        enumValue(CurrencyCode, formData.get("submissionFeeCurrency")) ??
        CurrencyCode.USD,
      homepageLink: optionalString(formData.get("homepageLink")),
      scimagoLink: optionalString(formData.get("scimagoLink")),
      scopusLink: optionalString(formData.get("scopusLink")),
      note: optionalString(formData.get("note")),
    },
  });

  revalidatePath("/journals");
  revalidatePath(`/journals/${journalId}`);
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
  const projectId = optionalString(formData.get("projectId"));
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createAcademicReview(formData: FormData) {
  await requireCurrentUser();

  const journalId = optionalString(formData.get("journalId"));
  if (!journalId) return;

  await prisma.academicReview.create({
    data: {
      journalId,
      manuscriptTitle:
        optionalString(formData.get("manuscriptTitle")) ??
        "Untitled manuscript",
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

export async function createResearchSubmission(
  projectId: string,
  formData: FormData,
) {
  await requireCurrentUser();

  const journalId = optionalString(formData.get("journalId"));
  if (!journalId) return;

  await prisma.researchSubmission.create({
    data: {
      researchProjectId: projectId,
      journalId,
      accountId: optionalString(formData.get("accountId")),
      status:
        enumValue(SubmissionStatus, formData.get("status")) ??
        SubmissionStatus.PENDING,
      submittedAt: optionalString(formData.get("submittedAt"))
        ? new Date(optionalString(formData.get("submittedAt")) as string)
        : new Date(),
    },
  });

  await refreshResearchStage(projectId);

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
  if (!userId || (role !== Role.ASSISTANT && role !== Role.CHIEF_ASSISTANT))
    return;

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

export async function removeResearchAssistantRole(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const userId = optionalString(formData.get("userId"));
  if (!userId) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  if (!target) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      roles: target.roles.filter(
        (role) => role !== Role.ASSISTANT && role !== Role.CHIEF_ASSISTANT,
      ),
    },
  });

  revalidatePath("/assistants");
}

export async function createResearchTask(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const assigneeIds = formData
    .getAll("assigneeIds")
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    );

  if (assigneeIds.length === 0) {
    return { ok: false, reason: "NO_ASSIGNEE" };
  }

  const taskType = taskTypeFromForm(formData.get("taskType"));
  const projectId = optionalString(formData.get("projectId"));
  const journalId = optionalString(formData.get("journalId"));
  const conferenceId = optionalString(formData.get("conferenceId"));

  if (projectId && (await researchContentIsLocked(projectId))) {
    return { ok: false, reason: "RESEARCH_LOCKED" };
  }

  if (
    projectId &&
    (taskType === ResearchTaskType.SUBMIT_RESEARCH ||
      taskType === ResearchTaskType.SUBMIT_CONFERENCE) &&
    !(await researchProductionIsComplete(projectId))
  ) {
    return { ok: false, reason: "PRODUCTION_INCOMPLETE" };
  }

  if (taskType === ResearchTaskType.SUBMIT_RESEARCH && projectId && journalId) {
    const existingTask = await prisma.researchTask.findFirst({
      where: {
        taskType,
        projectId,
        journalId,
        status: {
          notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
        },
      },
      select: { id: true },
    });
    if (existingTask) {
      return { ok: false, reason: "ACTIVE_SUBMISSION_TASK_EXISTS" };
    }
  }

  if (
    taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
    projectId &&
    conferenceId
  ) {
    const existingTask = await prisma.researchTask.findFirst({
      where: {
        taskType,
        projectId,
        conferenceId,
        status: {
          notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
        },
      },
      select: { id: true },
    });
    if (existingTask) {
      return { ok: false, reason: "ACTIVE_SUBMISSION_TASK_EXISTS" };
    }
  }

  await prisma.researchTask.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled task",
      taskCode: await generateTaskCode(),
      description: optionalString(formData.get("description")),
      category: taskCategoryFromForm(formData.get("category")),
      taskType,
      status: ResearchTaskStatus.IN_PROGRESS,
      projectId,
      journalId,
      conferenceId,
      accountId: optionalString(formData.get("accountId")),
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
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function revokeResearchTask(taskId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const task = await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.REVOKED,
      revokedAt: new Date(),
      completedAt: null,
      adminViewedAt: null,
    },
    select: { projectId: true },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
}

export async function updateSubmissionStatus(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const submissionId = optionalString(formData.get("submissionId"));
  const submissionKind = optionalString(formData.get("submissionKind"));
  const status = optionalString(formData.get("status"));
  const statusDate = dateFromForm(formData.get("statusDate")) ?? new Date();
  if (!submissionId || !submissionKind || !status)
    return { ok: false, message: "Missing submission status information." };

  if (submissionKind === "journal") {
    const journalStatus = enumValue(SubmissionStatus, status);
    if (!journalStatus)
      return { ok: false, message: "This journal status is not valid." };

    const currentSubmission = await prisma.researchSubmission.findUnique({
      where: { id: submissionId },
      select: {
        acceptedAt: true,
        submittedAt: true,
        status: true,
        researchProjectId: true,
      },
    });
    if (!currentSubmission)
      return { ok: false, message: "Submission was not found." };
    if (await researchContentIsLocked(currentSubmission.researchProjectId)) {
      return {
        ok: false,
        message: "Research is locked. Unlock it before editing submissions.",
      };
    }
    if (
      currentSubmission.status === SubmissionStatus.ACCEPTED ||
      currentSubmission.status === SubmissionStatus.PUBLISHED
    ) {
      const lockedPastAcceptedStatuses = new Set<SubmissionStatus>([
        SubmissionStatus.PENDING,
        SubmissionStatus.UNDER_REVIEW,
        SubmissionStatus.REVISION,
        SubmissionStatus.REJECTED,
        SubmissionStatus.WITHDRAWN,
      ]);
      const lockedPastAccepted = lockedPastAcceptedStatuses.has(journalStatus);
      if (lockedPastAccepted)
        return {
          ok: false,
          message:
            "Accepted or published submissions cannot be changed back to submitted, reviewing, or rejected.",
        };
    }
    if (
      journalStatus === SubmissionStatus.PUBLISHED &&
      currentSubmission.status !== SubmissionStatus.ACCEPTED &&
      currentSubmission.status !== SubmissionStatus.PUBLISHED
    ) {
      return {
        ok: false,
        message:
          "Submission must be accepted before it can be updated to published.",
      };
    }

    if (
      (journalStatus === SubmissionStatus.ACCEPTED ||
        journalStatus === SubmissionStatus.REJECTED) &&
      dateIsBefore(statusDate, currentSubmission.submittedAt)
    ) {
      return {
        ok: false,
        message:
          "Rejected and accepted dates must be the same as or after the submission date.",
      };
    }

    if (
      journalStatus === SubmissionStatus.PUBLISHED &&
      currentSubmission.acceptedAt &&
      dateIsBefore(statusDate, currentSubmission.acceptedAt)
    ) {
      return {
        ok: false,
        message:
          "Published date must be the same as or after the accepted date.",
      };
    }

    const data: {
      status: SubmissionStatus;
      submittedAt?: Date;
      acceptedAt?: Date | null;
      rejectedAt?: Date | null;
      publishedAt?: Date | null;
    } = { status: journalStatus };

    if (journalStatus === SubmissionStatus.ACCEPTED)
      data.acceptedAt = statusDate;
    if (journalStatus === SubmissionStatus.REJECTED)
      data.rejectedAt = statusDate;
    if (journalStatus === SubmissionStatus.PUBLISHED) {
      data.publishedAt = statusDate;
      data.acceptedAt = currentSubmission?.acceptedAt ?? statusDate;
    }

    const submission = await prisma.researchSubmission.update({
      where: { id: submissionId },
      data: {
        ...data,
        project:
          journalStatus === SubmissionStatus.ACCEPTED ||
          journalStatus === SubmissionStatus.PUBLISHED
            ? { update: { contentUnlocked: false } }
            : undefined,
      },
      select: { researchProjectId: true, journalId: true },
    });

    await refreshResearchStage(submission.researchProjectId);
    revalidatePath("/projects");
    revalidatePath(`/projects/${submission.researchProjectId}`);
    revalidatePath(`/journals/${submission.journalId}`);
    return { ok: true };
  }

  if (submissionKind === "conference") {
    const conferenceStatus = enumValue(ConferenceSubmissionStatus, status);
    if (!conferenceStatus)
      return { ok: false, message: "This conference status is not valid." };

    const currentSubmission = await prisma.conferenceSubmission.findUnique({
      where: { id: submissionId },
      select: {
        acceptedAt: true,
        submittedAt: true,
        status: true,
        researchProjectId: true,
      },
    });
    if (!currentSubmission)
      return { ok: false, message: "Submission was not found." };
    if (await researchContentIsLocked(currentSubmission.researchProjectId)) {
      return {
        ok: false,
        message: "Research is locked. Unlock it before editing submissions.",
      };
    }
    if (
      currentSubmission.status === ConferenceSubmissionStatus.ACCEPTED ||
      currentSubmission.status === ConferenceSubmissionStatus.PUBLISHED
    ) {
      const lockedPastAcceptedStatuses = new Set<ConferenceSubmissionStatus>([
        ConferenceSubmissionStatus.PLANNED,
        ConferenceSubmissionStatus.SUBMITTED,
        ConferenceSubmissionStatus.REVIEWING,
        ConferenceSubmissionStatus.REJECTED,
        ConferenceSubmissionStatus.WITHDRAWN,
      ]);
      const lockedPastAccepted =
        lockedPastAcceptedStatuses.has(conferenceStatus);
      if (lockedPastAccepted)
        return {
          ok: false,
          message:
            "Accepted or published submissions cannot be changed back to submitted, reviewing, or rejected.",
        };
    }
    if (
      conferenceStatus === ConferenceSubmissionStatus.PUBLISHED &&
      currentSubmission.status !== ConferenceSubmissionStatus.ACCEPTED &&
      currentSubmission.status !== ConferenceSubmissionStatus.PUBLISHED
    ) {
      return {
        ok: false,
        message:
          "Submission must be accepted before it can be updated to published.",
      };
    }

    if (
      (conferenceStatus === ConferenceSubmissionStatus.ACCEPTED ||
        conferenceStatus === ConferenceSubmissionStatus.REJECTED) &&
      currentSubmission.submittedAt &&
      dateIsBefore(statusDate, currentSubmission.submittedAt)
    ) {
      return {
        ok: false,
        message:
          "Rejected and accepted dates must be the same as or after the submission date.",
      };
    }

    if (
      conferenceStatus === ConferenceSubmissionStatus.PUBLISHED &&
      currentSubmission.acceptedAt &&
      dateIsBefore(statusDate, currentSubmission.acceptedAt)
    ) {
      return {
        ok: false,
        message:
          "Published date must be the same as or after the accepted date.",
      };
    }

    const data: {
      status: ConferenceSubmissionStatus;
      submittedAt?: Date | null;
      acceptedAt?: Date | null;
      rejectedAt?: Date | null;
      publishedAt?: Date | null;
    } = { status: conferenceStatus };

    if (conferenceStatus === ConferenceSubmissionStatus.ACCEPTED)
      data.acceptedAt = statusDate;
    if (conferenceStatus === ConferenceSubmissionStatus.REJECTED)
      data.rejectedAt = statusDate;
    if (conferenceStatus === ConferenceSubmissionStatus.PUBLISHED) {
      data.publishedAt = statusDate;
      data.acceptedAt = currentSubmission?.acceptedAt ?? statusDate;
    }

    const submission = await prisma.conferenceSubmission.update({
      where: { id: submissionId },
      data,
      select: { researchProjectId: true, conferenceId: true },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${submission.researchProjectId}`);
    revalidatePath(`/conferences/${submission.conferenceId}`);
    return { ok: true };
  }

  return { ok: false, message: "Submission type is not valid." };
}

export async function addSuggestedJournal(
  projectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const journalId = optionalString(formData.get("journalId"));
  if (!journalId) return;
  if (await researchContentIsLocked(projectId)) return;

  await prisma.suggestedJournal.upsert({
    where: { projectId_journalId: { projectId, journalId } },
    update: { createdById: user.id },
    create: { projectId, journalId, createdById: user.id },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteSuggestedJournal(
  projectId: string,
  journalId: string,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  if (await researchContentIsLocked(projectId)) return;

  await prisma.suggestedJournal.deleteMany({
    where: { projectId, journalId },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function addSuggestedConference(
  projectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const conferenceId = optionalString(formData.get("conferenceId"));
  if (!conferenceId) return;
  if (await researchContentIsLocked(projectId)) return;

  await prisma.suggestedConference.upsert({
    where: { projectId_conferenceId: { projectId, conferenceId } },
    update: { createdById: user.id },
    create: { projectId, conferenceId, createdById: user.id },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteSuggestedConference(
  projectId: string,
  conferenceId: string,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  if (await researchContentIsLocked(projectId)) return;

  await prisma.suggestedConference.deleteMany({
    where: { projectId, conferenceId },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function finishResearchTask(taskId: string, formData?: FormData) {
  const user = await requireCurrentUser();
  const isAdmin = user.roles.includes(Role.ADMIN);
  const accountId = optionalString(formData?.get("accountId") ?? null);
  const submittedAt = dateFromForm(formData?.get("submissionDate") ?? null);

  if (
    !isAdmin &&
    !user.roles.includes(Role.ASSISTANT) &&
    !user.roles.includes(Role.CHIEF_ASSISTANT)
  ) {
    redirect("/401");
  }

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      journalId: true,
      conferenceId: true,
      accountId: true,
      taskType: true,
      status: true,
    },
  });

  if (!task) return;
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  )
    return;
  if (
    (task.taskType === ResearchTaskType.SUBMIT_RESEARCH ||
      task.taskType === ResearchTaskType.SUBMIT_CONFERENCE) &&
    !submittedAt
  ) {
    return;
  }

  const completedAt = new Date();

  if (!isAdmin) {
    const assignment = await prisma.researchTaskAssignment.findUnique({
      where: { taskId_userId: { taskId, userId: user.id } },
    });

    if (!assignment) redirect("/401");
  }

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.COMPLETED,
      completedAt,
      revokedAt: null,
      adminViewedAt: null,
      project:
        task.taskType === ResearchTaskType.SUBMIT_RESEARCH && task.projectId
          ? { update: { completedProductionSteps: productionStepLabels } }
          : undefined,
      assignments: {
        updateMany: {
          where: { finishedAt: null },
          data: { finishedAt: completedAt },
        },
      },
    },
  });

  const completedTask = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: { status: true, completedAt: true },
  });

  if (
    completedTask?.status === ResearchTaskStatus.COMPLETED &&
    task.taskType === ResearchTaskType.SUBMIT_RESEARCH &&
    task.projectId &&
    task.journalId
  ) {
    if (!submittedAt) return;
    await prisma.researchSubmission.upsert({
      where: {
        researchProjectId_journalId: {
          researchProjectId: task.projectId,
          journalId: task.journalId,
        },
      },
      update: {
        ...(accountId || task.accountId
          ? { accountId: accountId ?? task.accountId }
          : {}),
      },
      create: {
        researchProjectId: task.projectId,
        journalId: task.journalId,
        accountId: accountId ?? task.accountId,
        status: SubmissionStatus.PENDING,
        submittedAt,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath("/journals");
    revalidatePath(`/journals/${task.journalId}`);
    revalidatePath("/accounts");
  }

  if (
    completedTask?.status === ResearchTaskStatus.COMPLETED &&
    task.taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
    task.projectId &&
    task.conferenceId
  ) {
    if (!submittedAt) return;
    await prisma.conferenceSubmission.upsert({
      where: {
        conferenceId_researchProjectId: {
          conferenceId: task.conferenceId,
          researchProjectId: task.projectId,
        },
      },
      update: {
        status: ConferenceSubmissionStatus.SUBMITTED,
      },
      create: {
        conferenceId: task.conferenceId,
        researchProjectId: task.projectId,
        status: ConferenceSubmissionStatus.SUBMITTED,
        submittedAt,
      },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath("/conferences");
    revalidatePath(`/conferences/${task.conferenceId}`);
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

function notificationLabel(type: ResearchAuthorNotificationType) {
  if (type === ResearchAuthorNotificationType.CREATED) return "created";
  if (type === ResearchAuthorNotificationType.ACCEPTED) return "accepted";
  return "published";
}

function notificationSubject(
  type: ResearchAuthorNotificationType,
  title: string,
) {
  if (type === ResearchAuthorNotificationType.CREATED) {
    return `Research record created: ${title}`;
  }
  if (type === ResearchAuthorNotificationType.ACCEPTED) {
    return `Research accepted: ${title}`;
  }
  return `Research published: ${title}`;
}

function venueLine(project: {
  submissions: {
    status: SubmissionStatus;
    acceptedAt: Date | null;
    publishedAt: Date | null;
    journal: {
      name: string;
      publisher: string | null;
      issn: string | null;
      rank: string | null;
    };
  }[];
  conferenceSubmissions: {
    status: ConferenceSubmissionStatus;
    acceptedAt: Date | null;
    publishedAt: Date | null;
    conference: {
      name: string;
      organizer: string | null;
      type: string | null;
      location: string | null;
    };
  }[];
}) {
  const journal =
    project.submissions.find(
      (submission) => submission.status === "PUBLISHED",
    ) ??
    project.submissions.find((submission) => submission.status === "ACCEPTED");
  if (journal) {
    return `${journal.journal.name} - ${journal.journal.publisher || "No publisher"} - ISSN ${journal.journal.issn || "-"} - ${journal.journal.rank || "No rank"}`;
  }

  const conference =
    project.conferenceSubmissions.find(
      (submission) => submission.status === "PUBLISHED",
    ) ??
    project.conferenceSubmissions.find(
      (submission) => submission.status === "ACCEPTED",
    );
  if (conference) {
    return `${conference.conference.name} - ${conference.conference.organizer || "No organizer"} - ${conference.conference.type || "No type"} - ${conference.conference.location || "No location"}`;
  }

  return "";
}

function emailBody({
  type,
  authorName,
  title,
  authorsLine,
  researchUrl,
  venue,
}: {
  type: ResearchAuthorNotificationType;
  authorName: string;
  title: string;
  authorsLine: string;
  researchUrl: string;
  venue: string;
}) {
  const status = notificationLabel(type);
  const opening =
    type === ResearchAuthorNotificationType.CREATED
      ? "A research record has been created in the research management system."
      : type === ResearchAuthorNotificationType.ACCEPTED
        ? "The research has been marked as accepted."
        : "The research has been marked as published.";
  const venueText = venue ? `\nVenue: ${venue}` : "";
  const text = `Dear ${authorName},

${opening}

Research title: ${title}
Authors: ${authorsLine}${venueText}
Status: ${status}

You can track the full information here:
${researchUrl}

Best regards,
Research Management System`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <p>Dear ${escapeHtml(authorName)},</p>
      <p>${escapeHtml(opening)}</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">Research title</td><td>${escapeHtml(title)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">Authors</td><td>${escapeHtml(authorsLine)}</td></tr>
        ${
          venue
            ? `<tr><td style="padding:4px 12px 4px 0;font-weight:700">Venue</td><td>${escapeHtml(venue)}</td></tr>`
            : ""
        }
        <tr><td style="padding:4px 12px 4px 0;font-weight:700">Status</td><td>${escapeHtml(status)}</td></tr>
      </table>
      <p><a href="${escapeHtml(researchUrl)}" style="color:#2563eb;font-weight:700">Open research detail page</a></p>
      <p>Best regards,<br/>Research Management System</p>
    </div>`;

  return { text, html };
}

export async function sendResearchAuthorNotification(
  projectId: string,
  notificationType: string,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  const type = enumValue(ResearchAuthorNotificationType, notificationType);
  if (!type) {
    return {
      ok: false,
      message: "Notification type is not valid.",
      results: [] as ResearchAuthorEmailResult[],
    };
  }

  const existing = await prisma.researchAuthorNotification.findUnique({
    where: { projectId_type: { projectId, type } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      message: "This author notification has already been sent.",
      results: [] as ResearchAuthorEmailResult[],
    };
  }

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    include: {
      leadResearcher: {
        select: { id: true, name: true, email: true, emailVerified: true },
      },
      authors: {
        select: { id: true, name: true, email: true, emailVerified: true },
      },
      authorEntries: {
        include: {
          user: {
            select: { id: true, name: true, email: true, emailVerified: true },
          },
        },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
      submissions: {
        include: { journal: true },
        orderBy: { submittedAt: "desc" },
      },
      conferenceSubmissions: {
        include: { conference: true },
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!project) {
    return {
      ok: false,
      message: "Research project was not found.",
      results: [] as ResearchAuthorEmailResult[],
    };
  }

  const authorMap = new Map<
    string,
    {
      id: string;
      name: string | null;
      email: string;
      emailVerified: Date | null;
    }
  >();
  const sourceAuthors =
    project.authorEntries.length > 0
      ? project.authorEntries.map((entry) => entry.user)
      : project.authors.length > 0
        ? project.authors
        : [project.leadResearcher];
  for (const author of sourceAuthors) authorMap.set(author.id, author);

  const authors = Array.from(authorMap.values());
  const authorsLine = authors
    .map((author) => author.name || author.email)
    .join(", ");
  const researchUrl = `${researchBaseUrl()}/projects/${project.id}`;
  const venue = venueLine(project);
  const results: ResearchAuthorEmailResult[] = [];
  const canSend = smtpConfigured();
  const transporter = canSend ? createTransporter() : null;

  for (const author of authors) {
    const authorName = author.name || author.email;
    if (!author.emailVerified) {
      results.push({
        authorName,
        email: author.email,
        status: "skipped",
        reason: "Email is not verified.",
      });
      continue;
    }

    if (!canSend || !transporter) {
      results.push({
        authorName,
        email: author.email,
        status: "failed",
        reason: "Email service is not configured.",
      });
      continue;
    }

    try {
      const body = emailBody({
        type,
        authorName,
        title: project.title,
        authorsLine,
        researchUrl,
        venue,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: author.email,
        subject: notificationSubject(type, project.title),
        text: body.text,
        html: body.html,
      });
      results.push({ authorName, email: author.email, status: "sent" });
    } catch (error) {
      results.push({
        authorName,
        email: author.email,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown email error.",
      });
    }
  }

  await prisma.researchAuthorNotification.create({
    data: {
      projectId,
      type,
      sentById: user.id,
      results,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return {
    ok: true,
    message: `${notificationLabel(type)} notification processed.`,
    results,
  };
}

export async function assertResearchManager() {
  const user = await requireCurrentUser();
  if (!canManageResearch(user.roles)) {
    redirect("/401");
  }
  return user;
}
