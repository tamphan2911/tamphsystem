"use server";

import bcrypt from "bcrypt";
import crypto from "crypto";
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
  JournalType,
  RegistrationStatus,
  ResearchStage,
  OrganizedProjectStatus,
  OrganizedProjectFinancialClaimStatus,
  OrganizedProjectType,
  ProposalStatus,
  ProposalType,
  ResearchAuthorNotificationType,
  ResearchTaskCategory,
  ResearchTaskStatus,
  ResearchTaskType,
  Role,
  SubmissionStatus,
  SuggestedVenueStatus,
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

function isSenderMailboxSkip(result: ResearchAuthorEmailResult) {
  return (
    result.status === "skipped" &&
    result.reason === "Email matches the system sender address."
  );
}

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

const generatedResearchEmailDomain = "no-email.research.tamph.local";

function generatedResearchEmail() {
  return `research-user-${crypto.randomBytes(8).toString("hex")}@${generatedResearchEmailDomain}`;
}

const articleFileMaxSize = 10 * 1024 * 1024;
const articleFileTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const articleFileTypesByExtension = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
]);

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
const taskReportFileTypes = new Map([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xlsx",
  ],
]);
const taskReportFileTypesByExtension = new Map([
  ["pdf", "application/pdf"],
  ["doc", "application/msword"],
  [
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
]);
const taskReportMaxFileSize = 2 * 1024 * 1024;

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function taskAllowsReportUpload(taskType: ResearchTaskType | null) {
  return (
    taskType === ResearchTaskType.PRODUCTION ||
    taskType === ResearchTaskType.PROJECT_PRODUCTION ||
    taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED ||
    taskType === ResearchTaskType.OTHER
  );
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

function researchMailFrom() {
  const from = process.env.SMTP_FROM?.trim() ?? "";
  const mailbox = extractMailbox(from);
  return mailbox ? `"Tamph Research Hub" <${mailbox}>` : from;
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

function normalizeEmailAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function extractMailbox(value: string | null | undefined) {
  const text = value?.trim();
  if (!text) return "";
  const match = text.match(/<([^<>@\s]+@[^<>@\s]+)>/);
  return normalizeEmailAddress(match?.[1] ?? text);
}

function senderMailboxes() {
  return new Set(
    [process.env.SMTP_FROM, process.env.SMTP_USER]
      .map(extractMailbox)
      .filter(Boolean),
  );
}

function emailRecipients(to: string[]) {
  const senders = senderMailboxes();
  const recipients = new Map<string, string>();

  for (const address of to) {
    const normalized = normalizeEmailAddress(address);
    if (!normalized || senders.has(normalized)) continue;
    recipients.set(normalized, address);
  }

  return Array.from(recipients.values());
}

function isSenderMailbox(email: string) {
  return senderMailboxes().has(normalizeEmailAddress(email));
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
  const recipients = emailRecipients(to);
  if (recipients.length === 0) return;
  const taskUrl = `${researchBaseUrl()}/tasks/${taskId}`;

  if (!smtpConfigured()) {
    console.info(
      `[task email] ${subject}: ${recipients.join(", ")} ${taskUrl}`,
    );
    return;
  }

  await createTransporter().sendMail({
    from: researchMailFrom(),
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
                ${detail ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#475569;white-space:pre-line;">${escapeHtml(detail)}</p>` : ""}
                <a href="${taskUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:12px;">${escapeHtml(actionLabel ?? "Open task")}</a>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  });
}

function taskStatusEmailLabel(status: ResearchTaskStatus) {
  if (status === ResearchTaskStatus.IN_PROGRESS) return "In progress";
  if (status === ResearchTaskStatus.NEED_CLARIFY) return "Need clarification";
  if (status === ResearchTaskStatus.CHECKING)
    return "Waiting for assigner check";
  if (status === ResearchTaskStatus.COMPLETED) return "Completed";
  if (status === ResearchTaskStatus.REVOKED) return "Revoked";
  return "Open";
}

async function sendProposalEmail({
  to,
  subject,
  heading,
  intro,
  detail,
  actionHref,
  actionLabel = "Open Research Hub",
}: {
  to: string[];
  subject: string;
  heading: string;
  intro: string;
  detail?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  const recipients = emailRecipients(to);
  if (recipients.length === 0) return;
  const href = actionHref ?? researchBaseUrl();

  if (!smtpConfigured()) {
    console.info(`[proposal email] ${subject}: ${recipients.join(", ")}`);
    return;
  }

  await createTransporter().sendMail({
    from: researchMailFrom(),
    to: recipients,
    subject,
    text: `${heading}\n\n${intro}${detail ? `\n\n${detail}` : ""}\n\n${actionLabel}: ${href}`,
    html: `
      <div style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 16px;background:#f8fafc;">
          <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
              <tr><td style="padding:26px 30px;border-bottom:1px solid #e2e8f0;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#059669;">Research Hub</div>
                <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(heading)}</h1>
                <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#475569;">${escapeHtml(intro)}</p>
              </td></tr>
              <tr><td style="padding:24px 30px;">
                ${detail ? `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#475569;">${escapeHtml(detail)}</p>` : ""}
                <a href="${href}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:12px;">${escapeHtml(actionLabel)}</a>
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

function taskTypeCanBeCreatedByResearchAuthor(taskType: ResearchTaskType) {
  return (
    taskType === ResearchTaskType.SUBMIT_RESEARCH ||
    taskType === ResearchTaskType.SUBMIT_CONFERENCE ||
    taskType === ResearchTaskType.OTHER
  );
}

async function canCreateResearchTaskForProject({
  user,
  projectId,
  taskType,
}: {
  user: { id: string; roles: Role[] };
  projectId: string | null;
  taskType: ResearchTaskType;
}) {
  if (user.roles.includes(Role.ADMIN)) return true;
  if (!projectId || !taskTypeCanBeCreatedByResearchAuthor(taskType)) {
    return false;
  }

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      leadResearcherId: true,
      authorEntries: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { userId: true, isCorresponding: true },
      },
    },
  });

  if (!project) return false;
  if (project.authorEntries.length === 0) {
    return project.leadResearcherId === user.id;
  }

  return (
    project.authorEntries[0]?.userId === user.id ||
    project.authorEntries.some(
      (entry) => entry.userId === user.id && entry.isCorresponding,
    )
  );
}

async function taskAssociationIsSelectable({
  taskType,
  projectId,
  reviewId,
  organizedProjectId,
}: {
  taskType: ResearchTaskType;
  projectId: string | null;
  reviewId: string | null;
  organizedProjectId: string | null;
}) {
  if (
    (taskType === ResearchTaskType.SUBMIT_RESEARCH ||
      taskType === ResearchTaskType.SUBMIT_CONFERENCE ||
      taskType === ResearchTaskType.PRODUCTION) &&
    projectId
  ) {
    const project = await prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { stage: true },
    });
    if (!project) return "MISSING_ASSOCIATION";
    if (
      taskType === ResearchTaskType.PRODUCTION &&
      project.stage !== ResearchStage.PRODUCTION
    ) {
      return "RESEARCH_PRODUCTION_COMPLETE";
    }
    if (
      (taskType === ResearchTaskType.SUBMIT_RESEARCH ||
        taskType === ResearchTaskType.SUBMIT_CONFERENCE) &&
      (project.stage === ResearchStage.ACCEPTED ||
        project.stage === ResearchStage.PUBLISHED)
    ) {
      return "RESEARCH_ALREADY_FINISHED";
    }
  }

  if (taskType === ResearchTaskType.REVIEW && reviewId) {
    const review = await prisma.academicReview.findUnique({
      where: { id: reviewId },
      select: { status: true },
    });
    if (!review) return "MISSING_ASSOCIATION";
    if (["SUBMITTED", "DECLINED", "CANCELLED"].includes(review.status)) {
      return "REVIEW_CLOSED";
    }
  }

  if (
    (taskType === ResearchTaskType.PROJECT_PRODUCTION ||
      taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED) &&
    organizedProjectId
  ) {
    const project = await prisma.organizedProject.findUnique({
      where: { id: organizedProjectId },
      select: { status: true },
    });
    if (!project) return "MISSING_ASSOCIATION";
    if (project.status === OrganizedProjectStatus.COMPLETED) {
      return "PROJECT_CLOSED";
    }
  }

  return null;
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

async function venueProposalDuplicateMessage({
  type,
  title,
  identifier,
}: {
  type: ProposalType;
  title: string;
  identifier: string | null;
}) {
  if (type === ProposalType.CONFERENCE) {
    const existing = await prisma.conference.findFirst({
      where: {
        OR: [
          { name: { equals: title, mode: "insensitive" } },
          ...(identifier ? [{ isbn: { equals: identifier } }] : []),
        ],
      },
      select: { name: true, isbn: true },
    });
    if (existing) {
      return existing.isbn === identifier
        ? `A conference with ISBN ${identifier} already exists.`
        : `A conference named "${existing.name}" already exists.`;
    }
  }

  if (type === ProposalType.JOURNAL) {
    const existing = await prisma.journal.findFirst({
      where: {
        OR: [
          { name: { equals: title, mode: "insensitive" } },
          ...(identifier ? [{ issn: { equals: identifier } }] : []),
        ],
      },
      select: { name: true, issn: true },
    });
    if (existing) {
      return existing.issn === identifier
        ? `A journal with ISSN ${identifier} already exists.`
        : `A journal named "${existing.name}" already exists.`;
    }
  }

  return null;
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
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      activeSites: true,
    },
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
  const identifier = optionalString(formData.get("identifier"));
  const organization = optionalString(formData.get("organization"));
  const location = optionalString(formData.get("location"));
  const website = optionalString(formData.get("website"));
  const venueType = optionalString(formData.get("venueType"));
  const file = formData.get("supportFile");

  if (!type || !title || !description) {
    return {
      ok: false,
      reason: "MISSING_FIELDS",
      title: "Proposal needs more detail",
      detail: "Please add a title and proposal description before sending.",
    };
  }

  if (
    (type === ProposalType.CONFERENCE || type === ProposalType.JOURNAL) &&
    !identifier
  ) {
    return {
      ok: false,
      reason: "MISSING_IDENTIFIER",
      title:
        type === ProposalType.CONFERENCE ? "ISBN required" : "ISSN required",
      detail:
        type === ProposalType.CONFERENCE
          ? "Please add the conference ISBN before sending the proposal."
          : "Please add the journal ISSN before sending the proposal.",
    };
  }

  const duplicateMessage = await venueProposalDuplicateMessage({
    type,
    title,
    identifier,
  });
  if (duplicateMessage) {
    return {
      ok: false,
      reason: "DUPLICATE_VENUE",
      title: "Already in the list",
      detail: duplicateMessage,
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

  const proposal = await prisma.proposal.create({
    data: {
      type,
      title,
      description,
      contactInfo,
      notes,
      identifier,
      organization,
      location,
      website,
      venueType,
      submittedById: user.id,
      ...supportFile,
    },
  });

  const admins = await prisma.user.findMany({
    where: { roles: { has: Role.ADMIN }, activeSites: { has: "research" } },
    select: { id: true },
  });

  await notifyUsers({
    userIds: admins.map((admin) => admin.id),
    type: "PROPOSAL_SUBMITTED",
    title: "New proposal submitted",
    summary: `${user.name || user.email} submitted ${title}.`,
    body: `${title}\n\n${description}`,
    href: `/proposals/${proposal.id}`,
    entityType: "proposal",
    entityId: proposal.id,
    excludeUserId: user.id,
  });

  await sendProposalEmail({
    to: [user.email],
    subject: "We received your Research Hub proposal",
    heading: "Thank you for your proposal",
    intro:
      "Your proposal has been received successfully and is now waiting for admin review.",
    detail: `Proposal: ${title}. We will notify you after the review decision is made.`,
    actionHref: `${researchBaseUrl()}/notifications`,
    actionLabel: "View notifications",
  });

  revalidatePath("/proposals");
  revalidatePath(
    type === ProposalType.PROJECT
      ? "/organized-projects"
      : type === ProposalType.CONFERENCE
        ? "/conferences"
        : type === ProposalType.JOURNAL
          ? "/journals"
          : "/projects",
  );
  revalidatePath("/notifications");
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

export async function reviewProposal(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const proposalId = optionalString(formData.get("proposalId"));
  const status = enumValue(ProposalStatus, formData.get("status"));
  const comment = optionalString(formData.get("comment"));
  if (
    !proposalId ||
    (status !== ProposalStatus.ACCEPTED && status !== ProposalStatus.DECLINED)
  ) {
    throw new Error("Choose approve or decline before submitting the review.");
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { submittedBy: { select: { id: true, name: true, email: true } } },
  });
  if (!proposal) throw new Error("Proposal not found.");
  if (
    proposal.status === ProposalStatus.ACCEPTED ||
    proposal.status === ProposalStatus.DECLINED
  ) {
    throw new Error("This proposal has already been reviewed.");
  }

  let createdHref = `/proposals/${proposal.id}`;
  if (status === ProposalStatus.ACCEPTED) {
    if (proposal.type === ProposalType.CONFERENCE) {
      const duplicateMessage = await venueProposalDuplicateMessage({
        type: proposal.type,
        title: proposal.title,
        identifier: proposal.identifier,
      });
      if (duplicateMessage) throw new Error(duplicateMessage);
      const conference = await prisma.conference.create({
        data: {
          name: proposal.title,
          type: enumValue(ConferenceType, proposal.venueType),
          isbn: proposal.identifier,
          organizer: proposal.organization,
          location: proposal.location,
          website: proposal.website,
          note: [proposal.description, proposal.notes]
            .filter(Boolean)
            .join("\n\n"),
        },
        select: { id: true },
      });
      createdHref = `/conferences/${conference.id}`;
    } else if (proposal.type === ProposalType.JOURNAL) {
      const duplicateMessage = await venueProposalDuplicateMessage({
        type: proposal.type,
        title: proposal.title,
        identifier: proposal.identifier,
      });
      if (duplicateMessage) throw new Error(duplicateMessage);
      const journal = await prisma.journal.create({
        data: {
          name: proposal.title,
          issn: proposal.identifier,
          publisher: proposal.organization,
          homepageLink: proposal.website,
          note: [proposal.description, proposal.notes]
            .filter(Boolean)
            .join("\n\n"),
        },
        select: { id: true },
      });
      createdHref = `/journals/${journal.id}`;
    }
  }

  const reviewed = await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      status,
      decisionComment: comment,
      decidedAt: new Date(),
      decidedById: user.id,
    },
  });

  const accepted = status === ProposalStatus.ACCEPTED;
  const statusLabel = accepted ? "approved" : "declined";
  const proposalType = proposal.type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const adminNote = comment ?? "No additional admin note was added.";
  const decisionSummary = `Your ${proposalType.toLowerCase()} "${proposal.title}" was ${statusLabel}.`;
  await notifyUsers({
    userIds: [proposal.submittedById],
    type: accepted ? "PROPOSAL_ACCEPTED" : "PROPOSAL_DECLINED",
    title: `Proposal feedback: ${statusLabel}`,
    summary: decisionSummary,
    body: `Proposal type: ${proposalType}\nProposal: ${proposal.title}\n\nAdmin note:\n${adminNote}`,
    href: accepted ? createdHref : "/notifications",
    entityType: "proposal",
    entityId: reviewed.id,
  });

  await sendProposalEmail({
    to: [proposal.submittedBy.email],
    subject: `Feedback on your Research Hub proposal`,
    heading: `Proposal ${statusLabel}`,
    intro: `${decisionSummary} Thank you for sharing this proposal with Research Hub.`,
    detail: `Proposal type: ${proposalType}\nProposal description: ${proposal.description}\n\nAdmin note: ${adminNote}`,
    actionHref: `${researchBaseUrl()}${accepted ? createdHref : "/notifications"}`,
    actionLabel: accepted ? "View item" : "View notification",
  });

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposal.id}`);
  revalidatePath("/notifications");
  revalidatePath("/conferences");
  revalidatePath("/journals");
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
  const projectType =
    enumValue(OrganizedProjectType, formData.get("projectType")) ??
    OrganizedProjectType.STUDENT;

  const organizedProject = await prisma.organizedProject.create({
    data: {
      title,
      organizer: fundingInstitution?.name ?? null,
      referenceCode,
      description: optionalString(formData.get("description")),
      projectType,
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

export async function deleteOrganizedProject(projectId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const project = await prisma.organizedProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) return;

  await prisma.organizedProject.delete({
    where: { id: projectId },
  });

  revalidatePath("/organized-projects");
  revalidatePath(`/organized-projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/funding-institutions");
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
  const projectType =
    enumValue(OrganizedProjectType, formData.get("projectType")) ??
    OrganizedProjectType.STUDENT;

  await prisma.organizedProject.update({
    where: { id: projectId },
    data: {
      title,
      organizer: fundingInstitution?.name ?? null,
      referenceCode,
      description: optionalString(formData.get("description")),
      projectType,
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
  const projectTypeChanged = previousProject.projectType !== projectType;
  const durationChanged =
    previousProject.durationMonths !== durationMonths ||
    previousProject.startDate?.getTime() !== startDate.getTime();

  const changedParts = [
    statusChanged ? "status" : "",
    projectTypeChanged ? "type" : "",
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
      leadResearcherId: true,
      authors: { select: { id: true } },
      authorEntries: { select: { userId: true, isCorresponding: true } },
      submissions: { select: { status: true } },
    },
  });
  if (!projectLock) return;

  const isCorrespondingAuthor =
    projectLock.authorEntries.length > 0
      ? projectLock.authorEntries.some(
          (entry) => entry.userId === user.id && entry.isCorresponding,
        )
      : projectLock.leadResearcherId === user.id;
  if (!isAdmin && !isCorrespondingAuthor) redirect("/401");

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

export async function deleteResearchProject(projectId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) return;

  await prisma.$transaction(async (tx) => {
    const taskIds = await tx.researchTask.findMany({
      where: { projectId },
      select: { id: true },
    });
    await tx.researchNotification.deleteMany({
      where: { entityType: "research", entityId: projectId },
    });
    if (taskIds.length > 0) {
      await tx.researchNotification.deleteMany({
        where: {
          entityType: "task",
          entityId: { in: taskIds.map((task) => task.id) },
        },
      });
    }
    await tx.researchTask.deleteMany({ where: { projectId } });
    await tx.researchProject.update({
      where: { id: projectId },
      data: { authors: { set: [] } },
    });
    await tx.researchProject.delete({
      where: { id: projectId },
    });
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/organized-projects");
  revalidatePath("/journals");
  revalidatePath("/conferences");
  revalidatePath("/tasks");
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
  const journalType =
    enumValue(JournalType, formData.get("type")) ?? JournalType.INTERNATIONAL;
  const accountUsername = optionalString(formData.get("accountUsername"));
  const accountPassword = optionalString(formData.get("accountPassword"));
  const accountEmail = optionalString(formData.get("accountEmail"));
  const accountNote = optionalString(formData.get("accountNote"));
  const shouldCreateAccount = Boolean(accountUsername);

  await prisma.$transaction(async (tx) => {
    const journal = await tx.journal.create({
      data: {
        name: optionalString(formData.get("name")) ?? "Untitled journal",
        issn: optionalString(formData.get("issn")),
        field: fields.length > 0 ? fields.join("; ") : legacyField,
        fields,
        type: journalType,
        rank:
          journalType === JournalType.INTERNATIONAL
            ? optionalString(formData.get("rank"))
            : null,
        localRank:
          journalType === JournalType.LOCAL
            ? optionalString(formData.get("localRank"))
            : null,
        issuesPerYear: positiveIntFromForm(formData.get("issuesPerYear")),
        isFavorite: formData.get("isFavorite") === "on",
        isInterest: formData.get("isInterest") === "on",
        publisher: optionalString(formData.get("publisher")),
        country: optionalString(formData.get("country")),
        apc: optionalString(formData.get("apc")),
        apcCurrency:
          enumValue(CurrencyCode, formData.get("apcCurrency")) ??
          CurrencyCode.USD,
        hasApcOption: formData.get("hasApcOption") === "on",
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

    if (accountUsername) {
      await tx.publisherAccount.create({
        data: {
          username: accountUsername,
          password: accountPassword ?? "",
          email: accountEmail,
          note: accountNote,
          journalId: journal.id,
        },
      });
    }
  });

  revalidatePath("/journals");
  if (shouldCreateAccount) revalidatePath("/accounts");
}

export async function updateJournal(journalId: string, formData: FormData) {
  await requireCurrentUser();
  const fields = orderedUniqueStrings(formData.getAll("fields"));
  const legacyField = optionalString(formData.get("field"));
  const journalType =
    enumValue(JournalType, formData.get("type")) ?? JournalType.INTERNATIONAL;

  await prisma.journal.update({
    where: { id: journalId },
    data: {
      name: optionalString(formData.get("name")) ?? "Untitled journal",
      issn: optionalString(formData.get("issn")),
      field: fields.length > 0 ? fields.join("; ") : legacyField,
      fields,
      type: journalType,
      rank:
        journalType === JournalType.INTERNATIONAL
          ? optionalString(formData.get("rank"))
          : null,
      localRank:
        journalType === JournalType.LOCAL
          ? optionalString(formData.get("localRank"))
          : null,
      issuesPerYear: positiveIntFromForm(formData.get("issuesPerYear")),
      isFavorite: formData.get("isFavorite") === "on",
      isInterest: formData.get("isInterest") === "on",
      publisher: optionalString(formData.get("publisher")),
      country: optionalString(formData.get("country")),
      apc: optionalString(formData.get("apc")),
      apcCurrency:
        enumValue(CurrencyCode, formData.get("apcCurrency")) ??
        CurrencyCode.USD,
      hasApcOption: formData.get("hasApcOption") === "on",
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
      _count: {
        select: { submissions: true, suggestions: true, reviews: true },
      },
    },
  });

  if (!journal) return;

  if (
    journal._count.submissions > 0 ||
    journal._count.suggestions > 0 ||
    journal._count.reviews > 0
  ) {
    throw new Error(
      "Delete the associated submissions, research links, and review records before deleting this journal.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.researchTask.updateMany({
      where: { journalId },
      data: { journalId: null },
    });
    await tx.publisherAccount.updateMany({
      where: { journalId },
      data: { journalId: null },
    });
    await tx.journal.delete({
      where: { id: journalId },
    });
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

  const blockers = [
    conference._count.submissions > 0
      ? `${conference._count.submissions} submission${
          conference._count.submissions === 1 ? "" : "s"
        }`
      : "",
    conference._count.suggestions > 0
      ? `${conference._count.suggestions} suggested research link${
          conference._count.suggestions === 1 ? "" : "s"
        }`
      : "",
  ].filter(Boolean);

  if (blockers.length > 0) {
    throw new Error(
      `Cannot delete ${conference.name}. Remove ${blockers.join(
        " and ",
      )} first, then delete the conference.`,
    );
  }

  await prisma.conference.delete({
    where: { id: conferenceId },
  });

  revalidatePath("/conferences");
  revalidatePath("/submissions");
  revalidatePath("/suggestions");
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

  const institution = await prisma.fundingInstitution.findUnique({
    where: { id: institutionId },
    select: { id: true },
  });
  if (!institution) return;

  await prisma.$transaction(async (tx) => {
    await tx.researchProject.updateMany({
      where: { fundingInstitutionId: institutionId },
      data: { fundingInstitutionId: null },
    });
    await tx.organizedProject.updateMany({
      where: { fundingInstitutionId: institutionId },
      data: { fundingInstitutionId: null },
    });
    await tx.fundingInstitution.delete({
      where: { id: institutionId },
    });
  });

  revalidatePath("/funding-institutions");
  revalidatePath("/organized-projects");
  revalidatePath("/projects");
}

export async function createAcademicReview(formData: FormData) {
  await requireCurrentUser();

  const journalId = optionalString(formData.get("journalId"));
  if (!journalId) return;
  const status = optionalString(formData.get("status")) ?? "ACCEPTED";
  const allowedStatuses = new Set([
    "ACCEPTED",
    "IN_PROGRESS",
    "SUBMITTED",
    "CANCELLED",
  ]);

  await prisma.academicReview.create({
    data: {
      journalId,
      manuscriptTitle:
        optionalString(formData.get("manuscriptTitle")) ??
        "Untitled manuscript",
      manuscriptId: optionalString(formData.get("manuscriptId")),
      status: allowedStatuses.has(status) ? status : "ACCEPTED",
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

export async function createResearchSiteUser(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const name = optionalString(formData.get("name"));
  const submittedEmail = optionalString(formData.get("email"))?.toLowerCase();
  const email = submittedEmail ?? generatedResearchEmail();
  const affiliation = optionalString(formData.get("affiliation")) ?? "Not set";
  const password = optionalString(formData.get("password"));

  if (!name || !password) {
    return { ok: false, reason: "MISSING_REQUIRED" };
  }
  if (password.length < 6) {
    return { ok: false, reason: "PASSWORD_SHORT" };
  }

  const roles = formData
    .getAll("roles")
    .filter((role): role is Role => Object.values(Role).includes(role as Role));

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        affiliation,
        passwordHash: await bcrypt.hash(password, 10),
        adminVisiblePassword: password,
        emailVerified: null,
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
        roles: roles.length > 0 ? roles : [Role.USER],
        activeSites: ["research"],
      },
    });
  } catch (error) {
    console.error("[research users] create failed", error);
    return { ok: false, reason: "CREATE_FAILED" };
  }

  revalidatePath("/users");
  return { ok: true, email: submittedEmail ?? null };
}

export async function updateResearchSiteUser(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const userId = optionalString(formData.get("userId"));
  const email = optionalString(formData.get("email"))?.toLowerCase();
  const password = optionalString(formData.get("password"));
  if (!userId) {
    return { ok: false, reason: "MISSING_REQUIRED" };
  }

  const roles = formData
    .getAll("roles")
    .filter((role): role is Role => Object.values(Role).includes(role as Role));
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSites: true },
  });
  if (!existing?.activeSites.includes("research")) {
    return { ok: false, reason: "NOT_RESEARCH_USER" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: optionalString(formData.get("name")),
        email,
        affiliation: optionalString(formData.get("affiliation")) ?? "Not set",
        roles: roles.length > 0 ? roles : [Role.STUDENT],
        activeSites: {
          set: Array.from(new Set([...existing.activeSites, "research"])),
        },
        ...(password
          ? {
              passwordHash: await bcrypt.hash(password, 10),
              adminVisiblePassword: password,
            }
          : {}),
      },
    });
  } catch (error) {
    console.error("[research users] update failed", error);
    return { ok: false, reason: "UPDATE_FAILED" };
  }

  revalidatePath("/users");
  return { ok: true };
}

export async function deleteResearchSiteUser(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const userId = optionalString(formData.get("userId"));
  if (!userId) return { ok: false, reason: "MISSING_REQUIRED" };
  if (userId === user.id) return { ok: false, reason: "SELF_DELETE" };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSites: true },
  });
  if (!target?.activeSites.includes("research")) {
    return { ok: false, reason: "NOT_RESEARCH_USER" };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    console.error("[research users] delete failed", error);
    return { ok: false, reason: "DELETE_FAILED" };
  }

  revalidatePath("/users");
  return { ok: true };
}

export async function createResearchTask(formData: FormData) {
  const user = await requireCurrentUser();

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
  if (!taskType) return { ok: false, reason: "MISSING_ASSOCIATION" };
  const projectId = optionalString(formData.get("projectId"));
  const organizedProjectId = optionalString(formData.get("organizedProjectId"));
  const journalId = optionalString(formData.get("journalId"));
  const conferenceId = optionalString(formData.get("conferenceId"));
  const reviewId = optionalString(formData.get("reviewId"));
  const accountId = optionalString(formData.get("accountId"));

  if (
    !(await canCreateResearchTaskForProject({
      user,
      projectId,
      taskType,
    }))
  ) {
    return { ok: false, reason: "UNAUTHORIZED" };
  }

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

  const associationBlockReason = await taskAssociationIsSelectable({
    taskType,
    projectId,
    reviewId,
    organizedProjectId,
  });
  if (associationBlockReason) {
    return { ok: false, reason: associationBlockReason };
  }

  if (accountId && taskType === ResearchTaskType.SUBMIT_RESEARCH) {
    const account = await prisma.publisherAccount.findFirst({
      where: { id: accountId, journalId },
      select: { id: true },
    });
    if (!account) return { ok: false, reason: "ACCOUNT_NOT_FOR_JOURNAL" };
  }

  if (
    projectId &&
    (taskType === ResearchTaskType.SUBMIT_RESEARCH ||
      taskType === ResearchTaskType.SUBMIT_CONFERENCE) &&
    !(await researchProductionIsComplete(projectId)) &&
    !(await canCreateResearchTaskForProject({ user, projectId, taskType }))
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
      accountId,
      dueDate: optionalString(formData.get("dueDate"))
        ? new Date(optionalString(formData.get("dueDate")) as string)
        : null,
      createdById: user.id,
      assignments: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdById: true,
      assignments: {
        select: { user: { select: { email: true } } },
      },
    },
  });

  if (taskType === ResearchTaskType.REVIEW && reviewId) {
    await prisma.academicReview.update({
      where: { id: reviewId },
      data: { status: "IN_PROGRESS" },
    });
  }

  await notifyUsers({
    userIds: assigneeIds,
    type: "TASK_ASSIGNED",
    title: "Task assigned",
    summary: task.title,
    body: task.description
      ? `You were assigned "${task.title}". Task note: ${task.description}`
      : `You were assigned the task "${task.title}".`,
    href: `/tasks/${task.id}`,
    entityType: "task",
    entityId: task.id,
  });
  await sendTaskEmail({
    to: task.assignments.map((assignment) => assignment.user.email),
    subject: `Task assigned: ${task.title}`,
    heading: "Task assigned",
    intro: "A new research task has been assigned to you.",
    detail: task.description ?? undefined,
    taskTitle: task.title,
    taskId: task.id,
    actionLabel: "Open task",
  });

  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  if (reviewId) revalidatePath(`/reviews/${reviewId}`);
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
      reviewId: true,
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
  if (!taskType) return { ok: false, reason: "MISSING_ASSOCIATION" };
  const projectId = optionalString(formData.get("projectId"));
  const organizedProjectId = optionalString(formData.get("organizedProjectId"));
  const journalId = optionalString(formData.get("journalId"));
  const conferenceId = optionalString(formData.get("conferenceId"));
  const reviewId = optionalString(formData.get("reviewId"));
  const accountId = optionalString(formData.get("accountId"));
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

  const associationBlockReason = await taskAssociationIsSelectable({
    taskType,
    projectId: effectiveProjectId,
    reviewId,
    organizedProjectId: effectiveOrganizedProjectId,
  });
  if (associationBlockReason) {
    return { ok: false, reason: associationBlockReason };
  }

  if (accountId && taskType === ResearchTaskType.SUBMIT_RESEARCH) {
    const account = await prisma.publisherAccount.findFirst({
      where: { id: accountId, journalId },
      select: { id: true },
    });
    if (!account) return { ok: false, reason: "ACCOUNT_NOT_FOR_JOURNAL" };
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
        accountId:
          taskType === ResearchTaskType.SUBMIT_RESEARCH ? accountId : null,
        conferenceId:
          taskType === ResearchTaskType.SUBMIT_CONFERENCE ? conferenceId : null,
        reviewId: taskType === ResearchTaskType.REVIEW ? reviewId : null,
        dueDate: optionalString(formData.get("dueDate"))
          ? new Date(optionalString(formData.get("dueDate")) as string)
          : null,
      },
      select: { id: true, title: true, description: true },
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

  if (taskType === ResearchTaskType.REVIEW && reviewId) {
    await prisma.academicReview.update({
      where: { id: reviewId },
      data: { status: "IN_PROGRESS" },
    });
  }

  if (addedAssignees.length > 0) {
    await notifyUsers({
      userIds: addedAssignees,
      type: "TASK_ASSIGNED",
      title: "Task assigned",
      summary: task.title,
      body: task.description
        ? `You were assigned "${task.title}". Task note: ${task.description}`
        : `You were assigned the task "${task.title}".`,
      href: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
    });
    const addedUsers = await prisma.user.findMany({
      where: { id: { in: addedAssignees } },
      select: { email: true },
    });
    await sendTaskEmail({
      to: addedUsers.map((user) => user.email),
      subject: `Task assigned: ${task.title}`,
      heading: "Task assigned",
      intro: "You were added as an assignee for this research task.",
      detail: task.description ?? undefined,
      taskTitle: task.title,
      taskId: task.id,
      actionLabel: "Open task",
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  if (currentTask.projectId)
    revalidatePath(`/projects/${currentTask.projectId}`);
  if (effectiveProjectId) revalidatePath(`/projects/${effectiveProjectId}`);
  if (currentTask.reviewId) revalidatePath(`/reviews/${currentTask.reviewId}`);
  if (reviewId) revalidatePath(`/reviews/${reviewId}`);
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
    body: `The assigned task "${task.title}" was revoked.`,
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

export async function deleteResearchTask(taskId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      projectId: true,
      organizedProjectId: true,
      reviewId: true,
    },
  });
  if (!task) return;

  await prisma.researchTask.delete({
    where: { id: taskId },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  if (task.organizedProjectId) {
    revalidatePath(`/organized-projects/${task.organizedProjectId}`);
  }
  if (task.reviewId) revalidatePath(`/reviews/${task.reviewId}`);
}

export async function deleteResearchNotification(notificationId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.researchNotification.delete({
    where: { id: notificationId },
  });

  revalidatePath("/notifications");
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
        articleFileName: true,
        articleUrl: true,
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
      (journalStatus === SubmissionStatus.REJECTED ||
        journalStatus === SubmissionStatus.WITHDRAWN) &&
      dateIsBefore(statusDate, currentSubmission.submittedAt)
    ) {
      return {
        ok: false,
        message:
          "Rejected and withdrawn dates must be the same as or after the submission date.",
      };
    }
    const articleUrl = optionalString(formData.get("articleUrl"));
    const articleFile = formData.get("articleFile");
    const hasNewArticleFile =
      articleFile instanceof File && articleFile.size > 0;
    if (journalStatus === SubmissionStatus.PUBLISHED) {
      if (!articleUrl) {
        return {
          ok: false,
          message:
            "Add the published article link before changing this submission to published.",
        };
      }
      try {
        const parsedUrl = new URL(articleUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return {
            ok: false,
            message:
              "Published article link must start with http:// or https://.",
          };
        }
      } catch {
        return {
          ok: false,
          message: "Published article link is not a valid URL.",
        };
      }
      if (hasNewArticleFile) {
        const extension = articleFile.name.toLowerCase().split(".").pop();
        const allowedByMime = articleFileTypes.has(articleFile.type);
        const allowedByExtension =
          Boolean(extension) &&
          articleFileTypesByExtension.has(extension ?? "");
        if (!allowedByMime && !allowedByExtension) {
          return {
            ok: false,
            message: "Upload the article as a PDF, DOC, or DOCX file.",
          };
        }
        if (articleFile.size > articleFileMaxSize) {
          return {
            ok: false,
            message: "The article file must be 10 MB or smaller.",
          };
        }
      }
    }

    const data: {
      status: SubmissionStatus;
      submittedAt?: Date;
      acceptedAt?: Date | null;
      rejectedAt?: Date | null;
      withdrawnAt?: Date | null;
      publishedAt?: Date | null;
      articleUrl?: string | null;
      articleFileName?: string | null;
      articleFileType?: string | null;
      articleFileSize?: number | null;
      articleFileData?: Buffer | null;
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
      data.articleUrl = articleUrl;
      if (hasNewArticleFile) {
        const extension = articleFile.name.toLowerCase().split(".").pop();
        data.articleFileName = articleFile.name;
        data.articleFileType =
          articleFile.type ||
          articleFileTypesByExtension.get(extension ?? "") ||
          "application/octet-stream";
        data.articleFileSize = articleFile.size;
        data.articleFileData = Buffer.from(await articleFile.arrayBuffer());
      }
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
      select: {
        researchProjectId: true,
        journalId: true,
        journal: { select: { name: true } },
      },
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
            body: `The submission of "${project?.title ?? "this research"}" to ${submission.journal.name} moved to review stage.`,
          }
        : journalStatus === SubmissionStatus.ACCEPTED
          ? {
              type: "RESEARCH_ACCEPTED",
              title: "Research accepted",
              body: `The submission of "${project?.title ?? "this research"}" to ${submission.journal.name} was accepted.`,
            }
          : journalStatus === SubmissionStatus.PUBLISHED
            ? {
                type: "RESEARCH_PUBLISHED",
                title: "Research published",
                body: `The submission of "${project?.title ?? "this research"}" to ${submission.journal.name} was published.`,
              }
            : null;
    if (normalizedNotification) {
      try {
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
            body: `${normalizedNotification.body} This research is associated with your project.`,
          },
        );
      } catch (error) {
        console.error("Failed to send submission status notifications", error);
      }
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
      (conferenceStatus === ConferenceSubmissionStatus.REJECTED ||
        conferenceStatus === ConferenceSubmissionStatus.WITHDRAWN) &&
      currentSubmission.submittedAt &&
      dateIsBefore(statusDate, currentSubmission.submittedAt)
    ) {
      return {
        ok: false,
        message:
          "Rejected and withdrawn dates must be the same as or after the submission date.",
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
      select: {
        researchProjectId: true,
        conferenceId: true,
        conference: { select: { name: true } },
      },
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
            body: `The submission of "${project?.title ?? "this research"}" to ${submission.conference.name} moved to review stage.`,
          }
        : conferenceStatus === ConferenceSubmissionStatus.ACCEPTED
          ? {
              type: "RESEARCH_ACCEPTED",
              title: "Research accepted",
              body: `The submission of "${project?.title ?? "this research"}" to ${submission.conference.name} was accepted.`,
            }
          : conferenceStatus === ConferenceSubmissionStatus.PUBLISHED
            ? {
                type: "RESEARCH_PUBLISHED",
                title: "Research published",
                body: `The submission of "${project?.title ?? "this research"}" to ${submission.conference.name} was published.`,
              }
            : null;
    if (normalizedNotification) {
      try {
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
            body: `${normalizedNotification.body} This research is associated with your project.`,
          },
        );
      } catch (error) {
        console.error("Failed to send submission status notifications", error);
      }
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
  if (!(await canSuggestVenueForResearch(projectId, user.id, user.roles))) {
    redirect("/401");
  }

  const journalId = optionalString(formData.get("journalId"));
  const venueName = optionalString(formData.get("venueName"));
  const venueLink = optionalString(formData.get("venueLink"));
  if (!journalId && !venueName && !venueLink) return;
  if (await researchContentIsLocked(projectId)) return;

  const canApprove =
    journalId &&
    (await canApproveVenueSuggestionForResearch(
      projectId,
      user.id,
      user.roles,
    ));
  const status = canApprove
    ? SuggestedVenueStatus.APPROVED
    : SuggestedVenueStatus.PENDING;
  const venue = journalId
    ? await prisma.journal.findUnique({
        where: { id: journalId },
        select: { name: true },
      })
    : null;

  const suggestion = journalId
    ? await prisma.suggestedJournal.upsert({
        where: { projectId_journalId: { projectId, journalId } },
        update: {
          createdById: user.id,
          status,
          approvedAt: canApprove ? new Date() : null,
          approvedById: canApprove ? user.id : null,
          venueName: venueName ?? venue?.name ?? null,
          venueLink,
        },
        create: {
          projectId,
          journalId,
          createdById: user.id,
          status,
          approvedAt: canApprove ? new Date() : null,
          approvedById: canApprove ? user.id : null,
          venueName: venueName ?? venue?.name ?? null,
          venueLink,
        },
      })
    : await prisma.suggestedJournal.create({
        data: {
          projectId,
          createdById: user.id,
          status: SuggestedVenueStatus.PENDING,
          venueName,
          venueLink,
        },
      });

  if (suggestion.status === SuggestedVenueStatus.PENDING) {
    await notifyVenueSuggestionApprovalNeeded({
      projectId,
      suggestionId: suggestion.id,
      venueName: venueName ?? venue?.name ?? "New journal venue",
      kind: "journal",
      createdById: user.id,
      adminOnly: !journalId,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/suggestions");
}

export async function deleteSuggestedJournal(
  projectId: string,
  suggestionId: string,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  if (await researchContentIsLocked(projectId)) return;

  await prisma.suggestedJournal.deleteMany({
    where: { projectId, id: suggestionId },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/suggestions");
}

export async function addSuggestedConference(
  projectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  if (!(await canSuggestVenueForResearch(projectId, user.id, user.roles))) {
    redirect("/401");
  }

  const conferenceId = optionalString(formData.get("conferenceId"));
  const venueName = optionalString(formData.get("venueName"));
  const venueLink = optionalString(formData.get("venueLink"));
  if (!conferenceId && !venueName && !venueLink) return;
  if (await researchContentIsLocked(projectId)) return;

  const canApprove =
    conferenceId &&
    (await canApproveVenueSuggestionForResearch(
      projectId,
      user.id,
      user.roles,
    ));
  const status = canApprove
    ? SuggestedVenueStatus.APPROVED
    : SuggestedVenueStatus.PENDING;
  const venue = conferenceId
    ? await prisma.conference.findUnique({
        where: { id: conferenceId },
        select: { name: true },
      })
    : null;

  const suggestion = conferenceId
    ? await prisma.suggestedConference.upsert({
        where: { projectId_conferenceId: { projectId, conferenceId } },
        update: {
          createdById: user.id,
          status,
          approvedAt: canApprove ? new Date() : null,
          approvedById: canApprove ? user.id : null,
          venueName: venueName ?? venue?.name ?? null,
          venueLink,
        },
        create: {
          projectId,
          conferenceId,
          createdById: user.id,
          status,
          approvedAt: canApprove ? new Date() : null,
          approvedById: canApprove ? user.id : null,
          venueName: venueName ?? venue?.name ?? null,
          venueLink,
        },
      })
    : await prisma.suggestedConference.create({
        data: {
          projectId,
          createdById: user.id,
          status: SuggestedVenueStatus.PENDING,
          venueName,
          venueLink,
        },
      });

  if (suggestion.status === SuggestedVenueStatus.PENDING) {
    await notifyVenueSuggestionApprovalNeeded({
      projectId,
      suggestionId: suggestion.id,
      venueName: venueName ?? venue?.name ?? "New conference venue",
      kind: "conference",
      createdById: user.id,
      adminOnly: !conferenceId,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/suggestions");
}

async function canSuggestVenueForResearch(
  projectId: string,
  userId: string,
  roles: Role[],
) {
  if (roles.includes(Role.ADMIN)) return true;
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      leadResearcherId: true,
      authors: { select: { id: true } },
      authorEntries: { select: { userId: true } },
      tasks: {
        where: {
          status: {
            notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
          },
          assignments: { some: { userId } },
        },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!project) return false;
  return (
    project.leadResearcherId === userId ||
    project.authors.some((author) => author.id === userId) ||
    project.authorEntries.some((entry) => entry.userId === userId) ||
    project.tasks.length > 0
  );
}

async function venueSuggestionApproverUserIds(projectId: string) {
  const [project, admins] = await Promise.all([
    prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        leadResearcherId: true,
        authorEntries: {
          where: { OR: [{ position: 0 }, { isCorresponding: true }] },
          select: { userId: true },
        },
      },
    }),
    adminUserIds(),
  ]);

  if (!project) return admins;
  return [
    ...admins,
    project.leadResearcherId,
    ...project.authorEntries.map((entry) => entry.userId),
  ];
}

async function canApproveVenueSuggestionForResearch(
  projectId: string,
  userId: string,
  roles: Role[],
) {
  if (roles.includes(Role.ADMIN)) return true;
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      leadResearcherId: true,
      authorEntries: {
        where: { OR: [{ position: 0 }, { isCorresponding: true }] },
        select: { userId: true },
      },
    },
  });
  if (!project) return false;
  return (
    project.leadResearcherId === userId ||
    project.authorEntries.some((entry) => entry.userId === userId)
  );
}

async function notifyVenueSuggestionApprovalNeeded({
  projectId,
  suggestionId,
  venueName,
  kind,
  createdById,
  adminOnly,
}: {
  projectId: string;
  suggestionId: string;
  venueName: string;
  kind: "journal" | "conference";
  createdById: string;
  adminOnly: boolean;
}) {
  const userIds = adminOnly
    ? await adminUserIds()
    : await venueSuggestionApproverUserIds(projectId);
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: { title: true },
  });

  await notifyUsers({
    userIds,
    excludeUserId: createdById,
    type: "VENUE_SUGGESTION_APPROVAL_NEEDED",
    title: "Venue suggestion needs approval",
    summary: project?.title ?? venueName,
    body: `${venueName} was suggested as a ${kind}. ${
      adminOnly
        ? "This venue is not in the system yet, so an admin needs to add and link it before approval."
        : "Approve it before submission tasks can be assigned."
    }`,
    href: `/projects/${projectId}`,
    entityType: "suggestedVenue",
    entityId: suggestionId,
  });
}

export async function deleteSuggestedConference(
  projectId: string,
  suggestionId: string,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  if (await researchContentIsLocked(projectId)) return;

  await prisma.suggestedConference.deleteMany({
    where: { projectId, id: suggestionId },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/suggestions");
}

export async function approveSuggestedJournal(
  projectId: string,
  suggestionId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  if (
    !(await canApproveVenueSuggestionForResearch(
      projectId,
      user.id,
      user.roles,
    ))
  ) {
    redirect("/401");
  }

  const suggestion = await prisma.suggestedJournal.findUnique({
    where: { id: suggestionId },
    select: { projectId: true, journalId: true, createdById: true },
  });
  if (!suggestion || suggestion.projectId !== projectId) return;

  const linkedJournalId =
    suggestion.journalId ?? optionalString(formData.get("journalId"));
  if (!linkedJournalId) {
    if (!user.roles.includes(Role.ADMIN)) redirect("/401");
    throw new Error("Choose the journal in the system before approving.");
  }

  await prisma.suggestedJournal.update({
    where: { id: suggestionId },
    data: {
      journalId: linkedJournalId,
      status: SuggestedVenueStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: user.id,
    },
  });

  if (suggestion.createdById) {
    await notifyUsers({
      userIds: [suggestion.createdById],
      excludeUserId: user.id,
      type: "VENUE_SUGGESTION_APPROVED",
      title: "Venue suggestion approved",
      summary: "Your journal suggestion was approved.",
      href: `/projects/${projectId}`,
      entityType: "suggestedVenue",
      entityId: suggestionId,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/suggestions");
}

export async function approveSuggestedConference(
  projectId: string,
  suggestionId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  if (
    !(await canApproveVenueSuggestionForResearch(
      projectId,
      user.id,
      user.roles,
    ))
  ) {
    redirect("/401");
  }

  const suggestion = await prisma.suggestedConference.findUnique({
    where: { id: suggestionId },
    select: { projectId: true, conferenceId: true, createdById: true },
  });
  if (!suggestion || suggestion.projectId !== projectId) return;

  const linkedConferenceId =
    suggestion.conferenceId ?? optionalString(formData.get("conferenceId"));
  if (!linkedConferenceId) {
    if (!user.roles.includes(Role.ADMIN)) redirect("/401");
    throw new Error("Choose the conference in the system before approving.");
  }

  await prisma.suggestedConference.update({
    where: { id: suggestionId },
    data: {
      conferenceId: linkedConferenceId,
      status: SuggestedVenueStatus.APPROVED,
      approvedAt: new Date(),
      approvedById: user.id,
    },
  });

  if (suggestion.createdById) {
    await notifyUsers({
      userIds: [suggestion.createdById],
      excludeUserId: user.id,
      type: "VENUE_SUGGESTION_APPROVED",
      title: "Venue suggestion approved",
      summary: "Your conference suggestion was approved.",
      href: `/projects/${projectId}`,
      entityType: "suggestedVenue",
      entityId: suggestionId,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/suggestions");
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

    const [project, journal] = await Promise.all([
      prisma.researchProject.findUnique({
        where: { id: task.projectId },
        select: { title: true },
      }),
      prisma.journal.findUnique({
        where: { id: task.journalId },
        select: { name: true },
      }),
    ]);
    await notifyResearchAuthors(task.projectId, {
      type: "SUBMISSION_CREATED",
      title: "New journal submission",
      summary: project?.title ?? "A research submission was created.",
      body: `"${project?.title ?? "This research"}" was submitted to ${journal?.name ?? "the selected journal"} after the assigner approved the submission task "${task.title}".`,
    });
    await notifyOrganizedProjectMembersForResearch(task.projectId, {
      type: "PROJECT_RESEARCH_SUBMISSION",
      title: "Project research submitted",
      summary:
        project?.title ?? "A project research record has a new submission.",
      body: `"${project?.title ?? "A research associated with your project"}" was submitted to ${journal?.name ?? "the selected journal"}.`,
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

    const [project, conference] = await Promise.all([
      prisma.researchProject.findUnique({
        where: { id: task.projectId },
        select: { title: true },
      }),
      prisma.conference.findUnique({
        where: { id: task.conferenceId },
        select: { name: true },
      }),
    ]);
    await notifyResearchAuthors(task.projectId, {
      type: "SUBMISSION_CREATED",
      title: "New conference submission",
      summary: project?.title ?? "A conference submission was created.",
      body: `"${project?.title ?? "This research"}" was submitted to ${conference?.name ?? "the selected conference"} after the assigner approved the submission task "${task.title}".`,
    });
    await notifyOrganizedProjectMembersForResearch(task.projectId, {
      type: "PROJECT_RESEARCH_SUBMISSION",
      title: "Project research submitted",
      summary:
        project?.title ??
        "A project research record has a new conference submission.",
      body: `"${project?.title ?? "A research associated with your project"}" was submitted to ${conference?.name ?? "the selected conference"}.`,
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
    body: `An assignee marked "${task.title}" as finished and ready for your review.`,
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

export async function uploadResearchTaskReport(
  taskId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const file = formData.get("reportFile");
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      title: "Report file required",
      detail: "Choose one report file before uploading.",
    };
  }

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      taskType: true,
      status: true,
      createdById: true,
      assignments: { select: { userId: true } },
    },
  });
  if (!task) {
    return {
      ok: false,
      title: "Task not found",
      detail: "This task could not be found.",
    };
  }
  if (!taskAllowsReportUpload(task.taskType)) {
    return {
      ok: false,
      title: "Report not available",
      detail: "Reports are only used for project, production, and other tasks.",
    };
  }
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return {
      ok: false,
      title: "Task is closed",
      detail:
        "Reports cannot be uploaded after a task is completed or revoked.",
    };
  }
  const isAssignee = task.assignments.some(
    (assignment) => assignment.userId === user.id,
  );
  if (!isAssignee || task.createdById === user.id) {
    return {
      ok: false,
      title: "Upload not allowed",
      detail: "Only assignees can upload a report for the assigner to check.",
    };
  }

  const extension = file.name.toLowerCase().split(".").pop();
  const allowedByMime = taskReportFileTypes.has(file.type);
  const allowedByExtension =
    Boolean(extension) && taskReportFileTypesByExtension.has(extension ?? "");
  if (!allowedByMime && !allowedByExtension) {
    return {
      ok: false,
      title: "Report file rejected",
      detail: "Upload only .doc, .docx, .xlsx, or .pdf files.",
    };
  }
  if (file.size > taskReportMaxFileSize) {
    return {
      ok: false,
      title: "Report file is too large",
      detail: "The report file must be 2 MB or smaller.",
    };
  }

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      reportFileName: file.name,
      reportFileType:
        file.type || taskReportFileTypesByExtension.get(extension ?? "") || "",
      reportFileSize: file.size,
      reportFileData: Buffer.from(await file.arrayBuffer()),
      reportUploadedAt: new Date(),
      reportUploadedById: user.id,
    },
  });

  await notifyUsers({
    userIds: [task.createdById],
    type: "TASK_REPORT_UPLOADED",
    title: "Task report uploaded",
    summary: task.title,
    body: `A report file "${file.name}" was uploaded for task "${task.title}".`,
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return {
    ok: true,
    title: "Report uploaded",
    detail: "The report file is ready for the assigner to check.",
  };
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
      reviewId: true,
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
      review:
        task.taskType === ResearchTaskType.REVIEW && task.reviewId
          ? {
              update: {
                status: "SUBMITTED",
                completedAt,
              },
            }
          : undefined,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  if (task.reviewId) revalidatePath(`/reviews/${task.reviewId}`);

  await notifyUsers({
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: "TASK_COMPLETED",
    title: "Task completed",
    summary: task.title,
    body: `The assigner reviewed and approved "${task.title}" as complete.`,
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

export async function sendTaskReminderEmail(
  taskId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const requestedAssigneeIds = Array.from(
    new Set(
      formData
        .getAll("assigneeIds")
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        ),
    ),
  );

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      dueDate: true,
      createdById: true,
      createdBy: { select: { name: true, email: true } },
      assignments: {
        select: {
          userId: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!task) {
    return {
      ok: false,
      title: "Task not found",
      detail: "This task could not be found. Refresh the page and try again.",
    };
  }

  const isAdmin = user.roles.includes(Role.ADMIN);
  const isAssigner = task.createdById === user.id;
  if (!isAdmin && !isAssigner) redirect("/401");

  if (task.status === ResearchTaskStatus.COMPLETED) {
    return {
      ok: false,
      title: "Reminder not available",
      detail:
        "This task is already completed, so assignees do not need a finish reminder.",
    };
  }
  if (task.status === ResearchTaskStatus.REVOKED) {
    return {
      ok: false,
      title: "Reminder not available",
      detail:
        "This task has been revoked. Revoked tasks are no longer active work for assignees.",
    };
  }
  if (task.status === ResearchTaskStatus.CHECKING) {
    return {
      ok: false,
      title: "Reminder not available",
      detail:
        "Assignees have already sent this task for checking. The next action is for the assigner to review, approve, or request revision.",
    };
  }
  if (task.status === ResearchTaskStatus.NEED_CLARIFY) {
    return {
      ok: false,
      title: "Reminder not available",
      detail:
        "Assignees are waiting for clarification feedback from the assigner. Please answer the clarification request before sending finish reminders.",
    };
  }

  const selectedAssignments = task.assignments.filter((assignment) =>
    requestedAssigneeIds.includes(assignment.userId),
  );

  if (selectedAssignments.length === 0) {
    return {
      ok: false,
      title: "Choose assignees",
      detail:
        "Select at least one assignee who should receive this task reminder email.",
    };
  }

  const sender = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true },
  });
  const senderName = sender?.name || sender?.email || "the assigner";
  const dueLine = task.dueDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(task.dueDate)
    : "No due date is set";
  const detail = [
    `Current status: ${taskStatusEmailLabel(task.status)}`,
    `Due date: ${dueLine}`,
    task.description ? `Task note: ${task.description}` : null,
    "",
    `Reminder from ${senderName}: please review the task details and finish the assigned work as soon as possible. If anything is blocking progress, open the task and send a clarification request so the assigner can respond with specific guidance.`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  await sendTaskEmail({
    to: selectedAssignments.map((assignment) => assignment.user.email),
    subject: `Reminder to finish task: ${task.title}`,
    heading: "Task completion reminder",
    intro:
      "This is a professional reminder from the Research Hub about an active task assigned to you. Please complete the work or communicate any blocker through the task page.",
    detail,
    taskTitle: task.title,
    taskId,
    actionLabel: "Open task",
  });

  return {
    ok: true,
    title: "Reminder email sent",
    detail: `Reminder sent to ${selectedAssignments.length} assignee${
      selectedAssignments.length === 1 ? "" : "s"
    }.`,
  };
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
  if (reason) {
    await prisma.researchTaskClarification.create({
      data: {
        taskId,
        requestedById: user.id,
        answeredById: user.id,
        question: "Revision requested",
        answer: reason,
        answeredAt: new Date(),
      },
    });
  }
  await notifyUsers({
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: "TASK_REDO_REQUIRED",
    title: "Task needs revision",
    summary: task.title,
    body: reason
      ? `Revision requested for "${task.title}". Note: ${reason}`
      : `The assigner requested revision for "${task.title}" before approval.`,
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
      status: true,
      createdBy: { select: { email: true } },
      assignments: { select: { userId: true } },
      clarifications: {
        where: { requestedById: user.id, answer: null },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!task) return;
  if (!task.assignments.some((assignment) => assignment.userId === user.id)) {
    redirect("/401");
  }
  if (task.createdById === user.id) return;
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED ||
    task.status === ResearchTaskStatus.CHECKING ||
    task.clarifications.length > 0
  ) {
    return;
  }

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
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const clarificationId = optionalString(formData.get("clarificationId"));
  const answer = optionalString(formData.get("answer"));
  if (!clarificationId || !answer) return;
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      createdById: true,
      status: true,
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });
  if (!task) return;
  if (!user.roles.includes(Role.ADMIN) && task.createdById !== user.id) {
    redirect("/401");
  }
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return;
  }

  const updated = await prisma.researchTaskClarification.updateMany({
    where: { id: clarificationId, taskId, answer: null },
    data: { answer, answeredById: user.id, answeredAt: new Date() },
  });
  if (updated.count === 0) return;
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
      "The assigner or an admin has answered a clarification request for this task. Please review the answer and continue the work.",
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
  if (type === ResearchAuthorNotificationType.PRODUCTION_FINISHED)
    return "production finished";
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
  if (type === ResearchAuthorNotificationType.PRODUCTION_FINISHED) {
    return `Research production finished: ${title}`;
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
      : type === ResearchAuthorNotificationType.PRODUCTION_FINISHED
        ? "The production stage of this research has been marked as finished."
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
  const firstAuthorId = sourceAuthors.at(0)?.id;
  const correspondingAuthorIds =
    project.authorEntries.length > 0
      ? project.authorEntries
          .filter((entry) => entry.isCorresponding)
          .map((entry) => entry.userId)
      : [project.leadResearcherId];
  const canSendAuthorNotification =
    user.roles.includes(Role.ADMIN) ||
    user.id === firstAuthorId ||
    correspondingAuthorIds.includes(user.id);
  if (!canSendAuthorNotification) {
    return {
      ok: false,
      message:
        "Only admin, first author, or corresponding author can send author notification emails.",
      results: [] as ResearchAuthorEmailResult[],
    };
  }
  const authorsLine =
    project.authorEntries.length > 0
      ? project.authorEntries
          .map(
            (entry) =>
              `${entry.user.name || entry.user.email}${entry.isCorresponding ? "*" : ""}`,
          )
          .join(", ")
      : authors
          .map(
            (author, index) =>
              `${author.name || author.email}${index === 0 ? "*" : ""}`,
          )
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
  const previouslySenderSkippedEmails = new Set(
    previousResults
      .filter(isSenderMailboxSkip)
      .map((result) => result.email.toLowerCase()),
  );
  const canSend = smtpConfigured();
  const transporter = canSend ? createTransporter() : null;

  for (const author of authors) {
    const authorName = author.name || author.email;
    const authorEmail = author.email.toLowerCase();
    if (
      previouslySentEmails.has(authorEmail) ||
      previouslySenderSkippedEmails.has(authorEmail)
    ) {
      continue;
    }

    if (isSenderMailbox(author.email)) {
      results.push({
        authorName,
        email: author.email,
        status: "skipped",
        reason: "Email matches the system sender address.",
      });
      continue;
    }

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
        from: researchMailFrom(),
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
  const complete = authors.every((author) => {
    const result = mergedByEmail.get(author.email.toLowerCase());
    return (
      result?.status === "sent" ||
      Boolean(result && isSenderMailboxSkip(result))
    );
  });

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
