"use server";

import {
  researchDateTimeFormat,
  researchDateValue,
  researchYear,
} from "@/sites/research/lib/date-time";
import {
  canAccessAllResearchProposals,
  proposalIsOpenForEditing,
} from "@/sites/research/lib/proposalAccess";
import { canEditJournalDetailsByEmail } from "@/sites/research/lib/journalPermissions";
import { researchTaskDueDate } from "@/sites/research/lib/task-date";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import { auth } from "../../../auth";
import {
  researchEmailButton,
  researchEmailInfoTable,
  researchEmailLink,
  researchEmailParagraph,
  researchLightEmail,
} from "@/sites/shared/lib/emailTemplates";
import {
  prisma,
  ClaimStatus,
  ConferenceType,
  ConferenceSubmissionStatus,
  CurrencyCode,
  JournalApprovalStatus,
  JournalType,
  RegistrationStatus,
  ResearchStage,
  OrganizedProjectStatus,
  OrganizedProjectFinancialClaimStatus,
  OrganizedProjectType,
  ProposalTaskScope,
  ProposalStatus,
  ProposalType,
  Prisma,
  PublisherAccountType,
  ResearchFolderAccessRequestStatus,
  ResearchAuthorNotificationType,
  ResearchProductionSubtype,
  ResearchTaskCategory,
  ResearchTaskStatus,
  ResearchTaskType,
  Role,
  SubmissionStatus,
  SuggestedVenueStatus,
} from "@repo/db";
import { deleteExpiredResearchNotifications } from "./notifications/retention";

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

function normalizeContactEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isValidContactEmail(value: string | null | undefined) {
  const text = value?.trim();
  return Boolean(text && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text));
}

function selectedContactEmailMap(formData: FormData) {
  const map = new Map<string, string>();
  for (const value of formData.getAll("selectedContactEmails")) {
    if (typeof value !== "string") continue;
    const [userId, email] = value.split("\t");
    if (userId && email) {
      map.set(userId, email.trim());
    }
  }
  return map;
}

async function validatedSelectedContactEmails(
  userIds: string[],
  selectedEmails: Map<string, string>,
  options: { allowPendingEmail?: boolean } = {},
) {
  if (userIds.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, additionalEmails: true },
  });
  const result = new Map<string, string>();
  for (const user of users) {
    const requestedRaw = selectedEmails.get(user.id)?.trim();
    const requested = normalizeContactEmail(requestedRaw);
    const choices = [user.email, ...user.additionalEmails];
    const matched =
      choices.find((email) => normalizeContactEmail(email) === requested) ??
      (options.allowPendingEmail && isValidContactEmail(requestedRaw)
        ? requestedRaw
        : null) ??
      user.email;
    result.set(user.id, matched);
  }
  return result;
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

function productionSubtypeFromForm(value: FormDataEntryValue | null) {
  return enumValue(ResearchProductionSubtype, value);
}

function proposalTaskScopeFromForm(value: FormDataEntryValue | null) {
  return enumValue(ProposalTaskScope, value) ?? ProposalTaskScope.RESEARCH;
}

const DEFAULT_TASK_DESCRIPTION =
  "Read the guide by click on icons right above.";
const SUGGEST_VENUE_TASK_DESCRIPTION =
  "Read the general guide by click on icons right above.\nSuggest 2 venues.";
const SUGGEST_VENUE_AFTER_PRODUCTION_DESCRIPTION =
  SUGGEST_VENUE_TASK_DESCRIPTION;

const productionSubtypeConfig = [
  {
    value: ResearchProductionSubtype.IDEA_FORMING,
    label: "Idea forming",
    guideCode: "G016",
  },
  {
    value: ResearchProductionSubtype.DATA_COLLECTION,
    label: "Data collection",
    guideCode: "G017",
  },
  {
    value: ResearchProductionSubtype.MODELING,
    label: "Modeling",
    guideCode: "G018",
  },
  {
    value: ResearchProductionSubtype.WRITING,
    label: "Writing",
    guideCode: "G019",
  },
  {
    value: ResearchProductionSubtype.HUMANIZING,
    label: "Humanizing",
    guideCode: "G020",
  },
  {
    value: ResearchProductionSubtype.REFERENCES,
    label: "References",
    guideCode: "G021",
  },
] as const;

function productionSubtypeMeta(subtype: ResearchProductionSubtype | null) {
  return productionSubtypeConfig.find((item) => item.value === subtype) ?? null;
}

function nextProductionSubtype(subtype: ResearchProductionSubtype | null) {
  const index = productionSubtypeConfig.findIndex(
    (item) => item.value === subtype,
  );
  if (index < 0) return null;
  return productionSubtypeConfig[index + 1]?.value ?? null;
}

function defaultTaskGuideCodeForTask({
  taskType,
  proposalScope,
  productionSubtype,
}: {
  taskType: ResearchTaskType;
  proposalScope: ProposalTaskScope;
  productionSubtype?: ResearchProductionSubtype | null;
}) {
  if (taskType === ResearchTaskType.SUGGEST_VENUE) return "G001";
  if (
    taskType === ResearchTaskType.SUBMIT_RESEARCH ||
    taskType === ResearchTaskType.SUBMIT_CONFERENCE
  ) {
    return "G002";
  }
  if (taskType === ResearchTaskType.PRODUCTION) {
    return (
      productionSubtypeMeta(productionSubtype ?? null)?.guideCode ?? "G014"
    );
  }
  if (taskType === ResearchTaskType.ADD_JOURNAL) return "G003";
  if (taskType === ResearchTaskType.PROPOSAL) {
    return proposalScope === ProposalTaskScope.PROJECT ? "G005" : "G004";
  }
  if (taskType === ResearchTaskType.REVIEW) return "G013";
  return null;
}

function defaultDescriptionForTask(taskType: ResearchTaskType) {
  return taskType === ResearchTaskType.SUGGEST_VENUE
    ? SUGGEST_VENUE_TASK_DESCRIPTION
    : DEFAULT_TASK_DESCRIPTION;
}

async function defaultTaskGuideIdsForTask({
  taskType,
  proposalScope,
  productionSubtype,
}: {
  taskType: ResearchTaskType;
  proposalScope: ProposalTaskScope;
  productionSubtype?: ResearchProductionSubtype | null;
}) {
  const guideCode = defaultTaskGuideCodeForTask({
    taskType,
    proposalScope,
    productionSubtype,
  });
  if (!guideCode) return [];
  const guide = await prisma.taskGuide.findUnique({
    where: { guideCode },
    select: { id: true },
  });
  return guide ? [guide.id] : [];
}

function dateFromForm(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  return text ? new Date(text) : null;
}

function positiveIntFromForm(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  if (!text) return null;
  const number = Number(text.replaceAll(".", ""));
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

async function taskAssignerFileFromForm(formData: FormData) {
  const file = formData.get("taskFile");
  if (!(file instanceof File) || file.size === 0) return null;

  const extension = file.name.toLowerCase().split(".").pop();
  const allowedByMime = taskReportFileTypes.has(file.type);
  const allowedByExtension =
    Boolean(extension) && taskReportFileTypesByExtension.has(extension ?? "");

  if (!allowedByMime && !allowedByExtension) {
    return { ok: false as const, reason: "TASK_FILE_REJECTED" };
  }
  if (file.size > taskReportMaxFileSize) {
    return { ok: false as const, reason: "TASK_FILE_TOO_LARGE" };
  }

  return {
    ok: true as const,
    data: {
      taskFileName: file.name,
      taskFileType:
        file.type || taskReportFileTypesByExtension.get(extension ?? "") || "",
      taskFileSize: file.size,
      taskFileData: Buffer.from(await file.arrayBuffer()),
    },
  };
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function dateIsBefore(left: Date, right: Date) {
  return researchDateValue(left) < researchDateValue(right);
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
    html: researchLightEmail({
      eyebrow: "Research Hub Task",
      title: heading,
      intro,
      children: `
        ${researchEmailInfoTable([{ label: "Task", value: taskTitle }])}
        ${detail ? researchEmailParagraph(detail, { preLine: true }) : ""}
        ${researchEmailButton(taskUrl, actionLabel ?? "Open task")}
      `,
      footer: "This task notification was sent by Tamph Research Hub.",
    }),
  });
}

async function sendTaskManagerEmails({
  assignerEmail,
  checkerEmail,
  taskTitle,
  taskId,
  detail,
  assigner,
  checker,
}: {
  assignerEmail: string | null | undefined;
  checkerEmail: string | null | undefined;
  taskTitle: string;
  taskId: string;
  detail?: string;
  assigner: {
    subject: string;
    heading: string;
    intro: string;
    actionLabel: string;
  };
  checker: {
    subject: string;
    heading: string;
    intro: string;
    actionLabel: string;
  };
}) {
  if (assignerEmail) {
    await sendTaskEmail({
      to: [assignerEmail],
      subject: assigner.subject,
      heading: assigner.heading,
      intro: assigner.intro,
      detail,
      taskTitle,
      taskId,
      actionLabel: assigner.actionLabel,
    });
  }

  if (
    checkerEmail &&
    normalizeEmailAddress(checkerEmail) !== normalizeEmailAddress(assignerEmail)
  ) {
    await sendTaskEmail({
      to: [checkerEmail],
      subject: checker.subject,
      heading: checker.heading,
      intro: checker.intro,
      detail,
      taskTitle,
      taskId,
      actionLabel: checker.actionLabel,
    });
  }
}

async function sendTaskCheckerAssignedEmail({
  checkerId,
  taskTitle,
  taskId,
  detail,
}: {
  checkerId: string | null | undefined;
  taskTitle: string;
  taskId: string;
  detail?: string;
}) {
  if (!checkerId) return;
  const checker = await prisma.user.findUnique({
    where: { id: checkerId },
    select: { email: true },
  });
  if (!checker) return;
  await sendTaskEmail({
    to: [checker.email],
    subject: `You are checker for task: ${taskTitle}`,
    heading: "Task checker assigned",
    intro:
      "You have been assigned as the checker for this task. Please monitor the task, answer or review clarification messages when needed, and review the assignee's work when it is ready for check.",
    detail,
    taskTitle,
    taskId,
    actionLabel: "Review task",
  });
}

function taskStatusEmailLabel(status: ResearchTaskStatus) {
  if (status === ResearchTaskStatus.IN_PROGRESS) return "In progress";
  if (status === ResearchTaskStatus.REVISION_REQUESTED)
    return "Revision requested";
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
    html: researchLightEmail({
      eyebrow: "Research Hub",
      title: heading,
      intro,
      children: `
        ${detail ? researchEmailParagraph(detail, { preLine: true }) : ""}
        ${researchEmailButton(href, actionLabel)}
      `,
      footer: "This proposal notification was sent by Tamph Research Hub.",
    }),
  });
}

async function researchContentIsLocked(projectId: string) {
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      contentUnlocked: true,
      submissions: { select: { status: true } },
      conferenceSubmissions: { select: { status: true } },
    },
  });

  if (!project) return false;
  return (
    !project.contentUnlocked &&
    (project.submissions.some(
      (submission) =>
        submission.status === SubmissionStatus.ACCEPTED ||
        submission.status === SubmissionStatus.PUBLISHED,
    ) ||
      project.conferenceSubmissions.some(
        (submission) =>
          submission.status === ConferenceSubmissionStatus.ACCEPTED ||
          submission.status === ConferenceSubmissionStatus.PUBLISHED,
      ))
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
    taskType === ResearchTaskType.PRODUCTION ||
    taskType === ResearchTaskType.SUGGEST_VENUE ||
    taskType === ResearchTaskType.PROPOSAL ||
    taskType === ResearchTaskType.OTHER
  );
}

async function canCreateResearchTaskForProject({
  user,
  projectId,
  organizedProjectId,
  taskType,
}: {
  user: { id: string; roles: Role[] };
  projectId: string | null;
  organizedProjectId: string | null;
  taskType: ResearchTaskType;
}) {
  if (user.roles.includes(Role.ADMIN)) return true;
  if (user.roles.includes(Role.CHIEF_ASSISTANT)) {
    if (
      taskType === ResearchTaskType.REVIEW ||
      taskType === ResearchTaskType.ADD_JOURNAL ||
      taskType === ResearchTaskType.PROPOSAL
    ) {
      return true;
    }
    if (
      taskType === ResearchTaskType.PROJECT_PRODUCTION &&
      !organizedProjectId &&
      !projectId
    ) {
      return true;
    }
    if (organizedProjectId && !projectId) {
      return (
        (await prisma.organizedProject.count({
          where: {
            id: organizedProjectId,
            OR: [
              { createdById: user.id },
              { members: { some: { userId: user.id } } },
            ],
          },
        })) > 0
      );
    }

    return false;
  }
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
      taskType === ResearchTaskType.PRODUCTION ||
      taskType === ResearchTaskType.SUGGEST_VENUE ||
      taskType === ResearchTaskType.PROPOSAL) &&
    projectId
  ) {
    const project = await prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { stage: true },
    });
    if (!project) return "MISSING_ASSOCIATION";
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
      taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED ||
      taskType === ResearchTaskType.PROPOSAL) &&
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

function normalizedPublisherName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function publisherCodeBase(name: string, alias: string | null) {
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
  return (code && code.length >= 2 ? code : "PUB").slice(0, 8);
}

async function generatePublisherCode(name: string, alias: string | null) {
  const base = publisherCodeBase(name, alias);
  for (let index = 0; index < 100; index += 1) {
    const code = index === 0 ? base : `${base}${index + 1}`;
    const existing = await prisma.publisher.findUnique({
      where: { publisherCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return `${base}${crypto.randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase()}`;
}

async function publisherSelection(formData: FormData) {
  const publisherId = optionalString(formData.get("publisherId"));
  if (!publisherId) return null;
  return prisma.publisher.findUnique({
    where: { id: publisherId },
    select: {
      id: true,
      name: true,
      usesSingleAccount: true,
      approvalStatus: true,
    },
  });
}

async function isCheckerForJournalResult(userId: string, journalId: string) {
  const journal = await prisma.journal.findFirst({
    where: {
      id: journalId,
      resultTask: {
        OR: [
          { checkerId: userId },
          {
            journalCreationSuggestion: {
              task: { checkerId: userId },
            },
          },
        ],
      },
    },
    select: { id: true },
  });
  return Boolean(journal);
}

async function isCheckerForPublisherJournalResult(
  userId: string,
  publisherId: string,
) {
  const publisher = await prisma.publisher.findFirst({
    where: {
      id: publisherId,
      journals: {
        some: {
          resultTask: {
            OR: [
              { checkerId: userId },
              {
                journalCreationSuggestion: {
                  task: { checkerId: userId },
                },
              },
            ],
          },
        },
      },
    },
    select: { id: true },
  });
  return Boolean(publisher);
}

async function ensurePublisherByName(name: string | null) {
  if (!name) return null;
  const cleanedName = name.trim().replace(/\s+/g, " ");
  const normalizedName = normalizedPublisherName(cleanedName);
  const existing = await prisma.publisher.findUnique({
    where: { normalizedName },
    select: { id: true, name: true },
  });
  if (existing) return existing;
  return prisma.publisher.create({
    data: {
      publisherCode: await generatePublisherCode(cleanedName, null),
      name: cleanedName,
      normalizedName,
    },
    select: { id: true, name: true },
  });
}

const productionStepLabels = [
  "Idea forming",
  "Data collection",
  "Modeling",
  "Writing",
  "Humanizing",
  "References",
];

type ResearchNotificationSnapshot = {
  title: string;
  abstract: string | null;
  sharedFolderUrl: string | null;
  universityRegistration: string | null;
  registerStatus: RegistrationStatus;
  claimStatus: ClaimStatus;
  completedProductionSteps: string[];
  registrationName: string | null;
  registrationUser: { name: string | null; email: string } | null;
  fundingInstitution: { name: string } | null;
  authors: { id: string; name: string | null; email: string }[];
  authorEntries: {
    userId: string;
    selectedEmail: string | null;
    isCorresponding: boolean;
    user: { name: string | null; email: string };
  }[];
};

function readableResearchValue(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactResearchNotificationValue(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim() || "Not set";
  return normalized.length > 100 ? `${normalized.slice(0, 97)}...` : normalized;
}

function researchPersonLabel(person: { name: string | null; email: string }) {
  return person.name?.trim() || person.email;
}

function researchAuthorsNotificationValue(
  snapshot: ResearchNotificationSnapshot,
) {
  if (snapshot.authorEntries.length > 0) {
    return snapshot.authorEntries
      .map((entry) => {
        return `${researchPersonLabel(entry.user)}${entry.isCorresponding ? " (corresponding)" : ""}`;
      })
      .join(", ");
  }

  return snapshot.authors
    .map((author) => researchPersonLabel(author))
    .join(", ");
}

function researchRegistrationUserNotificationValue(
  snapshot: ResearchNotificationSnapshot,
) {
  if (snapshot.registrationUser) {
    return researchPersonLabel(snapshot.registrationUser);
  }
  return snapshot.registrationName ?? "";
}

function researchProjectNotificationChanges(
  before: ResearchNotificationSnapshot,
  after: ResearchNotificationSnapshot,
) {
  const changes: { label: string; detail: string }[] = [];
  function addChange(label: string, previous: string, next: string) {
    const normalizedPrevious = previous.trim();
    const normalizedNext = next.trim();
    if (normalizedPrevious === normalizedNext) return;
    if (label === "Title") {
      changes.push({
        label,
        detail: `Previous title: "${compactResearchNotificationValue(previous)}".`,
      });
      return;
    }
    if (
      label === "Abstract" ||
      label === "Shared folder" ||
      label === "Author contact email"
    ) {
      const action = !normalizedPrevious
        ? "Added"
        : !normalizedNext
          ? "Removed"
          : "Updated";
      changes.push({ label, detail: `${label}: ${action}.` });
      return;
    }
    changes.push({
      label,
      detail: `${label} - Before: "${compactResearchNotificationValue(previous)}"; After: "${compactResearchNotificationValue(next)}"`,
    });
  }

  addChange("Title", before.title, after.title);
  addChange("Abstract", before.abstract ?? "", after.abstract ?? "");
  addChange(
    "Shared folder",
    before.sharedFolderUrl ?? "",
    after.sharedFolderUrl ?? "",
  );
  addChange(
    "University registration",
    before.universityRegistration ?? "",
    after.universityRegistration ?? "",
  );
  addChange(
    "Registration user",
    researchRegistrationUserNotificationValue(before),
    researchRegistrationUserNotificationValue(after),
  );
  addChange(
    "Funding institution",
    before.fundingInstitution?.name ?? "",
    after.fundingInstitution?.name ?? "",
  );
  addChange(
    "Registration status",
    readableResearchValue(before.registerStatus),
    readableResearchValue(after.registerStatus),
  );
  addChange(
    "Claim status",
    readableResearchValue(before.claimStatus),
    readableResearchValue(after.claimStatus),
  );
  addChange(
    "Authors",
    researchAuthorsNotificationValue(before),
    researchAuthorsNotificationValue(after),
  );
  if (
    researchAuthorsNotificationValue(before) ===
    researchAuthorsNotificationValue(after)
  ) {
    addChange(
      "Author contact email",
      before.authorEntries
        .map(
          (entry) =>
            `${entry.userId}:${entry.selectedEmail ?? entry.user.email}`,
        )
        .join("|"),
      after.authorEntries
        .map(
          (entry) =>
            `${entry.userId}:${entry.selectedEmail ?? entry.user.email}`,
        )
        .join("|"),
    );
  }

  const previousSteps = new Set(before.completedProductionSteps);
  const nextSteps = new Set(after.completedProductionSteps);
  const addedSteps = after.completedProductionSteps.filter(
    (step) => !previousSteps.has(step),
  );
  const removedSteps = before.completedProductionSteps.filter(
    (step) => !nextSteps.has(step),
  );
  if (addedSteps.length > 0 || removedSteps.length > 0) {
    const stepChanges = [
      addedSteps.length > 0 ? `Added: ${addedSteps.join(", ")}.` : "",
      removedSteps.length > 0 ? `Removed: ${removedSteps.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ");
    changes.push({
      label: "Production checklist",
      detail: `Production checklist - ${stepChanges}`,
    });
  }

  return changes;
}

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

async function generateResearchCode(
  year = researchYear(),
  client: Pick<Prisma.TransactionClient, "researchProject"> = prisma,
) {
  const yearPrefix = `${year}-`;
  const yearCodePattern = new RegExp(`^${year}-(\\d+)$`);
  const existing = await client.researchProject.findMany({
    where: {
      researchCode: {
        startsWith: yearPrefix,
      },
    },
    select: { researchCode: true },
  });

  const maxNumber = existing.reduce((max, project) => {
    const match = yearCodePattern.exec(project.researchCode ?? "");
    if (!match) return max;
    const number = Number(match[1]);
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);

  return `${yearPrefix}${String(maxNumber + 1).padStart(2, "0")}`;
}

type AcceptedProposalRecord = Prisma.ProposalGetPayload<{
  include: {
    submittedBy: { select: { id: true; name: true; email: true } };
  };
}>;

function proposalCombinedNote(
  proposal: Pick<AcceptedProposalRecord, "description" | "notes">,
) {
  return [proposal.description, proposal.notes].filter(Boolean).join("\n\n");
}

async function createPendingRecordFromProposal(
  proposal: AcceptedProposalRecord,
) {
  if (proposal.type === ProposalType.RESEARCH) {
    if (proposal.createdResearchProjectId) {
      return `/projects/${proposal.createdResearchProjectId}`;
    }

    const created = await prisma.researchProject.create({
      data: {
        title: proposal.title,
        researchCode: await generateResearchCode(),
        abstract: proposalCombinedNote(proposal),
        sharedFolderUrl: proposal.website,
        stage: ResearchStage.PENDING,
        leadResearcherId: proposal.submittedById,
        authors: { connect: [{ id: proposal.submittedById }] },
        authorEntries: {
          create: [
            {
              userId: proposal.submittedById,
              position: 0,
              selectedEmail: proposal.submittedBy.email,
              isCorresponding: true,
            },
          ],
        },
      },
      select: { id: true },
    });

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { createdResearchProjectId: created.id },
    });

    return `/projects/${created.id}`;
  }

  if (proposal.type === ProposalType.PROJECT) {
    if (proposal.createdOrganizedProjectId) {
      return `/organized-projects/${proposal.createdOrganizedProjectId}`;
    }

    const created = await prisma.organizedProject.create({
      data: {
        title: proposal.title,
        organizer: proposal.organization,
        referenceCode: proposal.identifier,
        description: proposal.description,
        sharedFolderUrl: proposal.website,
        note: proposal.notes,
        status: OrganizedProjectStatus.PENDING,
        createdById: proposal.submittedById,
        members: {
          create: [
            {
              userId: proposal.submittedById,
              position: 0,
              selectedEmail: proposal.submittedBy.email,
              isTeamLead: true,
            },
          ],
        },
      },
      select: { id: true },
    });

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { createdOrganizedProjectId: created.id },
    });

    return `/organized-projects/${created.id}`;
  }

  return `/proposals/${proposal.id}`;
}

export async function ensureAcceptedProposalRecords(type?: ProposalType) {
  const proposalTypes = type
    ? [type]
    : [ProposalType.RESEARCH, ProposalType.PROJECT];
  const proposals = await prisma.proposal.findMany({
    where: {
      status: ProposalStatus.ACCEPTED,
      type: { in: proposalTypes },
      OR: [
        {
          type: ProposalType.RESEARCH,
          createdResearchProjectId: null,
        },
        {
          type: ProposalType.PROJECT,
          createdOrganizedProjectId: null,
        },
      ],
    },
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  for (const proposal of proposals) {
    await createPendingRecordFromProposal(proposal);
  }
}

async function requireCurrentUser() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true, canManageResearchVenues: true, email: true },
  });

  return {
    id: userId,
    email: user?.email ?? session?.user?.email ?? null,
    canManageResearchVenues: user?.canManageResearchVenues ?? false,
    roles:
      user?.roles ??
      (((session?.user as { roles?: Role[] } | undefined)?.roles ??
        []) as Role[]),
  };
}

function canManageResearch(roles: Role[]) {
  return (
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    roles.includes(Role.ASSISTANT)
  );
}

function isResearchAdminRole(roles: Role[]) {
  return roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT);
}

function requireAdmin(roles: Role[]) {
  if (!roles.includes(Role.ADMIN)) {
    redirect("/401");
  }
}

function requireResearchAdmin(roles: Role[]) {
  if (!isResearchAdminRole(roles)) {
    redirect("/401");
  }
}

function requireVenueCreator(user: {
  roles: Role[];
  canManageResearchVenues: boolean;
}) {
  if (!user.roles.includes(Role.ADMIN) && !user.canManageResearchVenues) {
    redirect("/401");
  }
}

function scopedTaskWhere(taskId: string, userId: string) {
  return {
    id: taskId,
    OR: [
      { createdById: userId },
      { checkerId: userId },
      { assignments: { some: { userId } } },
      {
        project: {
          OR: [
            { leadResearcherId: userId },
            { authors: { some: { id: userId } } },
            { authorEntries: { some: { userId } } },
            { registrationUserId: userId },
            {
              organizedProjectLinks: {
                some: {
                  organizedProject: {
                    OR: [
                      { createdById: userId },
                      { members: { some: { userId } } },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
      {
        organizedProject: {
          OR: [{ createdById: userId }, { members: { some: { userId } } }],
        },
      },
    ],
  };
}

async function canManageTaskAsResearchAdmin(
  taskId: string,
  user: { id: string; roles: Role[] },
) {
  if (user.roles.includes(Role.ADMIN)) return true;
  if (!user.roles.includes(Role.CHIEF_ASSISTANT)) return false;
  return (
    (await prisma.researchTask.count({
      where: scopedTaskWhere(taskId, user.id),
    })) > 0
  );
}

async function taskAssigneesAreSelectableByUser({
  assigneeIds,
  user,
  allowChiefAssistantSelf = false,
}: {
  assigneeIds: string[];
  user: { id: string; roles: Role[] };
  allowChiefAssistantSelf?: boolean;
}) {
  const uniqueAssigneeIds = Array.from(new Set(assigneeIds));
  if (uniqueAssigneeIds.length === 0) return false;

  const chiefAssistantOnly =
    user.roles.includes(Role.CHIEF_ASSISTANT) &&
    !user.roles.includes(Role.ADMIN);
  const selectableAssigneeCount = await prisma.user.count({
    where: chiefAssistantOnly
      ? allowChiefAssistantSelf
        ? {
            id: { in: uniqueAssigneeIds },
            activeSites: { has: "research" },
            OR: [{ roles: { has: Role.ASSISTANT } }, { id: user.id }],
          }
        : {
            id: { in: uniqueAssigneeIds },
            activeSites: { has: "research" },
            roles: { has: Role.ASSISTANT },
            NOT: { id: user.id },
          }
      : {
          id: { in: uniqueAssigneeIds },
          activeSites: { has: "research" },
        },
  });

  return selectableAssigneeCount === uniqueAssigneeIds.length;
}

async function taskCheckerIsSelectableByAdmin({
  checkerId,
  user,
}: {
  checkerId: string | null;
  user: { roles: Role[] };
}) {
  if (!checkerId) return true;
  if (!user.roles.includes(Role.ADMIN)) return false;

  const checkerCount = await prisma.user.count({
    where: {
      id: checkerId,
      activeSites: { has: "research" },
      roles: { has: Role.CHIEF_ASSISTANT },
    },
  });

  return checkerCount === 1;
}

async function suggestedVenueSubmitTaskIsSelectable({
  taskType,
  projectId,
  journalId,
  conferenceId,
  suggestedJournalId,
  suggestedConferenceId,
}: {
  taskType: ResearchTaskType;
  projectId: string | null;
  journalId: string | null;
  conferenceId: string | null;
  suggestedJournalId: string | null;
  suggestedConferenceId: string | null;
}) {
  if (
    taskType === ResearchTaskType.SUBMIT_RESEARCH &&
    projectId &&
    journalId &&
    suggestedJournalId
  ) {
    return (
      (await prisma.suggestedJournal.count({
        where: {
          id: suggestedJournalId,
          projectId,
          journalId,
          status: SuggestedVenueStatus.APPROVED,
        },
      })) === 1
    );
  }

  if (
    taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
    projectId &&
    conferenceId &&
    suggestedConferenceId
  ) {
    return (
      (await prisma.suggestedConference.count({
        where: {
          id: suggestedConferenceId,
          projectId,
          conferenceId,
          status: SuggestedVenueStatus.APPROVED,
        },
      })) === 1
    );
  }

  return false;
}

async function notifyTaskAdminsAndChecker({
  taskId,
  userIds,
  type,
  title,
  summary,
  body,
  excludeUserId,
}: {
  taskId: string;
  userIds: Array<string | null | undefined>;
  type: string;
  title: string;
  summary: string;
  body?: string;
  excludeUserId?: string;
}) {
  await notifyUsers({
    userIds: userIds.filter((id): id is string => Boolean(id)),
    type,
    title,
    summary,
    body,
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId,
  });
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

  await deleteExpiredResearchNotifications();

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
  const taskId = optionalString(formData.get("taskId"));
  const file = formData.get("supportFile");

  if (!type || !title || (type !== ProposalType.JOURNAL && !description)) {
    return {
      ok: false,
      reason: "MISSING_FIELDS",
      title: "Proposal needs more detail",
      detail:
        type === ProposalType.JOURNAL
          ? "Please add the journal title before sending."
          : "Please add a title and proposal description before sending.",
    };
  }

  let linkedTask: {
    id: string;
    title: string;
    createdById: string;
    checkerId: string | null;
    createdByEmail: string;
    checkerEmail: string | null;
    projectId: string | null;
    organizedProjectId: string | null;
  } | null = null;
  if (taskId) {
    const task = await prisma.researchTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        taskType: true,
        status: true,
        createdById: true,
        checkerId: true,
        projectId: true,
        organizedProjectId: true,
        proposalScope: true,
        proposalResults: { select: { id: true, status: true } },
        createdBy: { select: { email: true } },
        checker: { select: { email: true } },
        assignments: { select: { userId: true } },
      },
    });
    if (!task || task.taskType !== ResearchTaskType.PROPOSAL) {
      return {
        ok: false,
        reason: "TASK_NOT_FOUND",
        title: "Proposal task not available",
        detail: "This task cannot receive a proposal.",
      };
    }
    if (
      task.status === ResearchTaskStatus.COMPLETED ||
      task.status === ResearchTaskStatus.REVOKED
    ) {
      return {
        ok: false,
        reason: "TASK_CLOSED",
        title: "Proposal task is closed",
        detail: "This task is already completed or revoked.",
      };
    }
    if (!task.assignments.some((assignment) => assignment.userId === user.id)) {
      return {
        ok: false,
        reason: "TASK_FORBIDDEN",
        title: "Proposal task not available",
        detail:
          "Only the task assignee can create the proposal from this task.",
      };
    }
    const hasActiveProposal = task.proposalResults.some(
      (proposal) => proposal.status !== ProposalStatus.DECLINED,
    );
    if (hasActiveProposal) {
      return {
        ok: false,
        reason: "TASK_ALREADY_FILLED",
        title: "Proposal already linked",
        detail:
          "This proposal task already has a proposal that is waiting for review or approved.",
      };
    }
    const expectedType =
      task.proposalScope === ProposalTaskScope.PROJECT
        ? ProposalType.PROJECT
        : ProposalType.RESEARCH;
    if (type !== expectedType) {
      return {
        ok: false,
        reason: "TASK_TYPE_MISMATCH",
        title: "Proposal type does not match task",
        detail: "Create the proposal type requested by this task.",
      };
    }
    linkedTask = {
      id: task.id,
      title: task.title,
      createdById: task.createdById,
      checkerId: task.checkerId,
      createdByEmail: task.createdBy.email,
      checkerEmail: task.checker?.email ?? null,
      projectId: task.projectId,
      organizedProjectId: task.organizedProjectId,
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
      description: description ?? "",
      contactInfo,
      notes,
      identifier,
      organization,
      location,
      website,
      venueType,
      submittedById: user.id,
      taskId: linkedTask?.id,
      ...supportFile,
    },
  });

  if (linkedTask) {
    const finishedAt = new Date();
    await prisma.researchTask.update({
      where: { id: linkedTask.id },
      data: {
        status: ResearchTaskStatus.CHECKING,
        completedAt: null,
        revokedAt: null,
        adminViewedAt: null,
        assignments: {
          updateMany: {
            where: { userId: user.id },
            data: { finishedAt },
          },
        },
      },
    });

    await notifyUsers({
      userIds: [linkedTask.createdById, linkedTask.checkerId].filter(
        (id): id is string => Boolean(id),
      ),
      type: "TASK_READY_FOR_CHECK",
      title: "Task ready for check",
      summary: linkedTask.title,
      body: `${type === ProposalType.PROJECT ? "Project" : "Research"} proposal "${title}" was created from this task and linked automatically. The task is now ready for review.`,
      href: `/tasks/${linkedTask.id}`,
      entityType: "task",
      entityId: linkedTask.id,
      excludeUserId: user.id,
    });

    await sendTaskManagerEmails({
      assignerEmail: linkedTask.createdByEmail,
      checkerEmail: linkedTask.checkerEmail,
      taskTitle: linkedTask.title,
      taskId: linkedTask.id,
      detail: `Linked proposal: ${title}`,
      assigner: {
        subject: `Task ready for your review: ${linkedTask.title}`,
        heading: "Task ready for assigner review",
        intro:
          "A proposal was created from the task and linked automatically. As the assigner, please review the proposal result and either approve completion or send it back for revision.",
        actionLabel: "Review task",
      },
      checker: {
        subject: `Task ready for checker review: ${linkedTask.title}`,
        heading: "Task ready for checker review",
        intro:
          "A proposal was created from the task and linked automatically. As the checker, please review the proposal result and confirm whether the task can be approved.",
        actionLabel: "Check task",
      },
    });
  }

  const admins = await prisma.user.findMany({
    where: { roles: { has: Role.ADMIN }, activeSites: { has: "research" } },
    select: { id: true },
  });

  await notifyUsers({
    userIds: admins.map((admin) => admin.id),
    type: "PROPOSAL_SUBMITTED",
    title: "New proposal submitted",
    summary: title,
    body: [
      `Submitted by: ${user.name || user.email}.`,
      description ? `Note: ${description}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
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
  if (linkedTask) {
    revalidatePath("/tasks");
    revalidatePath(`/tasks/${linkedTask.id}`);
  }
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

export async function updateProposal(formData: FormData) {
  const user = await requireCurrentUser();
  const proposalId = optionalString(formData.get("proposalId"));
  if (!proposalId) {
    return {
      ok: false,
      title: "Proposal not found",
      detail: "Refresh the page and try again.",
    };
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      type: true,
      status: true,
      submittedById: true,
      task: {
        select: {
          createdById: true,
          checkerId: true,
          assignments: { select: { userId: true } },
        },
      },
    },
  });
  if (!proposal) {
    return {
      ok: false,
      title: "Proposal not found",
      detail: "This proposal is no longer available.",
    };
  }

  const canAccess =
    canAccessAllResearchProposals(user.roles) ||
    proposal.submittedById === user.id ||
    proposal.task?.createdById === user.id ||
    proposal.task?.checkerId === user.id ||
    Boolean(
      proposal.task?.assignments.some(
        (assignment) => assignment.userId === user.id,
      ),
    );
  if (!canAccess) {
    return {
      ok: false,
      title: "Proposal not available",
      detail: "You can only edit proposals related to your account.",
    };
  }
  if (!proposalIsOpenForEditing(proposal.status)) {
    return {
      ok: false,
      title: "Proposal cannot be edited",
      detail: "Accepted or declined proposals can no longer be changed.",
    };
  }

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

  if (!title || (proposal.type !== ProposalType.JOURNAL && !description)) {
    return {
      ok: false,
      title: "Proposal needs more detail",
      detail:
        proposal.type === ProposalType.JOURNAL
          ? "Please add the journal title before saving."
          : "Please add a title and proposal description before saving.",
    };
  }

  if (
    (proposal.type === ProposalType.CONFERENCE ||
      proposal.type === ProposalType.JOURNAL) &&
    !identifier
  ) {
    return {
      ok: false,
      title:
        proposal.type === ProposalType.CONFERENCE
          ? "ISBN required"
          : "ISSN required",
      detail:
        proposal.type === ProposalType.CONFERENCE
          ? "Please add the conference ISBN before saving."
          : "Please add the journal ISSN before saving.",
    };
  }

  const duplicateMessage = await venueProposalDuplicateMessage({
    type: proposal.type,
    title,
    identifier,
  });
  if (duplicateMessage) {
    return {
      ok: false,
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
        title: "Support file rejected",
        detail: "Upload only .doc, .docx, or .pdf files.",
      };
    }
    if (file.size > proposalMaxFileSize) {
      return {
        ok: false,
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

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: {
      title,
      description: description ?? "",
      contactInfo,
      notes,
      identifier,
      organization,
      location,
      website,
      venueType,
      ...supportFile,
    },
  });

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposal.id}`);
  if (proposal.task) revalidatePath("/tasks");
  return { ok: true };
}

export async function updateProposalTaskAssociation(
  taskId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const associationType = optionalString(formData.get("associationType"));
  const associationId = optionalString(formData.get("associationId"));
  if (
    !associationId ||
    (associationType !== "research" && associationType !== "project")
  ) {
    return { ok: false, reason: "MISSING_ASSOCIATION" };
  }

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: { id: true, taskType: true, proposalScope: true },
  });
  if (!task || task.taskType !== ResearchTaskType.PROPOSAL) {
    return { ok: false, reason: "TASK_NOT_FOUND" };
  }
  const expectedAssociationType =
    task.proposalScope === ProposalTaskScope.PROJECT ? "project" : "research";
  if (associationType !== expectedAssociationType) {
    return { ok: false, reason: "TASK_TYPE_MISMATCH" };
  }

  if (associationType === "research") {
    const research = await prisma.researchProject.findUnique({
      where: { id: associationId },
      select: { id: true },
    });
    if (!research) return { ok: false, reason: "ASSOCIATION_NOT_FOUND" };
    await prisma.researchTask.update({
      where: { id: taskId },
      data: {
        projectId: associationId,
        organizedProjectId: null,
      },
    });
  } else {
    const project = await prisma.organizedProject.findUnique({
      where: { id: associationId },
      select: { id: true },
    });
    if (!project) return { ok: false, reason: "ASSOCIATION_NOT_FOUND" };
    await prisma.researchTask.update({
      where: { id: taskId },
      data: {
        organizedProjectId: associationId,
        projectId: null,
      },
    });
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  return { ok: true };
}

export async function linkProposalToTask(taskId: string, formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const proposalId = optionalString(formData.get("proposalId"));
  if (!proposalId) return { ok: false, reason: "MISSING_PROPOSAL" };

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      taskType: true,
      status: true,
      proposalScope: true,
      proposalResults: { select: { id: true, status: true } },
    },
  });
  if (!task || task.taskType !== ResearchTaskType.PROPOSAL) {
    return { ok: false, reason: "TASK_NOT_FOUND" };
  }
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return { ok: false, reason: "TASK_CLOSED" };
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { id: true, type: true, taskId: true },
  });
  if (!proposal) return { ok: false, reason: "PROPOSAL_NOT_FOUND" };
  if (proposal.taskId && proposal.taskId !== task.id) {
    return { ok: false, reason: "PROPOSAL_ALREADY_LINKED" };
  }

  const expectedType =
    task.proposalScope === ProposalTaskScope.PROJECT
      ? ProposalType.PROJECT
      : ProposalType.RESEARCH;
  if (proposal.type !== expectedType) {
    return { ok: false, reason: "TASK_TYPE_MISMATCH" };
  }

  const hasActiveProposal = task.proposalResults.some(
    (item) =>
      item.id !== proposal.id && item.status !== ProposalStatus.DECLINED,
  );
  if (hasActiveProposal) {
    return { ok: false, reason: "TASK_ALREADY_FILLED" };
  }

  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { taskId: task.id },
  });

  revalidatePath(`/tasks/${task.id}`);
  revalidatePath(`/proposals/${proposal.id}`);
  revalidatePath("/proposals");
  revalidatePath("/tasks");
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
    include: {
      submittedBy: { select: { id: true, name: true, email: true } },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          createdById: true,
          checkerId: true,
          createdBy: { select: { email: true } },
          checker: { select: { email: true } },
          assignments: {
            select: {
              userId: true,
              user: { select: { email: true } },
            },
          },
        },
      },
    },
  });
  if (!proposal) throw new Error("Proposal not found.");
  if (
    proposal.status === ProposalStatus.ACCEPTED ||
    proposal.status === ProposalStatus.DECLINED
  ) {
    throw new Error("This proposal has already been reviewed.");
  }

  const accepted = status === ProposalStatus.ACCEPTED;
  const statusLabel = accepted ? "approved" : "declined";
  const proposalType = proposal.type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const adminNote = comment ?? "No additional admin note was added.";
  const proposalTaskNote =
    status === ProposalStatus.ACCEPTED
      ? comment
        ? `The linked ${proposalType.toLowerCase()} was approved. This task was completed automatically. Admin note: ${comment}`
        : `The linked ${proposalType.toLowerCase()} was approved. This task was completed automatically.`
      : comment
        ? `The linked ${proposalType.toLowerCase()} was declined. This task was sent back for revision automatically. Admin note: ${comment}`
        : `The linked ${proposalType.toLowerCase()} was declined. This task was sent back for revision automatically. Please revise and submit a new proposal from this task.`;

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
      const publisher = await ensurePublisherByName(proposal.organization);
      const journal = await prisma.journal.create({
        data: {
          name: proposal.title,
          issn: proposal.identifier,
          publisherId: publisher?.id,
          publisher: publisher?.name ?? proposal.organization,
          homepageLink: proposal.website,
          note: [proposal.description, proposal.notes]
            .filter(Boolean)
            .join("\n\n"),
          createdById: user.id,
        },
        select: { id: true },
      });
      createdHref = `/journals/${journal.id}`;
    } else if (
      proposal.type === ProposalType.RESEARCH ||
      proposal.type === ProposalType.PROJECT
    ) {
      createdHref = await createPendingRecordFromProposal(proposal);
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
  const linkedTask = proposal.task;
  const proposalTaskCompleted =
    status === ProposalStatus.ACCEPTED &&
    linkedTask &&
    linkedTask.status !== ResearchTaskStatus.COMPLETED &&
    linkedTask.status !== ResearchTaskStatus.REVOKED;
  if (proposalTaskCompleted) {
    const completedAt = new Date();
    await prisma.researchTask.update({
      where: { id: linkedTask.id },
      data: {
        status: ResearchTaskStatus.COMPLETED,
        completedAt,
        completedById: user.id,
        completionMessage: proposalTaskNote,
        redoRequestedAt: null,
        redoRequestedById: null,
        redoReason: null,
        revokedAt: null,
        revokedById: null,
        revokeReason: null,
        adminViewedAt: null,
        assignments: {
          updateMany: {
            where: { finishedAt: null },
            data: { finishedAt: completedAt },
          },
        },
      },
    });
  }
  const proposalTaskRedo =
    status === ProposalStatus.DECLINED &&
    linkedTask &&
    linkedTask.status !== ResearchTaskStatus.REVOKED;
  if (proposalTaskRedo) {
    const redoRequestedAt = new Date();
    await prisma.researchTask.update({
      where: { id: linkedTask.id },
      data: {
        status: ResearchTaskStatus.REVISION_REQUESTED,
        completedAt: null,
        completedById: null,
        completionMessage: null,
        redoRequestedAt,
        redoRequestedById: user.id,
        redoReason: proposalTaskNote,
        revokedAt: null,
        revokedById: null,
        revokeReason: null,
        adminViewedAt: null,
        assignments: {
          updateMany: {
            where: {},
            data: { finishedAt: null },
          },
        },
      },
    });
    await prisma.researchTaskClarification.create({
      data: {
        taskId: linkedTask.id,
        requestedById: user.id,
        answeredById: user.id,
        question: "Revision requested",
        answer: proposalTaskNote,
        answeredAt: redoRequestedAt,
      },
    });
  }

  const mergedAutomaticTaskWorkflow =
    (proposalTaskCompleted || proposalTaskRedo) &&
    (proposal.type === ProposalType.RESEARCH ||
      proposal.type === ProposalType.PROJECT) &&
    linkedTask;
  const emailDecisionSummary = `Your ${proposalType.toLowerCase()} "${proposal.title}" was ${statusLabel}.`;
  if (mergedAutomaticTaskWorkflow) {
    const taskHref = `/tasks/${linkedTask.id}`;
    const href = accepted ? createdHref : taskHref;
    const workflowSummary = accepted
      ? "The linked proposal task was completed automatically."
      : "The linked proposal task was sent back for revision automatically.";
    const notificationTitle = accepted
      ? "Proposal approved and task completed"
      : "Proposal declined and task needs revision";
    const notificationBody = [
      `Decision: ${statusLabel}.`,
      `Type: ${proposalType}.`,
      `Task: ${linkedTask.title}.`,
      workflowSummary,
      `Admin note: ${adminNote}`,
    ].join("\n");
    const mergedUserIds = [
      proposal.submittedById,
      linkedTask.createdById,
      linkedTask.checkerId,
      ...linkedTask.assignments.map((assignment) => assignment.userId),
    ].filter((id): id is string => Boolean(id));
    await notifyUsers({
      userIds: mergedUserIds,
      type: accepted
        ? "PROPOSAL_ACCEPTED_TASK_COMPLETED"
        : "PROPOSAL_DECLINED_TASK_REDO",
      title: notificationTitle,
      summary: proposal.title,
      body: notificationBody,
      href,
      entityType: "proposal",
      entityId: reviewed.id,
    });

    const emailed = new Set<string>();
    const unhandledEmails = (emails: Array<string | null | undefined>) =>
      emails.filter((email): email is string => {
        const normalized = normalizeEmailAddress(email);
        if (!normalized || emailed.has(normalized)) return false;
        emailed.add(normalized);
        return true;
      });

    await sendProposalEmail({
      to: unhandledEmails(
        linkedTask.assignments.map((assignment) => assignment.user.email),
      ),
      subject: notificationTitle,
      heading: accepted
        ? "Proposal task approved as complete"
        : "Proposal task needs revision",
      intro: accepted
        ? `The linked ${proposalType.toLowerCase()} was approved. Your proposal task was completed automatically.`
        : `The linked ${proposalType.toLowerCase()} was declined. Your proposal task was sent back for revision automatically.`,
      detail: `Task: ${linkedTask.title}\nProposal: ${proposal.title}\n\nAdmin note: ${adminNote}`,
      actionHref: `${researchBaseUrl()}${href}`,
      actionLabel: accepted ? "View result" : "Open task",
    });
    await sendProposalEmail({
      to: unhandledEmails([linkedTask.createdBy.email]),
      subject: notificationTitle,
      heading: accepted
        ? "Proposal task completed"
        : "Proposal task sent back for revision",
      intro: accepted
        ? `As the assigner, please note that the linked ${proposalType.toLowerCase()} was approved and the task was completed automatically.`
        : `As the assigner, please note that the linked ${proposalType.toLowerCase()} was declined and the task was sent back for revision automatically.`,
      detail: `Task: ${linkedTask.title}\nProposal: ${proposal.title}\n\nAdmin note: ${adminNote}`,
      actionHref: `${researchBaseUrl()}${href}`,
      actionLabel: accepted ? "View result" : "Open task",
    });
    await sendProposalEmail({
      to: unhandledEmails([linkedTask.checker?.email]),
      subject: notificationTitle,
      heading: accepted
        ? "Proposal task completed"
        : "Proposal task needs checker attention",
      intro: accepted
        ? `As the checker, please note that the linked ${proposalType.toLowerCase()} was approved and the task was completed automatically.`
        : `As the checker, please note that the linked ${proposalType.toLowerCase()} was declined and the task was sent back for revision automatically.`,
      detail: `Task: ${linkedTask.title}\nProposal: ${proposal.title}\n\nAdmin note: ${adminNote}`,
      actionHref: `${researchBaseUrl()}${href}`,
      actionLabel: accepted ? "View result" : "Open task",
    });
    await sendProposalEmail({
      to: unhandledEmails([proposal.submittedBy.email]),
      subject: notificationTitle,
      heading: notificationTitle,
      intro: `${emailDecisionSummary} ${workflowSummary}`,
      detail: `Proposal type: ${proposalType}\nTask: ${linkedTask.title}\nProposal description: ${proposal.description}\n\nAdmin note: ${adminNote}`,
      actionHref: `${researchBaseUrl()}${href}`,
      actionLabel: accepted ? "View result" : "Open task",
    });
  } else {
    await notifyUsers({
      userIds: [proposal.submittedById],
      type: accepted ? "PROPOSAL_ACCEPTED" : "PROPOSAL_DECLINED",
      title: `Proposal feedback: ${statusLabel}`,
      summary: proposal.title,
      body: `Decision: ${statusLabel}.\nType: ${proposalType}.\nAdmin note: ${adminNote}`,
      href: accepted ? createdHref : "/notifications",
      entityType: "proposal",
      entityId: reviewed.id,
    });

    await sendProposalEmail({
      to: [proposal.submittedBy.email],
      subject: `Feedback on your Research Hub proposal`,
      heading: `Proposal ${statusLabel}`,
      intro: `${emailDecisionSummary} Thank you for sharing this proposal with Research Hub.`,
      detail: `Proposal type: ${proposalType}\nProposal description: ${proposal.description}\n\nAdmin note: ${adminNote}`,
      actionHref: `${researchBaseUrl()}${accepted ? createdHref : "/notifications"}`,
      actionLabel: accepted ? "View item" : "View notification",
    });
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposal.id}`);
  if (proposal.taskId) revalidatePath(`/tasks/${proposal.taskId}`);
  if (proposalTaskCompleted || proposalTaskRedo) revalidatePath("/tasks");
  revalidatePath("/notifications");
  revalidatePath("/conferences");
  revalidatePath("/journals");
  revalidatePath("/projects");
  revalidatePath("/organized-projects");
}

export async function createResearchProject(formData: FormData) {
  const user = await requireCurrentUser();
  if (!isResearchAdminRole(user.roles)) {
    redirect("/401");
  }
  const isAdmin = isResearchAdminRole(user.roles);
  const authorIds = orderedUniqueStrings(formData.getAll("authorUserIds"));
  if (authorIds.length === 0 || !optionalString(formData.get("title"))) return;
  const selectedAuthorIds = authorIds;
  const correspondingAuthorId =
    optionalString(formData.get("correspondingAuthorId")) ??
    selectedAuthorIds[0];
  const authorContactEmails = await validatedSelectedContactEmails(
    selectedAuthorIds,
    selectedContactEmailMap(formData),
    { allowPendingEmail: isAdmin },
  );
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
      sharedFolderUrl: optionalString(formData.get("sharedFolderUrl")),
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
          selectedEmail: authorContactEmails.get(id),
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
  requireResearchAdmin(user.roles);
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
  const memberContactEmails = await validatedSelectedContactEmails(
    memberUserIds,
    selectedContactEmailMap(formData),
  );

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
      sharedFolderUrl: optionalString(formData.get("sharedFolderUrl")),
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
          selectedEmail: memberContactEmails.get(userId),
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

  const isAdmin = isResearchAdminRole(user.roles);
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
  const memberContactEmails = await validatedSelectedContactEmails(
    memberUserIds,
    selectedContactEmailMap(formData),
  );

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
      sharedFolderUrl: optionalString(formData.get("sharedFolderUrl")),
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
          selectedEmail: memberContactEmails.get(userId),
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
      summary: title,
      body: `Changed: ${changedParts.join(", ")}.`,
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
    isResearchAdminRole(user.roles) ||
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
    isResearchAdminRole(user.roles) ||
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
  const authorContactEmails = await validatedSelectedContactEmails(
    authorIds,
    selectedContactEmailMap(formData),
  );
  const registrationUserId = optionalString(formData.get("registrationUserId"));

  const createdProject = await prisma.$transaction(async (tx) => {
    const research = await tx.researchProject.create({
      data: {
        title,
        researchCode: await generateResearchCode(researchYear(), tx),
        abstract: optionalString(formData.get("abstract")),
        sharedFolderUrl: optionalString(formData.get("sharedFolderUrl")),
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
            selectedEmail: authorContactEmails.get(id),
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
    summary: organizedProject.title,
    body: `Associated research added: ${createdProject.title}.`,
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
  const isAdmin = isResearchAdminRole(user.roles);
  const projectLock = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      title: true,
      abstract: true,
      sharedFolderUrl: true,
      universityRegistration: true,
      registerStatus: true,
      claimStatus: true,
      registrationName: true,
      registrationUser: { select: { name: true, email: true } },
      fundingInstitution: { select: { name: true } },
      stage: true,
      completedProductionSteps: true,
      contentUnlocked: true,
      authorsUnlocked: true,
      leadResearcherId: true,
      authors: { select: { id: true, name: true, email: true } },
      authorEntries: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          userId: true,
          selectedEmail: true,
          isCorresponding: true,
          folderShared: true,
          user: { select: { name: true, email: true } },
        },
      },
      submissions: { select: { status: true } },
      conferenceSubmissions: { select: { status: true } },
    },
  });
  if (!projectLock) return;

  const isCorrespondingAuthor =
    projectLock.authorEntries.length > 0
      ? projectLock.authorEntries.some(
          (entry) => entry.userId === user.id && entry.isCorresponding,
        )
      : projectLock.leadResearcherId === user.id;
  const isFirstAuthor =
    projectLock.authorEntries.length > 0
      ? projectLock.authorEntries[0]?.userId === user.id
      : projectLock.leadResearcherId === user.id;
  const updateScope = optionalString(formData.get("updateScope"));
  const canEditBasicResearch =
    isAdmin || isCorrespondingAuthor || isFirstAuthor;
  const canEditLockedResearchSections = isAdmin || isCorrespondingAuthor;

  if (
    (updateScope === "basic" && !canEditBasicResearch) ||
    (updateScope !== "basic" && !canEditLockedResearchSections)
  ) {
    redirect("/401");
  }

  const hasLockedJournalSubmission = projectLock?.submissions.some(
    (submission) =>
      submission.status === SubmissionStatus.ACCEPTED ||
      submission.status === SubmissionStatus.PUBLISHED,
  );
  const hasAcceptedResearch =
    projectLock.stage === ResearchStage.ACCEPTED ||
    projectLock.stage === ResearchStage.PUBLISHED ||
    hasLockedJournalSubmission ||
    projectLock.conferenceSubmissions.some(
      (submission) =>
        submission.status === ConferenceSubmissionStatus.ACCEPTED ||
        submission.status === ConferenceSubmissionStatus.PUBLISHED,
    );
  const authorsLocked = hasAcceptedResearch && !projectLock.authorsUnlocked;

  if (updateScope === "authors" && authorsLocked) {
    revalidatePath(`/projects/${projectId}`);
    return;
  }

  if (
    updateScope !== "authors" &&
    hasLockedJournalSubmission &&
    !projectLock?.contentUnlocked
  ) {
    revalidatePath(`/projects/${projectId}`);
    return;
  }

  const authorIds = orderedUniqueStrings(formData.getAll("authorUserIds"));
  const selectedAuthorIds = authorIds.length > 0 ? authorIds : [user.id];
  const folderSharedAuthorIds = new Set(
    orderedUniqueStrings(formData.getAll("folderSharedAuthorIds")).filter(
      (id) => selectedAuthorIds.includes(id),
    ),
  );
  const correspondingAuthorId =
    optionalString(formData.get("correspondingAuthorId")) ??
    selectedAuthorIds[0];
  const authorContactEmails = await validatedSelectedContactEmails(
    selectedAuthorIds,
    selectedContactEmailMap(formData),
    { allowPendingEmail: isAdmin },
  );
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
    sharedFolderUrl: optionalString(formData.get("sharedFolderUrl")),
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
        ...(updateScope === "authors"
          ? {
              authors: {
                set: selectedAuthorIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
    });

    if (updateScope === "authors") {
      await tx.researchProjectAuthor.deleteMany({ where: { projectId } });
      await tx.researchProjectAuthor.createMany({
        data: selectedAuthorIds.map((id, index) => ({
          projectId,
          userId: id,
          position: index,
          selectedEmail: authorContactEmails.get(id),
          isCorresponding: id === correspondingAuthorId,
          folderShared: folderSharedAuthorIds.has(id),
        })),
      });
      await tx.researchProject.update({
        where: { id: projectId },
        data: {
          folderSharedUsers: {
            disconnect: selectedAuthorIds.map((id) => ({ id })),
          },
        },
      });
    }
  });

  await refreshResearchStage(projectId, completedProductionSteps);
  const updatedProject = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      title: true,
      abstract: true,
      sharedFolderUrl: true,
      universityRegistration: true,
      registerStatus: true,
      claimStatus: true,
      registrationName: true,
      registrationUser: { select: { name: true, email: true } },
      fundingInstitution: { select: { name: true } },
      stage: true,
      completedProductionSteps: true,
      authors: { select: { id: true, name: true, email: true } },
      authorEntries: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: {
          userId: true,
          selectedEmail: true,
          isCorresponding: true,
          folderShared: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  const notificationChanges = updatedProject
    ? researchProjectNotificationChanges(projectLock, updatedProject)
    : [];

  const productionWasComplete = productionStepLabels.every((step) =>
    projectLock?.completedProductionSteps.includes(step),
  );

  if (!productionWasComplete && productionIsComplete) {
    await notifyResearchAuthors(projectId, {
      type: "RESEARCH_PRODUCTION_FINISHED",
      title: "Research production finished",
      summary: updatedProject?.title ?? "Research production is finished.",
      body:
        notificationChanges.find(
          (change) => change.label === "Production checklist",
        )?.detail ??
        "All production checklist items have been marked complete.",
    });
  } else if (updatedProject && projectLock?.stage !== updatedProject.stage) {
    await notifyResearchAuthors(projectId, {
      type: "RESEARCH_STATUS_UPDATED",
      title: "Research status updated",
      summary: updatedProject.title,
      body: `Research stage - Before: "${readableResearchValue(projectLock.stage)}"; After: "${readableResearchValue(updatedProject.stage)}"`,
    });
  } else if (updatedProject && notificationChanges.length > 0) {
    await notifyResearchAuthors(projectId, {
      type: "RESEARCH_UPDATED",
      title: "Research updated",
      summary: updatedProject.title,
      body: notificationChanges.map((change) => change.detail).join("\n"),
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
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

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

export async function setResearchAuthorsLock(
  projectId: string,
  locked: boolean,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      stage: true,
      submissions: { select: { status: true } },
      conferenceSubmissions: { select: { status: true } },
    },
  });
  if (!project) return;

  const acceptedOrPublished =
    project.stage === ResearchStage.ACCEPTED ||
    project.stage === ResearchStage.PUBLISHED ||
    project.submissions.some(
      (submission) =>
        submission.status === SubmissionStatus.ACCEPTED ||
        submission.status === SubmissionStatus.PUBLISHED,
    ) ||
    project.conferenceSubmissions.some(
      (submission) =>
        submission.status === ConferenceSubmissionStatus.ACCEPTED ||
        submission.status === ConferenceSubmissionStatus.PUBLISHED,
    );
  if (!acceptedOrPublished) return;

  await prisma.researchProject.update({
    where: { id: projectId },
    data: { authorsUnlocked: !locked },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function updateResearchFolderSharedUsers(
  projectId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      leadResearcherId: true,
      authorEntries: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { userId: true, isCorresponding: true },
      },
      authors: { select: { id: true } },
      folderSharedUsers: { select: { id: true } },
      tasks: {
        select: {
          createdById: true,
          checkerId: true,
          assignments: {
            select: { userId: true },
          },
        },
      },
    },
  });
  if (!project) return;

  const isAdmin = user.roles.includes(Role.ADMIN);
  const isCorrespondingAuthor =
    project.authorEntries.length > 0
      ? project.authorEntries.some(
          (entry) => entry.userId === user.id && entry.isCorresponding,
        )
      : project.leadResearcherId === user.id;
  const isFirstAuthor =
    project.authorEntries.length > 0
      ? project.authorEntries[0]?.userId === user.id
      : project.leadResearcherId === user.id;
  if (!isAdmin && !isCorrespondingAuthor && !isFirstAuthor) redirect("/401");

  const authorIds = new Set([
    ...project.authorEntries.map((entry) => entry.userId),
    ...project.authors.map((author) => author.id),
  ]);
  const assignedUserIds = new Set(
    project.tasks.flatMap((task) =>
      [
        task.createdById,
        task.checkerId,
        ...task.assignments.map((assignment) => assignment.userId),
      ].filter((id): id is string => Boolean(id)),
    ),
  );
  const existingSharedUserIds = new Set(
    project.folderSharedUsers.map((folderUser) => folderUser.id),
  );
  const requestedUserIds = orderedUniqueStrings(
    formData.getAll("folderSharedUserIds"),
  ).filter((id) => !authorIds.has(id));

  const allowedUsers = await prisma.user.findMany({
    where: {
      id: { in: requestedUserIds },
      activeSites: { has: "research" },
    },
    select: { id: true, roles: true },
  });
  const allowedUserIds = allowedUsers
    .filter(
      (allowedUser) =>
        existingSharedUserIds.has(allowedUser.id) ||
        allowedUser.roles.includes(Role.CHIEF_ASSISTANT) ||
        allowedUser.roles.includes(Role.ADMIN) ||
        assignedUserIds.has(allowedUser.id),
    )
    .map((allowedUser) => allowedUser.id);

  if (allowedUserIds.length !== requestedUserIds.length) {
    return {
      ok: false,
      savedCount: allowedUserIds.length,
      requestedCount: requestedUserIds.length,
    };
  }

  await prisma.researchProject.update({
    where: { id: projectId },
    data: {
      folderSharedUsers: {
        set: allowedUserIds.map((id) => ({ id })),
      },
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return {
    ok: true,
    savedCount: allowedUserIds.length,
    requestedCount: requestedUserIds.length,
  };
}

function researchFolderAccessRoleLabel({
  isAuthor,
  isFirstAuthor,
  isCorrespondingAuthor,
  isTaskAssignee,
  isTaskChecker,
}: {
  isAuthor: boolean;
  isFirstAuthor: boolean;
  isCorrespondingAuthor: boolean;
  isTaskAssignee: boolean;
  isTaskChecker: boolean;
}) {
  const roles: string[] = [];
  if (isFirstAuthor) roles.push("First author");
  else if (isCorrespondingAuthor) roles.push("Corresponding author");
  else if (isAuthor) roles.push("Author");
  if (isTaskAssignee) roles.push("Task assignee");
  if (isTaskChecker) roles.push("Task checker");
  return roles.join(", ");
}

export async function requestResearchFolderAccess(projectId: string) {
  const user = await requireCurrentUser();
  const [requester, project] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    }),
    prisma.researchProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        sharedFolderUrl: true,
        leadResearcherId: true,
        authors: { select: { id: true } },
        authorEntries: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          select: { userId: true, isCorresponding: true, folderShared: true },
        },
        folderSharedUsers: { select: { id: true } },
        tasks: {
          select: {
            checkerId: true,
            assignments: { select: { userId: true } },
          },
        },
        folderAccessRequests: {
          where: {
            userId: user.id,
            status: {
              in: [
                ResearchFolderAccessRequestStatus.PENDING,
                ResearchFolderAccessRequestStatus.DECLINED,
              ],
            },
          },
          select: { id: true, status: true },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        },
      },
    }),
  ]);

  if (!project || !requester || !project.sharedFolderUrl) redirect("/401");
  if (user.roles.includes(Role.ADMIN)) return { status: "already-shared" };

  const authorIds = new Set([
    project.leadResearcherId,
    ...project.authors.map((author) => author.id),
    ...project.authorEntries.map((entry) => entry.userId),
  ]);
  const authorEntryIndex = project.authorEntries.findIndex(
    (entry) => entry.userId === user.id,
  );
  const authorEntry =
    authorEntryIndex >= 0 ? project.authorEntries[authorEntryIndex] : null;
  const isAuthor = authorIds.has(user.id);
  const isFirstAuthor =
    project.authorEntries.length > 0
      ? authorEntryIndex === 0
      : project.leadResearcherId === user.id;
  const isCorrespondingAuthor =
    authorEntry?.isCorresponding ?? project.leadResearcherId === user.id;
  const isTaskAssignee = project.tasks.some((task) =>
    task.assignments.some((assignment) => assignment.userId === user.id),
  );
  const isTaskChecker = project.tasks.some(
    (task) => task.checkerId === user.id,
  );
  const alreadyShared =
    Boolean(authorEntry?.folderShared) ||
    project.folderSharedUsers.some((folderUser) => folderUser.id === user.id);

  if (alreadyShared) return { status: "already-shared" };
  if (!isAuthor && !isTaskAssignee && !isTaskChecker) redirect("/401");
  const existingRequest = project.folderAccessRequests[0] ?? null;
  if (existingRequest?.status === ResearchFolderAccessRequestStatus.PENDING) {
    return { status: "already-requested" };
  }
  if (existingRequest?.status === ResearchFolderAccessRequestStatus.DECLINED) {
    return { status: "declined" };
  }

  const requesterRole = researchFolderAccessRoleLabel({
    isAuthor,
    isFirstAuthor,
    isCorrespondingAuthor,
    isTaskAssignee,
    isTaskChecker,
  });
  const request = await prisma.researchFolderAccessRequest.create({
    data: {
      projectId,
      userId: user.id,
      requesterName: requester.name || requester.email,
      requesterEmail: requester.email,
      requesterRole,
    },
  });

  await notifyUsers({
    userIds: await adminUserIds(),
    type: "RESEARCH_FOLDER_ACCESS_REQUESTED",
    title: "Shared folder access requested",
    summary: `${requester.name || requester.email} requested access to a research shared folder.`,
    body: `Research: ${project.title}\nRole: ${requesterRole}`,
    href: `/projects/${projectId}`,
    entityType: "researchFolderAccessRequest",
    entityId: request.id,
    excludeUserId: user.id,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { status: "requested" };
}

export async function decideResearchFolderAccessRequest(
  requestId: string,
  decision: "APPROVED" | "DECLINED",
  formData: FormData,
) {
  const user = await requireCurrentUser();
  if (!user.roles.includes(Role.ADMIN)) redirect("/401");

  const note = optionalString(formData.get("note"));
  const request = await prisma.researchFolderAccessRequest.findUnique({
    where: { id: requestId },
    include: {
      user: { select: { id: true, email: true } },
      project: {
        select: {
          id: true,
          title: true,
          authorEntries: { select: { userId: true } },
          authors: { select: { id: true } },
        },
      },
    },
  });

  if (!request) return { status: "missing" };
  if (request.status !== ResearchFolderAccessRequestStatus.PENDING) {
    return { status: "already-decided" };
  }

  const nextStatus =
    decision === "APPROVED"
      ? ResearchFolderAccessRequestStatus.APPROVED
      : ResearchFolderAccessRequestStatus.DECLINED;

  await prisma.$transaction(async (tx) => {
    await tx.researchFolderAccessRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        note,
        decidedAt: new Date(),
        decidedById: user.id,
      },
    });

    if (nextStatus === ResearchFolderAccessRequestStatus.APPROVED) {
      const authorEntry = request.project.authorEntries.find(
        (entry) => entry.userId === request.userId,
      );
      if (authorEntry) {
        await tx.researchProjectAuthor.update({
          where: {
            projectId_userId: {
              projectId: request.projectId,
              userId: request.userId,
            },
          },
          data: { folderShared: true },
        });
      } else {
        await tx.researchProject.update({
          where: { id: request.projectId },
          data: {
            folderSharedUsers: {
              connect: { id: request.userId },
            },
          },
        });
      }
    }
  });

  const approved = nextStatus === ResearchFolderAccessRequestStatus.APPROVED;
  const decisionLabel = approved ? "approved" : "declined";
  const noteLine = note ? `\nNote: ${note}` : "";
  await notifyUsers({
    userIds: [request.userId],
    type: approved
      ? "RESEARCH_FOLDER_ACCESS_APPROVED"
      : "RESEARCH_FOLDER_ACCESS_DECLINED",
    title: approved
      ? "Shared folder access approved"
      : "Shared folder access declined",
    summary: `Your shared folder request was ${decisionLabel}.`,
    body: `Research: ${request.project.title}${noteLine}`,
    href: `/projects/${request.projectId}`,
    entityType: "researchFolderAccessRequest",
    entityId: request.id,
    excludeUserId: user.id,
  });

  await sendProposalEmail({
    to: [request.user.email],
    subject: approved
      ? "Research shared folder access approved"
      : "Research shared folder access declined",
    heading: approved
      ? "Shared folder access approved"
      : "Shared folder access declined",
    intro: approved
      ? "Your request to access the research shared folder has been approved."
      : "Your request to access the research shared folder has been declined.",
    detail: `Research: ${request.project.title}${noteLine}`,
    actionHref: `${researchBaseUrl()}/projects/${request.projectId}`,
    actionLabel: "Open research",
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${request.projectId}`);
  return { status: decisionLabel };
}

async function createJournalRecord({
  formData,
  createdById,
  approvalStatus,
  resultTaskId,
  resultPosition,
}: {
  formData: FormData;
  createdById: string;
  approvalStatus: JournalApprovalStatus;
  resultTaskId?: string;
  resultPosition?: number;
}) {
  const fields = orderedUniqueStrings(formData.getAll("fields"));
  const legacyField = optionalString(formData.get("field"));
  const journalType =
    enumValue(JournalType, formData.get("type")) ?? JournalType.INTERNATIONAL;
  const name = optionalString(formData.get("name")) ?? "Untitled journal";
  const issn = optionalString(formData.get("issn"));
  const accountUsername = optionalString(formData.get("accountUsername"));
  const accountPassword = optionalString(formData.get("accountPassword"));
  const accountEmail = optionalString(formData.get("accountEmail"));
  const accountNote = optionalString(formData.get("accountNote"));
  const publisher = await publisherSelection(formData);
  if (!publisher)
    throw new Error("Choose a publisher before saving the journal.");
  const shouldCreateAccount =
    Boolean(accountUsername) && !publisher.usesSingleAccount;
  const duplicateFilters: Prisma.JournalWhereInput[] = [
    { name: { equals: name, mode: Prisma.QueryMode.insensitive } },
  ];
  if (issn) {
    duplicateFilters.push({
      issn: { equals: issn, mode: Prisma.QueryMode.insensitive },
    });
  }
  const duplicateJournal = await prisma.journal.findFirst({
    where: {
      OR: duplicateFilters,
    },
    select: { name: true, issn: true },
  });
  if (duplicateJournal) {
    throw new Error(
      duplicateJournal.issn && issn
        ? `ISSN already exists in ${duplicateJournal.name}.`
        : `Journal name already exists: ${duplicateJournal.name}.`,
    );
  }

  const journal = await prisma.$transaction(async (tx) => {
    const journal = await tx.journal.create({
      data: {
        name,
        issn,
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
        publisherId: publisher.id,
        publisher: publisher.name,
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
        approvalStatus,
        createdById,
        resultTaskId,
        resultPosition,
      },
    });

    if (accountUsername && !publisher.usesSingleAccount) {
      await tx.publisherAccount.create({
        data: {
          username: accountUsername,
          password: accountPassword ?? "",
          email: accountEmail,
          note: accountNote,
          accountType: PublisherAccountType.JOURNAL,
          journalId: journal.id,
          publisherId: publisher.id,
        },
      });
    }
    return journal;
  });

  return { journal, shouldCreateAccount };
}

export async function createJournal(formData: FormData) {
  const user = await requireCurrentUser();
  requireVenueCreator(user);
  const isAdmin = user.roles.includes(Role.ADMIN);
  const { shouldCreateAccount } = await createJournalRecord({
    formData,
    createdById: user.id,
    approvalStatus: isAdmin
      ? JournalApprovalStatus.APPROVED
      : JournalApprovalStatus.PENDING_APPROVAL,
  });

  revalidatePath("/journals");
  if (shouldCreateAccount) revalidatePath("/accounts");
  return { pendingApproval: !isAdmin };
}

export async function createJournalForTaskSlot(
  taskId: string,
  resultPosition: number,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const task = await prisma.researchTask.findFirst({
    where: {
      id: taskId,
      taskType: ResearchTaskType.ADD_JOURNAL,
      status: {
        notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
      },
      assignments: { some: { userId: user.id } },
    },
    select: { id: true, journalTargetCount: true },
  });
  if (!task) redirect("/401");
  const targetCount = task.journalTargetCount ?? 0;
  if (resultPosition < 0 || resultPosition >= targetCount) {
    throw new Error("This journal result slot is not available.");
  }
  const occupied = await prisma.journal.count({
    where: { resultTaskId: taskId, resultPosition },
  });
  if (occupied) throw new Error("This journal result slot is already filled.");

  try {
    const { shouldCreateAccount } = await createJournalRecord({
      formData,
      createdById: user.id,
      approvalStatus: JournalApprovalStatus.PENDING_APPROVAL,
      resultTaskId: taskId,
      resultPosition,
    });
    revalidatePath("/journals");
    revalidatePath(`/tasks/${taskId}`);
    if (shouldCreateAccount) revalidatePath("/accounts");
    return { pendingApproval: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("This journal result slot is already filled.");
    }
    throw error;
  }
}

export async function linkJournalToTaskSlot(
  taskId: string,
  resultPosition: number,
  journalId: string,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: { id: true, taskType: true, journalTargetCount: true },
  });
  if (!task || task.taskType !== ResearchTaskType.ADD_JOURNAL) {
    throw new Error("This task cannot receive journal results.");
  }
  const targetCount = Math.max(1, task.journalTargetCount ?? 1);
  if (resultPosition < 0 || resultPosition >= targetCount) {
    throw new Error("This journal result slot is not available.");
  }
  const existingSlotJournal = await prisma.journal.findFirst({
    where: { resultTaskId: taskId, resultPosition },
    select: { id: true },
  });

  const journal = await prisma.journal.findUnique({
    where: { id: journalId },
    select: { id: true, resultTaskId: true, name: true },
  });
  if (!journal) throw new Error("Choose a journal before linking.");
  if (journal.resultTaskId && journal.id !== existingSlotJournal?.id) {
    throw new Error("This journal is already linked to a task slot.");
  }

  await prisma.$transaction(async (tx) => {
    if (existingSlotJournal && existingSlotJournal.id !== journalId) {
      await tx.journal.update({
        where: { id: existingSlotJournal.id },
        data: { resultTaskId: null, resultPosition: null },
      });
    }
    await tx.journal.update({
      where: { id: journalId },
      data: { resultTaskId: taskId, resultPosition },
    });
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/journals");
  if (existingSlotJournal)
    revalidatePath(`/journals/${existingSlotJournal.id}`);
  revalidatePath(`/journals/${journalId}`);
  return { journalName: journal.name };
}

export async function approveTaskJournal(taskId: string, journalId: string) {
  const user = await requireCurrentUser();
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      createdById: true,
      checkerId: true,
      journalCreationSuggestion: {
        select: {
          task: { select: { checkerId: true } },
        },
      },
    },
  });
  const sourceSuggestVenueCheckerId =
    task?.journalCreationSuggestion?.task?.checkerId ?? null;
  if (
    !task ||
    (!user.roles.includes(Role.ADMIN) &&
      task.createdById !== user.id &&
      task.checkerId !== user.id &&
      sourceSuggestVenueCheckerId !== user.id)
  ) {
    redirect("/401");
  }
  const journal = await prisma.journal.findFirst({
    where: { id: journalId, resultTaskId: taskId },
    select: { id: true },
  });
  if (!journal) throw new Error("Task journal was not found.");

  await approveJournalWithWorkflow(journalId, user.id);
}

export async function updateJournal(journalId: string, formData: FormData) {
  const user = await requireCurrentUser();
  const journal = await prisma.journal.findUnique({
    where: { id: journalId },
    select: { approvalStatus: true, createdById: true, resultTaskId: true },
  });
  if (!journal) return;
  const canEdit =
    user.roles.includes(Role.ADMIN) ||
    canEditJournalDetailsByEmail(user.email) ||
    (user.canManageResearchVenues &&
      journal.createdById === user.id &&
      journal.approvalStatus === JournalApprovalStatus.PENDING_APPROVAL);
  if (!canEdit) redirect("/401");
  const fields = orderedUniqueStrings(formData.getAll("fields"));
  const legacyField = optionalString(formData.get("field"));
  const journalType =
    enumValue(JournalType, formData.get("type")) ?? JournalType.INTERNATIONAL;
  const publisher = await publisherSelection(formData);
  if (!publisher)
    throw new Error("Choose a publisher before saving the journal.");

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
      publisherId: publisher.id,
      publisher: publisher.name,
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
  if (journal.resultTaskId) revalidatePath(`/tasks/${journal.resultTaskId}`);
}

export async function updateJournalApprovalStatus(
  journalId: string,
  status: JournalApprovalStatus,
) {
  const user = await requireCurrentUser();
  const isAdmin = user.roles.includes(Role.ADMIN);
  const canApproveAsChecker =
    status === JournalApprovalStatus.APPROVED &&
    (await isCheckerForJournalResult(user.id, journalId));
  if (!isAdmin && !canApproveAsChecker) redirect("/401");
  if (!isAdmin && status !== JournalApprovalStatus.APPROVED) redirect("/401");

  if (status === JournalApprovalStatus.APPROVED) {
    await approveJournalWithWorkflow(journalId, user.id);
    return;
  }

  const journal = await prisma.journal.update({
    where: { id: journalId },
    data: { approvalStatus: status },
    select: { resultTaskId: true },
  });

  revalidatePath("/journals");
  revalidatePath(`/journals/${journalId}`);
  if (journal.resultTaskId) revalidatePath(`/tasks/${journal.resultTaskId}`);
}

async function approveJournalWithWorkflow(
  journalId: string,
  approvedById: string,
) {
  const completedAt = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const journal = await tx.journal.findUnique({
      where: { id: journalId },
      select: {
        id: true,
        name: true,
        resultTaskId: true,
        resultTask: {
          select: {
            id: true,
            title: true,
            taskType: true,
            status: true,
            journalTargetCount: true,
            assignments: { select: { userId: true } },
            journalCreationSuggestion: {
              select: {
                id: true,
                projectId: true,
                taskId: true,
                createdById: true,
              },
            },
          },
        },
      },
    });
    if (!journal) throw new Error("Journal was not found.");
    const publisher = journal.id
      ? await tx.publisher.findFirst({
          where: {
            journals: { some: { id: journal.id } },
          },
          select: { name: true, approvalStatus: true },
        })
      : null;
    if (
      publisher &&
      publisher.approvalStatus !== JournalApprovalStatus.APPROVED
    ) {
      throw new Error(
        `Approve publisher "${publisher.name}" before approving this journal.`,
      );
    }

    await tx.journal.update({
      where: { id: journalId },
      data: { approvalStatus: JournalApprovalStatus.APPROVED },
    });

    const workflowTask = journal.resultTask;
    const suggestion = workflowTask?.journalCreationSuggestion;
    if (!workflowTask || workflowTask.status === ResearchTaskStatus.REVOKED) {
      return {
        journalName: journal.name,
        taskId: journal.resultTaskId,
        workflow: null,
      };
    }

    const taskJournals = await tx.journal.findMany({
      where: { resultTaskId: workflowTask.id },
      select: { approvalStatus: true },
    });
    const targetCount = Math.max(1, workflowTask.journalTargetCount ?? 1);
    const taskReadyToComplete =
      workflowTask.taskType === ResearchTaskType.ADD_JOURNAL &&
      taskJournals.length >= targetCount &&
      taskJournals.every(
        (taskJournal) =>
          taskJournal.approvalStatus === JournalApprovalStatus.APPROVED,
      );
    const taskCompleted =
      taskReadyToComplete &&
      workflowTask.status !== ResearchTaskStatus.COMPLETED;
    const completionNote =
      "All requested journals were approved, so this add-journal task was completed automatically.";

    if (taskCompleted) {
      await tx.researchTask.update({
        where: { id: workflowTask.id },
        data: {
          status: ResearchTaskStatus.COMPLETED,
          completedAt,
          completedById: approvedById,
          completionMessage: completionNote,
          revokedAt: null,
          revokedById: null,
          revokeReason: null,
          adminViewedAt: null,
          assignments: {
            updateMany: {
              where: { finishedAt: null },
              data: { finishedAt: completedAt },
            },
          },
        },
      });
    }

    if (suggestion) {
      await tx.suggestedJournal.update({
        where: { id: suggestion.id },
        data: {
          journalId,
          status: SuggestedVenueStatus.APPROVED,
          requiresApproval: true,
          approvedAt: completedAt,
          approvedById,
          declinedAt: null,
          declinedById: null,
          declineReason: null,
        },
      });
    }

    return {
      journalName: journal.name,
      taskId: workflowTask.id,
      workflow: {
        taskTitle: workflowTask.title,
        suggestionId: suggestion?.id ?? null,
        projectId: suggestion?.projectId ?? null,
        suggestVenueTaskId: suggestion?.taskId ?? null,
        suggesterId: suggestion?.createdById ?? null,
        assigneeIds: workflowTask.assignments.map(
          (assignment) => assignment.userId,
        ),
        taskCompleted,
        completionNote: taskCompleted ? completionNote : null,
      },
    };
  });

  revalidatePath("/journals");
  revalidatePath(`/journals/${journalId}`);
  if (result.taskId) revalidatePath(`/tasks/${result.taskId}`);
  const completedSuggestTask = result.workflow?.suggestVenueTaskId
    ? await completeSuggestVenueTaskIfReady(
        result.workflow.suggestVenueTaskId,
        approvedById,
      )
    : null;
  if (completedSuggestTask) {
    revalidatePath(`/tasks/${completedSuggestTask.taskId}`);
  }
  if (result.workflow?.taskCompleted || result.workflow?.suggestionId) {
    revalidatePath("/tasks");
    if (result.workflow.projectId)
      revalidatePath(`/projects/${result.workflow.projectId}`);
    revalidatePath("/suggestions");
    const recipientIds = new Set(result.workflow.assigneeIds);
    if (result.workflow.suggesterId) {
      recipientIds.add(result.workflow.suggesterId);
    }
    completedSuggestTask?.assigneeIds.forEach((assigneeId) =>
      recipientIds.add(assigneeId),
    );
    const body = [
      `${result.journalName} was approved.`,
      result.workflow.suggestionId
        ? "The linked venue suggestion is now approved."
        : null,
      result.workflow.completionNote
        ? `${result.workflow.taskTitle} was completed automatically. ${result.workflow.completionNote}`
        : null,
      completedSuggestTask
        ? `${completedSuggestTask.taskTitle} was approved as complete automatically. ${completedSuggestTask.note}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    await notifyUsers({
      userIds: Array.from(recipientIds),
      type: "VENUE_SUGGESTION_APPROVED",
      title:
        completedSuggestTask && result.workflow.taskCompleted
          ? "Venue approved and tasks completed"
          : result.workflow.suggestionId && result.workflow.taskCompleted
            ? "Venue approved and task completed"
            : completedSuggestTask
              ? "Venue approved and suggest venue task completed"
              : result.workflow.taskCompleted
                ? "Add journal task completed"
                : "Venue suggestion approved",
      summary: result.journalName,
      body,
      href: result.workflow.taskCompleted
        ? `/tasks/${result.taskId}`
        : result.workflow.projectId
          ? `/projects/${result.workflow.projectId}`
          : `/tasks/${result.taskId}`,
      entityType: "task",
      entityId: result.taskId,
      excludeUserId: approvedById,
    });
  }
}

export async function approveJournal(journalId: string) {
  await updateJournalApprovalStatus(journalId, JournalApprovalStatus.APPROVED);
}

export async function updateJournalCreator(
  journalId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  const createdById = optionalString(formData.get("createdById"));

  await prisma.journal.update({
    where: { id: journalId },
    data: { createdById },
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
      resultTaskId: true,
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
  if (journal.resultTaskId) revalidatePath(`/tasks/${journal.resultTaskId}`);
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
  return researchDateValue(value) < researchDateValue();
}

export async function createConference(formData: FormData) {
  const user = await requireCurrentUser();
  requireVenueCreator(user);
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

async function mergeMatchingPublisherAccounts(
  tx: Prisma.TransactionClient,
  survivorId: string,
  publisherId: string,
  username: string,
  password: string,
) {
  const duplicates = await tx.publisherAccount.findMany({
    where: {
      id: { not: survivorId },
      publisherId,
      username: { equals: username, mode: "insensitive" },
      password,
    },
    select: { id: true },
  });
  const duplicateIds = duplicates.map((account) => account.id);
  if (duplicateIds.length === 0) return;

  await tx.researchSubmission.updateMany({
    where: { accountId: { in: duplicateIds } },
    data: { accountId: survivorId },
  });
  await tx.academicReview.updateMany({
    where: { accountId: { in: duplicateIds } },
    data: { accountId: survivorId },
  });
  await tx.researchTask.updateMany({
    where: { accountId: { in: duplicateIds } },
    data: { accountId: survivorId },
  });
  await tx.publisherAccount.deleteMany({
    where: { id: { in: duplicateIds } },
  });
}

async function journalAccountIds(journalId: string) {
  const journal = await prisma.journal.findUnique({
    where: { id: journalId },
    select: {
      publisherId: true,
      publisherRecord: { select: { usesSingleAccount: true } },
    },
  });
  if (!journal) return [];
  return prisma.publisherAccount.findMany({
    where:
      journal.publisherRecord?.usesSingleAccount && journal.publisherId
        ? {
            accountType: PublisherAccountType.PUBLISHER,
            publisherId: journal.publisherId,
          }
        : { accountType: PublisherAccountType.JOURNAL, journalId },
    select: { id: true },
  });
}

async function accountBelongsToJournal(accountId: string, journalId: string) {
  const accounts = await journalAccountIds(journalId);
  return accounts.some((account) => account.id === accountId);
}

type SuggestedVenueSubmitTaskResult = {
  taskId: string;
  taskTitle: string;
  taskDescription: string | null;
  checkerId: string | null;
  created: boolean;
};

type AutoCompletedSuggestVenueTask = {
  taskId: string;
  taskTitle: string;
  note: string;
  assigneeIds: string[];
  assigneeEmails: string[];
};

async function createSubmitTaskForSuggestedJournalApproval({
  projectId,
  suggestionId,
  journalId,
  approverId,
  suggestedById,
  originalTask,
}: {
  projectId: string;
  suggestionId: string;
  journalId: string;
  approverId: string;
  suggestedById: string;
  originalTask: { createdById: string; checkerId: string | null } | null;
}): Promise<SuggestedVenueSubmitTaskResult> {
  const existingTask = await prisma.researchTask.findFirst({
    where: {
      taskType: ResearchTaskType.SUBMIT_RESEARCH,
      projectId,
      journalId,
      status: {
        notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
      },
    },
    select: { id: true, title: true },
  });
  if (existingTask) {
    await prisma.suggestedJournal.update({
      where: { id: suggestionId },
      data: { submissionTaskId: existingTask.id },
    });
    return {
      taskId: existingTask.id,
      taskTitle: existingTask.title,
      taskDescription: null,
      checkerId: null,
      created: false,
    };
  }

  const [project, journal, guide, accounts] = await Promise.all([
    prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { title: true },
    }),
    prisma.journal.findUnique({
      where: { id: journalId },
      select: { name: true },
    }),
    prisma.taskGuide.findUnique({
      where: { guideCode: "G002" },
      select: { id: true },
    }),
    journalAccountIds(journalId),
  ]);
  if (!project || !journal) {
    throw new Error("The linked research or journal was not found.");
  }

  const taskTitle = `Submit "${project.title}" to ${journal.name}`;
  const taskDescription = DEFAULT_TASK_DESCRIPTION;
  const task = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.researchTask.create({
      data: {
        title: taskTitle,
        taskCode: await generateTaskCode(),
        description: taskDescription,
        category: ResearchTaskCategory.SUBMITTING,
        taskType: ResearchTaskType.SUBMIT_RESEARCH,
        status: ResearchTaskStatus.IN_PROGRESS,
        projectId,
        journalId,
        accountId: accounts.length === 1 ? accounts[0]?.id : null,
        dueDate: researchTaskDueDate(researchDateValue(new Date(), 7)),
        createdById: originalTask?.createdById ?? approverId,
        checkerId: originalTask?.checkerId ?? null,
        assignments: { create: { userId: suggestedById } },
        ...(guide ? { guides: { connect: { id: guide.id } } } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        checkerId: true,
      },
    });
    await tx.suggestedJournal.update({
      where: { id: suggestionId },
      data: { submissionTaskId: createdTask.id },
    });
    return createdTask;
  });

  if (task.checkerId) {
    await notifyUsers({
      userIds: [task.checkerId],
      type: "TASK_CHECKER_ASSIGNED",
      title: "Task checker assigned",
      summary: task.title,
      body: "Admin assigned you as checker for this submit task.",
      href: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
      excludeUserId: approverId,
    });
    await sendTaskCheckerAssignedEmail({
      checkerId: task.checkerId,
      taskTitle: task.title,
      taskId: task.id,
      detail: task.description ?? undefined,
    });
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.description,
    checkerId: task.checkerId,
    created: true,
  };
}

async function createSubmitTaskForSuggestedConferenceApproval({
  projectId,
  suggestionId,
  conferenceId,
  approverId,
  suggestedById,
  originalTask,
}: {
  projectId: string;
  suggestionId: string;
  conferenceId: string;
  approverId: string;
  suggestedById: string;
  originalTask: { createdById: string; checkerId: string | null } | null;
}): Promise<SuggestedVenueSubmitTaskResult> {
  const existingTask = await prisma.researchTask.findFirst({
    where: {
      taskType: ResearchTaskType.SUBMIT_CONFERENCE,
      projectId,
      conferenceId,
      status: {
        notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
      },
    },
    select: { id: true, title: true },
  });
  if (existingTask) {
    await prisma.suggestedConference.update({
      where: { id: suggestionId },
      data: { submissionTaskId: existingTask.id },
    });
    return {
      taskId: existingTask.id,
      taskTitle: existingTask.title,
      taskDescription: null,
      checkerId: null,
      created: false,
    };
  }

  const [project, conference, guide] = await Promise.all([
    prisma.researchProject.findUnique({
      where: { id: projectId },
      select: { title: true },
    }),
    prisma.conference.findUnique({
      where: { id: conferenceId },
      select: { name: true },
    }),
    prisma.taskGuide.findUnique({
      where: { guideCode: "G002" },
      select: { id: true },
    }),
  ]);
  if (!project || !conference) {
    throw new Error("The linked research or conference was not found.");
  }

  const taskTitle = `Submit "${project.title}" to ${conference.name}`;
  const taskDescription = DEFAULT_TASK_DESCRIPTION;
  const task = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.researchTask.create({
      data: {
        title: taskTitle,
        taskCode: await generateTaskCode(),
        description: taskDescription,
        category: ResearchTaskCategory.SUBMITTING,
        taskType: ResearchTaskType.SUBMIT_CONFERENCE,
        status: ResearchTaskStatus.IN_PROGRESS,
        projectId,
        conferenceId,
        dueDate: researchTaskDueDate(researchDateValue(new Date(), 7)),
        createdById: originalTask?.createdById ?? approverId,
        checkerId: originalTask?.checkerId ?? null,
        assignments: { create: { userId: suggestedById } },
        ...(guide ? { guides: { connect: { id: guide.id } } } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        checkerId: true,
      },
    });
    await tx.suggestedConference.update({
      where: { id: suggestionId },
      data: { submissionTaskId: createdTask.id },
    });
    return createdTask;
  });

  if (task.checkerId) {
    await notifyUsers({
      userIds: [task.checkerId],
      type: "TASK_CHECKER_ASSIGNED",
      title: "Task checker assigned",
      summary: task.title,
      body: "Admin assigned you as checker for this submit task.",
      href: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
      excludeUserId: approverId,
    });
    await sendTaskCheckerAssignedEmail({
      checkerId: task.checkerId,
      taskTitle: task.title,
      taskId: task.id,
      detail: task.description ?? undefined,
    });
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.description,
    checkerId: task.checkerId,
    created: true,
  };
}

async function completeSuggestVenueTaskIfReady(
  taskId: string | null | undefined,
  completedById: string,
): Promise<AutoCompletedSuggestVenueTask | null> {
  if (!taskId) return null;

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      taskType: true,
      status: true,
      suggestedVenueTargetCount: true,
      assignments: {
        select: {
          userId: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!task || task.taskType !== ResearchTaskType.SUGGEST_VENUE) return null;
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return null;
  }

  const targetCount = Math.max(1, task.suggestedVenueTargetCount ?? 2);
  const [approvedJournals, approvedConferences] = await Promise.all([
    prisma.suggestedJournal.count({
      where: { taskId, status: SuggestedVenueStatus.APPROVED },
    }),
    prisma.suggestedConference.count({
      where: { taskId, status: SuggestedVenueStatus.APPROVED },
    }),
  ]);

  if (approvedJournals + approvedConferences < targetCount) return null;

  const completedAt = new Date();
  const note =
    "All venue suggestions for this task were approved, so the task was completed automatically.";

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.COMPLETED,
      completedAt,
      completedBy: { connect: { id: completedById } },
      completionMessage: note,
      revokedAt: null,
      revokedBy: { disconnect: true },
      revokeReason: null,
      adminViewedAt: null,
      assignments: {
        updateMany: {
          where: { finishedAt: null },
          data: { finishedAt: completedAt },
        },
      },
    },
  });

  return {
    taskId,
    taskTitle: task.title,
    note,
    assigneeIds: task.assignments.map((assignment) => assignment.userId),
    assigneeEmails: task.assignments.map((assignment) => assignment.user.email),
  };
}

async function markSuggestVenueTaskWaitingForJournalCreation(
  taskId: string | null | undefined,
) {
  if (!taskId) return null;

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: { id: true, taskType: true, status: true },
  });
  if (!task || task.taskType !== ResearchTaskType.SUGGEST_VENUE) return null;
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return null;
  }

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.IN_PROGRESS,
      completedAt: null,
      completedById: null,
      completionMessage: null,
      redoRequestedAt: null,
      redoRequestedById: null,
      redoReason: null,
      adminViewedAt: null,
      assignments: {
        updateMany: {
          where: {},
          data: { finishedAt: null },
        },
      },
    },
  });

  return task.id;
}

async function markSuggestVenueTaskReadyIfFilled(
  taskId: string | null | undefined,
) {
  if (!taskId) return;

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      taskType: true,
      status: true,
      suggestedVenueTargetCount: true,
      suggestedJournals: {
        select: {
          status: true,
          journalCreationTask: { select: { status: true } },
        },
      },
    },
  });
  if (!task || task.taskType !== ResearchTaskType.SUGGEST_VENUE) return;
  if (
    task.status === ResearchTaskStatus.CHECKING ||
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return;
  }
  const waitingForJournalCreation = task.suggestedJournals.some(
    (suggestion) =>
      suggestion.status !== SuggestedVenueStatus.DECLINED &&
      suggestion.journalCreationTask &&
      suggestion.journalCreationTask.status !== ResearchTaskStatus.COMPLETED &&
      suggestion.journalCreationTask.status !== ResearchTaskStatus.REVOKED,
  );
  if (waitingForJournalCreation) return;

  const targetCount = Math.max(1, task.suggestedVenueTargetCount ?? 2);
  const [activeJournals, activeConferences] = await Promise.all([
    prisma.suggestedJournal.count({
      where: { taskId, status: { not: SuggestedVenueStatus.DECLINED } },
    }),
    prisma.suggestedConference.count({
      where: { taskId, status: { not: SuggestedVenueStatus.DECLINED } },
    }),
  ]);
  if (activeJournals + activeConferences < targetCount) return;

  const now = new Date();
  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.CHECKING,
      adminViewedAt: null,
      assignments: {
        updateMany: {
          where: { finishedAt: null },
          data: { finishedAt: now },
        },
      },
    },
  });
}

async function requestSuggestVenueTaskRedoForDecline(
  taskId: string | null | undefined,
  requestedById: string,
) {
  if (!taskId) return;

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      taskType: true,
      status: true,
      assignments: {
        select: {
          userId: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!task || task.taskType !== ResearchTaskType.SUGGEST_VENUE) return;
  if (
    task.status === ResearchTaskStatus.REVISION_REQUESTED ||
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return;
  }

  const redoReason =
    "One or more suggested venues were declined. Please add another suitable venue so the task reaches the required approved venue count.";
  const now = new Date();
  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.REVISION_REQUESTED,
      redoRequestedAt: now,
      redoRequestedById: requestedById,
      redoReason,
      completedAt: null,
      completedById: null,
      completionMessage: null,
      adminViewedAt: null,
      assignments: {
        updateMany: {
          where: {},
          data: { finishedAt: null },
        },
      },
    },
  });

  const assigneeIds = task.assignments.map((assignment) => assignment.userId);
  await notifyUsers({
    userIds: assigneeIds,
    excludeUserId: requestedById,
    type: "TASK_REVISION_REQUESTED",
    title: "Task returned for revision",
    summary: task.title,
    body: redoReason,
    href: `/tasks/${task.id}`,
    entityType: "task",
    entityId: task.id,
  });

  const emails = task.assignments
    .map((assignment) => assignment.user.email)
    .filter(Boolean);
  if (emails.length > 0) {
    await sendTaskEmail({
      to: emails,
      subject: `Task returned for revision: ${task.title}`,
      heading: "Task returned for revision",
      intro: redoReason,
      taskTitle: task.title,
      taskId: task.id,
      actionLabel: "Open task",
    });
  }
}

async function notifyMergedSuggestedVenueApproval({
  projectId,
  suggestionId,
  venueKind,
  venueName,
  approverId,
  suggestedById,
  suggestedByEmail,
  approvalNote,
  submitTask,
  completedSuggestTask,
}: {
  projectId: string;
  suggestionId: string;
  venueKind: "journal" | "conference";
  venueName: string;
  approverId: string;
  suggestedById: string | null;
  suggestedByEmail: string | null | undefined;
  approvalNote: string | null | undefined;
  submitTask: SuggestedVenueSubmitTaskResult | null;
  completedSuggestTask: AutoCompletedSuggestVenueTask | null;
}) {
  const notificationUserIds = new Set<string>();
  if (suggestedById) notificationUserIds.add(suggestedById);
  completedSuggestTask?.assigneeIds.forEach((userId) =>
    notificationUserIds.add(userId),
  );

  const lines = [`${venueName} was approved as a suggested ${venueKind}.`];
  if (approvalNote) lines.push(`Approval note: ${approvalNote}`);
  if (submitTask?.created) {
    lines.push(`A submit task was assigned: ${submitTask.taskTitle}.`);
  } else if (submitTask) {
    lines.push(
      `The suggestion was linked to an existing submit task: ${submitTask.taskTitle}.`,
    );
  }
  if (completedSuggestTask) {
    lines.push(
      `${completedSuggestTask.taskTitle} was approved as complete automatically. ${completedSuggestTask.note}`,
    );
  }

  const title =
    submitTask?.created && completedSuggestTask
      ? "Venue approved, submit task assigned, and task completed"
      : submitTask?.created
        ? "Venue approved and submit task assigned"
        : completedSuggestTask
          ? "Venue approved and suggest venue task completed"
          : "Venue suggestion approved";
  const href = submitTask?.taskId
    ? `/tasks/${submitTask.taskId}`
    : completedSuggestTask
      ? `/tasks/${completedSuggestTask.taskId}`
      : `/projects/${projectId}`;

  await notifyUsers({
    userIds: Array.from(notificationUserIds),
    excludeUserId: approverId,
    type: "VENUE_SUGGESTION_APPROVED",
    title,
    summary: venueName,
    body: lines.join("\n"),
    href,
    entityType: "suggestedVenue",
    entityId: suggestionId,
  });

  if (!submitTask?.created && !completedSuggestTask) return;

  const emailRecipients = new Set<string>();
  if (suggestedByEmail) emailRecipients.add(suggestedByEmail);
  completedSuggestTask?.assigneeEmails.forEach((email) =>
    emailRecipients.add(email),
  );
  const emailTaskId = submitTask?.taskId ?? completedSuggestTask?.taskId;
  const emailTaskTitle =
    submitTask?.taskTitle ?? completedSuggestTask?.taskTitle;
  if (!emailTaskId || !emailTaskTitle) return;

  await sendTaskEmail({
    to: Array.from(emailRecipients),
    subject: title,
    heading: title,
    intro: "A suggested venue update is ready in Research Hub.",
    detail: lines.join("\n"),
    taskTitle: emailTaskTitle,
    taskId: emailTaskId,
    actionLabel: "Open task",
  });
}

async function publisherAccountScope(formData: FormData): Promise<{
  accountType: PublisherAccountType;
  journalId: string | null;
  publisherId: string | null;
}> {
  const isPublisherAccount = formData.get("isPublisherAccount") === "on";
  if (isPublisherAccount) {
    const publisherId = optionalString(formData.get("publisherId"));
    const publisher = publisherId
      ? await prisma.publisher.findUnique({
          where: { id: publisherId },
          select: { id: true },
        })
      : null;
    if (!publisher) {
      throw new Error("Choose the publisher that uses this account.");
    }
    return {
      accountType: PublisherAccountType.PUBLISHER,
      journalId: null,
      publisherId: publisher.id,
    };
  }

  const journalId = optionalString(formData.get("journalId"));
  const journal = journalId
    ? await prisma.journal.findUnique({
        where: { id: journalId },
        select: { id: true, publisherId: true },
      })
    : null;
  if (!journal) {
    throw new Error("Choose the journal that uses this account.");
  }
  return {
    accountType: PublisherAccountType.JOURNAL,
    journalId: journal.id,
    publisherId: journal.publisherId,
  };
}

export async function createPublisherAccount(formData: FormData) {
  await requireCurrentUser();
  const scope = await publisherAccountScope(formData);

  const username = optionalString(formData.get("username")) ?? "new-account";
  const password = optionalString(formData.get("password")) ?? "";
  await prisma.$transaction(async (tx) => {
    if (
      scope.accountType === PublisherAccountType.PUBLISHER &&
      scope.publisherId
    ) {
      await tx.publisher.update({
        where: { id: scope.publisherId },
        data: { usesSingleAccount: true },
      });
    }
    const account = await tx.publisherAccount.create({
      data: {
        username,
        password,
        email: optionalString(formData.get("email")),
        note: optionalString(formData.get("note")),
        accountType: scope.accountType,
        journalId: scope.journalId,
        publisherId: scope.publisherId,
      },
    });
    if (
      scope.accountType === PublisherAccountType.PUBLISHER &&
      scope.publisherId
    ) {
      await mergeMatchingPublisherAccounts(
        tx,
        account.id,
        scope.publisherId,
        username,
        password,
      );
    }
  });

  revalidatePath("/accounts");
  revalidatePath("/journals");
  const projectId = optionalString(formData.get("projectId"));
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function updatePublisherAccount(
  accountId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  requireResearchAdmin(user.roles);
  const scope = await publisherAccountScope(formData);

  const username = optionalString(formData.get("username")) ?? "new-account";
  const password = optionalString(formData.get("password")) ?? "";
  await prisma.$transaction(async (tx) => {
    if (
      scope.accountType === PublisherAccountType.PUBLISHER &&
      scope.publisherId
    ) {
      await tx.publisher.update({
        where: { id: scope.publisherId },
        data: { usesSingleAccount: true },
      });
    }
    await tx.publisherAccount.update({
      where: { id: accountId },
      data: {
        username,
        password,
        email: optionalString(formData.get("email")),
        note: optionalString(formData.get("note")),
        accountType: scope.accountType,
        journalId: scope.journalId,
        publisherId: scope.publisherId,
      },
    });
    if (
      scope.accountType === PublisherAccountType.PUBLISHER &&
      scope.publisherId
    ) {
      await mergeMatchingPublisherAccounts(
        tx,
        accountId,
        scope.publisherId,
        username,
        password,
      );
    }
  });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/journals");
  revalidatePath("/submissions");
}

export async function deletePublisherAccount(accountId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  await prisma.$transaction(async (tx) => {
    const account = await tx.publisherAccount.findUnique({
      where: { id: accountId },
      select: { accountType: true, publisherId: true },
    });
    if (!account) return;
    await tx.publisherAccount.delete({ where: { id: accountId } });
    if (
      account.accountType === PublisherAccountType.PUBLISHER &&
      account.publisherId
    ) {
      const remainingAccounts = await tx.publisherAccount.count({
        where: {
          publisherId: account.publisherId,
          accountType: PublisherAccountType.PUBLISHER,
        },
      });
      if (remainingAccounts === 0) {
        await tx.publisher.update({
          where: { id: account.publisherId },
          data: { usesSingleAccount: false },
        });
      }
    }
  });

  revalidatePath("/accounts");
  revalidatePath("/submissions");
  revalidatePath("/journals");
}

export async function createPublisher(formData: FormData) {
  const user = await requireCurrentUser();
  requireVenueCreator(user);
  const isAdmin = user.roles.includes(Role.ADMIN);

  const name = optionalString(formData.get("name"));
  if (!name) throw new Error("Publisher name is required.");
  const cleanedName = name.replace(/\s+/g, " ");
  const normalizedName = normalizedPublisherName(cleanedName);
  const existing = await prisma.publisher.findUnique({
    where: { normalizedName },
    select: { id: true },
  });
  if (existing) throw new Error("A publisher with this name already exists.");
  const usesSingleAccount = formData.get("usesSingleAccount") === "on";
  const accountUsername = optionalString(formData.get("accountUsername"));
  const accountPassword = optionalString(formData.get("accountPassword"));
  if (usesSingleAccount && (!accountUsername || !accountPassword)) {
    throw new Error(
      "Enter the publisher account login ID and password before saving.",
    );
  }
  const publisher = await prisma.$transaction(async (tx) => {
    const publisher = await tx.publisher.create({
      data: {
        publisherCode: await generatePublisherCode(cleanedName, null),
        name: cleanedName,
        normalizedName,
        usesSingleAccount,
        approvalStatus: isAdmin
          ? JournalApprovalStatus.APPROVED
          : JournalApprovalStatus.PENDING_APPROVAL,
        createdById: user.id,
        website: optionalString(formData.get("website")),
        note: optionalString(formData.get("note")),
      },
    });
    if (usesSingleAccount && accountUsername && accountPassword) {
      await tx.publisherAccount.create({
        data: {
          username: accountUsername,
          password: accountPassword,
          email: optionalString(formData.get("accountEmail")),
          note: optionalString(formData.get("accountNote")),
          accountType: PublisherAccountType.PUBLISHER,
          publisherId: publisher.id,
        },
      });
    }
    return publisher;
  });

  revalidatePath("/publishers");
  revalidatePath("/journals");
  return {
    publisher: {
      id: publisher.id,
      publisherCode: publisher.publisherCode,
      name: publisher.name,
      alias: publisher.alias ?? "",
      country: publisher.country ?? "",
      usesSingleAccount: publisher.usesSingleAccount,
      approvalStatus: publisher.approvalStatus,
    },
    pendingApproval: !isAdmin,
  };
}

export async function approvePublisher(publisherId: string) {
  const user = await requireCurrentUser();
  const canApprove =
    user.roles.includes(Role.ADMIN) ||
    (await isCheckerForPublisherJournalResult(user.id, publisherId));
  if (!canApprove) redirect("/401");

  await prisma.publisher.update({
    where: { id: publisherId },
    data: { approvalStatus: JournalApprovalStatus.APPROVED },
  });

  revalidatePath("/publishers");
  revalidatePath("/journals");
}

export async function updatePublisher(publisherId: string, formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const name = optionalString(formData.get("name"));
  if (!name) throw new Error("Publisher name is required.");
  const cleanedName = name.replace(/\s+/g, " ");
  const normalizedName = normalizedPublisherName(cleanedName);
  const duplicate = await prisma.publisher.findFirst({
    where: { normalizedName, NOT: { id: publisherId } },
    select: { id: true },
  });
  if (duplicate) throw new Error("A publisher with this name already exists.");
  const usesSingleAccount = formData.get("usesSingleAccount") === "on";
  const linkedPublisherAccounts = await prisma.publisherAccount.count({
    where: {
      publisherId,
      accountType: PublisherAccountType.PUBLISHER,
    },
  });
  if (usesSingleAccount && linkedPublisherAccounts === 0) {
    throw new Error(
      "Add a publisher-wide account from Accounts before enabling this policy.",
    );
  }
  if (!usesSingleAccount && linkedPublisherAccounts > 0) {
    throw new Error(
      "Delete or reassign the publisher-wide account before switching to separate journal accounts.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.publisher.update({
      where: { id: publisherId },
      data: {
        name: cleanedName,
        normalizedName,
        usesSingleAccount,
        website: optionalString(formData.get("website")),
        note: optionalString(formData.get("note")),
      },
    });
    await tx.journal.updateMany({
      where: { publisherId },
      data: { publisher: cleanedName },
    });
  });

  revalidatePath("/publishers");
  revalidatePath("/journals");
}

export async function deletePublisher(publisherId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
    select: { _count: { select: { journals: true, accounts: true } } },
  });
  if (!publisher) return;
  if (publisher._count.journals > 0) {
    throw new Error(
      "Move or delete the associated journals before deleting this publisher.",
    );
  }
  if (publisher._count.accounts > 0) {
    throw new Error(
      "Move or delete the publisher accounts before deleting this publisher.",
    );
  }
  await prisma.publisher.delete({ where: { id: publisherId } });
  revalidatePath("/publishers");
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
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const journalId = optionalString(formData.get("journalId"));
  const accountId = optionalString(formData.get("accountId"));
  if (!journalId || !accountId) {
    return { ok: false, reason: "MISSING_ACCOUNT" };
  }
  if (!(await accountBelongsToJournal(accountId, journalId))) {
    return { ok: false, reason: "ACCOUNT_NOT_FOR_JOURNAL" };
  }
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
      accountId,
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
  return { ok: true };
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
  const canManageResearchVenues = formData.has("canManageResearchVenues")
    ? formData.get("canManageResearchVenues") === "true"
    : true;
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
      canManageResearchVenues,
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
      canManageResearchVenues: false,
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
    select: { activeSites: true, email: true, emailVerified: true },
  });
  if (!existing?.activeSites.includes("research")) {
    return { ok: false, reason: "NOT_RESEARCH_USER" };
  }
  if (existing.emailVerified && email !== existing.email.trim().toLowerCase()) {
    return { ok: false, reason: "VERIFIED_EMAIL_LOCKED" };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: optionalString(formData.get("name")),
        email: existing.emailVerified ? existing.email : email,
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

  const taskType = taskTypeFromForm(formData.get("taskType"));
  if (!taskType) return { ok: false, reason: "MISSING_ASSOCIATION" };
  const proposalScope = proposalTaskScopeFromForm(
    formData.get("proposalScope"),
  );
  const productionSubtype =
    taskType === ResearchTaskType.PRODUCTION
      ? (productionSubtypeFromForm(formData.get("productionSubtype")) ??
        ResearchProductionSubtype.IDEA_FORMING)
      : null;
  const taskGuideIds = orderedUniqueStrings(formData.getAll("taskGuideIds"));
  const projectId = optionalString(formData.get("projectId"));
  const organizedProjectId = optionalString(formData.get("organizedProjectId"));
  const journalId = optionalString(formData.get("journalId"));
  const conferenceId = optionalString(formData.get("conferenceId"));
  const suggestedJournalId = optionalString(formData.get("suggestedJournalId"));
  const suggestedConferenceId = optionalString(
    formData.get("suggestedConferenceId"),
  );
  const isSuggestedVenueSubmitTask =
    (taskType === ResearchTaskType.SUBMIT_RESEARCH &&
      Boolean(suggestedJournalId)) ||
    (taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
      Boolean(suggestedConferenceId));
  const isChiefAssistantSuggestedVenueSubmitTask =
    user.roles.includes(Role.CHIEF_ASSISTANT) &&
    !user.roles.includes(Role.ADMIN) &&
    isSuggestedVenueSubmitTask;
  const checkerId = isChiefAssistantSuggestedVenueSubmitTask
    ? user.id
    : optionalString(formData.get("checkerId"));

  if (
    !(await taskAssigneesAreSelectableByUser({
      assigneeIds,
      user,
      allowChiefAssistantSelf: isChiefAssistantSuggestedVenueSubmitTask,
    }))
  ) {
    return { ok: false, reason: "INACTIVE_RESEARCH_ASSIGNEE" };
  }

  if (
    !isChiefAssistantSuggestedVenueSubmitTask &&
    !(await taskCheckerIsSelectableByAdmin({ checkerId, user }))
  ) {
    return { ok: false, reason: "INVALID_CHECKER" };
  }

  const reviewId = optionalString(formData.get("reviewId"));
  let accountId = optionalString(formData.get("accountId"));
  const allowAssigneeReportUpload =
    formData.get("allowAssigneeReportUpload") === "true";
  const isUrgent = formData.get("isUrgent") === "true";
  const journalTargetCount =
    taskType === ResearchTaskType.ADD_JOURNAL
      ? positiveIntFromForm(formData.get("journalTargetCount"))
      : null;
  const suggestedVenueTargetCount =
    taskType === ResearchTaskType.SUGGEST_VENUE
      ? (positiveIntFromForm(formData.get("suggestedVenueTargetCount")) ?? 2)
      : null;
  if (
    taskType === ResearchTaskType.ADD_JOURNAL &&
    (!journalTargetCount || journalTargetCount > 30)
  ) {
    return { ok: false, reason: "INVALID_JOURNAL_TARGET_COUNT" };
  }
  if (
    taskType === ResearchTaskType.SUGGEST_VENUE &&
    (!suggestedVenueTargetCount || suggestedVenueTargetCount > 30)
  ) {
    return { ok: false, reason: "INVALID_SUGGESTED_VENUE_TARGET_COUNT" };
  }

  const canCreateSuggestedVenueSubmitTask =
    isChiefAssistantSuggestedVenueSubmitTask &&
    (await suggestedVenueSubmitTaskIsSelectable({
      taskType,
      projectId,
      journalId,
      conferenceId,
      suggestedJournalId,
      suggestedConferenceId,
    }));
  const canCreateProjectTask =
    canCreateSuggestedVenueSubmitTask ||
    (await canCreateResearchTaskForProject({
      user,
      projectId,
      organizedProjectId,
      taskType,
    }));

  if (!canCreateProjectTask) {
    return { ok: false, reason: "UNAUTHORIZED" };
  }

  if (
    (taskType === ResearchTaskType.SUBMIT_RESEARCH &&
      (!projectId || !journalId)) ||
    (taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
      (!projectId || !conferenceId)) ||
    (taskType === ResearchTaskType.PRODUCTION && !projectId) ||
    (taskType === ResearchTaskType.SUGGEST_VENUE && !projectId) ||
    (taskType === ResearchTaskType.REVIEW && !reviewId) ||
    (taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED &&
      !organizedProjectId)
  ) {
    return { ok: false, reason: "MISSING_ASSOCIATION" };
  }

  if (
    projectId &&
    taskType !== ResearchTaskType.OTHER &&
    taskType !== ResearchTaskType.PROPOSAL &&
    (await researchContentIsLocked(projectId))
  ) {
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

  if (taskType === ResearchTaskType.SUBMIT_RESEARCH && journalId) {
    const journalAccounts = await journalAccountIds(journalId);
    if (!accountId && journalAccounts.length === 1) {
      accountId = journalAccounts[0]?.id ?? null;
    }
    if (!accountId && journalAccounts.length > 1) {
      return { ok: false, reason: "ACCOUNT_REQUIRED" };
    }
    if (
      accountId &&
      !journalAccounts.some((account) => account.id === accountId)
    ) {
      return { ok: false, reason: "ACCOUNT_NOT_FOR_JOURNAL" };
    }
  }

  if (
    projectId &&
    (taskType === ResearchTaskType.SUBMIT_RESEARCH ||
      taskType === ResearchTaskType.SUBMIT_CONFERENCE) &&
    !(await researchProductionIsComplete(projectId)) &&
    !canCreateProjectTask
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

  const taskFile = await taskAssignerFileFromForm(formData);
  if (taskFile?.ok === false) {
    return { ok: false, reason: taskFile.reason };
  }
  const resolvedTaskGuideIds =
    taskGuideIds.length > 0
      ? taskGuideIds
      : await defaultTaskGuideIdsForTask({
          taskType,
          proposalScope,
          productionSubtype,
        });

  const task = await prisma.researchTask.create({
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled task",
      taskCode: await generateTaskCode(),
      description:
        optionalString(formData.get("description")) ??
        defaultDescriptionForTask(taskType),
      category: taskCategoryFromForm(formData.get("category")),
      taskType,
      productionSubtype,
      proposalScope:
        taskType === ResearchTaskType.PROPOSAL
          ? proposalScope
          : ProposalTaskScope.RESEARCH,
      status: ResearchTaskStatus.IN_PROGRESS,
      projectId,
      organizedProjectId,
      journalId,
      conferenceId,
      reviewId,
      accountId,
      isUrgent,
      allowAssigneeReportUpload,
      journalTargetCount,
      suggestedVenueTargetCount,
      checkerId,
      dueDate: researchTaskDueDate(optionalString(formData.get("dueDate"))),
      createdById: user.id,
      ...(taskFile?.ok ? taskFile.data : {}),
      assignments: {
        create: assigneeIds.map((userId) => ({ userId })),
      },
      guides: {
        connect: resolvedTaskGuideIds.map((id) => ({ id })),
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdById: true,
      checkerId: true,
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

  if (
    taskType === ResearchTaskType.SUBMIT_RESEARCH &&
    projectId &&
    journalId &&
    suggestedJournalId
  ) {
    await prisma.suggestedJournal.updateMany({
      where: {
        id: suggestedJournalId,
        projectId,
        journalId,
        OR: [{ submissionTaskId: null }, { submissionTaskId: task.id }],
      },
      data: { submissionTaskId: task.id },
    });
  }

  if (
    taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
    projectId &&
    conferenceId &&
    suggestedConferenceId
  ) {
    await prisma.suggestedConference.updateMany({
      where: {
        id: suggestedConferenceId,
        projectId,
        conferenceId,
        OR: [{ submissionTaskId: null }, { submissionTaskId: task.id }],
      },
      data: { submissionTaskId: task.id },
    });
  }

  await notifyUsers({
    userIds: assigneeIds,
    type: "TASK_ASSIGNED",
    title: "Task assigned",
    summary: task.title,
    body: task.description
      ? `Assigned to you. Note: ${task.description}`
      : "Assigned to you.",
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
  if (task.checkerId) {
    await notifyUsers({
      userIds: [task.checkerId],
      type: "TASK_CHECKER_ASSIGNED",
      title: "Task checker assigned",
      summary: task.title,
      body: "Admin assigned you as checker for this task. You can review clarification requests, approve completion, request redo, revoke, and edit this task.",
      href: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
      excludeUserId: user.id,
    });
    await sendTaskCheckerAssignedEmail({
      checkerId: task.checkerId,
      taskTitle: task.title,
      taskId: task.id,
      detail: task.description ?? undefined,
    });
  }

  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  if (reviewId) revalidatePath(`/reviews/${reviewId}`);
  if (organizedProjectId)
    revalidatePath(`/organized-projects/${organizedProjectId}`);
  return { ok: true };
}

export async function updateResearchTask(taskId: string, formData: FormData) {
  const user = await requireCurrentUser();
  requireResearchAdmin(user.roles);

  const currentTask = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      organizedProjectId: true,
      reviewId: true,
      status: true,
      createdById: true,
      checkerId: true,
      taskType: true,
      addedJournals: { select: { resultPosition: true } },
      proposalResults: { select: { id: true } },
      assignments: { select: { userId: true } },
    },
  });
  if (!currentTask) return { ok: false, reason: "NOT_FOUND" };
  if (!(await canManageTaskAsResearchAdmin(taskId, user))) redirect("/401");
  const isClosedTask =
    currentTask.status === ResearchTaskStatus.COMPLETED ||
    currentTask.status === ResearchTaskStatus.REVOKED;
  if (isClosedTask && !user.roles.includes(Role.ADMIN)) {
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

  if (!(await taskAssigneesAreSelectableByUser({ assigneeIds, user }))) {
    return { ok: false, reason: "INACTIVE_RESEARCH_ASSIGNEE" };
  }

  const requestedCheckerId = optionalString(formData.get("checkerId"));
  if (
    user.roles.includes(Role.ADMIN) &&
    !(await taskCheckerIsSelectableByAdmin({
      checkerId: requestedCheckerId,
      user,
    }))
  ) {
    return { ok: false, reason: "INVALID_CHECKER" };
  }
  const checkerId = user.roles.includes(Role.ADMIN)
    ? requestedCheckerId
    : currentTask.checkerId;

  const taskType = taskTypeFromForm(formData.get("taskType"));
  if (!taskType) return { ok: false, reason: "MISSING_ASSOCIATION" };
  const proposalScope = proposalTaskScopeFromForm(
    formData.get("proposalScope"),
  );
  const productionSubtype =
    taskType === ResearchTaskType.PRODUCTION
      ? (productionSubtypeFromForm(formData.get("productionSubtype")) ??
        ResearchProductionSubtype.IDEA_FORMING)
      : null;
  const taskGuideIds = orderedUniqueStrings(formData.getAll("taskGuideIds"));
  const projectId = optionalString(formData.get("projectId"));
  const organizedProjectId = optionalString(formData.get("organizedProjectId"));
  const journalId = optionalString(formData.get("journalId"));
  const conferenceId = optionalString(formData.get("conferenceId"));
  const reviewId = optionalString(formData.get("reviewId"));
  const accountId = optionalString(formData.get("accountId"));
  const allowAssigneeReportUpload =
    formData.get("allowAssigneeReportUpload") === "true";
  const isUrgent = formData.get("isUrgent") === "true";
  const journalTargetCount =
    taskType === ResearchTaskType.ADD_JOURNAL
      ? positiveIntFromForm(formData.get("journalTargetCount"))
      : null;
  const suggestedVenueTargetCount =
    taskType === ResearchTaskType.SUGGEST_VENUE
      ? (positiveIntFromForm(formData.get("suggestedVenueTargetCount")) ?? 2)
      : null;
  if (
    taskType === ResearchTaskType.ADD_JOURNAL &&
    (!journalTargetCount || journalTargetCount > 30)
  ) {
    return { ok: false, reason: "INVALID_JOURNAL_TARGET_COUNT" };
  }
  if (
    taskType === ResearchTaskType.SUGGEST_VENUE &&
    (!suggestedVenueTargetCount || suggestedVenueTargetCount > 30)
  ) {
    return { ok: false, reason: "INVALID_SUGGESTED_VENUE_TARGET_COUNT" };
  }
  const highestFilledJournalPosition = currentTask.addedJournals.reduce(
    (highest, journal) => Math.max(highest, journal.resultPosition ?? -1),
    -1,
  );
  if (
    currentTask.addedJournals.length > 0 &&
    taskType !== ResearchTaskType.ADD_JOURNAL
  ) {
    return { ok: false, reason: "TASK_HAS_JOURNAL_RESULTS" };
  }
  if (
    currentTask.proposalResults.length > 0 &&
    taskType !== ResearchTaskType.PROPOSAL
  ) {
    return { ok: false, reason: "TASK_HAS_PROPOSAL_RESULT" };
  }
  if (
    taskType === ResearchTaskType.ADD_JOURNAL &&
    journalTargetCount !== null &&
    journalTargetCount <= highestFilledJournalPosition
  ) {
    return { ok: false, reason: "JOURNAL_TARGET_BELOW_RESULTS" };
  }
  const effectiveProjectId =
    taskType === ResearchTaskType.SUBMIT_RESEARCH ||
    taskType === ResearchTaskType.SUBMIT_CONFERENCE ||
    taskType === ResearchTaskType.PRODUCTION ||
    taskType === ResearchTaskType.SUGGEST_VENUE ||
    taskType === ResearchTaskType.PROPOSAL ||
    taskType === ResearchTaskType.OTHER
      ? projectId
      : null;
  const effectiveOrganizedProjectId =
    taskType === ResearchTaskType.PROJECT_PRODUCTION ||
    taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED ||
    (taskType === ResearchTaskType.PROPOSAL && !projectId)
      ? organizedProjectId
      : null;

  if (
    (taskType === ResearchTaskType.SUBMIT_RESEARCH &&
      (!effectiveProjectId || !journalId)) ||
    (taskType === ResearchTaskType.SUBMIT_CONFERENCE &&
      (!effectiveProjectId || !conferenceId)) ||
    (taskType === ResearchTaskType.PRODUCTION && !effectiveProjectId) ||
    (taskType === ResearchTaskType.SUGGEST_VENUE && !effectiveProjectId) ||
    (taskType === ResearchTaskType.REVIEW && !reviewId) ||
    (taskType === ResearchTaskType.PROJECT_RESEARCH_ASSOCIATED &&
      !effectiveOrganizedProjectId)
  ) {
    return { ok: false, reason: "MISSING_ASSOCIATION" };
  }

  if (
    !isClosedTask &&
    effectiveProjectId &&
    taskType !== ResearchTaskType.OTHER &&
    taskType !== ResearchTaskType.PROPOSAL &&
    (await researchContentIsLocked(effectiveProjectId))
  ) {
    return { ok: false, reason: "RESEARCH_LOCKED" };
  }

  const associationBlockReason = isClosedTask
    ? null
    : await taskAssociationIsSelectable({
        taskType,
        projectId: effectiveProjectId,
        reviewId,
        organizedProjectId: effectiveOrganizedProjectId,
      });
  if (associationBlockReason) {
    return { ok: false, reason: associationBlockReason };
  }

  if (accountId && taskType === ResearchTaskType.SUBMIT_RESEARCH) {
    if (!journalId || !(await accountBelongsToJournal(accountId, journalId))) {
      return { ok: false, reason: "ACCOUNT_NOT_FOR_JOURNAL" };
    }
  }

  if (
    !isClosedTask &&
    effectiveProjectId &&
    (taskType === ResearchTaskType.SUBMIT_RESEARCH ||
      taskType === ResearchTaskType.SUBMIT_CONFERENCE) &&
    !(await researchProductionIsComplete(effectiveProjectId))
  ) {
    return { ok: false, reason: "PRODUCTION_INCOMPLETE" };
  }

  if (
    !isClosedTask &&
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
    !isClosedTask &&
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
        description:
          optionalString(formData.get("description")) ??
          defaultDescriptionForTask(taskType),
        category: taskCategoryFromForm(formData.get("category")),
        taskType,
        productionSubtype,
        proposalScope:
          taskType === ResearchTaskType.PROPOSAL
            ? proposalScope
            : ProposalTaskScope.RESEARCH,
        projectId: effectiveProjectId,
        organizedProjectId: effectiveOrganizedProjectId,
        journalId:
          taskType === ResearchTaskType.SUBMIT_RESEARCH ||
          taskType === ResearchTaskType.OTHER
            ? journalId
            : null,
        accountId:
          taskType === ResearchTaskType.SUBMIT_RESEARCH ? accountId : null,
        conferenceId:
          taskType === ResearchTaskType.SUBMIT_CONFERENCE ||
          taskType === ResearchTaskType.OTHER
            ? conferenceId
            : null,
        reviewId: taskType === ResearchTaskType.REVIEW ? reviewId : null,
        isUrgent,
        allowAssigneeReportUpload,
        journalTargetCount,
        suggestedVenueTargetCount,
        checkerId,
        ...(!allowAssigneeReportUpload
          ? {
              reportFileName: null,
              reportFileType: null,
              reportFileSize: null,
              reportFileData: null,
              reportUploadedAt: null,
              reportUploadedById: null,
            }
          : {}),
        dueDate: researchTaskDueDate(optionalString(formData.get("dueDate"))),
        ...(formData.has("taskGuideIds")
          ? { guides: { set: taskGuideIds.map((id) => ({ id })) } }
          : {}),
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
        ? `Assigned to you. Note: ${task.description}`
        : "Assigned to you.",
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

  if (checkerId && checkerId !== currentTask.checkerId) {
    await notifyUsers({
      userIds: [checkerId],
      type: "TASK_CHECKER_ASSIGNED",
      title: "Task checker assigned",
      summary: task.title,
      body: "Admin assigned you as checker for this task. You can review clarification requests, approve completion, request redo, revoke, and edit this task.",
      href: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
      excludeUserId: user.id,
    });
    await sendTaskCheckerAssignedEmail({
      checkerId,
      taskTitle: task.title,
      taskId: task.id,
    });
  }
  if (currentTask.checkerId && !checkerId) {
    await notifyUsers({
      userIds: [currentTask.checkerId],
      type: "TASK_CHECKER_REMOVED",
      title: "Task checker removed",
      summary: task.title,
      body: "Admin removed you as checker for this task.",
      href: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
      excludeUserId: user.id,
    });
  }
  await notifyTaskAdminsAndChecker({
    taskId,
    userIds: [
      currentTask.createdById,
      user.roles.includes(Role.ADMIN) ? checkerId : currentTask.checkerId,
    ],
    type: "TASK_UPDATED_REVIEWER_NOTICE",
    title: "Task updated",
    summary: task.title,
    body: "Task details, associations, or assignees were updated by another task manager.",
    excludeUserId: user.id,
  });

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

export async function updateTaskSuggestedReviewers(
  taskId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const reviewerIds = orderedUniqueStrings(formData.getAll("reviewerIds"));

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      taskType: true,
      status: true,
      createdById: true,
      checkerId: true,
      journalId: true,
    },
  });

  if (!task) return { ok: false, reason: "NOT_FOUND" };
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return { ok: false, reason: "TASK_CLOSED" };
  }
  if (task.taskType !== ResearchTaskType.SUBMIT_RESEARCH || !task.journalId) {
    return { ok: false, reason: "NOT_JOURNAL_SUBMIT_TASK" };
  }

  const canManage =
    user.roles.includes(Role.ADMIN) ||
    task.createdById === user.id ||
    task.checkerId === user.id;
  if (!canManage) redirect("/401");

  if (reviewerIds.length > 0) {
    const reviewerCount = await prisma.suggestedReviewer.count({
      where: { id: { in: reviewerIds } },
    });
    if (reviewerCount !== reviewerIds.length) {
      return { ok: false, reason: "INVALID_REVIEWER" };
    }
  }

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      suggestedReviewers: {
        set: reviewerIds.map((id) => ({ id })),
      },
    },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  return { ok: true };
}

export async function revokeResearchTask(taskId: string, formData?: FormData) {
  const user = await requireCurrentUser();
  const isAdmin = await canManageTaskAsResearchAdmin(taskId, user);
  const reason = optionalString(formData?.get("reason") ?? null);
  const transferTask = formData?.get("transferTask") === "true";
  const transferAssigneeIds = orderedUniqueStrings(
    formData?.getAll("transferAssigneeIds") ?? [],
  );
  const reasonLine = reason
    ? `Reason: ${reason}`
    : "No revoke reason provided.";

  const currentTask = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      dueDate: true,
      createdById: true,
      checkerId: true,
      projectId: true,
      organizedProjectId: true,
      journalId: true,
      conferenceId: true,
      reviewId: true,
      accountId: true,
      taskType: true,
      proposalScope: true,
      taskFileName: true,
      taskFileType: true,
      taskFileSize: true,
      taskFileData: true,
      isUrgent: true,
      allowAssigneeReportUpload: true,
      journalTargetCount: true,
      assignments: {
        select: { userId: true },
      },
      guides: { select: { id: true } },
      suggestedReviewers: { select: { id: true } },
    },
  });
  if (!currentTask) return;
  if (!isAdmin && currentTask.createdById !== user.id) redirect("/401");

  const oldAssigneeIds = currentTask.assignments.map(
    (assignment) => assignment.userId,
  );
  const invalidTransferAssignees = transferAssigneeIds.some((assigneeId) =>
    oldAssigneeIds.includes(assigneeId),
  );
  if (transferTask) {
    if (transferAssigneeIds.length === 0 || invalidTransferAssignees) {
      throw new Error(
        "Choose at least one new assignee who is not already assigned to this task.",
      );
    }
    if (
      !(await taskAssigneesAreSelectableByUser({
        assigneeIds: transferAssigneeIds,
        user,
      }))
    ) {
      throw new Error("Choose only active research-site users as assignees.");
    }
  }

  const newTaskCode = transferTask ? await generateTaskCode() : null;
  const { task, transferredTask } = await prisma.$transaction(async (tx) => {
    const revokedTask = await tx.researchTask.update({
      where: { id: taskId },
      data: {
        status: ResearchTaskStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: { connect: { id: user.id } },
        revokeReason: reason,
        completedAt: null,
        completedBy: { disconnect: true },
        completionMessage: null,
        adminViewedAt: null,
      },
      select: {
        projectId: true,
        title: true,
        createdById: true,
        checkerId: true,
        assignments: {
          select: { userId: true, user: { select: { email: true } } },
        },
        clarifications: {
          where: { answer: null },
          select: { requestedById: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const createdTransferTask =
      transferTask && newTaskCode
        ? await tx.researchTask.create({
            data: {
              title: currentTask.title,
              taskCode: newTaskCode,
              description: currentTask.description,
              category: currentTask.category,
              taskType: currentTask.taskType,
              proposalScope: currentTask.proposalScope,
              status: ResearchTaskStatus.IN_PROGRESS,
              projectId: currentTask.projectId,
              organizedProjectId: currentTask.organizedProjectId,
              journalId: currentTask.journalId,
              conferenceId: currentTask.conferenceId,
              reviewId: currentTask.reviewId,
              accountId: currentTask.accountId,
              dueDate: currentTask.dueDate,
              createdById: currentTask.createdById,
              checkerId: currentTask.checkerId,
              taskFileName: currentTask.taskFileName,
              taskFileType: currentTask.taskFileType,
              taskFileSize: currentTask.taskFileSize,
              taskFileData: currentTask.taskFileData,
              isUrgent: currentTask.isUrgent,
              allowAssigneeReportUpload: currentTask.allowAssigneeReportUpload,
              journalTargetCount: currentTask.journalTargetCount,
              transferredFromTaskId: taskId,
              assignments: {
                create: transferAssigneeIds.map((userId) => ({ userId })),
              },
              guides:
                currentTask.guides.length > 0
                  ? {
                      connect: currentTask.guides.map((guide) => ({
                        id: guide.id,
                      })),
                    }
                  : undefined,
              suggestedReviewers:
                currentTask.suggestedReviewers.length > 0
                  ? {
                      connect: currentTask.suggestedReviewers.map(
                        (reviewer) => ({
                          id: reviewer.id,
                        }),
                      ),
                    }
                  : undefined,
            },
            select: {
              id: true,
              title: true,
              assignments: {
                select: {
                  userId: true,
                  user: { select: { email: true, name: true } },
                },
              },
            },
          })
        : null;

    return { task: revokedTask, transferredTask: createdTransferTask };
  });

  await notifyUsers({
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: "TASK_REVOKED",
    title: "Task revoked",
    summary: task.title,
    body: reason
      ? `This task was revoked. ${reasonLine}`
      : "This task was revoked.",
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
    detail: reasonLine,
    taskTitle: task.title,
    taskId,
    actionLabel: "View task",
  });

  if (transferredTask) {
    const assigneeNames = transferredTask.assignments
      .map((assignment) => assignment.user.name || assignment.user.email)
      .join(", ");
    await notifyUsers({
      userIds: transferredTask.assignments.map(
        (assignment) => assignment.userId,
      ),
      type: "TASK_ASSIGNED",
      title: "Task transferred to you",
      summary: transferredTask.title,
      body: `This task was transferred from a revoked task. Previous task: ${task.title}.`,
      href: `/tasks/${transferredTask.id}`,
      entityType: "task",
      entityId: transferredTask.id,
      excludeUserId: user.id,
    });
    await sendTaskEmail({
      to: transferredTask.assignments.map(
        (assignment) => assignment.user.email,
      ),
      subject: `Task transferred: ${transferredTask.title}`,
      heading: "Task transferred to you",
      intro:
        "A revoked task has been transferred and assigned to you as a new task.",
      detail: `Transferred from: ${task.title}. New assignee${transferredTask.assignments.length === 1 ? "" : "s"}: ${assigneeNames}.`,
      taskTitle: transferredTask.title,
      taskId: transferredTask.id,
      actionLabel: "View new task",
    });
  }

  await notifyTaskAdminsAndChecker({
    taskId,
    userIds: [task.createdById, task.checkerId],
    type: "TASK_REVOKED_REVIEWER_NOTICE",
    title: "Task revoked",
    summary: task.title,
    body: reason
      ? `This task was revoked by another task manager. ${reasonLine}`
      : "This task was revoked by another task manager.",
    excludeUserId: user.id,
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  if (transferredTask) revalidatePath(`/tasks/${transferredTask.id}`);
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
  if (!(await canManageTaskAsResearchAdmin(taskId, user))) redirect("/401");

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
  requireResearchAdmin(user.roles);

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
            ? {
                update: {
                  contentUnlocked: false,
                  authorsUnlocked: false,
                },
              }
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
            body: `Journal: ${submission.journal.name}. Status: In review.`,
          }
        : journalStatus === SubmissionStatus.ACCEPTED
          ? {
              type: "RESEARCH_ACCEPTED",
              title: "Research accepted",
              body: `Journal: ${submission.journal.name}. Status: Accepted.`,
            }
          : journalStatus === SubmissionStatus.PUBLISHED
            ? {
                type: "RESEARCH_PUBLISHED",
                title: "Research published",
                body: `Journal: ${submission.journal.name}. Status: Published.`,
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
            body: normalizedNotification.body,
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
      data: {
        ...data,
        project:
          conferenceStatus === ConferenceSubmissionStatus.ACCEPTED ||
          conferenceStatus === ConferenceSubmissionStatus.PUBLISHED
            ? { update: { authorsUnlocked: false } }
            : undefined,
      },
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
            body: `Conference: ${submission.conference.name}. Status: In review.`,
          }
        : conferenceStatus === ConferenceSubmissionStatus.ACCEPTED
          ? {
              type: "RESEARCH_ACCEPTED",
              title: "Research accepted",
              body: `Conference: ${submission.conference.name}. Status: Accepted.`,
            }
          : conferenceStatus === ConferenceSubmissionStatus.PUBLISHED
            ? {
                type: "RESEARCH_PUBLISHED",
                title: "Research published",
                body: `Conference: ${submission.conference.name}. Status: Published.`,
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
            body: normalizedNotification.body,
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

export async function updateSubmissionDetails(formData: FormData) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const submissionId = optionalString(formData.get("submissionId"));
  const submissionKind = optionalString(formData.get("submissionKind"));
  const researchProjectId = optionalString(formData.get("researchProjectId"));
  const venueId = optionalString(formData.get("venueId"));
  const submittedAt = dateFromForm(formData.get("submittedAt"));

  if (
    !submissionId ||
    !submissionKind ||
    !researchProjectId ||
    !venueId ||
    !submittedAt
  ) {
    return { ok: false, message: "Complete all required submission fields." };
  }

  try {
    if (submissionKind === "journal") {
      const current = await prisma.researchSubmission.findUnique({
        where: { id: submissionId },
        select: { researchProjectId: true, journalId: true },
      });
      if (!current) return { ok: false, message: "Submission was not found." };

      const accountId = optionalString(formData.get("accountId"));
      if (accountId) {
        if (!(await accountBelongsToJournal(accountId, venueId))) {
          return {
            ok: false,
            message: "The selected account does not belong to this journal.",
          };
        }
      }

      await prisma.researchSubmission.update({
        where: { id: submissionId },
        data: {
          researchProjectId,
          journalId: venueId,
          accountId,
          submittedAt,
        },
      });

      await Promise.all([
        refreshResearchStage(current.researchProjectId),
        current.researchProjectId === researchProjectId
          ? Promise.resolve()
          : refreshResearchStage(researchProjectId),
      ]);
      revalidatePath(`/journals/${current.journalId}`);
      revalidatePath(`/journals/${venueId}`);
      revalidatePath(`/projects/${current.researchProjectId}`);
      revalidatePath(`/projects/${researchProjectId}`);
    } else if (submissionKind === "conference") {
      const current = await prisma.conferenceSubmission.findUnique({
        where: { id: submissionId },
        select: { researchProjectId: true, conferenceId: true },
      });
      if (!current) return { ok: false, message: "Submission was not found." };

      await prisma.conferenceSubmission.update({
        where: { id: submissionId },
        data: {
          researchProjectId,
          conferenceId: venueId,
          submittedAt,
          note: optionalString(formData.get("note")),
        },
      });

      revalidatePath(`/conferences/${current.conferenceId}`);
      revalidatePath(`/conferences/${venueId}`);
      revalidatePath(`/projects/${current.researchProjectId}`);
      revalidatePath(`/projects/${researchProjectId}`);
    } else {
      return { ok: false, message: "Submission type is not valid." };
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message:
          "This research already has a submission for the selected venue.",
      };
    }
    throw error;
  }

  revalidatePath("/submissions");
  revalidatePath("/projects");
  return { ok: true };
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

async function unfinishedSuggestVenueTaskIdForUser(
  projectId: string,
  userId: string,
) {
  const task = await prisma.researchTask.findFirst({
    where: {
      projectId,
      taskType: ResearchTaskType.SUGGEST_VENUE,
      status: {
        notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
      },
      assignments: { some: { userId } },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  return task?.id ?? null;
}

async function validateSuggestedVenueTaskLink({
  projectId,
  currentTaskId,
  nextTaskId,
}: {
  projectId: string;
  currentTaskId: string | null;
  nextTaskId: string | null;
}) {
  if (currentTaskId && currentTaskId !== nextTaskId) {
    const currentTask = await prisma.researchTask.findUnique({
      where: { id: currentTaskId },
      select: { status: true },
    });
    if (currentTask?.status === ResearchTaskStatus.COMPLETED) {
      return {
        ok: false as const,
        message:
          "This suggestion is linked to a completed suggest venue task, so the task link cannot be changed.",
      };
    }
  }

  if (!nextTaskId) return { ok: true as const };

  const nextTask = await prisma.researchTask.findFirst({
    where: {
      id: nextTaskId,
      projectId,
      taskType: ResearchTaskType.SUGGEST_VENUE,
    },
    select: { id: true },
  });
  if (!nextTask) {
    return {
      ok: false as const,
      message: "Choose a suggest venue task from this research.",
    };
  }

  return { ok: true as const };
}

export async function addTaskSuggestedVenue(
  taskId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      taskType: true,
      status: true,
      assignments: { select: { userId: true } },
    },
  });
  if (!task || task.taskType !== ResearchTaskType.SUGGEST_VENUE) {
    return { ok: false, message: "Suggest venue task was not found." };
  }
  if (!task.projectId) {
    return { ok: false, message: "Link this task to a research first." };
  }
  if (
    task.status === ResearchTaskStatus.COMPLETED ||
    task.status === ResearchTaskStatus.REVOKED
  ) {
    return { ok: false, message: "This task is already closed." };
  }
  if (!task.assignments.some((assignment) => assignment.userId === user.id)) {
    redirect("/401");
  }
  if (await researchContentIsLocked(task.projectId)) {
    return { ok: false, message: "Unlock the research before adding venues." };
  }

  const venueKind = optionalString(formData.get("venueKind"));
  const journalId = optionalString(formData.get("journalId"));
  const conferenceId = optionalString(formData.get("conferenceId"));
  const venueName = optionalString(formData.get("venueName"));
  const venueLink = optionalString(formData.get("venueLink"));
  const note = optionalString(formData.get("note"));
  const apc = optionalString(formData.get("apc"));
  const submissionFee = optionalString(formData.get("submissionFee"));
  if (venueKind !== "journal" && venueKind !== "conference") {
    return { ok: false, message: "Choose journal or conference." };
  }
  if (!journalId && !conferenceId && !venueName && !venueLink) {
    return { ok: false, message: "Enter at least a venue name or link." };
  }
  if (venueKind === "journal" && conferenceId) {
    return { ok: false, message: "Choose a journal for this suggestion." };
  }
  if (venueKind === "conference" && journalId) {
    return { ok: false, message: "Choose a conference for this suggestion." };
  }

  const linkedJournal =
    venueKind === "journal" && journalId
      ? await prisma.journal.findFirst({
          where: {
            id: journalId,
            approvalStatus: JournalApprovalStatus.APPROVED,
          },
          select: {
            id: true,
            name: true,
            homepageLink: true,
            submissionLink: true,
          },
        })
      : null;
  const linkedConference =
    venueKind === "conference" && conferenceId
      ? await prisma.conference.findUnique({
          where: { id: conferenceId },
          select: { id: true, name: true, website: true },
        })
      : null;
  if (journalId && !linkedJournal) {
    return { ok: false, message: "Choose an approved journal on the site." };
  }
  if (conferenceId && !linkedConference) {
    return { ok: false, message: "Choose a conference on the site." };
  }

  if (journalId) {
    const existing = await prisma.suggestedJournal.findUnique({
      where: { projectId_journalId: { projectId: task.projectId, journalId } },
      select: { id: true, taskId: true, status: true },
    });
    if (
      existing &&
      existing.taskId !== task.id &&
      existing.status !== SuggestedVenueStatus.DECLINED
    ) {
      return {
        ok: false,
        message: "This journal is already suggested for this research.",
      };
    }
  }

  if (conferenceId) {
    const existing = await prisma.suggestedConference.findUnique({
      where: {
        projectId_conferenceId: {
          projectId: task.projectId,
          conferenceId,
        },
      },
      select: { id: true, taskId: true, status: true },
    });
    if (
      existing &&
      existing.taskId !== task.id &&
      existing.status !== SuggestedVenueStatus.DECLINED
    ) {
      return {
        ok: false,
        message: "This conference is already suggested for this research.",
      };
    }
  }

  const suggestion =
    venueKind === "journal"
      ? journalId
        ? await prisma.suggestedJournal.upsert({
            where: {
              projectId_journalId: { projectId: task.projectId, journalId },
            },
            create: {
              projectId: task.projectId,
              taskId: task.id,
              journalId,
              createdById: user.id,
              status: SuggestedVenueStatus.PENDING,
              requiresApproval: true,
              venueName: venueName ?? linkedJournal?.name ?? null,
              venueLink:
                venueLink ??
                linkedJournal?.submissionLink ??
                linkedJournal?.homepageLink ??
                null,
              apc,
              submissionFee,
              note,
            },
            update: {
              taskId: task.id,
              createdById: user.id,
              status: SuggestedVenueStatus.PENDING,
              requiresApproval: true,
              approvedAt: null,
              approvedById: null,
              declinedAt: null,
              declinedById: null,
              declineReason: null,
              venueName: venueName ?? linkedJournal?.name ?? null,
              venueLink:
                venueLink ??
                linkedJournal?.submissionLink ??
                linkedJournal?.homepageLink ??
                null,
              apc,
              submissionFee,
              note,
            },
          })
        : await prisma.suggestedJournal.create({
            data: {
              projectId: task.projectId,
              taskId: task.id,
              createdById: user.id,
              status: SuggestedVenueStatus.PENDING,
              requiresApproval: true,
              venueName,
              venueLink,
              apc,
              submissionFee,
              note,
            },
          })
      : conferenceId
        ? await prisma.suggestedConference.upsert({
            where: {
              projectId_conferenceId: {
                projectId: task.projectId,
                conferenceId,
              },
            },
            create: {
              projectId: task.projectId,
              taskId: task.id,
              conferenceId,
              createdById: user.id,
              status: SuggestedVenueStatus.PENDING,
              requiresApproval: true,
              venueName: venueName ?? linkedConference?.name ?? null,
              venueLink: venueLink ?? linkedConference?.website ?? null,
              note,
            },
            update: {
              taskId: task.id,
              createdById: user.id,
              status: SuggestedVenueStatus.PENDING,
              requiresApproval: true,
              approvedAt: null,
              approvedById: null,
              declinedAt: null,
              declinedById: null,
              declineReason: null,
              venueName: venueName ?? linkedConference?.name ?? null,
              venueLink: venueLink ?? linkedConference?.website ?? null,
              note,
            },
          })
        : await prisma.suggestedConference.create({
            data: {
              projectId: task.projectId,
              taskId: task.id,
              createdById: user.id,
              status: SuggestedVenueStatus.PENDING,
              requiresApproval: true,
              venueName,
              venueLink,
              note,
            },
          });

  await notifyVenueSuggestionApprovalNeeded({
    projectId: task.projectId,
    suggestionId: suggestion.id,
    venueName:
      venueName ??
      linkedJournal?.name ??
      linkedConference?.name ??
      (venueKind === "journal" ? "New journal" : "New conference"),
    kind: venueKind,
    createdById: user.id,
    adminOnly: true,
  });
  await markSuggestVenueTaskReadyIfFilled(task.id);

  revalidatePath(`/tasks/${task.id}`);
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  revalidatePath("/suggestions");
  return { ok: true };
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
  const apc = optionalString(formData.get("apc"));
  const submissionFee = optionalString(formData.get("submissionFee"));
  const note = optionalString(formData.get("note"));
  if (!journalId && !venueName && !venueLink) return;
  if (await researchContentIsLocked(projectId)) return;
  const taskId = await unfinishedSuggestVenueTaskIdForUser(projectId, user.id);

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
          requiresApproval: !canApprove,
          approvedAt: canApprove ? new Date() : null,
          approvedById: canApprove ? user.id : null,
          declinedAt: null,
          declinedById: null,
          declineReason: null,
          venueName: venueName ?? venue?.name ?? null,
          venueLink,
          note,
          ...(taskId ? { taskId } : {}),
        },
        create: {
          projectId,
          journalId,
          createdById: user.id,
          status,
          requiresApproval: !canApprove,
          approvedAt: canApprove ? new Date() : null,
          approvedById: canApprove ? user.id : null,
          venueName: venueName ?? venue?.name ?? null,
          venueLink,
          note,
          taskId,
        },
      })
    : await prisma.suggestedJournal.create({
        data: {
          projectId,
          createdById: user.id,
          status: SuggestedVenueStatus.PENDING,
          requiresApproval: true,
          venueName,
          venueLink,
          apc,
          submissionFee,
          note,
          taskId,
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
    await markSuggestVenueTaskReadyIfFilled(taskId);
  } else if (suggestion.status === SuggestedVenueStatus.APPROVED) {
    await markSuggestVenueTaskReadyIfFilled(taskId);
    const completedSuggestTask = await completeSuggestVenueTaskIfReady(
      taskId,
      user.id,
    );
    await notifyMergedSuggestedVenueApproval({
      projectId,
      suggestionId: suggestion.id,
      venueKind: "journal",
      venueName: venueName ?? venue?.name ?? "Journal",
      approverId: user.id,
      suggestedById: user.id,
      suggestedByEmail: null,
      approvalNote: null,
      submitTask: null,
      completedSuggestTask,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  if (taskId) revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/suggestions");
}

export async function updateSuggestedJournal(
  projectId: string,
  suggestionId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  if (!(await canSuggestVenueForResearch(projectId, user.id, user.roles))) {
    redirect("/401");
  }
  if (await researchContentIsLocked(projectId)) {
    return { ok: false, message: "Unlock the research before editing venues." };
  }

  const suggestion = await prisma.suggestedJournal.findFirst({
    where: { id: suggestionId, projectId },
    select: { journalId: true, status: true, taskId: true },
  });
  if (!suggestion) {
    return { ok: false, message: "Journal suggestion was not found." };
  }

  const hasJournalId = formData.has("journalId");
  const hasVenueName = formData.has("venueName");
  const hasVenueLink = formData.has("venueLink");
  const hasNote = formData.has("note");
  const hasTaskId = formData.has("taskId");
  const assistantNoteOnlyEdit =
    !user.roles.includes(Role.ADMIN) &&
    (user.roles.includes(Role.ASSISTANT) ||
      user.roles.includes(Role.CHIEF_ASSISTANT));
  if (
    assistantNoteOnlyEdit &&
    (hasJournalId || hasVenueName || hasVenueLink || hasTaskId)
  ) {
    return {
      ok: false,
      message:
        "Assistant accounts can only update the note of a suggested venue.",
    };
  }
  const journalId = hasJournalId
    ? optionalString(formData.get("journalId"))
    : suggestion.journalId;
  const venueName = hasVenueName
    ? optionalString(formData.get("venueName"))
    : undefined;
  const venueLink = hasVenueLink
    ? optionalString(formData.get("venueLink"))
    : undefined;
  const note = hasNote ? optionalString(formData.get("note")) : undefined;
  const taskId = hasTaskId ? optionalString(formData.get("taskId")) : null;
  if (
    !hasJournalId &&
    !hasVenueName &&
    !hasVenueLink &&
    !hasNote &&
    !hasTaskId
  ) {
    return { ok: false, message: "Update the venue or linked task." };
  }
  if (
    hasJournalId &&
    journalId &&
    !(await prisma.journal.count({ where: { id: journalId } }))
  ) {
    return { ok: false, message: "The selected journal was not found." };
  }
  if (hasTaskId) {
    const taskValidation = await validateSuggestedVenueTaskLink({
      projectId,
      currentTaskId: suggestion.taskId,
      nextTaskId: taskId,
    });
    if (!taskValidation.ok) return taskValidation;
  }

  const linkChanged = hasJournalId && journalId !== suggestion.journalId;
  const venueChanged = hasJournalId || hasVenueName || hasVenueLink;
  const resetForReview =
    linkChanged ||
    (venueChanged && suggestion.status === SuggestedVenueStatus.DECLINED);
  const canApproveChangedLink =
    journalId &&
    suggestion.status === SuggestedVenueStatus.APPROVED &&
    (await canApproveVenueSuggestionForResearch(
      projectId,
      user.id,
      user.roles,
    ));

  try {
    await prisma.suggestedJournal.update({
      where: { id: suggestionId },
      data: {
        ...(hasJournalId ? { journalId } : {}),
        ...(hasVenueName ? { venueName } : {}),
        ...(hasVenueLink ? { venueLink } : {}),
        ...(hasNote ? { note } : {}),
        ...(hasTaskId ? { taskId } : {}),
        ...(resetForReview
          ? {
              status: canApproveChangedLink
                ? SuggestedVenueStatus.APPROVED
                : SuggestedVenueStatus.PENDING,
              requiresApproval: !canApproveChangedLink,
              approvedAt: canApproveChangedLink ? new Date() : null,
              approvedById: canApproveChangedLink ? user.id : null,
              declinedAt: null,
              declinedById: null,
              declineReason: null,
            }
          : {}),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "This journal is already suggested for the research.",
      };
    }
    throw error;
  }

  revalidatePath(`/projects/${projectId}`);
  if (suggestion.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
  if (hasTaskId && taskId) revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/suggestions");
  return { ok: true };
}

export async function deleteSuggestedJournal(
  projectId: string,
  suggestionId: string,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);
  if (await researchContentIsLocked(projectId)) {
    return {
      ok: false,
      message: "Unlock this research before deleting a suggested venue.",
    };
  }

  const suggestion = await prisma.suggestedJournal.findFirst({
    where: { projectId, id: suggestionId },
    select: {
      taskId: true,
      submissionTaskId: true,
      journalCreationTaskId: true,
      journalId: true,
    },
  });
  if (!suggestion) {
    return { ok: false, message: "Suggested venue was not found." };
  }

  const linkedSubmission = suggestion.journalId
    ? await prisma.researchSubmission.findUnique({
        where: {
          researchProjectId_journalId: {
            researchProjectId: projectId,
            journalId: suggestion.journalId,
          },
        },
        select: { id: true, status: true },
      })
    : null;
  if (
    linkedSubmission &&
    (linkedSubmission.status === SubmissionStatus.ACCEPTED ||
      linkedSubmission.status === SubmissionStatus.PUBLISHED)
  ) {
    return {
      ok: false,
      message:
        "This suggested venue cannot be deleted because its submission is accepted or published.",
    };
  }

  const taskIds = [
    suggestion.submissionTaskId,
    suggestion.journalCreationTaskId,
  ].filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    if (linkedSubmission) {
      await tx.researchSubmission.delete({
        where: { id: linkedSubmission.id },
      });
    }
    await tx.suggestedJournal.delete({ where: { id: suggestionId } });
    if (taskIds.length > 0) {
      await tx.researchTask.deleteMany({ where: { id: { in: taskIds } } });
    }
  });

  revalidatePath(`/projects/${projectId}`);
  if (suggestion?.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
  for (const taskId of taskIds) revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/submissions");
  revalidatePath("/suggestions");
  return { ok: true };
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
  const note = optionalString(formData.get("note"));
  if (!conferenceId && !venueName && !venueLink) return;
  if (await researchContentIsLocked(projectId)) return;
  const taskId = await unfinishedSuggestVenueTaskIdForUser(projectId, user.id);

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
          requiresApproval: !canApprove,
          approvedAt: canApprove ? new Date() : null,
          approvedById: canApprove ? user.id : null,
          declinedAt: null,
          declinedById: null,
          declineReason: null,
          venueName: venueName ?? venue?.name ?? null,
          venueLink,
          note,
          ...(taskId ? { taskId } : {}),
        },
        create: {
          projectId,
          conferenceId,
          createdById: user.id,
          status,
          requiresApproval: !canApprove,
          approvedAt: canApprove ? new Date() : null,
          approvedById: canApprove ? user.id : null,
          venueName: venueName ?? venue?.name ?? null,
          venueLink,
          note,
          taskId,
        },
      })
    : await prisma.suggestedConference.create({
        data: {
          projectId,
          createdById: user.id,
          status: SuggestedVenueStatus.PENDING,
          requiresApproval: true,
          venueName,
          venueLink,
          note,
          taskId,
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
    await markSuggestVenueTaskReadyIfFilled(taskId);
  } else if (suggestion.status === SuggestedVenueStatus.APPROVED) {
    await markSuggestVenueTaskReadyIfFilled(taskId);
    const completedSuggestTask = await completeSuggestVenueTaskIfReady(
      taskId,
      user.id,
    );
    await notifyMergedSuggestedVenueApproval({
      projectId,
      suggestionId: suggestion.id,
      venueKind: "conference",
      venueName: venueName ?? venue?.name ?? "Conference",
      approverId: user.id,
      suggestedById: user.id,
      suggestedByEmail: null,
      approvalNote: null,
      submitTask: null,
      completedSuggestTask,
    });
  }

  revalidatePath(`/projects/${projectId}`);
  if (taskId) revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/suggestions");
}

export async function updateSuggestedConference(
  projectId: string,
  suggestionId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  if (!(await canSuggestVenueForResearch(projectId, user.id, user.roles))) {
    redirect("/401");
  }
  if (await researchContentIsLocked(projectId)) {
    return { ok: false, message: "Unlock the research before editing venues." };
  }

  const suggestion = await prisma.suggestedConference.findFirst({
    where: { id: suggestionId, projectId },
    select: { conferenceId: true, status: true, taskId: true },
  });
  if (!suggestion) {
    return { ok: false, message: "Conference suggestion was not found." };
  }

  const hasConferenceId = formData.has("conferenceId");
  const hasVenueName = formData.has("venueName");
  const hasVenueLink = formData.has("venueLink");
  const hasNote = formData.has("note");
  const hasTaskId = formData.has("taskId");
  const assistantNoteOnlyEdit =
    !user.roles.includes(Role.ADMIN) &&
    (user.roles.includes(Role.ASSISTANT) ||
      user.roles.includes(Role.CHIEF_ASSISTANT));
  if (
    assistantNoteOnlyEdit &&
    (hasConferenceId || hasVenueName || hasVenueLink || hasTaskId)
  ) {
    return {
      ok: false,
      message:
        "Assistant accounts can only update the note of a suggested venue.",
    };
  }
  const conferenceId = hasConferenceId
    ? optionalString(formData.get("conferenceId"))
    : suggestion.conferenceId;
  const venueName = hasVenueName
    ? optionalString(formData.get("venueName"))
    : undefined;
  const venueLink = hasVenueLink
    ? optionalString(formData.get("venueLink"))
    : undefined;
  const note = hasNote ? optionalString(formData.get("note")) : undefined;
  const taskId = hasTaskId ? optionalString(formData.get("taskId")) : null;
  if (
    !hasConferenceId &&
    !hasVenueName &&
    !hasVenueLink &&
    !hasNote &&
    !hasTaskId
  ) {
    return { ok: false, message: "Update the venue or linked task." };
  }
  if (
    hasConferenceId &&
    conferenceId &&
    !(await prisma.conference.count({ where: { id: conferenceId } }))
  ) {
    return { ok: false, message: "The selected conference was not found." };
  }
  if (hasTaskId) {
    const taskValidation = await validateSuggestedVenueTaskLink({
      projectId,
      currentTaskId: suggestion.taskId,
      nextTaskId: taskId,
    });
    if (!taskValidation.ok) return taskValidation;
  }

  const linkChanged =
    hasConferenceId && conferenceId !== suggestion.conferenceId;
  const venueChanged = hasConferenceId || hasVenueName || hasVenueLink;
  const resetForReview =
    linkChanged ||
    (venueChanged && suggestion.status === SuggestedVenueStatus.DECLINED);
  const canApproveChangedLink =
    conferenceId &&
    suggestion.status === SuggestedVenueStatus.APPROVED &&
    (await canApproveVenueSuggestionForResearch(
      projectId,
      user.id,
      user.roles,
    ));

  try {
    await prisma.suggestedConference.update({
      where: { id: suggestionId },
      data: {
        ...(hasConferenceId ? { conferenceId } : {}),
        ...(hasVenueName ? { venueName } : {}),
        ...(hasVenueLink ? { venueLink } : {}),
        ...(hasNote ? { note } : {}),
        ...(hasTaskId ? { taskId } : {}),
        ...(resetForReview
          ? {
              status: canApproveChangedLink
                ? SuggestedVenueStatus.APPROVED
                : SuggestedVenueStatus.PENDING,
              requiresApproval: !canApproveChangedLink,
              approvedAt: canApproveChangedLink ? new Date() : null,
              approvedById: canApproveChangedLink ? user.id : null,
              declinedAt: null,
              declinedById: null,
              declineReason: null,
            }
          : {}),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: "This conference is already suggested for the research.",
      };
    }
    throw error;
  }

  revalidatePath(`/projects/${projectId}`);
  if (suggestion.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
  if (hasTaskId && taskId) revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/suggestions");
  return { ok: true };
}

async function canSuggestVenueForResearch(
  projectId: string,
  userId: string,
  roles: Role[],
) {
  if (isResearchAdminRole(roles)) return true;
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
  if (roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT)) {
    return true;
  }
  const project = await prisma.researchProject.findUnique({
    where: { id: projectId },
    select: {
      tasks: {
        where: { taskType: ResearchTaskType.SUGGEST_VENUE },
        select: { createdById: true },
      },
    },
  });
  if (!project) return false;
  return project.tasks.some((task) => task.createdById === userId);
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
  if (await researchContentIsLocked(projectId)) {
    return {
      ok: false,
      message: "Unlock this research before deleting a suggested venue.",
    };
  }

  const suggestion = await prisma.suggestedConference.findFirst({
    where: { projectId, id: suggestionId },
    select: {
      taskId: true,
      submissionTaskId: true,
      conferenceId: true,
    },
  });
  if (!suggestion) {
    return { ok: false, message: "Suggested venue was not found." };
  }

  const linkedSubmission = suggestion.conferenceId
    ? await prisma.conferenceSubmission.findUnique({
        where: {
          conferenceId_researchProjectId: {
            conferenceId: suggestion.conferenceId,
            researchProjectId: projectId,
          },
        },
        select: { id: true, status: true },
      })
    : null;
  if (
    linkedSubmission &&
    (linkedSubmission.status === ConferenceSubmissionStatus.ACCEPTED ||
      linkedSubmission.status === ConferenceSubmissionStatus.PUBLISHED)
  ) {
    return {
      ok: false,
      message:
        "This suggested venue cannot be deleted because its submission is accepted or published.",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (linkedSubmission) {
      await tx.conferenceSubmission.delete({
        where: { id: linkedSubmission.id },
      });
    }
    await tx.suggestedConference.delete({ where: { id: suggestionId } });
    if (suggestion.submissionTaskId) {
      await tx.researchTask.delete({
        where: { id: suggestion.submissionTaskId },
      });
    }
  });

  revalidatePath(`/projects/${projectId}`);
  if (suggestion?.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
  if (suggestion.submissionTaskId)
    revalidatePath(`/tasks/${suggestion.submissionTaskId}`);
  revalidatePath("/tasks");
  revalidatePath("/submissions");
  revalidatePath("/suggestions");
  return { ok: true };
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
    select: {
      projectId: true,
      journalId: true,
      venueName: true,
      venueLink: true,
      createdById: true,
      taskId: true,
      journalCreationTaskId: true,
      submissionTaskId: true,
      createdBy: { select: { email: true } },
      project: { select: { title: true } },
      task: { select: { createdById: true, checkerId: true } },
      journalCreationTask: { select: { status: true } },
    },
  });
  if (!suggestion || suggestion.projectId !== projectId) return;

  const createJournalTask =
    formData.get("createJournalTask") === "true" && !suggestion.journalId;
  if (createJournalTask) {
    if (!suggestion.createdById || !suggestion.createdBy) {
      throw new Error("The venue suggester is not available for assignment.");
    }
    const suggesterId = suggestion.createdById;
    if (suggestion.journalCreationTaskId) {
      if (
        suggestion.journalCreationTask?.status !==
          ResearchTaskStatus.COMPLETED &&
        suggestion.journalCreationTask?.status !== ResearchTaskStatus.REVOKED
      ) {
        await markSuggestVenueTaskWaitingForJournalCreation(suggestion.taskId);
        if (suggestion.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
        revalidatePath("/tasks");
      }
      revalidatePath(`/tasks/${suggestion.journalCreationTaskId}`);
      revalidatePath(`/projects/${projectId}`);
      revalidatePath("/suggestions");
      return {
        taskCreated: true,
        taskId: suggestion.journalCreationTaskId,
      };
    }
    const guide = await prisma.taskGuide.findUnique({
      where: { guideCode: "G003" },
      select: { id: true },
    });
    if (!guide) {
      throw new Error("Task guide G003 is not available.");
    }
    const venueName = suggestion.venueName ?? "New suggested journal";
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const taskTitle = `Add journal: ${venueName}`;
    const taskCode = await generateTaskCode();
    const taskDescription = DEFAULT_TASK_DESCRIPTION;
    const followUpCheckerId =
      suggestion.task?.checkerId ??
      (user.roles.includes(Role.CHIEF_ASSISTANT) ? user.id : null);
    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.researchTask.create({
        data: {
          title: taskTitle,
          taskCode,
          description: taskDescription,
          taskType: ResearchTaskType.ADD_JOURNAL,
          status: ResearchTaskStatus.IN_PROGRESS,
          dueDate,
          journalTargetCount: 1,
          createdById: suggestion.task?.createdById ?? user.id,
          checkerId: followUpCheckerId,
          assignments: { create: { userId: suggesterId } },
          guides: { connect: { id: guide.id } },
        },
        select: { id: true },
      });
      await tx.suggestedJournal.update({
        where: { id: suggestionId },
        data: {
          journalCreationTaskId: createdTask.id,
          status: SuggestedVenueStatus.PENDING,
          requiresApproval: true,
          approvedAt: null,
          approvedById: null,
          declinedAt: null,
          declinedById: null,
          declineReason: null,
        },
      });
      return createdTask;
    });
    await markSuggestVenueTaskWaitingForJournalCreation(suggestion.taskId);

    await notifyUsers({
      userIds: [suggesterId],
      type: "TASK_ASSIGNED",
      title: "Task assigned",
      summary: taskTitle,
      body: taskDescription,
      href: `/tasks/${task.id}`,
      entityType: "task",
      entityId: task.id,
      excludeUserId: user.id,
    });
    await sendTaskEmail({
      to: [suggestion.createdBy.email],
      subject: `Task assigned: ${taskTitle}`,
      heading: "Task assigned",
      intro: "A journal suggestion needs to be added to the site system.",
      detail: taskDescription,
      taskTitle,
      taskId: task.id,
      actionLabel: "Open task",
    });

    revalidatePath("/tasks");
    revalidatePath(`/tasks/${task.id}`);
    if (suggestion.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/suggestions");
    return { taskCreated: true, taskId: task.id };
  }

  const linkedJournalId =
    suggestion.journalId ?? optionalString(formData.get("journalId"));
  if (!linkedJournalId) {
    throw new Error("Choose the journal in the system before approving.");
  }
  const createSubmitTask = formData.get("createSubmitTask") === "true";
  const approvalNote = optionalString(formData.get("approvalNote"));

  await prisma.suggestedJournal.update({
    where: { id: suggestionId },
    data: {
      journalId: linkedJournalId,
      status: SuggestedVenueStatus.APPROVED,
      requiresApproval: true,
      approvedAt: new Date(),
      approvedById: user.id,
      approvalNote,
      declinedAt: null,
      declinedById: null,
      declineReason: null,
    },
  });

  const submitTaskResult =
    createSubmitTask && suggestion.createdById && suggestion.createdBy
      ? await createSubmitTaskForSuggestedJournalApproval({
          projectId,
          suggestionId,
          journalId: linkedJournalId,
          approverId: user.id,
          suggestedById: suggestion.createdById,
          originalTask: suggestion.task,
        })
      : null;

  const linkedJournal = await prisma.journal.findUnique({
    where: { id: linkedJournalId },
    select: { name: true },
  });

  const completedSuggestTask = await completeSuggestVenueTaskIfReady(
    suggestion.taskId,
    user.id,
  );

  await notifyMergedSuggestedVenueApproval({
    projectId,
    suggestionId,
    venueKind: "journal",
    venueName: linkedJournal?.name ?? suggestion.venueName ?? "Journal",
    approverId: user.id,
    suggestedById: suggestion.createdById,
    suggestedByEmail: suggestion.createdBy?.email,
    approvalNote,
    submitTask: submitTaskResult,
    completedSuggestTask,
  });

  revalidatePath(`/projects/${projectId}`);
  if (suggestion.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
  if (submitTaskResult?.taskId)
    revalidatePath(`/tasks/${submitTaskResult.taskId}`);
  revalidatePath("/suggestions");
  return {
    taskCreated: false,
    submitTaskCreated: submitTaskResult?.created ?? false,
    submitTaskLinked: Boolean(submitTaskResult && !submitTaskResult.created),
    submitTaskId: submitTaskResult?.taskId,
    suggestVenueTaskCompleted: Boolean(completedSuggestTask),
  };
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
    select: {
      projectId: true,
      conferenceId: true,
      venueName: true,
      createdById: true,
      taskId: true,
      submissionTaskId: true,
      createdBy: { select: { email: true } },
      project: { select: { title: true } },
      task: { select: { createdById: true, checkerId: true } },
    },
  });
  if (!suggestion || suggestion.projectId !== projectId) return;

  const linkedConferenceId =
    suggestion.conferenceId ?? optionalString(formData.get("conferenceId"));
  if (!linkedConferenceId) {
    throw new Error("Choose the conference in the system before approving.");
  }
  const createSubmitTask = formData.get("createSubmitTask") === "true";
  const approvalNote = optionalString(formData.get("approvalNote"));

  await prisma.suggestedConference.update({
    where: { id: suggestionId },
    data: {
      conferenceId: linkedConferenceId,
      status: SuggestedVenueStatus.APPROVED,
      requiresApproval: true,
      approvedAt: new Date(),
      approvedById: user.id,
      approvalNote,
      declinedAt: null,
      declinedById: null,
      declineReason: null,
    },
  });

  const submitTaskResult =
    createSubmitTask && suggestion.createdById && suggestion.createdBy
      ? await createSubmitTaskForSuggestedConferenceApproval({
          projectId,
          suggestionId,
          conferenceId: linkedConferenceId,
          approverId: user.id,
          suggestedById: suggestion.createdById,
          originalTask: suggestion.task,
        })
      : null;

  const linkedConference = await prisma.conference.findUnique({
    where: { id: linkedConferenceId },
    select: { name: true },
  });

  const completedSuggestTask = await completeSuggestVenueTaskIfReady(
    suggestion.taskId,
    user.id,
  );

  await notifyMergedSuggestedVenueApproval({
    projectId,
    suggestionId,
    venueKind: "conference",
    venueName: linkedConference?.name ?? suggestion.venueName ?? "Conference",
    approverId: user.id,
    suggestedById: suggestion.createdById,
    suggestedByEmail: suggestion.createdBy?.email,
    approvalNote,
    submitTask: submitTaskResult,
    completedSuggestTask,
  });

  revalidatePath(`/projects/${projectId}`);
  if (suggestion.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
  if (submitTaskResult?.taskId)
    revalidatePath(`/tasks/${submitTaskResult.taskId}`);
  revalidatePath("/suggestions");
  return {
    taskCreated: false,
    submitTaskCreated: submitTaskResult?.created ?? false,
    submitTaskLinked: Boolean(submitTaskResult && !submitTaskResult.created),
    submitTaskId: submitTaskResult?.taskId,
    suggestVenueTaskCompleted: Boolean(completedSuggestTask),
  };
}

export async function declineSuggestedJournal(
  projectId: string,
  suggestionId: string,
  reason: string,
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

  const declineReason = reason.trim();
  if (!declineReason) {
    return { ok: false, message: "Enter a reason for declining this venue." };
  }

  const suggestion = await prisma.suggestedJournal.findUnique({
    where: { id: suggestionId },
    select: {
      projectId: true,
      status: true,
      venueName: true,
      createdById: true,
      taskId: true,
      journal: { select: { name: true } },
    },
  });
  if (!suggestion || suggestion.projectId !== projectId) {
    return { ok: false, message: "Venue suggestion was not found." };
  }
  if (suggestion.status !== SuggestedVenueStatus.PENDING) {
    return { ok: false, message: "Only pending suggestions can be declined." };
  }

  await prisma.suggestedJournal.update({
    where: { id: suggestionId },
    data: {
      status: SuggestedVenueStatus.DECLINED,
      declinedAt: new Date(),
      declinedById: user.id,
      declineReason,
      approvalNote: null,
      approvedAt: null,
      approvedById: null,
    },
  });

  if (suggestion.createdById) {
    const venueName =
      suggestion.journal?.name ?? suggestion.venueName ?? "Journal";
    await notifyUsers({
      userIds: [suggestion.createdById],
      excludeUserId: user.id,
      type: "VENUE_SUGGESTION_DECLINED",
      title: "Venue suggestion declined",
      summary: venueName,
      body: `Your journal suggestion was declined. Reason: ${declineReason}`,
      href: `/projects/${projectId}`,
      entityType: "suggestedVenue",
      entityId: suggestionId,
    });
  }
  await requestSuggestVenueTaskRedoForDecline(suggestion.taskId, user.id);

  revalidatePath(`/projects/${projectId}`);
  if (suggestion.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
  revalidatePath("/suggestions");
  return { ok: true };
}

export async function declineSuggestedConference(
  projectId: string,
  suggestionId: string,
  reason: string,
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

  const declineReason = reason.trim();
  if (!declineReason) {
    return { ok: false, message: "Enter a reason for declining this venue." };
  }

  const suggestion = await prisma.suggestedConference.findUnique({
    where: { id: suggestionId },
    select: {
      projectId: true,
      status: true,
      venueName: true,
      createdById: true,
      taskId: true,
      conference: { select: { name: true } },
    },
  });
  if (!suggestion || suggestion.projectId !== projectId) {
    return { ok: false, message: "Venue suggestion was not found." };
  }
  if (suggestion.status !== SuggestedVenueStatus.PENDING) {
    return { ok: false, message: "Only pending suggestions can be declined." };
  }

  await prisma.suggestedConference.update({
    where: { id: suggestionId },
    data: {
      status: SuggestedVenueStatus.DECLINED,
      declinedAt: new Date(),
      declinedById: user.id,
      declineReason,
      approvalNote: null,
      approvedAt: null,
      approvedById: null,
    },
  });

  if (suggestion.createdById) {
    const venueName =
      suggestion.conference?.name ?? suggestion.venueName ?? "Conference";
    await notifyUsers({
      userIds: [suggestion.createdById],
      excludeUserId: user.id,
      type: "VENUE_SUGGESTION_DECLINED",
      title: "Venue suggestion declined",
      summary: venueName,
      body: `Your conference suggestion was declined. Reason: ${declineReason}`,
      href: `/projects/${projectId}`,
      entityType: "suggestedVenue",
      entityId: suggestionId,
    });
  }
  await requestSuggestVenueTaskRedoForDecline(suggestion.taskId, user.id);

  revalidatePath(`/projects/${projectId}`);
  if (suggestion.taskId) revalidatePath(`/tasks/${suggestion.taskId}`);
  revalidatePath("/suggestions");
  return { ok: true };
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
      body: `Journal: ${journal?.name ?? "Selected journal"}. Submission task approved.`,
    });
    await notifyOrganizedProjectMembersForResearch(task.projectId, {
      type: "PROJECT_RESEARCH_SUBMISSION",
      title: "Project research submitted",
      summary:
        project?.title ?? "A project research record has a new submission.",
      body: `Journal: ${journal?.name ?? "Selected journal"}.`,
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
      body: `Conference: ${conference?.name ?? "Selected conference"}. Submission task approved.`,
    });
    await notifyOrganizedProjectMembersForResearch(task.projectId, {
      type: "PROJECT_RESEARCH_SUBMISSION",
      title: "Project research submitted",
      summary:
        project?.title ??
        "A project research record has a new conference submission.",
      body: `Conference: ${conference?.name ?? "Selected conference"}.`,
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
  const isAdmin = await canManageTaskAsResearchAdmin(taskId, user);
  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      title: true,
      createdById: true,
      checkerId: true,
      journalCreationSuggestion: { select: { id: true } },
      createdBy: { select: { email: true } },
      checker: { select: { email: true } },
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });

  if (!task) return;
  if (task.journalCreationSuggestion) return;
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
    userIds: [task.createdById, task.checkerId].filter((id): id is string =>
      Boolean(id),
    ),
    type: "TASK_READY_FOR_CHECK",
    title: "Task ready for check",
    summary: task.title,
    body: "An assignee marked this task as finished and ready for review.",
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });
  await sendTaskManagerEmails({
    assignerEmail: task.createdBy.email,
    checkerEmail: task.checker?.email ?? null,
    taskTitle: task.title,
    taskId,
    assigner: {
      subject: `Task ready for your review: ${task.title}`,
      heading: "Task ready for assigner review",
      intro:
        "An assignee has marked the assigned work as finished. As the assigner, please review the work and either approve completion or send it back for revision.",
      actionLabel: "Review task",
    },
    checker: {
      subject: `Task ready for checker review: ${task.title}`,
      heading: "Task ready for checker review",
      intro:
        "An assignee has marked the assigned work as finished. As the checker, please review the result and confirm whether this task is ready to be approved.",
      actionLabel: "Check task",
    },
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
      allowAssigneeReportUpload: true,
      status: true,
      createdById: true,
      checkerId: true,
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
  if (!task.allowAssigneeReportUpload) {
    return {
      ok: false,
      title: "Report not available",
      detail: "The assigner did not enable report uploads for this task.",
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
    userIds: [task.createdById, task.checkerId].filter((id): id is string =>
      Boolean(id),
    ),
    type: "TASK_REPORT_UPLOADED",
    title: "Task report uploaded",
    summary: task.title,
    body: `Report uploaded: "${file.name}".`,
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

export async function deleteResearchTaskReport(taskId: string) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: { id: true, reportFileName: true },
  });
  if (!task) throw new Error("Task not found.");
  if (!task.reportFileName) throw new Error("This task has no report file.");

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      reportFileName: null,
      reportFileType: null,
      reportFileSize: null,
      reportFileData: null,
      reportUploadedAt: null,
      reportUploadedById: null,
    },
  });

  revalidatePath("/task-reports");
  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteResearchUploadedFile(
  fileKind:
    | "task-attachment"
    | "task-report"
    | "proposal-support"
    | "published-article",
  ownerId: string,
) {
  const user = await requireCurrentUser();
  requireAdmin(user.roles);

  if (fileKind === "task-attachment") {
    const task = await prisma.researchTask.findUnique({
      where: { id: ownerId },
      select: { id: true, taskFileName: true },
    });
    if (!task) throw new Error("Task not found.");
    if (!task.taskFileName) throw new Error("This task has no assigner file.");

    await prisma.researchTask.update({
      where: { id: ownerId },
      data: {
        taskFileName: null,
        taskFileType: null,
        taskFileSize: null,
        taskFileData: null,
      },
    });

    revalidatePath("/task-reports");
    revalidatePath(`/tasks/${ownerId}`);
    return;
  }

  if (fileKind === "task-report") {
    await deleteResearchTaskReport(ownerId);
    return;
  }

  if (fileKind === "proposal-support") {
    const proposal = await prisma.proposal.findUnique({
      where: { id: ownerId },
      select: { id: true, supportFileName: true },
    });
    if (!proposal) throw new Error("Proposal not found.");
    if (!proposal.supportFileName)
      throw new Error("This proposal has no support file.");

    await prisma.proposal.update({
      where: { id: ownerId },
      data: {
        supportFileName: null,
        supportFileType: null,
        supportFileSize: null,
        supportFileData: null,
      },
    });

    revalidatePath("/task-reports");
    revalidatePath("/proposals");
    revalidatePath(`/proposals/${ownerId}`);
    return;
  }

  const submission = await prisma.researchSubmission.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      articleFileName: true,
      researchProjectId: true,
      journalId: true,
    },
  });
  if (!submission) throw new Error("Submission not found.");
  if (!submission.articleFileName)
    throw new Error("This submission has no article file.");

  await prisma.researchSubmission.update({
    where: { id: ownerId },
    data: {
      articleFileName: null,
      articleFileType: null,
      articleFileSize: null,
      articleFileData: null,
    },
  });

  revalidatePath("/task-reports");
  revalidatePath("/submissions");
  revalidatePath(`/submissions/${ownerId}`);
  revalidatePath(`/projects/${submission.researchProjectId}`);
  revalidatePath(`/journals/${submission.journalId}`);
}

async function createNextProductionWorkflowTask({
  sourceTask,
  createdById,
}: {
  sourceTask: {
    id: string;
    projectId: string | null;
    productionSubtype: ResearchProductionSubtype | null;
    createdById: string;
    checkerId: string | null;
    project: { title: string } | null;
    assignments: { userId: string; user: { email: string } }[];
  };
  createdById: string;
}) {
  if (!sourceTask.projectId || sourceTask.assignments.length === 0) {
    return null;
  }

  const nextSubtype = nextProductionSubtype(sourceTask.productionSubtype);
  const nextSubtypeMeta = productionSubtypeMeta(nextSubtype);
  const isSuggestVenueNext =
    sourceTask.productionSubtype === ResearchProductionSubtype.REFERENCES;
  if (!nextSubtypeMeta && !isSuggestVenueNext) return null;

  const nextTaskType = isSuggestVenueNext
    ? ResearchTaskType.SUGGEST_VENUE
    : ResearchTaskType.PRODUCTION;
  const nextTitle = isSuggestVenueNext
    ? `Suggest venues for ${sourceTask.project?.title ?? "research"}`
    : `${nextSubtypeMeta?.label ?? "Production"} for ${
        sourceTask.project?.title ?? "research"
      }`;
  const nextDescription = isSuggestVenueNext
    ? SUGGEST_VENUE_AFTER_PRODUCTION_DESCRIPTION
    : DEFAULT_TASK_DESCRIPTION;
  const guideIds = await defaultTaskGuideIdsForTask({
    taskType: nextTaskType,
    proposalScope: ProposalTaskScope.RESEARCH,
    productionSubtype: nextSubtype,
  });

  return prisma.researchTask.create({
    data: {
      title: nextTitle,
      taskCode: await generateTaskCode(),
      description: nextDescription,
      category: isSuggestVenueNext ? null : ResearchTaskCategory.PRODUCTION,
      taskType: nextTaskType,
      suggestedVenueTargetCount: isSuggestVenueNext ? 2 : null,
      productionSubtype: isSuggestVenueNext ? null : nextSubtype,
      proposalScope: ProposalTaskScope.RESEARCH,
      status: ResearchTaskStatus.IN_PROGRESS,
      projectId: sourceTask.projectId,
      checkerId: sourceTask.checkerId,
      dueDate: researchTaskDueDate(researchDateValue(new Date(), 7)),
      createdById,
      assignments: {
        create: sourceTask.assignments.map((assignment) => ({
          userId: assignment.userId,
        })),
      },
      guides: {
        connect: guideIds.map((id) => ({ id })),
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      checkerId: true,
      assignments: {
        select: { user: { select: { email: true } } },
      },
    },
  });
}

export async function finishResearchTask(taskId: string, formData?: FormData) {
  const user = await requireCurrentUser();
  const completionMessage = optionalString(
    formData?.get("completionMessage") ?? null,
  )?.slice(0, 2000);
  const createNextProductionTask =
    formData?.get("createNextProductionTask") === "true";
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
      productionSubtype: true,
      status: true,
      title: true,
      createdById: true,
      checkerId: true,
      project: {
        select: {
          title: true,
          completedProductionSteps: true,
        },
      },
      journalCreationSuggestion: { select: { id: true } },
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });

  if (!task) return;
  if (task.journalCreationSuggestion) return;
  const isAdmin = await canManageTaskAsResearchAdmin(taskId, user);
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
  const completedProductionStep =
    task.taskType === ResearchTaskType.PRODUCTION
      ? productionSubtypeMeta(task.productionSubtype)?.label
      : null;
  const completedProductionSteps =
    task.taskType === ResearchTaskType.PRODUCTION && task.projectId
      ? completedProductionStep
        ? Array.from(
            new Set([
              ...(task.project?.completedProductionSteps ?? []),
              completedProductionStep,
            ]),
          )
        : productionStepLabels
      : null;
  const productionWasComplete = productionStepLabels.every((step) =>
    task.project?.completedProductionSteps.includes(step),
  );
  const productionIsComplete = completedProductionSteps
    ? productionStepLabels.every((step) =>
        completedProductionSteps.includes(step),
      )
    : false;
  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.COMPLETED,
      completedAt,
      completedBy: { connect: { id: user.id } },
      completionMessage,
      revokedAt: null,
      revokedBy: { disconnect: true },
      revokeReason: null,
      adminViewedAt: null,
      project:
        task.taskType === ResearchTaskType.PRODUCTION &&
        task.projectId &&
        completedProductionSteps
          ? {
              update: {
                completedProductionSteps,
                productionTimelineLocked: productionIsComplete,
              },
            }
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

  if (task.taskType === ResearchTaskType.PRODUCTION && task.projectId) {
    await refreshResearchStage(task.projectId, completedProductionSteps ?? []);
    if (!productionWasComplete && productionIsComplete) {
      await notifyResearchAuthors(task.projectId, {
        type: "RESEARCH_PRODUCTION_FINISHED",
        title: "Research production finished",
        summary: task.project?.title ?? "Research production is finished.",
        body: "All production checklist items have been marked complete.",
      });
    }
  }

  const nextTask = createNextProductionTask
    ? await createNextProductionWorkflowTask({
        sourceTask: task,
        createdById: task.createdById,
      })
    : null;

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  if (nextTask) revalidatePath(`/tasks/${nextTask.id}`);
  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  if (task.reviewId) revalidatePath(`/reviews/${task.reviewId}`);

  await notifyUsers({
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: nextTask ? "TASK_ASSIGNED" : "TASK_COMPLETED",
    title: nextTask
      ? "Task completed and next task assigned"
      : "Task completed",
    summary: nextTask ? nextTask.title : task.title,
    body: nextTask
      ? `The assigner approved "${task.title}" as complete and automatically assigned the next task: ${nextTask.title}.`
      : completionMessage
        ? `The assigner reviewed and approved this task as complete. Completion note: ${completionMessage}`
        : "The assigner reviewed and approved this task as complete.",
    href: nextTask ? `/tasks/${nextTask.id}` : `/tasks/${taskId}`,
    entityType: "task",
    entityId: nextTask?.id ?? taskId,
    excludeUserId: user.id,
  });
  await sendTaskEmail({
    to: task.assignments.map((assignment) => assignment.user.email),
    subject: nextTask
      ? `Task completed and next task assigned: ${nextTask.title}`
      : `Task approved as complete: ${task.title}`,
    heading: nextTask
      ? "Task completed and next task assigned"
      : "Task approved as complete",
    intro: nextTask
      ? "The previous production task was approved and the next workflow task has been assigned automatically."
      : "The assigner reviewed the submitted work and marked the task as complete.",
    detail: nextTask
      ? (nextTask.description ?? undefined)
      : completionMessage
        ? `Completion note: ${completionMessage}`
        : undefined,
    taskTitle: nextTask ? nextTask.title : task.title,
    taskId: nextTask?.id ?? taskId,
    actionLabel: nextTask ? "Open next task" : "View task",
  });
  if (nextTask) {
    if (nextTask.checkerId) {
      await notifyUsers({
        userIds: [nextTask.checkerId],
        type: "TASK_CHECKER_ASSIGNED",
        title: "Task checker assigned",
        summary: nextTask.title,
        body: "A follow-up production workflow task was assigned automatically with you as checker.",
        href: `/tasks/${nextTask.id}`,
        entityType: "task",
        entityId: nextTask.id,
        excludeUserId: user.id,
      });
      await sendTaskCheckerAssignedEmail({
        checkerId: nextTask.checkerId,
        taskTitle: nextTask.title,
        taskId: nextTask.id,
        detail: nextTask.description ?? undefined,
      });
    }
  }
  await notifyTaskAdminsAndChecker({
    taskId,
    userIds: [task.createdById, task.checkerId],
    type: "TASK_COMPLETED_REVIEWER_NOTICE",
    title: "Task approved as complete",
    summary: task.title,
    body: "This task was approved as complete by another task manager.",
    excludeUserId: user.id,
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
      clarifications: {
        where: { answer: null },
        select: { requestedById: true },
        orderBy: { createdAt: "desc" },
        take: 1,
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

  const isAdmin = await canManageTaskAsResearchAdmin(taskId, user);
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
    const openClarification = task.clarifications[0] ?? null;
    const requesterIsAssignee = openClarification
      ? task.assignments.some(
          (assignment) => assignment.userId === openClarification.requestedById,
        )
      : true;
    if (requesterIsAssignee) {
      return {
        ok: false,
        title: "Reminder not available",
        detail:
          "Assignees are waiting for clarification feedback from the task manager. Please answer the clarification request before sending finish reminders.",
      };
    }
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
    ? researchDateTimeFormat("en-GB", {
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
      checkerId: true,
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
    },
  });
  if (!task) return;
  if (
    !(await canManageTaskAsResearchAdmin(taskId, user)) &&
    task.createdById !== user.id
  ) {
    redirect("/401");
  }

  await prisma.researchTask.update({
    where: { id: taskId },
    data: {
      status: ResearchTaskStatus.REVISION_REQUESTED,
      completedAt: null,
      completedBy: { disconnect: true },
      completionMessage: null,
      redoRequestedAt: new Date(),
      redoRequestedBy: { connect: { id: user.id } },
      redoReason: reason,
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
      ? `Revision note: ${reason}`
      : "The assigner requested revision before approval.",
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
  await notifyTaskAdminsAndChecker({
    taskId,
    userIds: [task.createdById, task.checkerId],
    type: "TASK_REDO_REVIEWER_NOTICE",
    title: "Task revision requested",
    summary: task.title,
    body: reason
      ? `Revision was requested by another task manager. Note: ${reason}`
      : "Revision was requested by another task manager.",
    excludeUserId: user.id,
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
      checkerId: true,
      status: true,
      createdBy: { select: { email: true } },
      checker: { select: { email: true } },
      assignments: { select: { userId: true } },
      clarifications: {
        where: { answer: null },
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
    userIds: [task.createdById, task.checkerId].filter((id): id is string =>
      Boolean(id),
    ),
    type: "TASK_CLARIFICATION_REQUESTED",
    title: "Clarification requested",
    summary: task.title,
    body: question,
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });
  await sendTaskManagerEmails({
    assignerEmail: task.createdBy.email,
    checkerEmail: task.checker?.email ?? null,
    detail: question,
    taskTitle: task.title,
    taskId,
    assigner: {
      subject: `Assignee requested clarification: ${task.title}`,
      heading: "Assignee requested clarification",
      intro:
        "An assignee requested clarification or additional instruction. As the assigner, please answer the request so the work can continue.",
      actionLabel: "Answer request",
    },
    checker: {
      subject: `Clarification needs checker review: ${task.title}`,
      heading: "Clarification needs checker review",
      intro:
        "An assignee requested clarification or additional instruction. As the checker, please review the request and help answer it if it falls under your review responsibility.",
      actionLabel: "Review request",
    },
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
      checkerId: true,
      status: true,
      createdBy: { select: { email: true } },
      checker: { select: { email: true } },
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
      clarifications: {
        where: { id: clarificationId },
        select: { requestedById: true },
        take: 1,
      },
    },
  });
  if (!task) return;
  const clarification = task.clarifications[0];
  if (!clarification || clarification.requestedById === user.id) return;
  const requesterIsAssignee = task.assignments.some(
    (assignment) => assignment.userId === clarification.requestedById,
  );
  const userIsAssignee = task.assignments.some(
    (assignment) => assignment.userId === user.id,
  );
  const userCanManage =
    (await canManageTaskAsResearchAdmin(taskId, user)) ||
    task.createdById === user.id ||
    task.checkerId === user.id;
  if (requesterIsAssignee ? !userCanManage : !userIsAssignee) redirect("/401");
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
    data: {
      status: requesterIsAssignee
        ? ResearchTaskStatus.IN_PROGRESS
        : ResearchTaskStatus.CHECKING,
    },
  });
  if (requesterIsAssignee) {
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
        "The assigner, checker, or admin has answered a clarification request for this task. Please review the answer and continue the work.",
      detail: answer,
      taskTitle: task.title,
      taskId,
      actionLabel: "Open task",
    });
    await notifyTaskAdminsAndChecker({
      taskId,
      userIds: [task.createdById, task.checkerId],
      type: "TASK_CLARIFICATION_ANSWERED_REVIEWER_NOTICE",
      title: "Clarification answered",
      summary: task.title,
      body: `A task manager answered the clarification request: ${answer}`,
      excludeUserId: user.id,
    });
  } else {
    await notifyTaskAdminsAndChecker({
      taskId,
      userIds: [task.createdById, task.checkerId],
      type: "TASK_ASSIGNEE_CLARIFICATION_ANSWERED",
      title: "Assignee answered clarification",
      summary: task.title,
      body: `The assignee answered the clarification request. The task is ready for check again: ${answer}`,
      excludeUserId: user.id,
    });
    await sendTaskManagerEmails({
      assignerEmail: task.createdBy.email,
      checkerEmail: task.checker?.email ?? null,
      detail: answer,
      taskTitle: task.title,
      taskId,
      assigner: {
        subject: `Assignee answered clarification: ${task.title}`,
        heading: "Assignee answered clarification",
        intro:
          "An assignee answered the clarification request. As the assigner, please review the answer and decide whether the task can proceed to approval.",
        actionLabel: "Review task",
      },
      checker: {
        subject: `Clarification answer ready for checker: ${task.title}`,
        heading: "Clarification answer ready for checker",
        intro:
          "An assignee answered the clarification request. As the checker, please review the answer and confirm whether the task is ready for approval.",
        actionLabel: "Check answer",
      },
    });
  }
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function requestAssigneeClarification(
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
      checkerId: true,
      status: true,
      createdBy: { select: { email: true } },
      checker: { select: { email: true } },
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
      clarifications: {
        where: { answer: null },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!task) return;
  const canManage =
    (await canManageTaskAsResearchAdmin(taskId, user)) ||
    task.createdById === user.id ||
    task.checkerId === user.id;
  if (!canManage) redirect("/401");
  if (
    task.status !== ResearchTaskStatus.CHECKING ||
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
    userIds: task.assignments.map((assignment) => assignment.userId),
    type: "TASK_ASSIGNEE_CLARIFICATION_REQUESTED",
    title: "Clarification needed",
    summary: task.title,
    body: `The task reviewer needs your clarification before this task can be approved: ${question}`,
    href: `/tasks/${taskId}`,
    entityType: "task",
    entityId: taskId,
    excludeUserId: user.id,
  });
  await sendTaskEmail({
    to: task.assignments.map((assignment) => assignment.user.email),
    subject: `Clarification needed: ${task.title}`,
    heading: "Clarification needed before approval",
    intro:
      "The assigner, checker, or admin needs more information before this task can be approved. Please answer the request in the task conversation.",
    detail: question,
    taskTitle: task.title,
    taskId,
    actionLabel: "Answer request",
  });
  await notifyTaskAdminsAndChecker({
    taskId,
    userIds: [task.createdById, task.checkerId],
    type: "TASK_ASSIGNEE_CLARIFICATION_REVIEWER_NOTICE",
    title: "Clarification requested from assignee",
    summary: task.title,
    body: `A task manager requested clarification from the assignee: ${question}`,
    excludeUserId: user.id,
  });
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function sendTaskClarificationChatMessage(
  taskId: string,
  formData: FormData,
) {
  const user = await requireCurrentUser();
  const currentUserId = user.id ?? "";
  if (!currentUserId) redirect("/401");

  const message = optionalString(formData.get("message"));
  const requestedMode = optionalString(formData.get("mode"));
  const clarificationId = optionalString(formData.get("clarificationId"));
  if (!message) return;
  const checkedMessage = message;

  const task = await prisma.researchTask.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      createdById: true,
      checkerId: true,
      status: true,
      createdBy: { select: { email: true } },
      checker: { select: { email: true } },
      assignments: {
        select: { userId: true, user: { select: { email: true } } },
      },
      clarifications: {
        where: clarificationId ? { id: clarificationId } : { answer: null },
        select: {
          id: true,
          requestedById: true,
          answeredById: true,
          answer: true,
          messages: {
            select: { senderId: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!task) return;
  const checkedTask = task;
  if (
    checkedTask.status === ResearchTaskStatus.COMPLETED ||
    checkedTask.status === ResearchTaskStatus.REVOKED
  ) {
    return;
  }

  const userIsAssignee = checkedTask.assignments.some(
    (assignment) => assignment.userId === currentUserId,
  );
  const userCanManage =
    (await canManageTaskAsResearchAdmin(taskId, user)) ||
    checkedTask.createdById === currentUserId ||
    checkedTask.checkerId === currentUserId;
  const clarification = checkedTask.clarifications[0] ?? null;
  const requesterIsAssignee = clarification
    ? checkedTask.assignments.some(
        (assignment) => assignment.userId === clarification.requestedById,
      )
    : false;
  const userIsRequesterSide = clarification
    ? userIsAssignee === requesterIsAssignee
    : false;
  const requestSideExtraCount = clarification
    ? clarification.messages.filter((item) => {
        const senderIsAssignee = checkedTask.assignments.some(
          (assignment) => assignment.userId === item.senderId,
        );
        return senderIsAssignee === requesterIsAssignee;
      }).length
    : 0;
  const answerSideExtraCount = clarification
    ? clarification.messages.filter((item) => {
        const senderIsAssignee = checkedTask.assignments.some(
          (assignment) => assignment.userId === item.senderId,
        );
        return senderIsAssignee !== requesterIsAssignee;
      }).length
    : 0;

  const canStartAssigneeRequest =
    userIsAssignee &&
    checkedTask.createdById !== currentUserId &&
    checkedTask.status !== ResearchTaskStatus.CHECKING &&
    checkedTask.status !== ResearchTaskStatus.NEED_CLARIFY;
  const canStartManagerRequest =
    userCanManage && checkedTask.status === ResearchTaskStatus.CHECKING;

  async function createClarificationRequest() {
    if (!canStartAssigneeRequest && !canStartManagerRequest) return;
    if (clarification && !clarification.answer) return;

    await prisma.researchTaskClarification.create({
      data: { taskId, requestedById: currentUserId, question: checkedMessage },
    });
    await prisma.researchTask.update({
      where: { id: taskId },
      data: { status: ResearchTaskStatus.NEED_CLARIFY },
    });

    if (userIsAssignee) {
      await notifyUsers({
        userIds: [checkedTask.createdById, checkedTask.checkerId].filter(
          (id): id is string => Boolean(id),
        ),
        type: "TASK_CLARIFICATION_REQUESTED",
        title: "Clarification requested",
        summary: checkedTask.title,
        body: checkedMessage,
        href: `/tasks/${taskId}`,
        entityType: "task",
        entityId: taskId,
        excludeUserId: currentUserId,
      });
      await sendTaskManagerEmails({
        assignerEmail: checkedTask.createdBy.email,
        checkerEmail: checkedTask.checker?.email ?? null,
        detail: checkedMessage,
        taskTitle: checkedTask.title,
        taskId,
        assigner: {
          subject: `Assignee requested clarification: ${checkedTask.title}`,
          heading: "Assignee requested clarification",
          intro:
            "An assignee requested clarification or additional instruction. As the assigner, please answer the request so the work can continue.",
          actionLabel: "Answer request",
        },
        checker: {
          subject: `Clarification needs checker review: ${checkedTask.title}`,
          heading: "Clarification needs checker review",
          intro:
            "An assignee requested clarification or additional instruction. As the checker, please review the request and help answer it if it falls under your review responsibility.",
          actionLabel: "Review request",
        },
      });
      return;
    }

    await notifyUsers({
      userIds: checkedTask.assignments.map((assignment) => assignment.userId),
      type: "TASK_ASSIGNEE_CLARIFICATION_REQUESTED",
      title: "Clarification needed",
      summary: checkedTask.title,
      body: `The task reviewer needs your clarification before this task can be approved: ${checkedMessage}`,
      href: `/tasks/${taskId}`,
      entityType: "task",
      entityId: taskId,
      excludeUserId: currentUserId,
    });
    await sendTaskEmail({
      to: checkedTask.assignments.map((assignment) => assignment.user.email),
      subject: `Clarification needed: ${checkedTask.title}`,
      heading: "Clarification needed before approval",
      intro:
        "The assigner, checker, or admin needs more information before this task can be approved. Please answer the request in the task conversation.",
      detail: checkedMessage,
      taskTitle: checkedTask.title,
      taskId,
      actionLabel: "Answer request",
    });
    await notifyTaskAdminsAndChecker({
      taskId,
      userIds: [checkedTask.createdById, checkedTask.checkerId],
      type: "TASK_ASSIGNEE_CLARIFICATION_REVIEWER_NOTICE",
      title: "Clarification requested from assignee",
      summary: checkedTask.title,
      body: `A task manager requested clarification from the assignee: ${checkedMessage}`,
      excludeUserId: currentUserId,
    });
  }

  async function createFollowUpMessage() {
    if (!clarification) return;
    const canAddRequestFollowUp =
      !clarification.answer &&
      clarification.requestedById === currentUserId &&
      requestSideExtraCount < 2;
    const canAddAnswerFollowUp =
      Boolean(clarification.answer) &&
      !userIsRequesterSide &&
      clarification.answeredById === currentUserId &&
      answerSideExtraCount < 2;
    if (!canAddRequestFollowUp && !canAddAnswerFollowUp) return;

    await prisma.researchTaskClarificationMessage.create({
      data: {
        clarificationId: clarification.id,
        senderId: currentUserId,
        body: checkedMessage,
      },
    });
    const recipientIds = userIsAssignee
      ? [checkedTask.createdById, checkedTask.checkerId].filter(
          (id): id is string => Boolean(id),
        )
      : checkedTask.assignments.map((assignment) => assignment.userId);
    await notifyUsers({
      userIds: recipientIds,
      type: "TASK_CLARIFICATION_REQUESTED",
      title: "Clarification message added",
      summary: checkedTask.title,
      body: checkedMessage,
      href: `/tasks/${taskId}`,
      entityType: "task",
      entityId: taskId,
      excludeUserId: currentUserId,
    });
  }

  async function answerClarificationRequest() {
    if (!clarification || clarification.answer) return;
    if (userIsRequesterSide) return;
    if (requesterIsAssignee ? !userCanManage : !userIsAssignee)
      redirect("/401");

    const updated = await prisma.researchTaskClarification.updateMany({
      where: { id: clarification.id, taskId, answer: null },
      data: {
        answer: checkedMessage,
        answeredById: currentUserId,
        answeredAt: new Date(),
      },
    });
    if (updated.count === 0) return;
    await prisma.researchTask.update({
      where: { id: taskId },
      data: {
        status: requesterIsAssignee
          ? ResearchTaskStatus.IN_PROGRESS
          : ResearchTaskStatus.CHECKING,
      },
    });

    if (requesterIsAssignee) {
      await notifyUsers({
        userIds: checkedTask.assignments.map((assignment) => assignment.userId),
        type: "TASK_CLARIFICATION_ANSWERED",
        title: "Clarification answered",
        summary: checkedTask.title,
        body: checkedMessage,
        href: `/tasks/${taskId}`,
        entityType: "task",
        entityId: taskId,
        excludeUserId: currentUserId,
      });
      await sendTaskEmail({
        to: checkedTask.assignments.map((assignment) => assignment.user.email),
        subject: `Clarification answered: ${checkedTask.title}`,
        heading: "Clarification answered",
        intro:
          "The assigner, checker, or admin has answered a clarification request for this task. Please review the answer and continue the work.",
        detail: checkedMessage,
        taskTitle: checkedTask.title,
        taskId,
        actionLabel: "Open task",
      });
      await notifyTaskAdminsAndChecker({
        taskId,
        userIds: [checkedTask.createdById, checkedTask.checkerId],
        type: "TASK_CLARIFICATION_ANSWERED_REVIEWER_NOTICE",
        title: "Clarification answered",
        summary: checkedTask.title,
        body: `A task manager answered the clarification request: ${checkedMessage}`,
        excludeUserId: currentUserId,
      });
    } else {
      await notifyTaskAdminsAndChecker({
        taskId,
        userIds: [checkedTask.createdById, checkedTask.checkerId],
        type: "TASK_ASSIGNEE_CLARIFICATION_ANSWERED",
        title: "Assignee answered clarification",
        summary: checkedTask.title,
        body: `The assignee answered the clarification request. The task is ready for check again: ${checkedMessage}`,
        excludeUserId: currentUserId,
      });
      await sendTaskManagerEmails({
        assignerEmail: checkedTask.createdBy.email,
        checkerEmail: checkedTask.checker?.email ?? null,
        detail: checkedMessage,
        taskTitle: checkedTask.title,
        taskId,
        assigner: {
          subject: `Assignee answered clarification: ${checkedTask.title}`,
          heading: "Assignee answered clarification",
          intro:
            "An assignee answered the clarification request. As the assigner, please review the answer and decide whether the task can proceed to approval.",
          actionLabel: "Review task",
        },
        checker: {
          subject: `Clarification answer ready for checker: ${checkedTask.title}`,
          heading: "Clarification answer ready for checker",
          intro:
            "An assignee answered the clarification request. As the checker, please review the answer and confirm whether the task is ready for approval.",
          actionLabel: "Check answer",
        },
      });
    }
  }

  if (requestedMode === "start") {
    await createClarificationRequest();
  } else if (requestedMode === "followup") {
    await createFollowUpMessage();
  } else if (requestedMode === "answer") {
    await answerClarificationRequest();
  }

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
Tamph Research Hub`;

  const html = researchLightEmail({
    eyebrow: "Research Hub",
    title: notificationSubject(type, title),
    intro: `Dear ${authorName}, ${opening}`,
    children: `
      ${researchEmailInfoTable([
        { label: "Research title", value: title },
        { label: "Authors", value: authorsLine },
        { label: "Venue", value: venue },
        { label: "Status", value: status },
      ])}
      ${researchEmailButton(researchUrl, "Open research detail page")}
      ${researchEmailParagraph("You can use the research detail page to track full information, authorship, venue, and submission progress.")}
      ${researchEmailLink(researchUrl)}
    `,
    footer: "Best regards, Tamph Research Hub.",
  });

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
      loginEmail: string;
      emailVerified: Date | null;
    }
  >();
  const sourceAuthors =
    project.authorEntries.length > 0
      ? project.authorEntries.map((entry) => ({
          id: entry.user.id,
          name: entry.user.name,
          email: entry.selectedEmail ?? entry.user.email,
          loginEmail: entry.user.email,
          emailVerified: entry.user.emailVerified,
        }))
      : project.authors.length > 0
        ? project.authors.map((author) => ({
            ...author,
            loginEmail: author.email,
          }))
        : [
            {
              ...project.leadResearcher,
              loginEmail: project.leadResearcher.email,
            },
          ];
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
    isResearchAdminRole(user.roles) ||
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

    const usesLoginEmail =
      author.email.trim().toLowerCase() ===
      author.loginEmail.trim().toLowerCase();
    if (usesLoginEmail && !author.emailVerified) {
      results.push({
        authorName,
        email: author.email,
        status: "skipped",
        reason: "Main email is not verified.",
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
