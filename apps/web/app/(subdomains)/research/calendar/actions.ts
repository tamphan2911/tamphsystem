"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  prisma,
  ResearchCalendarItemStatus,
  ResearchCalendarItemType,
  Role,
} from "@repo/db";
import { auth } from "../../../../auth";

const colorOptions = new Set([
  "cyan",
  "violet",
  "emerald",
  "amber",
  "rose",
  "slate",
]);

async function requireCalendarAdmin() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true, activeSites: true },
  });
  if (
    !user?.activeSites.includes("research") ||
    !user.roles.includes(Role.ADMIN)
  ) {
    redirect("/401");
  }
  return userId;
}

function enumValue<T extends Record<string, string>>(
  enumObject: T,
  value: FormDataEntryValue | null,
): T[keyof T] | null {
  const text = typeof value === "string" ? value : "";
  return Object.values(enumObject).includes(text) ? (text as T[keyof T]) : null;
}

function optionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function dateTimeFromForm(dateValue: string | null, timeValue: string | null) {
  if (!dateValue) return null;
  const time = timeValue?.trim() || "09:00";
  const date = new Date(`${dateValue}T${time}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function calendarItemValues(formData: FormData) {
  const title = optionalText(formData.get("title"));
  if (!title) throw new Error("Enter a calendar title.");

  const itemType =
    enumValue(ResearchCalendarItemType, formData.get("itemType")) ??
    ResearchCalendarItemType.EVENT;
  const status =
    enumValue(ResearchCalendarItemStatus, formData.get("status")) ??
    ResearchCalendarItemStatus.PLANNED;
  const allDay = formData.get("allDay") === "true";
  const startDate = optionalText(formData.get("startDate"));
  const endDate = optionalText(formData.get("endDate")) || startDate;
  const startAt = dateTimeFromForm(
    startDate,
    allDay ? "09:00" : optionalText(formData.get("startTime")),
  );
  const endAt = endDate
    ? dateTimeFromForm(
        endDate,
        allDay ? "17:00" : optionalText(formData.get("endTime")),
      )
    : null;
  if (!startAt) throw new Error("Choose a valid start date.");
  if (endAt && endAt < startAt) {
    throw new Error("End date/time must be after the start date/time.");
  }

  const colorValue = optionalText(formData.get("color")) ?? "cyan";
  const color = colorOptions.has(colorValue) ? colorValue : "cyan";

  return {
    title,
    description: optionalText(formData.get("description")),
    location: optionalText(formData.get("location")),
    itemType,
    status,
    color,
    startAt,
    endAt,
    allDay,
  };
}

export async function createResearchCalendarItem(formData: FormData) {
  const userId = await requireCalendarAdmin();
  const values = calendarItemValues(formData);
  await prisma.researchCalendarItem.create({
    data: {
      ...values,
      createdById: userId,
    },
  });
  revalidatePath("/calendar");
}

export async function updateResearchCalendarItem(
  itemId: string,
  formData: FormData,
) {
  await requireCalendarAdmin();
  const values = calendarItemValues(formData);
  await prisma.researchCalendarItem.update({
    where: { id: itemId },
    data: values,
  });
  revalidatePath("/calendar");
}

export async function deleteResearchCalendarItem(itemId: string) {
  await requireCalendarAdmin();
  await prisma.researchCalendarItem.delete({ where: { id: itemId } });
  revalidatePath("/calendar");
}
