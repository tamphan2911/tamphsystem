"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";

function safeRedirectPath(
  value: FormDataEntryValue | null | undefined,
  fallback = "/",
) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return fallback;
  }

  return value;
}

async function requireUserId(callbackUrl?: string) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl ?? "/")}`);
  }

  return userId;
}

export async function enrollInCourse(courseId: string, formData?: FormData) {
  const userId = await requireUserId(
    safeRedirectPath(formData?.get("callbackUrl"), `/courses/${courseId}`),
  );

  await prisma.user.updateMany({
    where: {
      id: userId,
      NOT: { activeSites: { has: "learn" } },
    },
    data: {
      activeSites: { push: "learn" },
    },
  });

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    update: {},
    create: {
      userId,
      courseId,
    },
  });

  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
}

export async function updateCourseProgress(
  courseId: string,
  progressPercentage: number,
) {
  const userId = await requireUserId();
  const progress = Math.min(100, Math.max(0, progressPercentage));

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    update: {
      progressPercentage: progress,
      completedAt: progress >= 100 ? new Date() : null,
    },
    create: {
      userId,
      courseId,
      progressPercentage: progress,
      completedAt: progress >= 100 ? new Date() : null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/sessions`);
}

export async function completeSession(courseId: string, sessionId: string) {
  const userId = await requireUserId();

  await prisma.sessionCompletion.upsert({
    where: {
      userId_sessionId: {
        userId,
        sessionId,
      },
    },
    update: { completedAt: new Date() },
    create: {
      userId,
      sessionId,
      courseId,
    },
  });

  const [totalSessions, completedSessions] = await Promise.all([
    prisma.session.count({
      where: { module: { courseId } },
    }),
    prisma.sessionCompletion.count({
      where: { userId, courseId },
    }),
  ]);

  const progressPercentage =
    totalSessions > 0
      ? Math.min(100, Math.round((completedSessions / totalSessions) * 100))
      : 100;

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    update: {
      progressPercentage,
      completedAt: progressPercentage >= 100 ? new Date() : null,
    },
    create: {
      userId,
      courseId,
      progressPercentage,
      completedAt: progressPercentage >= 100 ? new Date() : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/sessions/${sessionId}`);
}

export async function submitQuizAttempt(
  courseId: string,
  sessionId: string,
  quizId: string,
  selectedAnswerIds: string[],
) {
  const userId = await requireUserId();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answers: true } } },
  });
  if (!quiz) return;

  const correctCount = quiz.questions.reduce((sum, question) => {
    const correct = question.answers.find((answer) => answer.isCorrect);
    return correct && selectedAnswerIds.includes(correct.id) ? sum + 1 : sum;
  }, 0);

  const score =
    quiz.questions.length > 0
      ? Math.round((correctCount / quiz.questions.length) * 100)
      : 0;

  await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      score,
    },
  });

  await completeSession(courseId, sessionId);
}
