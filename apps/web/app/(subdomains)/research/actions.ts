"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import { auth } from "../../../auth";
import {
  prisma,
  ClaimStatus,
  ConferenceType,
  ConferenceSubmissionStatus,
  CurrencyCode,
  RegistrationStatus,
  ResearchStage,
  OrganizedProjectStatus,
  OrganizedProjectFinancialClaimStatus,
  ProposalType,
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

function storedAuthorEmailResults(value: unknown): ResearchAuthorEmailResult[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is ResearchAuthorEmailResult =>
      Boolean(item) &&
      typeof item === "object" &&
      "authorName" in item &&
      "email" in item &&
      "status" in item &&
      typeof item.authorName === "string" &&
      typeof item.email === "string" &&
      (item.status === "sent" ||
        item.status === "skipped" ||
        item.status === "failed"),
  );
}

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

function positiveIntFromForm(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function numericStringFromForm(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  if (!text) return null;
  const normalized = text.replaceAll(".", "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? normalized : null;
}

const proposalFileTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
]);
const proposalFileTypesByExtension = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
]);
const proposalMaxFileSize = 2 * 1024 * 1024;

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
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

async function sendTaskEmail({
  to,
  subject,
  heading,
  intro,
  taskTitle,
  actionLabel,
  taskId,
  detail,
}: {
  to: string[];
  subject: string;
  heading: string;
  intro: string;
  taskTitle: string;
  actionLabel?: string;
  taskId: string;
  detail?: string;
}) {
  const recipients = Array.from(new Set(to.filter(Boolean)));
  if (recipients.length === 0) return;
  const taskUrl = `${researchBaseUrl()}/tasks/${taskId}`;

  if (!smtpConfigured()) {
    console.info(
      `[task email] ${subject}: ${recipients.join(", ")} ${taskUrl}`,
    );
    return;
  }

  await createTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: recipients,
    subject,
    text: `${heading}\n\n${intro}\n\nTask: ${taskTitle}${detail ? `\n\n${detail}` : ""}\n\nOpen task: ${taskUrl}`,
    html: `
      <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 16px;background:#f8fafc;">
          <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
              <tr><td style="padding:26px 30px;border-bottom:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#059669;">Research Hub Task</div>
                <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(heading)}</h1>
                <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#475569;">${escapeHtml(intro)}</p>
              </td></tr>
              <tr><td style="padding:24px 30px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Task</p>
                <p style="margin:0 0 16px;font-size:15px;font-weight:700;line-height:1.6;color:#0f172a;">${escapeHtml(taskTitle)}</p>
                ${detail ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#475569;">${escapeHtml(detail)}</p>` : ""}
                <a href="${taskUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:12px;">${escapeHtml(actionLabel ?? "Open task")}</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
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

async function generateSubmissionCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const code = Array.from(
      bytes,
      (byte) => alphabet[byte % alphabet.length],
    ).join("");
    const [journalSubmission, conferenceSubmission] = await Promise.all([
      prisma.researchSubmission.findUnique({
        where: { submissionCode: code },
        select: { id: true },
      }),
      prisma.conferenceSubmission.findUnique({
        where: { submissionCode: code },
        select: { id: true },
      }),
    ]);
    if (!journalSubmission && !conferenceSubmission) return code;
  }

  return crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}

function funderCodeBase(name: string, alias: string | null) {
  const source = alias || name;
  const words = source
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const code =
    words.length > 1
      ? words.map((word) => word[0]).join("")
      : words[0]?.slice(0, 6);

  return (code && code.length >= 2 ? code : "FUND").slice(0, 8);
}

async function generateFunderCode(name: string, alias: string | null) {
  const base = funderCodeBase(name, alias);

  for (let index = 0; index < 100; index += 1) {
    const code = index === 0 ? base : `${base}${index + 1}`;
    const existing = await prisma.fundingInstitution.findUnique({
      where: { funderCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  return `${base}${crypto.randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase()}`;
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

function linesFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );
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
  return (
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    roles.includes(Role.ASSISTANT)
  );
}

function requireAdmin(roles: Role[]) {
  if (!roles.includes(Role.ADMIN)) {
    redirect("/401");
  }
}

async function notifyUsers({
  userIds,
  type,
  title,
  summary,
  body,
  href,
  entityType,
  entityId,
  excludeUserId,
}: {
  userIds: string[];
  type: string;
  title: string;
  summary: string;
  body?: string;
  href?: string;
  entityType?: string;
  entityId?: string;
  excludeUserId?: string;
}) {
  const recipients = Array.from(new Set(userIds)).filter(
    (userId) => userId && userId !== excludeUserId,
  );
  if (recipients.length === 0) return;

  await prisma.researchNotification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type,
      title,
      summary,
      body,
      href,
      entityType,
      entityId,
    })),
  });
}

async function adminUserIds() {
  const admins = await prisma.user.findMany({
    where: {
      roles: { has: Role.ADMIN },
      activeSites: { has: "research" },
    },
    select: { id: true },
  });
  return admins.map((admin) => admin.id);
}

async function organizedProjectNotificationUserIds(projectId: string) {
  const [project, admins] = await Promise.all([
    prisma.organizedProject.findUnique({
      where: { id: projectId },
      select: { members: { select: { userId: true } } },
    }),
    adminUserIds(),
  ]);

  return [
    ...(project?.members.map((member) => member.userId) ?? []),
    ...admins,
  ];
}

async function researchAuthorUserIds(projectId: string) {
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      leadResearcherId: true,
      authors: { select: { id: true } },
      authorEntries: { select: { userId: true } },
    },
  });

  if (!project) return [];
  return [
    project.leadResearcherId,
    ...project.authors.map((author) => author.id),
    ...project.authorEntries.map((entry) => entry.userId),
  ];
}

async function organizedProjectMemberUserIdsForResearch(projectId: string) {
  const links = await prisma.organizedProjectResearch.findMany({
    where: { researchProjectId: projectId },
    include: {
      organizedProject: {
        include: { members: { select: { userId: true } } },
      },
    },
  });

  return links.flatMap((link) =>
    link.organizedProject.members.map((member) => member.userId),
  );
}

async function notifyResearchAuthors(
  projectId: string,
  payload: {
    type: string;
    title: string;
    summary: string;
    body?: string;
    href?: string;
    excludeUserId?: string;
  },
) {
  await notifyUsers({
    userIds: await researchAuthorUserIds(projectId),
    entityType: "research",
    entityId: projectId,
    href: `/projects/${projectId}`,
    ...payload,
  });
}

async function notifyOrganizedProjectMembersForResearch(
  projectId: string,
  payload: {
    type: string;
    title: string;
    summary: string;
    body?: string;
    href?: string;
  },
) {
  await notifyUsers({
    userIds: await organizedProjectMemberUserIdsForResearch(projectId),
    entityType: "research",
    entityId: projectId,
    href: `/projects/${projectId}`,
    ...payload,
  });
}

export async function submitProposal(formData: FormData) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return {
      ok: false,
      reason: "AUTH_REQUIRED",
      title: "Login required",
      detail: "Please log in before sending a proposal.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, emailVerified: true, activeSites: true },
  });
  if (!user) {
    return {
      ok: false,
      reason: "AUTH_REQUIRED",
      title: "Login required",
      detail: "Your session could not be verified. Please log in again.",
    };
  }
  if (!user.emailVerified) {
    return {
      ok: false,
      reason: "EMAIL_REQUIRED",
      title: "Verify your email first",
      detail:
        "Your email must be verified before you can send a research or project proposal.",
    };
  }
  if (!user.activeSites.includes("research")) {
    return {
      ok: false,
      reason: "SITE_REQUIRED",
      title: "Activate Research Hub first",
      detail:
        "Please activate your Research Hub account before sending a proposal.",
    };
  }

  const type = enumValue(ProposalType, formData.get("type"));
  const title = optionalString(formData.get("title"));
  const description = optionalString(formData.get("description"));
  const contactInfo = optionalString(formData.get("contactInfo"));
  const notes = optionalString(formData.get("notes"));
  const file = formData.get("supportFile");

  if (!type || !title || !description) {
    return {
      ok: false,
      reason: "MISSING_FIELDS",
      title: "Proposal needs more detail",
      detail: "Please add a title and proposal description before sending.",
    };
  }

  let supportFile:
    | {
        supportFileName: string;
        supportFileType: string;
        supportFileSize: number;
        supportFileData: Buffer;
      }
    | undefined;

  if (file instanceof File && file.size > 0) {
    const extension = file.name.toLowerCase().split(".").pop();
    const allowedByMime = proposalFileTypes.has(file.type);
    const allowedByExtension =
      extension === "pdf" || extension === "doc" || extension === "docx";
    if (!allowedByMime && !allowedByExtension) {
      return {
        ok: false,
        reason: "BAD_FILE_TYPE",
        title: "Support file rejected",
        detail: "Upload only .doc, .docx, or .pdf files.",
      };
    }
    if (file.size > proposalMaxFileSize) {
      return {
        ok: false,
        reason: "FILE_TOO_LARGE",
        title: "Support file is too large",
        detail: "The support file must be 2 MB or smaller.",
      };
    }
    supportFile = {
      supportFileName: file.name,
      supportFileType:
        file.type || proposalFileTypesByExtension.get(extension ?? "") || "",
      supportFileSize: file.size,
      supportFileData: Buffer.from(await file.arrayBuffer()),
    };
  }

  await prisma.proposal.create({
    data: {
      type,
      title,
      description,
      contactInfo,
      notes,
      submittedById: user.id,
      ...supportFile,
    },
  });

  revalidatePath("/proposals");
  revalidatePath(
    type === ProposalType.PROJECT ? "/organized-projects" : "/projects",
  );
  return { ok: true };
}

export async function deleteProposal(proposalId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.proposal.delete({
    where: { id: proposalId },
  });

  revalidatePath("/proposals");
}

export async function createResearchProject(formData: FormData) {
  const user = await requireCurrentUser();
  if (!user.roles.includes(Role.ADMIN)) {
    redirect("/401");
  }
  const isAdmin = user.roles.includes(Role.ADMIN);
  const authorIds = orderedUniqueStrings(formData.getAll("authorUserIds"));
  if (authorIds.length === 0 || !optionalString(formData.get("title"))) return;
  const selectedAuthorIds = authorIds;
  const correspondingAuthorId =
    optionalString(formData.get("correspondingAuthorId")) ??
    selectedAuthorIds[0];
  const registrationUserId = isAdmin
    ? optionalString(formData.get("registrationUserId"))
    : null;
  const fundingInstitutionId = isAdmin
    ? optionalString(formData.get("fundingInstitutionId"))
    : null;

  const createdProject = await prisma.researchProject.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled research",
      researchCode: await generateResearchCode(),
      abstract: optionalString(formData.get("abstract")),
      stage: ResearchStage.PRODUCTION,
      coAuthors: optionalString(formData.get("coAuthors")),
      universityRegistration: isAdmin
        ? optionalString(formData.get("universityRegistration"))
        : null,
      registrationName: null,
      registrationUserId,
      fundingInstitutionId,
      registerStatus: isAdmin
        ? (enumValue(RegistrationStatus, formData.get("registerStatus")) ??
          RegistrationStatus.NOT_REGISTERED)
        : RegistrationStatus.NOT_REGISTERED,
      claimStatus: isAdmin
        ? (enumValue(ClaimStatus, formData.get("claimStatus")) ??
          ClaimStatus.CANNOT_CLAIM)
        : ClaimStatus.CANNOT_CLAIM,
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
    select: { id: true, title: true },
  });

  await notifyResearchAuthors(createdProject.id, {
    type: "RESEARCH_CREATED",
    title: "Research created",
    summary: createdProject.title,
    body: "You were added as an author on this research record.",
    excludeUserId: user.id,
  });

  revalidatePath("/projects");
  redirect("/projects");
}

export async function createOrganizedProject(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  const researchProjectIds = orderedUniqueStrings(
    formData.getAll("researchProjectIds"),
  );
  const memberUserIds = orderedUniqueStrings(formData.getAll("memberUserIds"));
  const title = optionalString(formData.get("title"));
  const referenceCode = optionalString(formData.get("referenceCode"));
  const startDate = dateFromForm(formData.get("startDate"));
  const durationMonths = positiveIntFromForm(formData.get("durationMonths"));
  const teamLeadUserId = optionalString(formData.get("teamLeadUserId"));
  const instructorUserIds = new Set(
    orderedUniqueStrings(formData.getAll("instructorUserIds")),
  );
  const selectedTeamLeadId =
    teamLeadUserId && memberUserIds.includes(teamLeadUserId)
      ? teamLeadUserId
      : memberUserIds[0];

  if (
    !title ||
    !referenceCode ||
    !startDate ||
    !durationMonths ||
    !selectedTeamLeadId
  ) {
    revalidatePath("/organized-projects");
    return;
  }

  const fundingInstitutionId = optionalString(
    formData.get("fundingInstitutionId"),
  );
  const fundingInstitution = fundingInstitutionId
    ? await prisma.fundingInstitution.findUnique({
        where: { id: fundingInstitutionId },
        select: { name: true },
      })
    : null;

  const financialClaimStatus =
    enumValue(
      OrganizedProjectFinancialClaimStatus,
      formData.get("financialClaimStatus"),
    ) ?? OrganizedProjectFinancialClaimStatus.NONE;

  const organizedProject = await prisma.organizedProject.create({
    data: {
      title,
      organizer: fundingInstitution?.name ?? null,
      referenceCode,
      description: optionalString(formData.get("description")),
      note: optionalString(formData.get("note")),
      status:
        enumValue(OrganizedProjectStatus, formData.get("status")) ??
        OrganizedProjectStatus.PLANNED,
      financialClaimStatus,
      fundingAmount:
        financialClaimStatus === OrganizedProjectFinancialClaimStatus.NONE
          ? null
          : numericStringFromForm(formData.get("fundingAmount")),
      fundingCurrency:
        enumValue(CurrencyCode, formData.get("fundingCurrency")) ??
        CurrencyCode.VND,
      requiredResearchCount: null,
      requiredProducts: linesFromForm(formData.get("requiredProducts")),
      completedProducts: [],
      fundingInstitutionId,
      startDate,
      durationMonths,
      endDate: addMonths(startDate, durationMonths),
      createdById: user.id,
      members: {
        create: memberUserIds.map((userId, index) => ({
          userId,
          position: index,
          isTeamLead: userId === selectedTeamLeadId,
          isInstructor: instructorUserIds.has(userId),
        })),
      },
      research: {
        create: researchProjectIds.map((researchProjectId) => ({
          researchProjectId,
        })),
      },
    },
    select: { id: true, title: true },
  });

  await notifyUsers({
    userIds: [...memberUserIds, ...(await adminUserIds())],
    type: "PROJECT_CREATED",
    title: "Project created",
    summary: organizedProject.title,
    body: "You were added as a member of this project.",
    href: `/organized-projects/${organizedProject.id}`,
    entityType: "organizedProject",
    entityId: organizedProject.id,
  });

  revalidatePath("/organized-projects");
  revalidatePath("/funding-institutions");
  redirect("/organized-projects?created=project");
}

export async function updateOrganizedProject(
  projectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const updateScope = optionalString(formData.get("updateScope")) ?? "all";
  const previousProject = await prisma.organizedProject.findUnique({
    where: { id: projectId },
    include: {
      members: {
        select: { userId: true, isTeamLead: true, isInstructor: true },
      },
      research: { select: { researchProjectId: true } },
    },
  });
  if (!previousProject) return;

  const isAdmin = user.roles.includes(Role.ADMIN);
  const isTeamLead = previousProject.members.some(
    (member) => member.userId === user.id && member.isTeamLead,
  );
  const canEditProject = isAdmin || isTeamLead;
  let canEditResearchAssociated = canEditProject;
  if (!canEditResearchAssociated && updateScope === "research") {
    const assignedEditTask = await prisma.researchTask.findFirst({
      where: {
        organizedProjectId: projectId,
        taskType: ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED,
        status: ResearchTaskStatus.IN_PROGRESS,
        assignments: { some: { userId: user.id } },
      },
      select: { id: true },
    });
    canEditResearchAssociated = Boolean(assignedEditTask);
  }

  if (
    (updateScope === "research" && !canEditResearchAssociated) ||
    (updateScope !== "research" && !canEditProject)
  ) {
    redirect("/401");
  }

  const researchProjectIds = orderedUniqueStrings(
    formData.getAll("researchProjectIds"),
  );
  const memberUserIds = orderedUniqueStrings(formData.getAll("memberUserIds"));
  const title = optionalString(formData.get("title"));
  const referenceCode = optionalString(formData.get("referenceCode"));
  const startDate = dateFromForm(formData.get("startDate"));
  const durationMonths = positiveIntFromForm(formData.get("durationMonths"));
  const teamLeadUserId = optionalString(formData.get("teamLeadUserId"));
  const instructorUserIds = new Set(
    orderedUniqueStrings(formData.getAll("instructorUserIds")),
  );
  const selectedTeamLeadId =
    teamLeadUserId && memberUserIds.includes(teamLeadUserId)
      ? teamLeadUserId
      : memberUserIds[0];

  if (
    !title ||
    !referenceCode ||
    !startDate ||
    !durationMonths ||
    !selectedTeamLeadId
  ) {
    revalidatePath(`/organized-projects/${projectId}`);
    return;
  }

  const fundingInstitutionId = optionalString(
    formData.get("fundingInstitutionId"),
  );
  const fundingInstitution = fundingInstitutionId
    ? await prisma.fundingInstitution.findUnique({
        where: { id: fundingInstitutionId },
        select: { name: true },
      })
    : null;
  const financialClaimStatus =
    enumValue(
      OrganizedProjectFinancialClaimStatus,
      formData.get("financialClaimStatus"),
    ) ?? OrganizedProjectFinancialClaimStatus.NONE;

  await prisma.organizedProject.update({
    where: { id: projectId },
    data: {
      title,
      organizer: fundingInstitution?.name ?? null,
      referenceCode,
      description: optionalString(formData.get("description")),
      note: optionalString(formData.get("note")),
      status:
        enumValue(OrganizedProjectStatus, formData.get("status")) ??
        OrganizedProjectStatus.PLANNED,
      financialClaimStatus,
      fundingAmount:
        financialClaimStatus === OrganizedProjectFinancialClaimStatus.NONE
          ? null
          : numericStringFromForm(formData.get("fundingAmount")),
      fundingCurrency:
        enumValue(CurrencyCode, formData.get("fundingCurrency")) ??
        CurrencyCode.VND,
      requiredProducts: linesFromForm(formData.get("requiredProducts")),
      fundingInstitutionId,
      startDate,
      durationMonths,
      endDate: addMonths(startDate, durationMonths),
      members: {
        deleteMany: {},
        create: memberUserIds.map((userId, index) => ({
          userId,
          position: index,
          isTeamLead: userId === selectedTeamLeadId,
          isInstructor: instructorUserIds.has(userId),
        })),
      },
      research: {
        deleteMany: {},
        create: researchProjectIds.map((researchProjectId) => ({
          researchProjectId,
        })),
      },
    },
  });

  const previousMembers = new Set(
    previousProject.members.map((member) => member.userId),
  );
  const previousResearch = new Set(
    previousProject.research.map((item) => item.researchProjectId),
  );
  const memberChanged =
    memberUserIds.length !== previousProject.members.length ||
    memberUserIds.some((memberId) => !previousMembers.has(memberId));
  const researchChanged =
    researchProjectIds.length !== previousProject.research.length ||
    researchProjectIds.some((researchId) => !previousResearch.has(researchId));
  const statusChanged =
    previousProject.status !==
    (enumValue(OrganizedProjectStatus, formData.get("status")) ??
      OrganizedProjectStatus.PLANNED);
  const durationChanged =
    previousProject.durationMonths !== durationMonths ||
    previousProject.startDate?.getTime() !== startDate.getTime();

  const changedParts = [
    statusChanged ? "status" : "",
    memberChanged ? "members" : "",
    researchChanged ? "associated research" : "",
    durationChanged ? "duration" : "",
  ].filter(Boolean);

  if (changedParts.length > 0) {
    await notifyUsers({
      userIds: [...memberUserIds, ...(await adminUserIds())],
      type: researchChanged
        ? "PROJECT_RESEARCH_ASSOCIATED_UPDATED"
        : "PROJECT_UPDATED",
      title: researchChanged
        ? "Project research associated updated"
        : "Project updated",
      summary: `${title} updated: ${changedParts.join(", ")}.`,
      body: researchChanged
        ? "Research associated with this project was added or removed."
        : "Project status, members, associated research, or duration changed.",
      href: `/organized-projects/${projectId}`,
      entityType: "organizedProject",
      entityId: projectId,
      excludeUserId: user.id,
    });
  }

  revalidatePath("/organized-projects");
  revalidatePath("/funding-institutions");
  revalidatePath(`/organized-projects/${projectId}`);
}

export async function updateOrganizedProjectProducts(
  projectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const project = await prisma.organizedProject.findUnique({
    where: { id: projectId },
    select: {
      title: true,
      requiredProducts: true,
      members: { select: { userId: true, isTeamLead: true } },
    },
  });
  if (!project) return;
  const canEdit =
    user.roles.includes(Role.ADMIN) ||
    project.members.some(
      (member) => member.userId === user.id && member.isTeamLead,
    );
  if (!canEdit) redirect("/401");

  const completedProducts = orderedUniqueStrings(
    formData.getAll("completedProducts"),
  ).filter((product) => project.requiredProducts.includes(product));
  const isComplete =
    project.requiredProducts.length > 0 &&
    project.requiredProducts.every((product) =>
      completedProducts.includes(product),
    );

  await prisma.organizedProject.update({
    where: { id: projectId },
    data: {
      completedProducts,
      status: isComplete ? OrganizedProjectStatus.COMPLETED : undefined,
    },
  });

  if (isComplete) {
    await notifyUsers({
      userIds: await organizedProjectNotificationUserIds(projectId),
      type: "PROJECT_COMPLETED",
      title: "Project completed",
      summary: project.title,
      body: "All required project products have been marked complete.",
      href: `/organized-projects/${projectId}`,
      entityType: "organizedProject",
      entityId: projectId,
      excludeUserId: user.id,
    });
  }

  revalidatePath("/organized-projects");
  revalidatePath(`/organized-projects/${projectId}`);
}

export async function createResearchForOrganizedProject(
  organizedProjectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const organizedProject = await prisma.organizedProject.findUnique({
    where: { id: organizedProjectId },
    select: {
      title: true,
      members: { select: { userId: true, isTeamLead: true } },
      research: { select: { researchProjectId: true } },
    },
  });
  if (!organizedProject) return { ok: false, reason: "PROJECT_NOT_FOUND" };
  const canEdit =
    user.roles.includes(Role.ADMIN) ||
    organizedProject.members.some(
      (member) => member.userId === user.id && member.isTeamLead,
    );
  const assignedEditTask = canEdit
    ? null
    : await prisma.researchTask.findFirst({
        where: {
          organizedProjectId,
          taskType: ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED,
          status: ResearchTaskStatus.IN_PROGRESS,
          assignments: { some: { userId: user.id } },
        },
        select: { id: true },
      });
  if (!canEdit && !assignedEditTask)
    return { ok: false, reason: "UNAUTHORIZED" };

  const title = optionalString(formData.get("title"));
  const authorIds = orderedUniqueStrings(formData.getAll("authorUserIds"));
  if (!title || authorIds.length === 0) {
    return { ok: false, reason: "MISSING_FIELDS" };
  }
  const correspondingAuthorId =
    optionalString(formData.get("correspondingAuthorId")) ?? authorIds[0];
  const registrationUserId = optionalString(formData.get("registrationUserId"));

  const createdProject = await prisma.$transaction(async (tx) => {
    const research = await tx.researchProject.create({
      data: {
        title,
        researchCode: await generateResearchCode(),
        abstract: optionalString(formData.get("abstract")),
        stage: ResearchStage.PRODUCTION,
        universityRegistration: optionalString(
          formData.get("universityRegistration"),
        ),
        registrationName: null,
        registrationUserId,
        registerStatus:
          enumValue(RegistrationStatus, formData.get("registerStatus")) ??
          RegistrationStatus.NOT_REGISTERED,
        claimStatus:
          enumValue(ClaimStatus, formData.get("claimStatus")) ??
          ClaimStatus.CANNOT_CLAIM,
        leadResearcherId: user.id,
        authors: { connect: authorIds.map((id) => ({ id })) },
        authorEntries: {
          create: authorIds.map((id, index) => ({
            userId: id,
            position: index,
            isCorresponding: id === correspondingAuthorId,
          })),
        },
      },
      select: { id: true, title: true },
    });
    await tx.organizedProjectResearch.create({
      data: {
        organizedProjectId,
        researchProjectId: research.id,
      },
    });
    return research;
  });

  await notifyResearchAuthors(createdProject.id, {
    type: "RESEARCH_CREATED",
    title: "Research created",
    summary: createdProject.title,
    body: "You were added as an author on this research record.",
    excludeUserId: user.id,
  });
  await notifyUsers({
    userIds: await organizedProjectNotificationUserIds(organizedProjectId),
    type: "PROJECT_RESEARCH_ASSOCIATED_UPDATED",
    title: "Project research associated updated",
    summary: createdProject.title,
    body: `A new research record was added to ${organizedProject.title}.`,
    href: `/organized-projects/${organizedProjectId}`,
    entityType: "organizedProject",
    entityId: organizedProjectId,
    excludeUserId: user.id,
  });

  revalidatePath("/organized-projects");
  revalidatePath(`/organized-projects/${organizedProjectId}`);
  revalidatePath("/projects");
  return { ok: true, id: createdProject.id };
}

export async function updateResearchProject(
  projectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const isAdmin = user.roles.includes(Role.ADMIN);
  const projectLock = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      title: true,
      stage: true,
      completedProductionSteps: true,
      contentUnlocked: true,
      submissions: { select: { status: true } },
    },
  });

  const hasLockedJournalSubmission = projectLock?.submissions.some(
    (submission) =>
      submission.status === SubmissionStatus.ACCEPTED ||
      submission.status === SubmissionStatus.PUBLISHED,
  );
  const updateScope = optionalString(formData.get("updateScope"));

  if (
    hasLockedJournalSubmission &&
    !projectLock?.contentUnlocked &&
    updateScope !== "basic"
  ) {
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

  const registrationUserId = optionalString(formData.get("registrationUserId"));
  const fundingInstitutionId = optionalString(
    formData.get("fundingInstitutionId"),
  );
  const data = {
    title: optionalString(formData.get("title")) ?? "Untitled research",
    coAuthors: null,
    completedProductionSteps,
    ...(isAdmin
      ? {
          universityRegistration: optionalString(
            formData.get("universityRegistration"),
          ),
          registrationName: null,
          registrationUserId,
          fundingInstitutionId,
          registerStatus:
            enumValue(RegistrationStatus, formData.get("registerStatus")) ??
            RegistrationStatus.NOT_REGISTERED,
          claimStatus:
            enumValue(ClaimStatus, formData.get("claimStatus")) ??
            ClaimStatus.CANNOT_CLAIM,
        }
      : {}),
    ...(formData.has("abstract")
      ? { abstract: optionalString(formData.get("abstract")) }
      : {}),
  };
  const productionIsComplete = productionStepLabels.every((step) =>
    completedProductionSteps.includes(step),
  );
  const productionLockUpdate =
    updateScope === "production"
      ? { productionTimelineLocked: productionIsComplete }
      : {};

  await prisma.$transaction(async (tx) => {
    await tx.researchProject.update({
      where: { id: projectId },
      data: {
        ...data,
        ...productionLockUpdate,
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
  const updatedProject = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { title: true, stage: true },
  });

  const productionWasComplete = productionStepLabels.every((step) =>
    projectLock?.completedProductionSteps.includes(step),
  );

  if (!productionWasComplete && productionIsComplete) {
    await notifyResearchAuthors(projectId, {
      type: "RESEARCH_PRODUCTION_FINISHED",
      title: "Research production finished",
      summary: updatedProject?.title ?? "Research production is finished.",
      body: "All production checklist items have been marked complete.",
    });
  } else if (updatedProject && projectLock?.stage !== updatedProject.stage) {
    await notifyResearchAuthors(projectId, {
      type: "RESEARCH_STATUS_UPDATED",
      title: "Research status updated",
      summary: `${updatedProject.title} moved to ${updatedProject.stage.toLowerCase()}.`,
      body: "The research stage changed after recent updates.",
    });
  } else {
    await notifyResearchAuthors(projectId, {
      type: "RESEARCH_UPDATED",
      title: "Research updated",
      summary: updatedProject?.title ?? "A research record was updated.",
      body: "Research information, authors, registration, claim, or production checklist details were changed.",
      excludeUserId: user.id,
    });
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function unlockProductionTimeline(projectId: string) {
  await requireCurrentUser();

  if (await researchContentIsLocked(projectId)) {
    revalidatePath(`/projects/${projectId}`);
    return;
  }

  await prisma.researchProject.update({
    where: { id: projectId },
    data: { productionTimelineLocked: false },
  });

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
      country: optionalString(formData.get("country")),
      apc: optionalString(formData.get("apc")),
      apcCurrency:
        enumValue(CurrencyCode, formData.get("apcCurrency")) ??
        CurrencyCode.USD,
      submissionFee: optionalString(formData.get("submissionFee")),
      submissionFeeCurrency:
        enumValue(CurrencyCode, formData.get("submissionFeeCurrency")) ??
        CurrencyCode.USD,
      homepageLink: optionalString(formData.get("homepageLink")),
      submissionLink: optionalString(formData.get("submissionLink")),
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
      country: optionalString(formData.get("country")),
      apc: optionalString(formData.get("apc")),
      apcCurrency:
        enumValue(CurrencyCode, formData.get("apcCurrency")) ??
        CurrencyCode.USD,
      submissionFee: optionalString(formData.get("submissionFee")),
      submissionFeeCurrency:
        enumValue(CurrencyCode, formData.get("submissionFeeCurrency")) ??
        CurrencyCode.USD,
      homepageLink: optionalString(formData.get("homepageLink")),
      submissionLink: optionalString(formData.get("submissionLink")),
      scimagoLink: optionalString(formData.get("scimagoLink")),
      scopusLink: optionalString(formData.get("scopusLink")),
      note: optionalString(formData.get("note")),
    },
  });

  revalidatePath("/journals");
  revalidatePath(`/journals/${journalId}`);
}

export async function deleteJournal(journalId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const journal = await prisma.journal.findUnique({
    where: { id: journalId },
    select: {
      name: true,
      _count: { select: { submissions: true, suggestions: true } },
    },
  });

  if (!journal) return;

  if (journal._count.submissions > 0 || journal._count.suggestions > 0) {
    throw new Error(
      "Delete the associated submissions and research links before deleting this journal.",
    );
  }

  await prisma.journal.delete({
    where: { id: journalId },
  });

  revalidatePath("/journals");
}

export async function deleteConference(conferenceId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: {
      name: true,
      _count: { select: { submissions: true, suggestions: true } },
    },
  });

  if (!conference) return;

  if (conference._count.submissions > 0 || conference._count.suggestions > 0) {
    throw new Error(
      "Delete the associated submissions and research links before deleting this conference.",
    );
  }

  await prisma.conference.delete({
    where: { id: conferenceId },
  });

  revalidatePath("/conferences");
}

function conferenceDataFromForm(formData: FormData) {
  return {
    name: optionalString(formData.get("name")) ?? "",
    type: enumValue(ConferenceType, formData.get("type")),
    themes: optionalString(formData.get("themes")),
    targetTheme: optionalString(formData.get("targetTheme")),
    isbn: optionalString(formData.get("isbn")),
    organizer: optionalString(formData.get("organizer")),
    location: optionalString(formData.get("location")),
    startDate: dateFromForm(formData.get("startDate")),
    endDate: dateFromForm(formData.get("endDate")),
    submissionDeadline: dateFromForm(formData.get("submissionDeadline")),
    acceptanceNotification: dateFromForm(
      formData.get("acceptanceNotification"),
    ),
    closeDate: dateFromForm(formData.get("closeDate")),
    apc: null,
    apcCurrency: CurrencyCode.USD,
    submissionFee: optionalString(formData.get("submissionFee")),
    submissionFeeCurrency:
      enumValue(CurrencyCode, formData.get("submissionFeeCurrency")) ??
      CurrencyCode.USD,
    website: optionalString(formData.get("website")),
    note: optionalString(formData.get("note")),
  };
}

function conferenceValidationMessage(
  data: ReturnType<typeof conferenceDataFromForm>,
) {
  const missing: string[] = [];
  if (!data.name) missing.push("conference name");
  if (!data.type) missing.push("type");
  if (!data.isbn) missing.push("ISBN");
  if (!data.organizer) missing.push("organizer");
  if (!data.location) missing.push("location");
  if (!data.submissionDeadline) missing.push("submission deadline");
  if (!data.acceptanceNotification) missing.push("acceptance notification");

  if (missing.length === 0) return null;
  return `Please complete the required field${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`;
}

async function conferenceIsbnExists(isbn: string, conferenceId?: string) {
  const existing = await prisma.conference.findFirst({
    where: {
      isbn,
      ...(conferenceId ? { id: { not: conferenceId } } : {}),
    },
    select: { id: true, name: true },
  });

  return existing;
}

function dateHasPassed(value: Date | null) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export async function createConference(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  const data = conferenceDataFromForm(formData);
  const validationMessage = conferenceValidationMessage(data);
  if (validationMessage) {
    return { ok: false, reason: "VALIDATION", message: validationMessage };
  }

  const existing = await conferenceIsbnExists(data.isbn as string);
  if (existing) {
    return {
      ok: false,
      reason: "DUPLICATE_ISBN",
      message: `ISBN ${data.isbn} is already used by ${existing.name}. Each conference must have a unique ISBN.`,
    };
  }

  await prisma.conference.create({
    data,
  });

  revalidatePath("/conferences");
  return { ok: true };
}

export async function updateConference(
  conferenceId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const conference = await prisma.conference.findUnique({
    where: { id: conferenceId },
    select: { closeDate: true, editUnlocked: true },
  });
  if (!conference) return { ok: false, reason: "NOT_FOUND" };
  const closed = dateHasPassed(conference.closeDate);
  if (closed && !conference.editUnlocked) {
    return { ok: false, reason: "LOCKED" };
  }
  const data = conferenceDataFromForm(formData);
  const validationMessage = conferenceValidationMessage(data);
  if (validationMessage) {
    return { ok: false, reason: "VALIDATION", message: validationMessage };
  }

  const existing = await conferenceIsbnExists(
    data.isbn as string,
    conferenceId,
  );
  if (existing) {
    return {
      ok: false,
      reason: "DUPLICATE_ISBN",
      message: `ISBN ${data.isbn} is already used by ${existing.name}. Each conference must have a unique ISBN.`,
    };
  }

  await prisma.conference.update({
    where: { id: conferenceId },
    data: {
      ...data,
      editUnlocked: false,
    },
  });

  revalidatePath("/conferences");
  revalidatePath(`/conferences/${conferenceId}`);
  return { ok: true };
}

export async function unlockConference(conferenceId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.conference.update({
    where: { id: conferenceId },
    data: { editUnlocked: true },
  });

  revalidatePath(`/conferences/${conferenceId}`);
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

export async function deletePublisherAccount(accountId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.publisherAccount.delete({
    where: { id: accountId },
  });

  revalidatePath("/accounts");
  revalidatePath("/submissions");
  revalidatePath("/journals");
}

export async function createFundingInstitution(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const name = optionalString(formData.get("name")) ?? "Untitled funder";
  const shortName = optionalString(formData.get("shortName"));

  await prisma.fundingInstitution.create({
    data: {
      funderCode: await generateFunderCode(name, shortName),
      name,
      shortName,
      country: optionalString(formData.get("country")),
      website: optionalString(formData.get("website")),
      note: optionalString(formData.get("note")),
    },
  });

  revalidatePath("/funding-institutions");
  revalidatePath("/organized-projects");
}

export async function updateFundingInstitution(
  institutionId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.fundingInstitution.update({
    where: { id: institutionId },
    data: {
      name: optionalString(formData.get("name")) ?? "Untitled funder",
      shortName: optionalString(formData.get("shortName")),
      country: optionalString(formData.get("country")),
      website: optionalString(formData.get("website")),
      note: optionalString(formData.get("note")),
    },
  });

  revalidatePath("/funding-institutions");
  revalidatePath("/organized-projects");
}

export async function deleteFundingInstitution(institutionId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.fundingInstitution.delete({
    where: { id: institutionId },
  });

  revalidatePath("/funding-institutions");
  revalidatePath("/organized-projects");
  revalidatePath("/projects");
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

export async function deleteAcademicReview(reviewId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.academicReview.delete({
    where: { id: reviewId },
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
      submissionCode: await generateSubmissionCode(),
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
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { title: true },
  });
  await notifyResearchAuthors(projectId, {
    type: "SUBMISSION_CREATED",
    title: "New journal submission",
    summary: project?.title ?? "A research submission was created.",
    body: "A new journal submission was added to this research.",
  });
  await notifyOrganizedProjectMembersForResearch(projectId, {
    type: "PROJECT_RESEARCH_SUBMISSION",
    title: "Project research submitted",
    summary:
      project?.title ?? "A project research record has a new submission.",
    body: "A research associated with your project has a new journal submission.",
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
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSites: true },
  });
  if (!target) return;
  const activeSites = new Set(target.activeSites);
  if (
    selectedRoles.includes(Role.ASSISTANT) ||
    selectedRoles.includes(Role.CHIEF_ASSISTANT)
  ) {
    activeSites.add("research");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      roles: selectedRoles.length > 0 ? selectedRoles : [Role.STUDENT],
      activeSites: { set: Array.from(activeSites) },
    },
  });

  revalidatePath("/assistants");
}

export async function assignResearchAssistant(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const userId = optionalString(formData.get("userId"));
  const password = optionalString(formData.get("password"));
  const role = formData.get("assistantRole");
  if (!userId || (role !== Role.ASSISTANT && role !== Role.CHIEF_ASSISTANT))
    return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true, activeSites: true },
  });
  if (!target) return;

  const roles = new Set(target.roles);
  const activeSites = new Set(target.activeSites);
  roles.delete(Role.ASSISTANT);
  roles.delete(Role.CHIEF_ASSISTANT);
  roles.add(role);
  activeSites.add("research");

  await prisma.user.update({
    where: { id: userId },
    data: {
      roles: Array.from(roles),
      activeSites: { set: Array.from(activeSites) },
      ...(password
        ? {
            passwordHash: await bcrypt.hash(password, 10),
            adminVisiblePassword: password,
          }
        : {}),
    },
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

  const activeAssigneeCount = await prisma.user.count({
    where: {
      id: { in: assigneeIds },
      activeSites: { has: "research" },
    },
  });
  if (activeAssigneeCount !== new Set(assigneeIds).size) {
    return { ok: false, reason: "INACTIVE_RESEARCH_ASSIGNEE" };
  }

  const taskType = taskTypeFromForm(formData.get("taskType"));
  const projectId = optionalString(formData.get("projectId"));
  const organizedProjectId = optionalString(formData.get("organizedProjectId"));
  const journalId = optionalString(formData.get("journalId"));
  const conferenceId = optionalString(formData.get("conferenceId"));
  const reviewId = optionalString(formData.get("reviewId"));

  if (
    (taskType === ResearchTaskType.SUBMIT_RESEARCH &&
      (!projectId || !journalId)) ||
    (taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
      (!projectId || !conferenceId)) ||
    (taskType === ResearchTaskType.PRODUCTION && !projectId) ||
    (taskType === ResearchTaskType.REVIEW && !reviewId) ||
    (taskType === ResearchTaskType.PROJECT_PRODUCTION && !organizedProjectId) ||
    (taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED &&
      !organizedProjectId)
  ) {
    return { ok: false, reason: "MISSING_ASSOCIATION" };
  }

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

  const task = await prisma.researchTask.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled task",
      taskCode: await generateTaskCode(),
      description: optionalString(formData.get("description")),
      category: taskCategoryFromForm(formData.get("category")),
      taskType,
      status: ResearchTaskStatus.IN_PROGRESS,
      projectId,
      organizedProjectId,
      journalId,
      conferenceId,
      reviewId,
      accountId: optionalString(formData.get("accountId")),
      dueDate: optionalString(formData.get("dueDate"))
        ? new Date(optionalString(formData.get("dueDate")) as string)
        : null,
      createdById: user.id,
      assignments: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    select: { id: true, title: true, createdById: true },
  });

  await notifyUsers({
    userIds: assigneeIds,
    type: "TASK_ASSIGNED",
    title: "Task assigned",
    summary: task.title,
    body: "A research task was assigned to you.",
    href: `/tasks/${task.id}`,
    entityType: "task",
    entityId: task.id,
  });

  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  if (organizedProjectId)
    revalidatePath(`/organized-projects/${organizedProjectId}`);
  return { ok: true };
}

export async function updateResearchTask(taskId: string, formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const currentTask = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      organizedProjectId: true,
      status: true,
      assignments: { select: { userId: true } },
    },
  });
  if (!currentTask) return { ok: false, reason: "NOT_FOUND" };
  if (
    currentTask.status === ResearchTaskStatus.COMPLETED ||
    currentTask.status === ResearchTaskStatus.REVOKED
  ) {
    return { ok: false, reason: "TASK_CLOSED" };
  }

  const assigneeIds = Array.from(
    new Set(
      formData
        .getAll("assigneeIds")
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        ),
    ),
  );

  if (assigneeIds.length === 0) {
    return { ok: false, reason: "NO_ASSIGNEE" };
  }

  const activeAssigneeCount = await prisma.user.count({
    where: {
      id: { in: assigneeIds },
      activeSites: { has: "research" },
    },
  });
  if (activeAssigneeCount !== assigneeIds.length) {
    return { ok: false, reason: "INACTIVE_RESEARCH_ASSIGNEE" };
  }

  const taskType = taskTypeFromForm(formData.get("taskType"));
  const projectId = optionalString(formData.get("projectId"));
  const organizedProjectId = optionalString(formData.get("organizedProjectId"));
  const journalId = optionalString(formData.get("journalId"));
  const conferenceId = optionalString(formData.get("conferenceId"));
  const reviewId = optionalString(formData.get("reviewId"));
  const effectiveProjectId =
    taskType === ResearchTaskType.SUBMIT_RESEARCH ||
    taskType === ResearchTaskType.SUBMIT_CONFERENCE ||
    taskType === ResearchTaskType.PRODUCTION
      ? projectId
      : null;
  const effectiveOrganizedProjectId =
    taskType === ResearchTaskType.PROJECT_PRODUCTION ||
    taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED
      ? organizedProjectId
      : null;

  if (
    (taskType === ResearchTaskType.SUBMIT_RESEARCH &&
      (!effectiveProjectId || !journalId)) ||
    (taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
      (!effectiveProjectId || !conferenceId)) ||
    (taskType === ResearchTaskType.PRODUCTION && !effectiveProjectId) ||
    (taskType === ResearchTaskType.REVIEW && !reviewId) ||
    (taskType === ResearchTaskType.PROJECT_PRODUCTION &&
      !effectiveOrganizedProjectId) ||
    (taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED &&
      !effectiveOrganizedProjectId)
  ) {
    return { ok: false, reason: "MISSING_ASSOCIATION" };
  }

  if (
    effectiveProjectId &&
    (await researchContentIsLocked(effectiveProjectId))
  ) {
    return { ok: false, reason: "RESEARCH_LOCKED" };
  }

  if (
    effectiveProjectId &&
    (taskType === ResearchTaskType.SUBMIT_RESEARCH ||
      taskType === ResearchTaskType.SUBMIT_CONFERENCE) &&
    !(await researchProductionIsComplete(effectiveProjectId))
  ) {
    return { ok: false, reason: "PRODUCTION_INCOMPLETE" };
  }

  if (
    taskType === ResearchTaskType.SUBMIT_RESEARCH &&
    effectiveProjectId &&
    journalId
  ) {
    const existingTask = await prisma.researchTask.findFirst({
      where: {
        id: { not: taskId },
        taskType,
        projectId: effectiveProjectId,
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
    effectiveProjectId &&
    conferenceId
  ) {
    const existingTask = await prisma.researchTask.findFirst({
      where: {
        id: { not: taskId },
        taskType,
        projectId: effectiveProjectId,
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

  const previousAssignees = new Set(
    currentTask.assignments.map((assignment) => assignment.userId),
  );
  const nextAssignees = new Set(assigneeIds);
  const removedAssignees = [...previousAssignees].filter(
    (userId) => !nextAssignees.has(userId),
  );
  const addedAssignees = assigneeIds.filter(
    (userId) => !previousAssignees.has(userId),
  );

  const task = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.researchTask.update({
      where: { id: taskId },
      data: {
        title: optionalString(formData.get("title")) ?? "Untitled task",
        description: optionalString(formData.get("description")),
        category: taskCategoryFromForm(formData.get("category")),
        taskType,
        projectId: effectiveProjectId,
        organizedProjectId: effectiveOrganizedProjectId,
        journalId:
          taskType === ResearchTaskType.SUBMIT_RESEARCH ? journalId : null,
        conferenceId:
          taskType === ResearchTaskType.SUBMIT_CONFERENCE ? conferenceId : null,
        reviewId: taskType === ResearchTaskType.REVIEW ? reviewId : null,
        dueDate: optionalString(formData.get("dueDate"))
          ? new Date(optionalString(formData.get("dueDate")) as string)
          : null,
      },
      select: { id: true, title: true },
    });

    if (removedAssignees.length > 0) {
      await tx.researchTaskAssignment.deleteMany({
        where: { taskId, userId: { in: removedAssignees } },
      });
    }
    if (addedAssignees.length > 0) {
      await tx.researchTaskAssignment.createMany({
        data: addedAssignees.map((userId) => ({ taskId, userId })),
        skipDuplicates: true,
      });
    }

    return updatedTask;
  });

  if (addedAssignees.length > 0) {
    await notifyUsers({
      userIds: addedAssignees,
      type: "TASK_ASSIGNED",
      title: "Task assigned",
      summary: task.title,
      body: "A research task was assigned to you.",
      href: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  if (currentTask.projectId)
    revalidatePath(`/projects/${currentTask.projectId}`);
  if (effectiveProjectId) revalidatePath(`/projects/${effectiveProjectId}`);
  if (currentTask.organizedProjectId) {
    revalidatePath(`/organized-projects/${currentTask.organizedProjectId}`);
  }
  if (effectiveOrganizedProjectId) {
    revalidatePath(`/organized-projects/${effectiveOrganizedProjectId}`);
  }
  return { ok: true };
}

export async function revokeResearchTask(taskId: string) {
  const user = await requireCurrentUser();
  const isAdmin = user.roles.includes(Role.ADMIN);

  const currentTask = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: { createdById: true },
  });
  if (!currentTask) return;
  if (!isAdmin && currentTask.createdById !== user.id) redirect("/401");

  const task = await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.REVOKED,
      revokedAt: new Date(),
      completedAt: null,
      adminViewedAt: null,
    },
    select: {
      projectId: true,
      title: true,
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });

  await notifyUsers({
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: "TASK_REVOKED",
    title: "Task revoked",
    summary: task.title,
    body: "A task assigned to you was revoked.",
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
  });

  await sendTaskEmail({
    to: task.assignments.map((assignment) => assignment.user.email),
    subject: `Task revoked: ${task.title}`,
    heading: "Task revoked",
    intro:
      "A task assigned to you has been revoked by the assigner. You do not need to continue this task unless a new task is assigned.",
    taskTitle: task.title,
    taskId,
    actionLabel: "View task",
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
    if (currentSubmission.status === SubmissionStatus.WITHDRAWN) {
      return {
        ok: false,
        message:
          "This submission is withdrawn and locked. Its status cannot be changed again.",
      };
    }
    const canEditLockedSubmission =
      (currentSubmission.status === SubmissionStatus.ACCEPTED ||
        currentSubmission.status === SubmissionStatus.PUBLISHED) &&
      (journalStatus === SubmissionStatus.ACCEPTED ||
        journalStatus === SubmissionStatus.PUBLISHED ||
        journalStatus === SubmissionStatus.WITHDRAWN);
    if (
      !canEditLockedSubmission &&
      (await researchContentIsLocked(currentSubmission.researchProjectId))
    ) {
      return {
        ok: false,
        message:
          "Research is locked. Only accepted or published submissions can still be updated.",
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
        journalStatus === SubmissionStatus.REJECTED ||
        journalStatus === SubmissionStatus.WITHDRAWN) &&
      dateIsBefore(statusDate, currentSubmission.submittedAt)
    ) {
      return {
        ok: false,
        message:
          "Accepted, rejected, and withdrawn dates must be the same as or after the submission date.",
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
      withdrawnAt?: Date | null;
      publishedAt?: Date | null;
    } = { status: journalStatus };

    if (journalStatus === SubmissionStatus.ACCEPTED)
      data.acceptedAt = statusDate;
    if (journalStatus === SubmissionStatus.REJECTED)
      data.rejectedAt = statusDate;
    if (journalStatus === SubmissionStatus.WITHDRAWN)
      data.withdrawnAt = statusDate;
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
    const project = await prisma.researchProject.findUnique({
      where: { id: submission.researchProjectId },
      select: { title: true },
    });
    const normalizedNotification =
      journalStatus === SubmissionStatus.UNDER_REVIEW ||
      journalStatus === SubmissionStatus.REVISION
        ? {
            type: "SUBMISSION_REVIEW",
            title: "Submission in review",
            body: "A journal submission moved to review stage.",
          }
        : journalStatus === SubmissionStatus.ACCEPTED
          ? {
              type: "RESEARCH_ACCEPTED",
              title: "Research accepted",
              body: "A journal submission for this research was accepted.",
            }
          : journalStatus === SubmissionStatus.PUBLISHED
            ? {
                type: "RESEARCH_PUBLISHED",
                title: "Research published",
                body: "A journal submission for this research was published.",
              }
            : null;
    if (normalizedNotification) {
      await notifyResearchAuthors(submission.researchProjectId, {
        ...normalizedNotification,
        summary: project?.title ?? normalizedNotification.title,
      });
      await notifyOrganizedProjectMembersForResearch(
        submission.researchProjectId,
        {
          type: `PROJECT_${normalizedNotification.type}`,
          title: normalizedNotification.title,
          summary: project?.title ?? normalizedNotification.title,
          body: "A research associated with your project has an updated submission status.",
        },
      );
    }
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
    if (currentSubmission.status === ConferenceSubmissionStatus.WITHDRAWN) {
      return {
        ok: false,
        message:
          "This submission is withdrawn and locked. Its status cannot be changed again.",
      };
    }
    const canEditLockedSubmission =
      (currentSubmission.status === ConferenceSubmissionStatus.ACCEPTED ||
        currentSubmission.status === ConferenceSubmissionStatus.PUBLISHED) &&
      (conferenceStatus === ConferenceSubmissionStatus.ACCEPTED ||
        conferenceStatus === ConferenceSubmissionStatus.PUBLISHED ||
        conferenceStatus === ConferenceSubmissionStatus.WITHDRAWN);
    if (
      !canEditLockedSubmission &&
      (await researchContentIsLocked(currentSubmission.researchProjectId))
    ) {
      return {
        ok: false,
        message:
          "Research is locked. Only accepted or published submissions can still be updated.",
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
        conferenceStatus === ConferenceSubmissionStatus.REJECTED ||
        conferenceStatus === ConferenceSubmissionStatus.WITHDRAWN) &&
      currentSubmission.submittedAt &&
      dateIsBefore(statusDate, currentSubmission.submittedAt)
    ) {
      return {
        ok: false,
        message:
          "Accepted, rejected, and withdrawn dates must be the same as or after the submission date.",
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
      withdrawnAt?: Date | null;
      publishedAt?: Date | null;
    } = { status: conferenceStatus };

    if (conferenceStatus === ConferenceSubmissionStatus.ACCEPTED)
      data.acceptedAt = statusDate;
    if (conferenceStatus === ConferenceSubmissionStatus.REJECTED)
      data.rejectedAt = statusDate;
    if (conferenceStatus === ConferenceSubmissionStatus.WITHDRAWN)
      data.withdrawnAt = statusDate;
    if (conferenceStatus === ConferenceSubmissionStatus.PUBLISHED) {
      data.publishedAt = statusDate;
      data.acceptedAt = currentSubmission?.acceptedAt ?? statusDate;
    }

    const submission = await prisma.conferenceSubmission.update({
      where: { id: submissionId },
      data,
      select: { researchProjectId: true, conferenceId: true },
    });

    const project = await prisma.researchProject.findUnique({
      where: { id: submission.researchProjectId },
      select: { title: true },
    });
    const normalizedNotification =
      conferenceStatus === ConferenceSubmissionStatus.REVIEWING
        ? {
            type: "SUBMISSION_REVIEW",
            title: "Submission in review",
            body: "A conference submission moved to review stage.",
          }
        : conferenceStatus === ConferenceSubmissionStatus.ACCEPTED
          ? {
              type: "RESEARCH_ACCEPTED",
              title: "Research accepted",
              body: "A conference submission for this research was accepted.",
            }
          : conferenceStatus === ConferenceSubmissionStatus.PUBLISHED
            ? {
                type: "RESEARCH_PUBLISHED",
                title: "Research published",
                body: "A conference submission for this research was published.",
              }
            : null;
    if (normalizedNotification) {
      await notifyResearchAuthors(submission.researchProjectId, {
        ...normalizedNotification,
        summary: project?.title ?? normalizedNotification.title,
      });
      await notifyOrganizedProjectMembersForResearch(
        submission.researchProjectId,
        {
          type: `PROJECT_${normalizedNotification.type}`,
          title: normalizedNotification.title,
          summary: project?.title ?? normalizedNotification.title,
          body: "A research associated with your project has an updated submission status.",
        },
      );
    }

    revalidatePath("/projects");
    revalidatePath(`/projects/${submission.researchProjectId}`);
    revalidatePath(`/conferences/${submission.conferenceId}`);
    return { ok: true };
  }

  return { ok: false, message: "Submission type is not valid." };
}

export async function deleteSubmission(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const submissionId = optionalString(formData.get("submissionId"));
  const submissionKind = optionalString(formData.get("submissionKind"));
  if (!submissionId || !submissionKind)
    return { ok: false, message: "Missing submission information." };

  if (submissionKind === "journal") {
    const submission = await prisma.researchSubmission.findUnique({
      where: { id: submissionId },
      select: { researchProjectId: true, journalId: true },
    });
    if (!submission) return { ok: false, message: "Submission was not found." };

    await prisma.researchSubmission.delete({ where: { id: submissionId } });
    await refreshResearchStage(submission.researchProjectId);

    revalidatePath("/submissions");
    revalidatePath("/projects");
    revalidatePath(`/projects/${submission.researchProjectId}`);
    revalidatePath(`/journals/${submission.journalId}`);
    return { ok: true };
  }

  if (submissionKind === "conference") {
    const submission = await prisma.conferenceSubmission.findUnique({
      where: { id: submissionId },
      select: { researchProjectId: true, conferenceId: true },
    });
    if (!submission) return { ok: false, message: "Submission was not found." };

    await prisma.conferenceSubmission.delete({ where: { id: submissionId } });

    revalidatePath("/submissions");
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

async function createSubmissionAfterTaskApproval(
  task: {
    id: string;
    projectId: string | null;
    journalId: string | null;
    conferenceId: string | null;
    accountId: string | null;
    taskType: ResearchTaskType | null;
    title: string;
  },
  formData?: FormData,
) {
  const accountId = optionalString(formData?.get("accountId") ?? null);
  const submittedAt = dateFromForm(formData?.get("submissionDate") ?? null);

  if (
    (task.taskType === ResearchTaskType.SUBMIT_RESEARCH ||
      task.taskType === ResearchTaskType.SUBMIT_CONFERENCE) &&
    !submittedAt
  ) {
    return false;
  }

  if (
    task.taskType === ResearchTaskType.SUBMIT_RESEARCH &&
    task.projectId &&
    task.journalId &&
    submittedAt
  ) {
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
        submissionCode: await generateSubmissionCode(),
        researchProjectId: task.projectId,
        journalId: task.journalId,
        accountId: accountId ?? task.accountId,
        status: SubmissionStatus.PENDING,
        submittedAt,
      },
    });

    const project = await prisma.researchProject.findUnique({
      where: { id: task.projectId },
      select: { title: true },
    });
    await notifyResearchAuthors(task.projectId, {
      type: "SUBMISSION_CREATED",
      title: "New journal submission",
      summary: project?.title ?? "A research submission was created.",
      body: "A journal submission was created after the assigner approved a submission task.",
    });
    await notifyOrganizedProjectMembersForResearch(task.projectId, {
      type: "PROJECT_RESEARCH_SUBMISSION",
      title: "Project research submitted",
      summary:
        project?.title ?? "A project research record has a new submission.",
      body: "A research associated with your project has a new journal submission.",
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath("/journals");
    revalidatePath(`/journals/${task.journalId}`);
    revalidatePath("/accounts");
  }

  if (
    task.taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
    task.projectId &&
    task.conferenceId &&
    submittedAt
  ) {
    await prisma.conferenceSubmission.upsert({
      where: {
        conferenceId_researchProjectId: {
          conferenceId: task.conferenceId,
          researchProjectId: task.projectId,
        },
      },
      update: { status: ConferenceSubmissionStatus.SUBMITTED },
      create: {
        submissionCode: await generateSubmissionCode(),
        conferenceId: task.conferenceId,
        researchProjectId: task.projectId,
        status: ConferenceSubmissionStatus.SUBMITTED,
        submittedAt,
      },
    });

    const project = await prisma.researchProject.findUnique({
      where: { id: task.projectId },
      select: { title: true },
    });
    await notifyResearchAuthors(task.projectId, {
      type: "SUBMISSION_CREATED",
      title: "New conference submission",
      summary: project?.title ?? "A conference submission was created.",
      body: "A conference submission was created after the assigner approved a submission task.",
    });
    await notifyOrganizedProjectMembersForResearch(task.projectId, {
      type: "PROJECT_RESEARCH_SUBMISSION",
      title: "Project research submitted",
      summary:
        project?.title ??
        "A project research record has a new conference submission.",
      body: "A research associated with your project has a new conference submission.",
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath("/conferences");
    revalidatePath(`/conferences/${task.conferenceId}`);
  }

  return true;
}

export async function markResearchTaskReadyForCheck(taskId: string) {
  const user = await requireCurrentUser();
  const isAdmin = user.roles.includes(Role.ADMIN);
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      title: true,
      createdById: true,
      createdBy: { select: { email: true } },
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });

  if (!task) return;
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return;
  }
  if (!isAdmin) {
    const isAssigned = task.assignments.some(
      (assignment) => assignment.userId === user.id,
    );
    if (!isAssigned) redirect("/401");
    if (task.createdById === user.id) return;
  }

  const finishedAt = new Date();
  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.CHECKING,
      completedAt: null,
      revokedAt: null,
      adminViewedAt: null,
      assignments: {
        updateMany: {
          where: isAdmin ? { finishedAt: null } : { userId: user.id },
          data: { finishedAt },
        },
      },
    },
  });

  await notifyUsers({
    userIds: [task.createdById],
    type: "TASK_READY_FOR_CHECK",
    title: "Task ready for check",
    summary: task.title,
    body: "An assignee marked this task as finished and ready for your review.",
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });
  await sendTaskEmail({
    to: [task.createdBy.email],
    subject: `Task ready for review: ${task.title}`,
    heading: "Task ready for checking",
    intro:
      "An assignee has marked the assigned work as finished. Please review the work and either approve completion or send it back for revision.",
    taskTitle: task.title,
    taskId,
    actionLabel: "Review task",
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function finishResearchTask(taskId: string, formData?: FormData) {
  const user = await requireCurrentUser();
  const isAdmin = user.roles.includes(Role.ADMIN);
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
      title: true,
      createdById: true,
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });

  if (!task) return;
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return;
  }

  const isAssigned = task.assignments.some(
    (assignment) => assignment.userId === user.id,
  );
  const selfAssigned = task.createdById === user.id && isAssigned;
  if (!isAdmin && task.createdById !== user.id) redirect("/401");
  if (
    !selfAssigned &&
    !isAdmin &&
    task.status !== ResearchTaskStatus.CHECKING
  ) {
    return;
  }

  if (!(await createSubmissionAfterTaskApproval(task, formData))) return;

  const completedAt = new Date();
  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.COMPLETED,
      completedAt,
      revokedAt: null,
      adminViewedAt: null,
      project:
        task.taskType === ResearchTaskType.PRODUCTION && task.projectId
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

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);

  await notifyUsers({
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: "TASK_COMPLETED",
    title: "Task completed",
    summary: task.title,
    body: "The assigner reviewed and approved this task as complete.",
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });
  await sendTaskEmail({
    to: task.assignments.map((assignment) => assignment.user.email),
    subject: `Task approved as complete: ${task.title}`,
    heading: "Task approved as complete",
    intro:
      "The assigner reviewed the submitted work and marked the task as complete.",
    taskTitle: task.title,
    taskId,
    actionLabel: "View task",
  });
}

export async function requestTaskRedo(taskId: string, formData: FormData) {
  const user = await requireCurrentUser();
  const reason = optionalString(formData.get("reason"));
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      createdById: true,
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });
  if (!task) return;
  if (!user.roles.includes(Role.ADMIN) && task.createdById !== user.id) {
    redirect("/401");
  }

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.IN_PROGRESS,
      completedAt: null,
      adminViewedAt: null,
      assignments: { updateMany: { where: {}, data: { finishedAt: null } } },
    },
  });
  await notifyUsers({
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: "TASK_REDO_REQUIRED",
    title: "Task needs revision",
    summary: task.title,
    body: reason ?? "The assigner requested revision before approval.",
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });
  await sendTaskEmail({
    to: task.assignments.map((assignment) => assignment.user.email),
    subject: `Revision requested: ${task.title}`,
    heading: "Task needs revision",
    intro:
      "The assigner reviewed the work and requested revision before the task can be completed.",
    detail: reason ?? undefined,
    taskTitle: task.title,
    taskId,
    actionLabel: "Open task",
  });
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function requestTaskClarification(
  taskId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const question = optionalString(formData.get("question"));
  if (!question) return;
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      createdById: true,
      createdBy: { select: { email: true } },
      assignments: { select: { userId: true } },
    },
  });
  if (!task) return;
  if (!task.assignments.some((assignment) => assignment.userId === user.id)) {
    redirect("/401");
  }
  if (task.createdById === user.id) return;

  await prisma.researchTaskClarification.create({
    data: { taskId, requestedById: user.id, question },
  });
  await prisma.researchTask.update({
    where: { id: taskId },
    data: { status: ResearchTaskStatus.NEED_CLARIFY },
  });
  await notifyUsers({
    userIds: [task.createdById],
    type: "TASK_CLARIFICATION_REQUESTED",
    title: "Clarification requested",
    summary: task.title,
    body: question,
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });
  await sendTaskEmail({
    to: [task.createdBy.email],
    subject: `Clarification requested: ${task.title}`,
    heading: "Clarification requested",
    intro:
      "An assignee requested clarification or additional instruction for this task.",
    detail: question,
    taskTitle: task.title,
    taskId,
    actionLabel: "Answer request",
  });
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function answerTaskClarification(
  taskId: string,
  clarificationId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const answer = optionalString(formData.get("answer"));
  if (!answer) return;
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      createdById: true,
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });
  if (!task) return;
  if (!user.roles.includes(Role.ADMIN) && task.createdById !== user.id) {
    redirect("/401");
  }

  await prisma.researchTaskClarification.update({
    where: { id: clarificationId },
    data: { answer, answeredById: user.id, answeredAt: new Date() },
  });
  await prisma.researchTask.update({
    where: { id: taskId },
    data: { status: ResearchTaskStatus.IN_PROGRESS },
  });
  await notifyUsers({
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: "TASK_CLARIFICATION_ANSWERED",
    title: "Clarification answered",
    summary: task.title,
    body: answer,
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });
  await sendTaskEmail({
    to: task.assignments.map((assignment) => assignment.user.email),
    subject: `Clarification answered: ${task.title}`,
    heading: "Clarification answered",
    intro:
      "The assigner has answered a clarification request for this task. Please review the answer and continue the work.",
    detail: answer,
    taskTitle: task.title,
    taskId,
    actionLabel: "Open task",
  });
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
    select: { id: true, results: true },
  });

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
  const previousResults = storedAuthorEmailResults(existing?.results);
  const previouslySentEmails = new Set(
    previousResults
      .filter((result) => result.status === "sent")
      .map((result) => result.email.toLowerCase()),
  );
  const canSend = smtpConfigured();
  const transporter = canSend ? createTransporter() : null;

  for (const author of authors) {
    const authorName = author.name || author.email;
    if (previouslySentEmails.has(author.email.toLowerCase())) continue;

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

  const mergedByEmail = new Map<string, ResearchAuthorEmailResult>();
  for (const result of previousResults) {
    mergedByEmail.set(result.email.toLowerCase(), result);
  }
  for (const result of results) {
    const key = result.email.toLowerCase();
    const previous = mergedByEmail.get(key);
    if (previous?.status === "sent") continue;
    mergedByEmail.set(key, result);
  }

  const mergedResults = Array.from(mergedByEmail.values());
  const complete = authors.every(
    (author) =>
      mergedByEmail.get(author.email.toLowerCase())?.status === "sent",
  );

  if (existing) {
    await prisma.researchAuthorNotification.update({
      where: { id: existing.id },
      data: {
        sentById: user.id,
        results: mergedResults,
      },
    });
  } else {
    await prisma.researchAuthorNotification.create({
      data: {
        projectId,
        type,
        sentById: user.id,
        results: mergedResults,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return {
    ok: true,
    complete,
    message: complete
      ? `${notificationLabel(type)} notification sent to all authors.`
      : `${notificationLabel(type)} notification processed. Some authors still have not received it.`,
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
