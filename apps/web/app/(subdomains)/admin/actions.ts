"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import {
  prisma,
  ClaimStatus,
  QuestionType,
  ResearchStage,
  Role,
  SessionType,
} from "@repo/db";

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  if (!text) return null;

  const number = Number(text);
  return Number.isFinite(number) ? number : null;
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
      adminVisiblePassword: roles.some(
        (role) => role === Role.ASSISTANT || role === Role.CHIEF_ASSISTANT,
      )
        ? password
        : null,
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

export async function createModule(formData: FormData) {
  await requireAdmin();

  const courseId = optionalString(formData.get("courseId"));
  if (!courseId) return;

  const moduleCount = await prisma.module.count({ where: { courseId } });

  await prisma.module.create({
    data: {
      courseId,
      title: optionalString(formData.get("title")) ?? "Untitled module",
      order: optionalNumber(formData.get("order")) ?? moduleCount + 1,
    },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
}

export async function createSession(formData: FormData) {
  await requireAdmin();

  const moduleId = optionalString(formData.get("moduleId"));
  if (!moduleId) return;

  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });
  if (!courseModule) return;

  const sessionCount = await prisma.session.count({ where: { moduleId } });
  const type =
    (formData.get("type") as SessionType | null) ?? SessionType.LESSON_TEXT;

  const session = await prisma.session.create({
    data: {
      moduleId,
      title: optionalString(formData.get("title")) ?? "Untitled session",
      type: Object.values(SessionType).includes(type)
        ? type
        : SessionType.LESSON_TEXT,
      order: optionalNumber(formData.get("order")) ?? sessionCount + 1,
      year: optionalNumber(formData.get("year")),
      content: optionalString(formData.get("content")),
      videoUrl: optionalString(formData.get("videoUrl")),
      codingLanguage: optionalString(formData.get("codingLanguage")),
      initialCode: optionalString(formData.get("initialCode")),
      expectedOutput: optionalString(formData.get("expectedOutput")),
    },
  });

  if (session.type === SessionType.EXERCISE_QUIZ) {
    await prisma.quiz.create({
      data: {
        title: session.title,
        moduleId,
        sessionId: session.id,
      },
    });
  }

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseModule.courseId}`);
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

export async function updateAdminSessionContent(formData: FormData) {
  await requireAdmin();

  const sessionId = optionalString(formData.get("sessionId"));
  if (!sessionId) return;

  const type = formData.get("type") as SessionType | null;
  const session = await prisma.session.update({
    where: { id: sessionId },
    data: {
      title: optionalString(formData.get("title")) ?? "Untitled session",
      type:
        type && Object.values(SessionType).includes(type) ? type : undefined,
      year: optionalNumber(formData.get("year")),
      content: optionalString(formData.get("content")),
      videoUrl: optionalString(formData.get("videoUrl")),
      codingLanguage: optionalString(formData.get("codingLanguage")),
      initialCode: optionalString(formData.get("initialCode")),
      expectedOutput: optionalString(formData.get("expectedOutput")),
    },
    select: { id: true, title: true, type: true, moduleId: true },
  });

  if (session.type === SessionType.EXERCISE_QUIZ) {
    await prisma.quiz.upsert({
      where: { sessionId: session.id },
      update: { title: session.title, moduleId: session.moduleId },
      create: {
        title: session.title,
        moduleId: session.moduleId,
        sessionId: session.id,
      },
    });
  }

  revalidatePath("/courses");
}

export async function createQuizQuestion(formData: FormData) {
  await requireAdmin();

  const sessionId = optionalString(formData.get("sessionId"));
  if (!sessionId) return;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      moduleId: true,
      module: { select: { courseId: true } },
    },
  });
  if (!session) return;

  const quiz = await prisma.quiz.upsert({
    where: { sessionId },
    update: { title: session.title, moduleId: session.moduleId },
    create: {
      title: session.title,
      moduleId: session.moduleId,
      sessionId,
    },
  });

  const optionTexts = ["answerA", "answerB", "answerC", "answerD"]
    .map((name) => optionalString(formData.get(name)))
    .filter((text): text is string => Boolean(text));
  const correctIndex = Number(formData.get("correctIndex") ?? 0);

  if (!optionalString(formData.get("text")) || optionTexts.length < 2) return;

  await prisma.question.create({
    data: {
      quizId: quiz.id,
      text: optionalString(formData.get("text")) ?? "Untitled question",
      type: QuestionType.MULTIPLE_CHOICE,
      answers: {
        create: optionTexts.map((text, index) => ({
          text,
          isCorrect: index === correctIndex,
        })),
      },
    },
  });

  revalidatePath("/courses");
  revalidatePath(`/courses/${session.module.courseId}/sessions/${sessionId}`);
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

  const publisherId = optionalString(formData.get("publisherId"));
  const publisher = publisherId
    ? await prisma.publisher.findUnique({
        where: { id: publisherId },
        select: { id: true, name: true },
      })
    : null;
  if (!publisher)
    throw new Error("Choose a publisher before adding the journal.");

  await prisma.journal.create({
    data: {
      name: optionalString(formData.get("name")) ?? "Untitled journal",
      issn: optionalString(formData.get("issn")),
      field: optionalString(formData.get("field")),
      rank: optionalString(formData.get("rank")),
      publisherId: publisher.id,
      publisher: publisher.name,
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
