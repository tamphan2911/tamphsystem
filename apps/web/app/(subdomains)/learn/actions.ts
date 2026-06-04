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
