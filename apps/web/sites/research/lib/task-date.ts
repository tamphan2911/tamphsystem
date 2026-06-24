import { researchDateValue } from "./date-time";

export function defaultResearchTaskDueDate(referenceDate = new Date()) {
  return researchDateValue(referenceDate, 7);
}

export function urgentResearchTaskDueDate(referenceDate = new Date()) {
  return researchDateValue(referenceDate, 1);
}

export function researchTaskDueDate(value: string | null | undefined) {
  const match = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  // 23:59:59.999 in Hanoi (UTC+7) is 16:59:59.999 UTC.
  return new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999));
}
